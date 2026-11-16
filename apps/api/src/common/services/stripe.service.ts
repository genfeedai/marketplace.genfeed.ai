import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type Stripe from 'stripe';

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  status?: string | null;
  metadata?: Record<string, string> | null;
  payment_intent?: string | null;
}

/**
 * Request parameters are the SDK's own types, so a parameter the SDK's pinned
 * Stripe API version no longer accepts fails the typecheck here.
 */
export type StripeCheckoutSessionCreateParams =
  Stripe.Checkout.SessionCreateParams;

export interface StripeAccount {
  id: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
}

export interface StripePayout {
  amount: number;
  arrival_date: number | null;
  created: number;
  currency: string;
  id: string;
  status: string;
}

export interface StripePayoutList {
  data: StripePayout[];
}

export interface StripePaymentIntent {
  id: string;
}

export interface StripeCharge {
  id: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  payment_intent?: string | null;
  refunded: boolean;
}

export interface StripeRefund {
  id: string;
}

export type StripeRefundReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer';

interface StripeBalance {
  available: Array<{ amount: number }>;
  pending: Array<{ amount: number }>;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
}

interface StripeLikeClient {
  checkout: {
    sessions: {
      create(
        params: StripeCheckoutSessionCreateParams,
      ): Promise<StripeCheckoutSession>;
      retrieve(sessionId: string): Promise<StripeCheckoutSession>;
      list(
        params: Stripe.Checkout.SessionListParams,
      ): Promise<{ data: StripeCheckoutSession[] }>;
    };
  };
  accounts: {
    create(params: Stripe.AccountCreateParams): Promise<StripeAccount>;
    createLoginLink(accountId: string): Promise<{ url: string }>;
    retrieve(accountId: string): Promise<StripeAccount>;
  };
  accountLinks: {
    create(params: Stripe.AccountLinkCreateParams): Promise<{ url: string }>;
  };
  balance: {
    retrieve(params: { stripeAccount: string }): Promise<StripeBalance>;
  };
  payouts: {
    create(
      params: Stripe.PayoutCreateParams,
      options: { stripeAccount: string },
    ): Promise<StripePayout>;
    list(
      params: Stripe.PayoutListParams,
      options: { stripeAccount: string },
    ): Promise<StripePayoutList>;
  };
  paymentIntents: {
    create(
      params: Stripe.PaymentIntentCreateParams,
    ): Promise<StripePaymentIntent>;
  };
  refunds: {
    create(params: Stripe.RefundCreateParams): Promise<StripeRefund>;
  };
  webhooks: {
    constructEvent(
      body: Buffer,
      signature: string,
      endpointSecret: string,
    ): StripeWebhookEvent;
  };
}

interface StripeConstructor {
  new (key: string, config?: Record<string, unknown>): StripeLikeClient;
}

@Injectable()
export class MarketplaceStripeService {
  private readonly stripe?: StripeLikeClient;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      if (process.env.NODE_ENV === 'development') {
        return;
      }
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    const StripeClient = require('stripe') as StripeConstructor;
    this.stripe = new StripeClient(secretKey);
  }

  get client(): StripeLikeClient {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Payments are not configured. Set STRIPE_SECRET_KEY to enable them.',
      );
    }
    return this.stripe;
  }

  constructEvent(
    body: Buffer,
    signature: string,
    endpointSecret: string,
  ): StripeWebhookEvent {
    return this.client.webhooks.constructEvent(body, signature, endpointSecret);
  }
}
