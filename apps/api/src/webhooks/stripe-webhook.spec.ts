import { MarketplaceStripeService } from '@api/common/services/stripe.service';
import { MarketplaceConfigService } from '@api/config/config.service';
import { CheckoutService } from '@api/purchases/services/checkout.service';
import { StripeEventLedgerService } from '@api/webhooks/stripe-event-ledger.service';
import { StripeWebhookService } from '@api/webhooks/stripe-webhook.service';
import { WebhooksController } from '@api/webhooks/webhooks.controller';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('Stripe signed raw-body delivery', () => {
  let app: INestApplication;
  let url: string;
  const secret = 'whsec_disposable_signature_fixture';
  const payload = JSON.stringify(
    {
      id: 'evt_fixture',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_fixture',
          metadata: { type: 'marketplace', purchaseId: 'purchase-fixture' },
        },
      },
    },
    null,
    2,
  );
  const checkout = {
    handleSuccessfulCheckout: vi.fn().mockResolvedValue({ success: true }),
  };
  const stripe = new Stripe('sk_test_disposable_signature_fixture');
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        StripeWebhookService,
        { provide: MarketplaceStripeService, useValue: { client: stripe } },
        {
          provide: MarketplaceConfigService,
          useValue: { stripeWebhookSecret: secret },
        },
        { provide: CheckoutService, useValue: checkout },
        {
          provide: StripeEventLedgerService,
          useValue: {
            claim: vi.fn().mockResolvedValue(true),
            markProcessed: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  afterAll(async () => app?.close());
  const send = (signature: string) =>
    fetch(`${url}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    });
  const signature = () =>
    stripe.webhooks.generateTestHeaderString({ payload, secret });
  it('rejects invalid signatures with 400', async () => {
    expect((await send('invalid')).status).toBe(400);
    expect(checkout.handleSuccessfulCheckout).not.toHaveBeenCalled();
  });
  it('verifies the exact raw payload and acknowledges successful processing', async () => {
    expect((await send(signature())).status).toBe(200);
    expect(checkout.handleSuccessfulCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cs_fixture' }),
    );
  });
  it('returns 500 on processing failures so Stripe retries', async () => {
    checkout.handleSuccessfulCheckout.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    expect((await send(signature())).status).toBe(500);
  });
});
