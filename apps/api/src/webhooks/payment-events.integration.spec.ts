import {
  adminUrl,
  type MarketplaceFixture,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PRICE = 1500;
const BUYER_ORG = 'buyer-org';

let fixture: MarketplaceFixture;
let buyerToken: string;

interface PendingPurchase {
  listingId: string;
  purchaseId: string;
  sessionId: string;
  paymentIntent: string;
}

async function startCheckout(title: string): Promise<PendingPurchase> {
  const listing = await fixture.publishListing({
    downloadData: { prompt: `${title} payload` },
    price: PRICE,
    title,
  });
  const response = await fixture.request(
    `/marketplace/listings/${listing.id}/checkout`,
    buyerToken,
    {},
  );
  const { purchaseId, sessionId } = (await response.json()).data.attributes;
  return {
    listingId: listing.id,
    paymentIntent: `pi_${sessionId}`,
    purchaseId,
    sessionId,
  };
}

async function purchaseRow(purchaseId: string) {
  const [row] = await fixture.sql<{
    status: string;
    stripePaymentIntentId: string | null;
  }>('select status, "stripePaymentIntentId" from purchases where id = $1', [
    purchaseId,
  ]);
  return row;
}

async function salesCounted(listingId: string) {
  const [listing] = await fixture.sql<{ purchases: number; revenue: number }>(
    'select purchases, revenue from listings where id = $1',
    [listingId],
  );
  return {
    listingPurchases: listing.purchases,
    listingRevenue: listing.revenue,
  };
}

async function sellerSales(listingId: string) {
  const [seller] = await fixture.sql<{ totalSales: number }>(
    `select "totalSales" from sellers
     where id = (select seller from listings where id = $1)`,
    [listingId],
  );
  return seller.totalSales;
}

async function eventRows(eventId: string) {
  return fixture.sql<{ processedAt: Date | null }>(
    'select "processedAt" from stripe_events where "stripeEventId" = $1',
    [eventId],
  );
}

const downloadStatus = async (purchaseId: string) =>
  (
    await fixture.request(
      `/marketplace/purchases/${purchaseId}/download-data`,
      buyerToken,
    )
  ).status;

const refundCharge = (
  purchase: PendingPurchase,
  overrides: Record<string, unknown> = {},
) =>
  fixture.postStripeEvent('charge.refunded', {
    amount: PRICE,
    amount_refunded: PRICE,
    currency: 'usd',
    id: `ch_${purchase.sessionId}`,
    object: 'charge',
    payment_intent: purchase.paymentIntent,
    refunded: true,
    ...overrides,
  });

const complete = (
  purchase: PendingPurchase,
  overrides: Record<string, unknown> = {},
) =>
  fixture.postCheckoutCompleted({
    amountTotal: PRICE,
    purchaseId: purchase.purchaseId,
    sessionId: purchase.sessionId,
    ...overrides,
  });

describe.skipIf(!adminUrl)('Stripe payment events on real PostgreSQL', () => {
  beforeAll(async () => {
    fixture = await startMarketplaceFixture();
    buyerToken = await fixture.token('payer-opaque', BUYER_ORG);
  });
  afterAll(async () => {
    await fixture?.stop();
  });

  it('applies a redelivered event once and records its id as processed', async () => {
    const purchase = await startCheckout('Duplicate event');
    const eventId = 'evt_duplicate_delivery';

    expect((await complete(purchase, { eventId })).status).toBe(200);
    expect((await complete(purchase, { eventId })).status).toBe(200);

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('completed');
    expect(await salesCounted(purchase.listingId)).toEqual({
      listingPurchases: 1,
      listingRevenue: PRICE,
    });
    expect(await eventRows(eventId)).toEqual([
      { processedAt: expect.any(Date) },
    ]);
    expect(await downloadStatus(purchase.purchaseId)).toBe(200);
  });

  it('counts a sale once when two different events complete the same session', async () => {
    const purchase = await startCheckout('Two events one session');

    await complete(purchase);
    await complete(purchase);

    expect(await salesCounted(purchase.listingId)).toEqual({
      listingPurchases: 1,
      listingRevenue: PRICE,
    });
  });

  it('keeps a purchase pending and undownloadable when the session is unpaid', async () => {
    const purchase = await startCheckout('Unpaid session');

    expect((await complete(purchase, { paymentStatus: 'unpaid' })).status).toBe(
      200,
    );

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('pending');
    expect(await downloadStatus(purchase.purchaseId)).not.toBe(200);
    expect((await salesCounted(purchase.listingId)).listingPurchases).toBe(0);
  });

  it('keeps a purchase pending when the paid amount differs from the purchase', async () => {
    const purchase = await startCheckout('Amount mismatch');

    await complete(purchase, { amountTotal: PRICE - 1 });

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('pending');
    expect(await downloadStatus(purchase.purchaseId)).not.toBe(200);
  });

  it('keeps a purchase pending when the paid currency differs from the purchase', async () => {
    const purchase = await startCheckout('Currency mismatch');

    await complete(purchase, { currency: 'eur' });

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('pending');
  });

  it('keeps a purchase pending when the session is not the one created for it', async () => {
    const purchase = await startCheckout('Foreign session');

    await complete(purchase, { sessionId: 'cs_test_someone_elses' });

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('pending');
  });

  it('refunds a completed purchase, removes it from the library and refuses its download', async () => {
    const purchase = await startCheckout('Refunded purchase');
    const salesBefore = await sellerSales(purchase.listingId);
    await complete(purchase);
    expect(await downloadStatus(purchase.purchaseId)).toBe(200);

    expect((await refundCharge(purchase)).status).toBe(200);

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('refunded');
    expect(await downloadStatus(purchase.purchaseId)).not.toBe(200);
    const library = await (
      await fixture.request('/marketplace/purchases', buyerToken)
    ).json();
    expect(library.data.map((item: { id: string }) => item.id)).not.toContain(
      purchase.purchaseId,
    );
    expect(await salesCounted(purchase.listingId)).toEqual({
      listingPurchases: 0,
      listingRevenue: 0,
    });
    expect(await sellerSales(purchase.listingId)).toBe(salesBefore);
  });

  it('gives a refunded sale back once when the refund is delivered twice', async () => {
    const purchase = await startCheckout('Refund twice');
    await complete(purchase);

    await refundCharge(purchase);
    await refundCharge(purchase);

    expect((await salesCounted(purchase.listingId)).listingPurchases).toBe(0);
  });

  it('leaves a purchase completed after a partial refund', async () => {
    const purchase = await startCheckout('Partial refund');
    await complete(purchase);

    await refundCharge(purchase, { amount_refunded: 500, refunded: false });

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('completed');
    expect(await downloadStatus(purchase.purchaseId)).toBe(200);
  });

  it('does not reopen a refunded purchase when a late completed event arrives', async () => {
    const purchase = await startCheckout('Late completed event');
    await complete(purchase);
    await refundCharge(purchase);

    expect((await complete(purchase)).status).toBe(200);

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('refunded');
    expect(await downloadStatus(purchase.purchaseId)).not.toBe(200);
    expect((await salesCounted(purchase.listingId)).listingPurchases).toBe(0);
  });

  it('ends refunded when the refund arrives before the completed event', async () => {
    const purchase = await startCheckout('Refund first');

    await refundCharge(purchase);
    await complete(purchase);

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('refunded');
    expect(await downloadStatus(purchase.purchaseId)).not.toBe(200);
    expect((await salesCounted(purchase.listingId)).listingPurchases).toBe(0);
  });

  it('does not fail a completed purchase when its expired event arrives late', async () => {
    const purchase = await startCheckout('Late expiry');
    await complete(purchase);

    await fixture.postStripeEvent('checkout.session.expired', {
      id: purchase.sessionId,
      metadata: { purchaseId: purchase.purchaseId, type: 'marketplace' },
    });

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('completed');
  });

  it('does not reopen an expired purchase when a late completed event arrives', async () => {
    const purchase = await startCheckout('Expired then paid');
    await fixture.postStripeEvent('checkout.session.expired', {
      id: purchase.sessionId,
      metadata: { purchaseId: purchase.purchaseId, type: 'marketplace' },
    });

    await complete(purchase);

    expect((await purchaseRow(purchase.purchaseId)).status).toBe('failed');
    expect(await downloadStatus(purchase.purchaseId)).not.toBe(200);
  });

  it('rejects an invalid signature without recording the event', async () => {
    const event = fixture.signedStripeEvent(
      'checkout.session.completed',
      {},
      'evt_bad_signature',
    );

    const response = await fixture.sendRawStripeBody(event.body, 'invalid');

    expect(response.status).toBe(400);
    expect(await eventRows('evt_bad_signature')).toEqual([]);
  });

  it('leaves an event unprocessed when its handling fails so Stripe retries it', async () => {
    const eventId = 'evt_unknown_purchase';

    const response = await fixture.postCheckoutCompleted({
      amountTotal: PRICE,
      eventId,
      purchaseId: 'no-such-purchase',
      sessionId: 'cs_test_unknown',
    });

    expect(response.status).not.toBe(200);
    expect(await eventRows(eventId)).toEqual([{ processedAt: null }]);
  });
});
