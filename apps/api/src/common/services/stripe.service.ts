import { Injectable, ServiceUnavailableException } from '@nestjs/common';

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

export interface StripeCheckoutSessionCreateParams {
  [key: string]: unknown;
  allow_promotion_codes?: boolean;
  cancel_url?: string;
  line_items?: unknown[];
  metadata?: Record<string, string>;
  mode?: string;
  payment_intent_data?: {
    application_fee_amount?: number;
    transfer_data?: {
      destination: string;
    };
  };
  payment_method_types?: string[];
  success_url?: string;
}

export interface StripeAccount {
  id: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
}

export interface StripeAccountCreateParams {
  business_profile?: {
    name?: string;
  };
  capabilities?: Record<string, unknown>;
  email?: string;
  metadata?: Record<string, string>;
  type?: string;
}

export interface StripeAccountLinkCreateParams {
  account: string;
  refresh_url: string;
  return_url: string;
  type: string;
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

export interface StripeRefund {
  id: string;
}

export type StripeRefundReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer';

export interface StripeBalance {
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
    };
  };
  accounts: {
    create(params: StripeAccountCreateParams): Promise<StripeAccount>;
    createLoginLink(accountId: string): Promise<{ url: string }>;
    retrieve(accountId: string): Promise<StripeAccount>;
  };
  accountLinks: {
    create(params: StripeAccountLinkCreateParams): Promise<{ url: string }>;
  };
  balance: {
    retrieve(params: { stripeAccount: string }): Promise<StripeBalance>;
  };
  payouts: {
    create(
      params: { amount: number; currency: string },
      options: { stripeAccount: string },
    ): Promise<StripePayout>;
    list(
      params: { limit: number },
      options: { stripeAccount: string },
    ): Promise<StripePayoutList>;
  };
  paymentIntents: {
    create(params: Record<string, unknown>): Promise<StripePaymentIntent>;
  };
  refunds: {
    create(params: Record<string, unknown>): Promise<StripeRefund>;
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
