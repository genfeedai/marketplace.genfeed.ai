import {
  adminUrl,
  type MarketplaceFixture,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface PurchaseRow {
  status: string;
  total: number;
  currency: string;
  platformFee: number;
  sellerEarnings: number;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
}

const WORKFLOW = { workflow: { nodes: ['paid-node'] } };

describe.skipIf(!adminUrl)('paid checkout against real PostgreSQL', () => {
  let fixture: MarketplaceFixture;
  let buyerToken: string;

  const purchaseRow = async (purchaseId: string) =>
    (
      await fixture.sql<PurchaseRow>(
        `SELECT status, total, currency, "platformFee", "sellerEarnings",
                "stripeSessionId", "stripePaymentIntentId"
           FROM purchases WHERE id = $1`,
        [purchaseId],
      )
    )[0];

  beforeAll(async () => {
    fixture = await startMarketplaceFixture();
    buyerToken = await fixture.token('buyer-opaque', 'buyer-org');
  });
  afterAll(async () => {
    await fixture?.stop();
  });

  it('prices a pending purchase from the listing and splits the commission', async () => {
    const listing = await fixture.publishListing({
      title: 'Priced Workflow',
      price: 2000,
      downloadData: WORKFLOW,
    });

    const { purchaseId, sessionId } = await fixture.startCheckout(
      buyerToken,
      listing.id,
    );

    expect(await purchaseRow(purchaseId)).toEqual({
      status: 'pending',
      total: 2000,
      currency: 'usd',
      platformFee: 300,
      sellerEarnings: 1700,
      stripeSessionId: sessionId,
      stripePaymentIntentId: null,
    });
  });

  it('keeps an unpaid purchase out of the library and refuses its download', async () => {
    const listing = await fixture.publishListing({
      title: 'Unpaid Workflow',
      price: 1500,
      downloadData: WORKFLOW,
    });
    const { purchaseId } = await fixture.startCheckout(buyerToken, listing.id);

    const download = await fixture.request(
      `/marketplace/purchases/${purchaseId}/download-data`,
      buyerToken,
    );
    const library = await (
      await fixture.request(
        '/marketplace/purchases?status=completed',
        buyerToken,
      )
    ).json();

    expect(download.status).toBe(404);
    expect(library.data.map((entry: { id: string }) => entry.id)).not.toContain(
      purchaseId,
    );
  });

  it('completes the purchase on a signed checkout.session.completed event and lets the buyer download', async () => {
    const listing = await fixture.publishListing({
      title: 'Paid Workflow',
      price: 2500,
      downloadData: WORKFLOW,
    });
    const { purchaseId, sessionId } = await fixture.startCheckout(
      buyerToken,
      listing.id,
    );

    const webhook = await fixture.postCheckoutCompleted({
      sessionId,
      purchaseId,
      amountTotal: 2500,
      paymentIntent: 'pi_paid_workflow',
    });
    const download = await fixture.request(
      `/marketplace/purchases/${purchaseId}/download-data`,
      buyerToken,
    );
    const library = await (
      await fixture.request(
        '/marketplace/purchases?status=completed',
        buyerToken,
      )
    ).json();

    expect(webhook.status).toBe(200);
    expect(await purchaseRow(purchaseId)).toEqual({
      status: 'completed',
      total: 2500,
      currency: 'usd',
      platformFee: 375,
      sellerEarnings: 2125,
      stripeSessionId: sessionId,
      stripePaymentIntentId: 'pi_paid_workflow',
    });
    expect(download.status).toBe(200);
    expect((await download.json()).data.attributes.downloadData).toEqual(
      WORKFLOW,
    );
    expect(library.data.map((entry: { id: string }) => entry.id)).toContain(
      purchaseId,
    );
  });

  it('counts the sale on the listing once it is paid', async () => {
    const listing = await fixture.publishListing({
      title: 'Counted Workflow',
      price: 1000,
      downloadData: WORKFLOW,
    });
    const { purchaseId, sessionId } = await fixture.startCheckout(
      buyerToken,
      listing.id,
    );

    await fixture.postCheckoutCompleted({
      sessionId,
      purchaseId,
      amountTotal: 1000,
    });

    expect(
      await fixture.sql(
        'SELECT purchases, revenue FROM listings WHERE id = $1',
        [listing.id],
      ),
    ).toEqual([{ purchases: 1, revenue: 1000 }]);
  });

  it('does not complete a purchase from a webhook with a forged signature', async () => {
    const listing = await fixture.publishListing({
      title: 'Forged Workflow',
      price: 1200,
      downloadData: WORKFLOW,
    });
    const { purchaseId, sessionId } = await fixture.startCheckout(
      buyerToken,
      listing.id,
    );
    const event = fixture.signedStripeEvent('checkout.session.completed', {
      id: sessionId,
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 1200,
      currency: 'usd',
      metadata: { type: 'marketplace', purchaseId },
    });

    const response = await fixture.sendRawStripeBody(
      event.body,
      'a-forged-signature',
    );

    expect(response.status).toBe(400);
    expect((await purchaseRow(purchaseId)).status).toBe('pending');
  });

  it('refuses a second checkout once the buyer owns the item', async () => {
    const listing = await fixture.publishListing({
      title: 'Owned Workflow',
      price: 900,
      downloadData: WORKFLOW,
    });
    const { purchaseId, sessionId } = await fixture.startCheckout(
      buyerToken,
      listing.id,
    );
    await fixture.postCheckoutCompleted({
      sessionId,
      purchaseId,
      amountTotal: 900,
    });

    const again = await fixture.request(
      `/marketplace/listings/${listing.id}/checkout`,
      buyerToken,
      {},
    );

    expect(again.status).toBe(400);
    expect(
      await fixture.sql(
        'SELECT count(*)::int AS purchases FROM purchases WHERE listing = $1',
        [listing.id],
      ),
    ).toEqual([{ purchases: 1 }]);
  });

  it('sends a free listing to the claim endpoint and creates no purchase', async () => {
    const listing = await fixture.publishListing({
      title: 'Free Workflow',
      price: 0,
      downloadData: WORKFLOW,
    });

    const response = await fixture.request(
      `/marketplace/listings/${listing.id}/checkout`,
      buyerToken,
      {},
    );

    expect(response.status).toBe(400);
    expect(
      await fixture.sql(
        'SELECT count(*)::int AS purchases FROM purchases WHERE listing = $1',
        [listing.id],
      ),
    ).toEqual([{ purchases: 0 }]);
  });
});
