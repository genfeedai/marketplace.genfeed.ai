import { HandleErrors } from '@api/common/decorators/error-handler.decorator';
import { createLegacyId } from '@api/common/prisma/legacy-id.util';
import type {
  ListingRecord,
  PurchaseRecord,
} from '@api/common/prisma/marketplace.types';
import type {
  MarketplaceStripeService,
  StripeCheckoutSession,
  StripeCheckoutSessionCreateParams,
} from '@api/common/services/stripe.service';
import type { MarketplaceConfigService } from '@api/config/config.service';
import type { ListingsService } from '@api/listings/services/listings.service';
import type { PurchasesService } from '@api/purchases/services/purchases.service';
import type { SellersService } from '@api/sellers/services/sellers.service';
import { PurchaseStatus } from '@genfeedai/enums';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CheckoutService {
  private readonly constructorName: string = String(this.constructor.name);
  public readonly logger = new Logger(CheckoutService.name);

  constructor(
    readonly _configService: MarketplaceConfigService,
    private readonly stripeService: MarketplaceStripeService,
    private readonly listingsService: ListingsService,
    private readonly purchasesService: PurchasesService,
    private readonly sellersService: SellersService,
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
      id: createLegacyId(),
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
      purchaseId: purchase._id,
      successUrl,
    });

    await this.purchasesService.patch(purchase._id, {
      stripeSessionId: session.id,
    });

    this.logger.log(`${this.constructorName} checkout session created`, {
      buyerId,
      listingId,
      purchaseId: purchase._id,
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
        listingId: listing._id,
        organizationId,
        purchaseId,
        sellerId: listing.seller,
        type: 'marketplace',
      },
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    };

    const seller = await this.sellersService.findOne({
      _id: listing.seller,
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

  @HandleErrors('handle successful checkout', 'checkout')
  async handleSuccessfulCheckout(session: StripeCheckoutSession): Promise<{
    purchase: PurchaseRecord;
    success: boolean;
  }> {
    const purchaseId = session.metadata?.purchaseId;

    if (!purchaseId) {
      this.logger.error(
        `${this.constructorName} no purchaseId in session metadata`,
        { sessionId: session.id },
      );

      return { purchase: null as unknown as PurchaseRecord, success: false };
    }

    const purchase = await this.purchasesService.completePurchase(purchaseId);

    await this.purchasesService.patch(purchaseId, {
      stripePaymentIntentId: session.payment_intent ?? null,
    });

    this.logger.log(`${this.constructorName} checkout completed successfully`, {
      listingId: session.metadata?.listingId,
      purchaseId,
      sessionId: session.id,
    });

    return { purchase, success: true };
  }

  @HandleErrors('handle failed checkout', 'checkout')
  async handleFailedCheckout(sessionId: string, reason: string): Promise<void> {
    const session = await this.getCheckoutSession(sessionId);
    const purchaseId = session.metadata?.purchaseId;

    if (purchaseId) {
      await this.purchasesService.patch(purchaseId, {
        failureReason: reason,
        status: PurchaseStatus.FAILED,
      });

      this.logger.log(`${this.constructorName} checkout marked as failed`, {
        purchaseId,
        reason,
        sessionId,
      });
    }
  }
}
