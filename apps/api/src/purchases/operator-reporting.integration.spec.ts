import {
  adminUrl,
  type MarketplaceFixture,
  OPERATOR,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const WORKFLOW = { workflow: { nodes: ['operator-reporting'] } };

describe.skipIf(!adminUrl)(
  'operator sales reporting against real PostgreSQL',
  () => {
    let fixture: MarketplaceFixture;
    let operatorToken: string;
    let purchaseIds: string[];

    beforeAll(async () => {
      fixture = await startMarketplaceFixture();
      operatorToken = await fixture.token(
        OPERATOR.user,
        OPERATOR.organization,
        true,
      );
      const listing = await fixture.publishListing({
        title: 'Reported Sale',
        price: 2000,
        downloadData: WORKFLOW,
      });
      purchaseIds = [];
      for (const organization of ['buyer-org-one', 'buyer-org-two']) {
        const buyer = await fixture.token(
          `buyer-of-${organization}`,
          organization,
        );
        const checkout = await fixture.startCheckout(buyer, listing.id);
        await fixture.postCheckoutCompleted({
          amountTotal: 2000,
          purchaseId: checkout.purchaseId,
          sessionId: checkout.sessionId,
        });
        purchaseIds.push(checkout.purchaseId);
      }
    });
    afterAll(async () => {
      await fixture?.stop();
    });

    it('lists purchases from every buyer organization for the operator', async () => {
      const response = await fixture.request(
        '/admin/marketplace/purchases',
        operatorToken,
      );

      expect(response.status).toBe(200);
      const ids: string[] = (await response.json()).data.map(
        (purchase: { id: string }) => purchase.id,
      );
      expect(ids.sort()).toEqual([...purchaseIds].sort());
    });

    it('opens a purchase made from another organization', async () => {
      const response = await fixture.request(
        `/admin/marketplace/purchases/${purchaseIds[0]}`,
        operatorToken,
      );

      expect(response.status).toBe(200);
      expect((await response.json()).data.id).toBe(purchaseIds[0]);
    });

    it('counts sales from every buyer organization in the analytics', async () => {
      const response = await fixture.request(
        '/admin/marketplace/analytics/overview',
        operatorToken,
      );

      expect(response.status).toBe(200);
      expect((await response.json()).data.attributes).toMatchObject({
        completedOrders: 2,
        totalRevenue: 4000,
        totalSales: 2,
      });
    });

    it('still refuses a user without the platform operator claim', async () => {
      const ordinary = await fixture.token(
        OPERATOR.user,
        OPERATOR.organization,
      );

      for (const path of [
        '/admin/marketplace/purchases',
        '/admin/marketplace/analytics/overview',
        '/admin/marketplace/payouts',
      ]) {
        expect((await fixture.request(path, ordinary)).status).toBe(403);
      }
    });
  },
);
