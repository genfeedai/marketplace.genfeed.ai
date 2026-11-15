import {
  adminUrl,
  type MarketplaceFixture,
  startMarketplaceFixture,
  UUID_PATTERN,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let fixture: MarketplaceFixture;
let sellerToken: string;
let buyerToken: string;
let operatorToken: string;
let wrongOrganizationToken: string;
let listingId: string;
let purchaseId: string;
const suffix = Date.now().toString(36);

const request = (path: string, token?: string, body?: unknown) =>
  fixture.request(path, token, body);

describe.skipIf(!adminUrl)(
  'signed identity and real PostgreSQL marketplace journey',
  () => {
    beforeAll(async () => {
      fixture = await startMarketplaceFixture();
      sellerToken = await fixture.token('seller-opaque', 'seller-org');
      buyerToken = await fixture.token('buyer-opaque', 'buyer-org');
      operatorToken = await fixture.token(
        'operator-opaque',
        'seller-org',
        true,
      );
      wrongOrganizationToken = await fixture.token(
        'buyer-opaque',
        'unrelated-org',
      );
    });
    afterAll(async () => {
      await fixture?.stop();
    });

    it('creates a seller and listing without allowing client-supplied identity', async () => {
      const invalid = await request('/seller/profile', sellerToken, {
        displayName: 'Seller',
        organization: 'unrelated-org',
      });
      expect(invalid.status).toBe(400);
      const profile = await request('/seller/profile', sellerToken, {
        displayName: `Contract Seller ${suffix}`,
      });
      expect(profile.status).toBe(201);
      const response = await request('/seller/listings', sellerToken, {
        title: 'Test Workflow',
        type: 'workflow',
        shortDescription: 'A free workflow',
        description: 'Integration contract',
        price: 0,
        downloadData: { workflow: { nodes: [] } },
      });
      expect(response.status).toBe(201);
      listingId = (await response.json()).data.id;
      expect(listingId).toMatch(UUID_PATTERN);
      const created = await request(
        `/seller/listings/${listingId}`,
        sellerToken,
      );
      const createdBody = await created.json();
      expect(createdBody.data.attributes.organization).toBe('seller-org');
      expect(createdBody.data.id).toBe(listingId);
      expect(JSON.stringify(createdBody)).not.toContain('"_id"');
    });

    it('requires operator authority to approve a listing and hides download payloads publicly', async () => {
      const submitted = await request(
        `/seller/listings/${listingId}/submit`,
        sellerToken,
        {},
      );
      expect(submitted.status).toBe(201);
      const unauthorized = await request(
        `/admin/marketplace/listings/${listingId}/approve`,
        sellerToken,
        {},
      );
      expect(unauthorized.status).toBe(403);
      const approved = await request(
        `/admin/marketplace/listings/${listingId}/approve`,
        operatorToken,
        {},
      );
      expect(approved.status).toBe(201);
      const catalog = await request('/marketplace/listings?type=workflow');
      expect(catalog.status).toBe(200);
      const data = (await catalog.json()).data;
      expect(data).toHaveLength(1);
      expect(data[0].attributes.downloadData).toBeUndefined();
      expect((await request(`/marketplace/listings/${listingId}`)).status).toBe(
        200,
      );
    });

    it('claims a free listing and exposes the purchase only to its buyer organization', async () => {
      const claim = await request(
        `/marketplace/listings/${listingId}/claim`,
        buyerToken,
        {},
      );
      expect(claim.status).toBe(201);
      const claimBody = await claim.json();
      purchaseId = claimBody.data.id;
      expect(purchaseId).toMatch(UUID_PATTERN);
      expect(JSON.stringify(claimBody)).not.toContain('"_id"');
      const library = await request('/marketplace/purchases', buyerToken);
      const libraryBody = await library.json();
      expect(libraryBody.data).toHaveLength(1);
      expect(JSON.stringify(libraryBody)).not.toContain('"_id"');
      expect(
        (await request('/marketplace/purchases', wrongOrganizationToken))
          .status,
      ).toBe(200);
      expect(
        (
          await (
            await request('/marketplace/purchases', wrongOrganizationToken)
          ).json()
        ).data,
      ).toHaveLength(0);
      const download = await request(
        `/marketplace/purchases/${purchaseId}/download-data`,
        buyerToken,
      );
      expect(download.status).toBe(200);
      expect((await download.json()).data.attributes.downloadData).toEqual({
        workflow: { nodes: [] },
      });
      expect(
        (
          await request(
            `/marketplace/purchases/${purchaseId}/download-data`,
            wrongOrganizationToken,
          )
        ).status,
      ).toBe(404);
      expect(
        (await request(`/marketplace/purchases/${purchaseId}/download-data`))
          .status,
      ).toBe(401);
      expect(
        (await request(`/marketplace/checkout/unrelated-session`, buyerToken))
          .status,
      ).toBe(404);
      expect(
        (
          await request(
            `/marketplace/listings/${listingId}/checkout`,
            buyerToken,
            { successUrl: 'https://attacker.example/success' },
          )
        ).status,
      ).toBe(400);
    });
  },
);
