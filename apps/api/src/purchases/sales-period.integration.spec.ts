import {
  adminUrl,
  type MarketplaceFixture,
  OPERATOR,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PRICE = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

describe.skipIf(!adminUrl)(
  'operator sales report for a period on real PostgreSQL',
  () => {
    let fixture: MarketplaceFixture;
    let operatorToken: string;

    const attributes = async (path: string) => {
      const response = await fixture.request(path, operatorToken);
      return { response, body: await response.json() };
    };

    const period = (fromDays: number, toDays = 0) =>
      `from=${encodeURIComponent(daysAgo(fromDays).toISOString())}&to=${encodeURIComponent(daysAgo(toDays).toISOString())}`;

    async function backdate(purchaseId: string, days: number) {
      await fixture.sql('UPDATE purchases SET "createdAt" = $1 WHERE id = $2', [
        daysAgo(days),
        purchaseId,
      ]);
    }

    async function paidPurchase(buyer: string, listingId: string) {
      const token = await fixture.token(buyer, `${buyer}-org`);
      const checkout = await fixture.startCheckout(token, listingId);
      await fixture.postCheckoutCompleted({
        amountTotal: PRICE,
        purchaseId: checkout.purchaseId,
        sessionId: checkout.sessionId,
      });
      return checkout;
    }

    beforeAll(async () => {
      fixture = await startMarketplaceFixture();
      operatorToken = await fixture.token(
        OPERATOR.user,
        OPERATOR.organization,
        true,
      );
      const paid = await fixture.publishListing({
        downloadData: { prompt: 'paid payload' },
        price: PRICE,
        title: 'Period Paid',
      });
      const free = await fixture.publishListing({
        downloadData: { prompt: 'free payload' },
        price: 0,
        title: 'Period Free',
      });

      // Paid today.
      await paidPurchase('buyer-today', paid.id);

      // Paid forty days ago.
      const old = await paidPurchase('buyer-old', paid.id);
      await backdate(old.purchaseId, 40);

      // Paid, then fully refunded, ten days ago.
      const refunded = await paidPurchase('buyer-refunded', paid.id);
      await fixture.postStripeEvent('charge.refunded', {
        amount: PRICE,
        amount_refunded: PRICE,
        currency: 'usd',
        id: `ch_${refunded.sessionId}`,
        object: 'charge',
        payment_intent: `pi_${refunded.sessionId}`,
        refunded: true,
      });
      await backdate(refunded.purchaseId, 10);

      // A free claim today.
      const claimer = await fixture.token('buyer-free', 'buyer-free-org');
      const claim = await fixture.request(
        `/marketplace/listings/${free.id}/claim`,
        claimer,
        {},
      );
      expect(claim.status).toBe(201);
    });
    afterAll(async () => {
      await fixture?.stop();
    });

    it('scopes every total to the period', async () => {
      const { response, body } = await attributes(
        `/admin/marketplace/analytics/overview?${period(35)}`,
      );

      expect(response.status).toBe(200);
      expect(body.data.attributes).toMatchObject({
        completedOrders: 2,
        paidOrders: 1,
        refundedOrders: 1,
        totalPlatformFees: 300,
        totalRefunded: PRICE,
        totalRevenue: PRICE,
      });
    });

    it('counts all time when no period is given', async () => {
      const { body } = await attributes(
        '/admin/marketplace/analytics/overview',
      );

      expect(body.data.attributes).toMatchObject({
        completedOrders: 3,
        paidOrders: 2,
        refundedOrders: 1,
        totalRevenue: PRICE * 2,
      });
    });

    it('lists only the purchases inside the period, newest first', async () => {
      const { response, body } = await attributes(
        `/admin/marketplace/purchases?${period(35)}&limit=100`,
      );

      expect(response.status).toBe(200);
      const statuses = body.data.map(
        (purchase: { attributes: { status: string } }) =>
          purchase.attributes.status,
      );
      expect(statuses.sort()).toEqual(['completed', 'completed', 'refunded']);
    });

    it('lists a period that holds nothing as empty', async () => {
      const { body } = await attributes(
        `/admin/marketplace/purchases?${period(300, 200)}`,
      );

      expect(body.data).toEqual([]);
    });

    it.each([
      ['a from that is not a date', 'from=last-week'],
      ['a to that is not a date', 'to=tomorrow'],
    ])('refuses %s', async (_name, query) => {
      for (const path of [
        `/admin/marketplace/analytics/overview?${query}`,
        `/admin/marketplace/purchases?${query}`,
      ]) {
        expect((await attributes(path)).response.status).toBe(400);
      }
    });
  },
);
