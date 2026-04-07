import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * Thin Stripe SDK wrapper for marketplace operations.
 * Only exposes checkout sessions and Connect account management.
 */
@Injectable()
export class MarketplaceStripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(MarketplaceStripeService.name);

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    this.stripe = new Stripe(secretKey);
  }

  get client(): Stripe {
    return this.stripe;
  }

  /** Create a checkout session for a marketplace purchase */
  async createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create(params);
  }

  /** Create a Stripe Connect Express account for a seller */
  async createConnectAccount(
    params: Stripe.AccountCreateParams,
  ): Promise<Stripe.Account> {
    return this.stripe.accounts.create(params);
  }

  /** Generate an onboarding link for a Connect account */
  async createAccountLink(
    params: Stripe.AccountLinkCreateParams,
  ): Promise<Stripe.AccountLink> {
    return this.stripe.accountLinks.create(params);
  }

  /** Generate a dashboard login link for a Connect account */
  async createLoginLink(accountId: string): Promise<Stripe.LoginLink> {
    return this.stripe.accounts.createLoginLink(accountId);
  }

  /** Verify a webhook signature */
  constructEvent(
    body: Buffer,
    signature: string,
    endpointSecret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(body, signature, endpointSecret);
  }
}
