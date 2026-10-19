import { HandleErrors } from '@api/common/decorators/error-handler.decorator';
import {
  MarketplaceStripeService,
  type StripeAccount,
  type StripePaymentIntent,
  type StripePayout,
  type StripePayoutList,
  type StripeRefund,
  type StripeRefundReason,
} from '@api/common/services/stripe.service';
import { MarketplaceConfigService } from '@api/config/config.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

@Injectable()
export class StripeConnectService {
  private readonly constructorName: string = String(this.constructor.name);
  public readonly logger = new Logger(StripeConnectService.name);

  constructor(
    @Inject(MarketplaceConfigService)
    readonly _configService: MarketplaceConfigService,
    @Inject(MarketplaceStripeService)
    private readonly stripeService: MarketplaceStripeService,
  ) {}

  /**
   * Create a Stripe Connect Express account for a seller
   */
  @HandleErrors('create connect account', 'stripe-connect')
  async createConnectAccount(params: {
    email: string;
    sellerId: string;
    displayName: string;
  }): Promise<StripeAccount> {
    const { email, sellerId, displayName } = params;

    this.logger.log(`${this.constructorName} createConnectAccount`, {
      email,
      sellerId,
    });

    const account = await this.stripeService.client.accounts.create({
      business_profile: {
        name: displayName,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      email,
      metadata: {
        sellerId,
      },
      type: 'express',
    });

    return account;
  }

  /**
   * Create an onboarding link for Stripe Connect
   */
  @HandleErrors('create onboarding link', 'stripe-connect')
  async createOnboardingLink(params: {
    accountId: string;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<string> {
    const { accountId, returnUrl, refreshUrl } = params;

    const accountLink = await this.stripeService.client.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Get the Express dashboard login link for a seller
   */
  @HandleErrors('create dashboard link', 'stripe-connect')
  async createDashboardLink(accountId: string): Promise<string> {
    const loginLink =
      await this.stripeService.client.accounts.createLoginLink(accountId);
    return loginLink.url;
  }

  /**
   * Retrieve Connect account details
   */
  @HandleErrors('get account details', 'stripe-connect')
  async getAccountDetails(accountId: string): Promise<StripeAccount> {
    return await this.stripeService.client.accounts.retrieve(accountId);
  }

  /**
   * Check if a Connect account has completed onboarding
   */
  @HandleErrors('check onboarding status', 'stripe-connect')
  async checkOnboardingComplete(accountId: string): Promise<{
    complete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  }> {
    const account = await this.getAccountDetails(accountId);

    return {
      chargesEnabled: account.charges_enabled || false,
      complete: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
    };
  }

  /**
   * Get balance for a Connect account
   */
  @HandleErrors('get account balance', 'stripe-connect')
  async getAccountBalance(
    accountId: string,
  ): Promise<{ available: number; pending: number }> {
    // `balance.retrieve` has no request params, so its sole argument is the
    // RequestOptions object used to set the connected-account header.
    const balance = await this.stripeService.client.balance.retrieve({
      stripeAccount: accountId,
    });

    const available = balance.available.reduce(
      (sum: number, entry: { amount: number }) => sum + entry.amount,
      0,
    );
    const pending = balance.pending.reduce(
      (sum: number, entry: { amount: number }) => sum + entry.amount,
      0,
    );

    return { available, pending };
  }

  /**
   * Create a payout to a Connect account's bank
   */
  @HandleErrors('create payout', 'stripe-connect')
  async createPayout(params: {
    accountId: string;
    amount: number;
    currency?: string;
  }): Promise<StripePayout> {
    const { accountId, amount, currency = 'usd' } = params;

    if (amount <= 0) {
      throw new BadRequestException('Payout amount must be positive');
    }

    return await this.stripeService.client.payouts.create(
      {
        amount,
        currency,
      },
      {
        stripeAccount: accountId,
      },
    );
  }

  /**
   * List payouts for a Connect account
   */
  @HandleErrors('list payouts', 'stripe-connect')
  async listPayouts(accountId: string, limit = 10): Promise<StripePayoutList> {
    return await this.stripeService.client.payouts.list(
      { limit },
      { stripeAccount: accountId },
    );
  }

  /**
   * Create a PaymentIntent with Connect transfer
   */
  @HandleErrors('create payment intent', 'stripe-connect')
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    sellerAccountId: string;
    applicationFeeAmount: number;
    metadata: Record<string, string>;
  }): Promise<StripePaymentIntent> {
    const {
      amount,
      currency,
      sellerAccountId,
      applicationFeeAmount,
      metadata,
    } = params;

    return await this.stripeService.client.paymentIntents.create({
      amount,
      application_fee_amount: applicationFeeAmount,
      currency,
      metadata,
      transfer_data: {
        destination: sellerAccountId,
      },
    });
  }

  /**
   * Process a refund for a marketplace purchase
   */
  @HandleErrors('process refund', 'stripe-connect')
  async processRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: StripeRefundReason;
  }): Promise<StripeRefund> {
    const { paymentIntentId, amount, reason } = params;

    return await this.stripeService.client.refunds.create({
      amount,
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer',
      refund_application_fee: true,
      reverse_transfer: true,
    });
  }
}
