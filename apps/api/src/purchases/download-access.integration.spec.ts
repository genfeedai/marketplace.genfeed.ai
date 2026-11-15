import {
  adminUrl,
  type MarketplaceFixture,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const WORKFLOW = { workflow: { nodes: ['payload-only-for-buyers'] } };

describe.skipIf(!adminUrl)(
  'buyer-only downloads against real PostgreSQL',
  () => {
    let fixture: MarketplaceFixture;
    let buyerToken: string;
    let sameOrganizationToken: string;
    let otherOrganizationToken: string;
    let purchaseId: string;
    let listingId: string;

    beforeAll(async () => {
      fixture = await startMarketplaceFixture();
      buyerToken = await fixture.token('buyer-opaque', 'buyer-org');
      sameOrganizationToken = await fixture.token(
        'colleague-opaque',
        'buyer-org',
      );
      otherOrganizationToken = await fixture.token('buyer-opaque', 'other-org');
      const listing = await fixture.publishListing({
        title: 'Members Only',
        price: 1800,
        downloadData: WORKFLOW,
      });
      listingId = listing.id;
      const checkout = await fixture.startCheckout(buyerToken, listing.id);
      purchaseId = checkout.purchaseId;
      await fixture.postCheckoutCompleted({
        sessionId: checkout.sessionId,
        purchaseId,
        amountTotal: 1800,
      });
    });
    afterAll(async () => {
      await fixture?.stop();
    });

    const download = (token?: string) =>
      fixture.request(
        `/marketplace/purchases/${purchaseId}/download-data`,
        token,
      );

    it('gives the paying buyer the download payload', async () => {
      const response = await download(buyerToken);

      expect(response.status).toBe(200);
      expect((await response.json()).data.attributes.downloadData).toEqual(
        WORKFLOW,
      );
    });

    it('counts a download only for the buyer', async () => {
      await fixture.request(
        `/marketplace/purchases/${purchaseId}/download`,
        buyerToken,
      );
      await fixture.request(
        `/marketplace/purchases/${purchaseId}/download`,
        sameOrganizationToken,
      );

      expect(
        await fixture.sql(
          'SELECT "downloadCount" FROM purchases WHERE id = $1',
          [purchaseId],
        ),
      ).toEqual([{ downloadCount: 1 }]);
    });

    it('refuses a colleague in the same organization', async () => {
      expect((await download(sameOrganizationToken)).status).toBe(404);
    });

    it('refuses the same user acting in another organization', async () => {
      expect((await download(otherOrganizationToken)).status).toBe(404);
    });

    it('refuses a request with no token', async () => {
      expect((await download()).status).toBe(401);
    });

    it('refuses the platform operator, who is not the buyer', async () => {
      const operatorToken = await fixture.token(
        'operator-opaque',
        'buyer-org',
        true,
      );

      expect((await download(operatorToken)).status).toBe(404);
    });

    it('hides the purchase record itself from everyone but the buyer', async () => {
      const response = await fixture.request(
        `/marketplace/purchases/${purchaseId}`,
        sameOrganizationToken,
      );

      expect(response.status).toBe(404);
    });

    it('never puts the download payload on the public listing', async () => {
      const response = await fixture.request(
        `/marketplace/listings/${listingId}`,
      );

      expect(JSON.stringify(await response.json())).not.toContain(
        'payload-only-for-buyers',
      );
    });

    it('refuses the download of a purchase the buyer has not paid for', async () => {
      const unpaid = await fixture.publishListing({
        title: 'Not Yet Paid',
        price: 700,
        downloadData: WORKFLOW,
      });
      const checkout = await fixture.startCheckout(buyerToken, unpaid.id);

      const response = await fixture.request(
        `/marketplace/purchases/${checkout.purchaseId}/download`,
        buyerToken,
      );

      expect(response.status).toBe(404);
    });
  },
);
