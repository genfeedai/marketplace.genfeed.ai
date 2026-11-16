import { HandleErrors } from '@api/common/decorators/error-handler.decorator';
import type {
  ListingRecord,
  PurchaseRecord,
} from '@api/common/prisma/marketplace.types';
import {
  MarketplaceStripeService,
  type StripeCharge,
  type StripeCheckoutSession,
  type StripeCheckoutSessionCreateParams,
} from '@api/common/services/stripe.service';
import { MarketplaceConfigService } from '@api/config/config.service';
import type { Prisma } from '@api/generated/prisma/client';
import { ListingsService } from '@api/listings/services/listings.service';
import {
  EXTERNAL_CHECKOUT_MESSAGE,
  getExternalCheckoutProvider,
} from '@api/listings/utils/external-checkout';
import { PurchasesService } from '@api/purchases/services/purchases.service';
import { SellersService } from '@api/sellers/services/sellers.service';
import { PurchaseStatus } from '@genfeedai/contracts/enums';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class CheckoutService {
  private readonly constructorName: string = String(this.constructor.name);
  public readonly logger = new Logger(CheckoutService.name);

  constructor(
    @Inject(MarketplaceConfigService)
    readonly _configService: MarketplaceConfigService,
    @Inject(MarketplaceStripeService)
    private readonly stripeService: MarketplaceStripeService,
    @Inject(ListingsService) private readonly listingsService: ListingsService,
    @Inject(PurchasesService)
    private readonly purchasesService: PurchasesService,
    @Inject(SellersService) private readonly sellersService: SellersService,
  ) {}

  @HandleErrors('create checkout session', 'checkout')
  async createCheckoutSession(params: {
    listingId: string;
    buyerId: string;
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; sessionId: string; purchase: PurchaseRecord }> {
    const { listingId, buyerId, organizationId, successUrl, cancelUrl } =
      params;

    this.logger.log(`${this.constructorName} createCheckoutSession`, {
      buyerId,
      listingId,
    });

    const alreadyPurchased = await this.purchasesService.hasAlreadyPurchased(
      listingId,
      buyerId,
    );
    if (alreadyPurchased) {
      throw new BadRequestException('You already own this item');
    }

    const listing = await this.listingsService.getPublishedListing(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (getExternalCheckoutProvider(listing)) {
      throw new BadRequestException(EXTERNAL_CHECKOUT_MESSAGE);
    }

    if (listing.pricingTier === 'premium') {
      throw new BadRequestException(
        'Premium listings are not purchasable via checkout.',
      );
    }

    if (listing.price === 0) {
      throw new BadRequestException(
        'This item is free. Use the claim endpoint instead.',
      );
    }

    const { platformFee, sellerEarnings } =
      this.purchasesService.calculateCommission(listing.price);

    const purchase = await this.purchasesService.create({
      buyer: buyerId,
      currency: listing.currency,
      discount: 0,
      isDeleted: false,
      listing: listingId,
      listingSnapshot: {
        price: listing.price,
        title: listing.title,
        type: listing.type,
        version: listing.version,
      } as Prisma.InputJsonValue,
      organization: organizationId,
      platformFee,
      seller: listing.seller,
      sellerEarnings,
      status: PurchaseStatus.PENDING,
      subtotal: listing.price,
      total: listing.price,
    });

    const session = await this.createStripeSession({
      buyerId,
      cancelUrl,
      listing,
      organizationId,
      purchaseId: purchase.id,
      successUrl,
    });

    await this.purchasesService.patch(purchase.id, {
      stripeSessionId: session.id,
    });

    this.logger.log(`${this.constructorName} checkout session created`, {
      buyerId,
      listingId,
      purchaseId: purchase.id,
      sessionId: session.id,
    });

    return {
      purchase,
      sessionId: session.id,
      url: session.url || '',
    };
  }

  private async createStripeSession(params: {
    listing: ListingRecord;
    purchaseId: string;
    buyerId: string;
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<StripeCheckoutSession> {
    const {
      listing,
      purchaseId,
      buyerId,
      organizationId,
      successUrl,
      cancelUrl,
    } = params;

    const sessionConfig: StripeCheckoutSessionCreateParams = {
      allow_promotion_codes: true,
      cancel_url: `${cancelUrl}?session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          price_data: {
            currency: listing.currency.toLowerCase(),
            product_data: {
              description: listing.shortDescription,
              images: listing.thumbnail ? [listing.thumbnail] : undefined,
              name: listing.title,
            },
            unit_amount: listing.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        buyerId,
        listingId: listing.id,
        organizationId,
        purchaseId,
        sellerId: listing.seller,
        type: 'marketplace',
      },
      mode: 'payment',
      allowed_payment_method_types: ['card'],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    };

    const seller = await this.sellersService.findOne({
      id: listing.seller,
      isDeleted: false,
    });

    if (seller?.stripeAccountId && seller.stripeOnboardingComplete) {
      const { platformFee } = this.purchasesService.calculateCommission(
        listing.price,
      );

      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: seller.stripeAccountId,
        },
      };
    }

    return this.stripeService.client.checkout.sessions.create(sessionConfig);
  }

  @HandleErrors('get checkout session', 'checkout')
  getCheckoutSession(sessionId: string): Promise<StripeCheckoutSession> {
    return this.stripeService.client.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Complete a purchase only when Stripe says the session is paid and the
   * amount and currency match the purchase row. A mismatch is logged and the
   * purchase stays as it is; it is not retried because a retry cannot fix it.
   */
  @HandleErrors('handle successful checkout', 'checkout')
  async handleSuccessfulCheckout(session: StripeCheckoutSession): Promise<{
    purchase: PurchaseRecord | null;
    success: boolean;
  }> {
    const purchaseId = session.metadata?.purchaseId;

    if (!purchaseId) {
      this.logger.error(
        `${this.constructorName} no purchaseId in session metadata`,
        { sessionId: session.id },
      );

      return { purchase: null, success: false };
    }

    const purchase = await this.purchasesService.findById(purchaseId);
    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    const mismatch = this.findPaymentMismatch(session, purchase);
    if (mismatch) {
      this.logger.error(`${this.constructorName} payment mismatch`, {
        mismatch,
        purchaseId,
        sessionId: session.id,
      });

      return { purchase, success: false };
    }

    const result = await this.purchasesService.completePurchase(
      purchaseId,
      session.payment_intent ?? null,
    );

    this.logger.log(`${this.constructorName} checkout handled`, {
      applied: result.applied,
      listingId: session.metadata?.listingId,
      purchaseId,
      sessionId: session.id,
      status: result.purchase.status,
    });

    return { purchase: result.purchase, success: result.applied };
  }

  private findPaymentMismatch(
    session: StripeCheckoutSession,
    purchase: PurchaseRecord,
  ): string | null {
    if (session.payment_status !== 'paid') {
      return `session is ${session.payment_status ?? 'unknown'}, not paid`;
    }

    if (purchase.stripeSessionId && purchase.stripeSessionId !== session.id) {
      return 'session is not the one created for this purchase';
    }

    if (session.amount_total !== purchase.total) {
      return `amount ${session.amount_total} differs from purchase total ${purchase.total}`;
    }

    if (session.currency?.toLowerCase() !== purchase.currency.toLowerCase()) {
      return `currency ${session.currency} differs from purchase currency ${purchase.currency}`;
    }

    return null;
  }

  @HandleErrors('handle failed checkout', 'checkout')
  async handleFailedCheckout(
    session: StripeCheckoutSession,
    reason: string,
  ): Promise<void> {
    const purchaseId = session.metadata?.purchaseId;

    if (purchaseId) {
      const result = await this.purchasesService.failPurchase(
        purchaseId,
        reason,
      );

      this.logger.log(`${this.constructorName} checkout failure handled`, {
        applied: result.applied,
        purchaseId,
        reason,
        sessionId: session.id,
        status: result.purchase.status,
      });
    }
  }

  /**
   * A fully refunded charge refunds its purchase. The charge only names the
   * payment intent, so the purchase is found by the intent stored when it
   * completed, or else through the checkout session that paid it. A refund can
   * arrive before the completed event; the purchase is then refunded straight
   * away and the late completed event is refused.
   */
  @HandleErrors('handle refunded charge', 'checkout')
  async handleRefundedCharge(charge: StripeCharge): Promise<void> {
    if (!charge.refunded) {
      this.logger.log(`${this.constructorName} partial refund ignored`, {
        amountRefunded: charge.amount_refunded,
        chargeId: charge.id,
      });
      return;
    }

    const paymentIntentId = charge.payment_intent;
    if (!paymentIntentId) {
      return;
    }

    let purchase =
      await this.purchasesService.findByPaymentIntentId(paymentIntentId);

    if (!purchase) {
      const sessions = await this.stripeService.client.checkout.sessions.list({
        limit: 1,
        payment_intent: paymentIntentId,
      });
      const metadata = sessions.data[0]?.metadata;

      if (metadata?.type !== 'marketplace' || !metadata.purchaseId) {
        this.logger.log(`${this.constructorName} refund is not a purchase`, {
          chargeId: charge.id,
        });
        return;
      }

      purchase = await this.purchasesService.findById(metadata.purchaseId);
    }

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    const result = await this.purchasesService.refundPurchase(
      purchase.id,
      paymentIntentId,
    );

    this.logger.log(`${this.constructorName} refund handled`, {
      applied: result.applied,
      chargeId: charge.id,
      purchaseId: purchase.id,
      status: result.purchase.status,
    });
  }
}
