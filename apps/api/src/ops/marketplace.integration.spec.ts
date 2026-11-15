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

    it('creates a seller and listing as the platform operator without allowing client-supplied identity', async () => {
      const invalid = await request('/seller/profile', operatorToken, {
        displayName: 'Seller',
        organization: 'unrelated-org',
      });
      expect(invalid.status).toBe(400);
      const profile = await request('/seller/profile', operatorToken, {
        displayName: `Contract Seller ${suffix}`,
      });
      expect(profile.status).toBe(201);
      const response = await request('/seller/listings', operatorToken, {
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
        operatorToken,
      );
      const createdBody = await created.json();
      expect(createdBody.data.attributes.organization).toBe('seller-org');
      expect(createdBody.data.id).toBe(listingId);
      expect(JSON.stringify(createdBody)).not.toContain('"_id"');
    });

    it('requires operator authority to approve a listing and hides download payloads publicly', async () => {
      const submitted = await request(
        `/seller/listings/${listingId}/submit`,
        operatorToken,
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
      const install = await request(
        `/marketplace/purchases/by-listing/${listingId}/install-data`,
        buyerToken,
      );
      expect(install.status).toBe(200);
      const installBody = await install.json();
      expect(installBody.data).toEqual({
        attributes: {
          downloadData: { workflow: { nodes: [] } },
          listingId,
          title: 'Test Workflow',
          type: 'workflow',
        },
        id: purchaseId,
        type: 'install-data',
      });
      // A buyer in another organization, a user with no purchase and a
      // caller with no token never receive the payload.
      const otherOrganization = await request(
        `/marketplace/purchases/by-listing/${listingId}/install-data`,
        wrongOrganizationToken,
      );
      expect(otherOrganization.status).toBe(403);
      expect(JSON.stringify(await otherOrganization.json())).not.toContain(
        'nodes',
      );
      expect(
        (
          await request(
            `/marketplace/purchases/by-listing/${listingId}/install-data`,
            sellerToken,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await request(
            `/marketplace/purchases/by-listing/${listingId}/install-data`,
          )
        ).status,
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

    async function publishListing(body: Record<string, unknown>) {
      const created = await request('/seller/listings', sellerToken, body);
      expect(created.status).toBe(201);
      const id: string = (await created.json()).data.id;
      expect(
        (await request(`/seller/listings/${id}/submit`, sellerToken, {}))
          .status,
      ).toBe(201);
      expect(
        (
          await request(
            `/admin/marketplace/listings/${id}/approve`,
            operatorToken,
            {},
          )
        ).status,
      ).toBe(201);
      return id;
    }

    it('claims a free skill and downloads its files', async () => {
      const files = [
        {
          path: 'SKILL.md',
          content: '---\nname: x-thread\n---\nWrite an X thread.',
        },
      ];
      const skillId = await publishListing({
        title: 'X Thread',
        type: 'skill',
        shortDescription: 'Write an X thread',
        description: 'Open-source skill from genfeedai/skills',
        price: 0,
        downloadData: {
          slug: 'x-thread',
          description: 'Write a thread',
          files,
        },
      });
      const claim = await request(
        `/marketplace/listings/${skillId}/claim`,
        buyerToken,
        {},
      );
      expect(claim.status).toBe(201);
      const skillPurchaseId = (await claim.json()).data.id;
      const download = await request(
        `/marketplace/purchases/${skillPurchaseId}/download-data`,
        buyerToken,
      );
      expect(download.status).toBe(200);
      expect((await download.json()).data.attributes.downloadData).toEqual({
        slug: 'x-thread',
        description: 'Write a thread',
        files,
      });
    });

    it('lists the Skills Pro bundle but never sells or claims it in the store', async () => {
      const bundleId = await publishListing({
        title: 'Skills Pro Bundle',
        type: 'skill',
        shortDescription: 'All Skills Pro packs',
        description: 'Delivered by receipt.',
        price: 4900,
        previewData: {
          externalCheckout: { provider: 'skills-pro' },
          packs: [{ slug: 'x-warmup-pro', name: 'X Warmup Pro' }],
        },
      });
      const listed = await request(`/marketplace/listings/${bundleId}`);
      expect(listed.status).toBe(200);
      const attributes = (await listed.json()).data.attributes;
      expect(attributes.price).toBe(4900);
      expect(attributes.previewData.externalCheckout.provider).toBe(
        'skills-pro',
      );
      const before = (
        await (await request('/marketplace/purchases', buyerToken)).json()
      ).data.length;
      const checkout = await request(
        `/marketplace/listings/${bundleId}/checkout`,
        buyerToken,
        {},
      );
      expect(checkout.status).toBe(400);
      expect((await checkout.json()).message).toContain('bought on Genfeed');
      const claim = await request(
        `/marketplace/listings/${bundleId}/claim`,
        buyerToken,
        {},
      );
      expect(claim.status).toBe(400);
      const after = (
        await (await request('/marketplace/purchases', buyerToken)).json()
      ).data.length;
      expect(after).toBe(before);
    });
  },
);
