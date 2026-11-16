import {
  adminUrl,
  type MarketplaceFixture,
  OPERATOR,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PRICE = 2000;

describe.skipIf(!adminUrl)(
  'sales analytics count money by purchase status on real PostgreSQL',
  () => {
    let fixture: MarketplaceFixture;
    let operatorToken: string;

    async function startCheckout(buyer: string, listingId: string) {
      const token = await fixture.token(buyer, `${buyer}-org`);
      return fixture.startCheckout(token, listingId);
    }

    async function pay(checkout: { purchaseId: string; sessionId: string }) {
      await fixture.postCheckoutCompleted({
        amountTotal: PRICE,
        purchaseId: checkout.purchaseId,
        sessionId: checkout.sessionId,
      });
    }

    beforeAll(async () => {
      fixture = await startMarketplaceFixture();
      operatorToken = await fixture.token(
        OPERATOR.user,
        OPERATOR.organization,
        true,
      );
      const listing = await fixture.publishListing({
        downloadData: { prompt: 'analytics payload' },
        price: PRICE,
        title: 'Counted Once',
      });

      // One paid sale.
      await pay(await startCheckout('buyer-paid', listing.id));

      // One sale paid and then fully refunded.
      const refunded = await startCheckout('buyer-refunded', listing.id);
      await pay(refunded);
      await fixture.postStripeEvent('charge.refunded', {
        amount: PRICE,
        amount_refunded: PRICE,
        currency: 'usd',
        id: `ch_${refunded.sessionId}`,
        object: 'charge',
        payment_intent: `pi_${refunded.sessionId}`,
        refunded: true,
      });

      // One checkout that expired without payment.
      const expired = await startCheckout('buyer-expired', listing.id);
      await fixture.postStripeEvent('checkout.session.expired', {
        id: expired.sessionId,
        metadata: { purchaseId: expired.purchaseId, type: 'marketplace' },
      });

      // One checkout still open.
      await startCheckout('buyer-open', listing.id);
    });
    afterAll(async () => {
      await fixture?.stop();
    });

    it('reports only the paid sale as operator revenue, and the refund on its own', async () => {
      const response = await fixture.request(
        '/admin/marketplace/analytics/overview',
        operatorToken,
      );

      expect(response.status).toBe(200);
      expect((await response.json()).data.attributes).toMatchObject({
        completedOrders: 1,
        failedOrders: 1,
        pendingOrders: 1,
        refundedOrders: 1,
        totalPlatformFees: 300,
        totalRefunded: 2000,
        totalRevenue: 2000,
        totalSales: 1,
        totalSellerEarnings: 1700,
      });
    });

    it('reports only the paid sale to the seller', async () => {
      const response = await fixture.request(
        '/marketplace/seller/analytics',
        operatorToken,
      );

      expect(response.status).toBe(200);
      expect((await response.json()).data.attributes).toMatchObject({
        completedOrders: 1,
        pendingOrders: 1,
        totalEarnings: 1700,
        totalPlatformFees: 300,
        totalRevenue: 2000,
        totalSales: 1,
      });
    });
  },
);
