import {
  adminUrl,
  type MarketplaceFixture,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const STRIPE_ROUTES = [
  ['POST', '/seller/stripe/connect'],
  ['GET', '/seller/stripe/status'],
  ['GET', '/seller/stripe/dashboard'],
  ['GET', '/seller/stripe/balance'],
  ['GET', '/seller/stripe/payouts'],
] as const;

let fixture: MarketplaceFixture;
let userToken: string;
let operatorToken: string;

const LISTING = {
  title: 'Gate Workflow',
  type: 'workflow',
  shortDescription: 'A workflow',
  description: 'Seller gate test',
  price: 0,
  downloadData: { workflow: { nodes: [] } },
};

describe.skipIf(!adminUrl)('only a superadmin can sell', () => {
  beforeAll(async () => {
    fixture = await startMarketplaceFixture();
    userToken = await fixture.token('ordinary-user', 'ordinary-org');
    operatorToken = await fixture.token('operator', 'operator-org', true);
  });
  afterAll(async () => {
    await fixture?.stop();
  });

  it('refuses a seller profile to a user without the superadmin claim', async () => {
    const response = await fixture.request('/seller/profile', userToken, {
      displayName: 'Ordinary Seller',
    });

    expect(response.status).toBe(403);
    expect(await fixture.sql('SELECT id FROM sellers')).toEqual([]);
  });

  it('tells a user without the superadmin claim they cannot sell', async () => {
    const eligibility = await fixture.request('/seller/eligibility', userToken);

    expect((await eligibility.json()).data.attributes).toEqual({
      eligible: false,
      reason: 'Only the Genfeed official seller can sell',
    });
  });

  it.each(
    STRIPE_ROUTES,
  )('refuses %s %s to a user without the superadmin claim', async (method, path) => {
    const response = await fixture.request(
      path,
      userToken,
      method === 'POST' ? {} : undefined,
    );

    expect(response.status).toBe(403);
  });

  it('refuses listing creation and submission without the superadmin claim', async () => {
    const created = await fixture.request(
      '/seller/listings',
      userToken,
      LISTING,
    );
    const submitted = await fixture.request(
      '/seller/listings/00000000-0000-4000-8000-000000000000/submit',
      userToken,
      {},
    );

    expect(created.status).toBe(403);
    expect(submitted.status).toBe(403);
    expect(await fixture.sql('SELECT id FROM listings')).toEqual([]);
  });

  it('lets a superadmin create the Genfeed seller and run the submit and approve flow', async () => {
    const profile = await fixture.request('/seller/profile', operatorToken, {
      displayName: 'Genfeed Official',
    });
    const created = await fixture.request(
      '/seller/listings',
      operatorToken,
      LISTING,
    );
    const listingId: string = (await created.json()).data.id;
    const submitted = await fixture.request(
      `/seller/listings/${listingId}/submit`,
      operatorToken,
      {},
    );
    const approved = await fixture.request(
      `/admin/marketplace/listings/${listingId}/approve`,
      operatorToken,
      {},
    );
    const catalog = await fixture.request(
      '/marketplace/listings?type=workflow',
    );

    expect([
      profile.status,
      created.status,
      submitted.status,
      approved.status,
    ]).toEqual([201, 201, 201, 201]);
    expect(
      (await catalog.json()).data.map((listing: { id: string }) => listing.id),
    ).toEqual([listingId]);
    expect(await fixture.sql('SELECT status FROM listings')).toEqual([
      { status: 'published' },
    ]);
  });

  it('refuses a second profile to the superadmin who already has one', async () => {
    const response = await fixture.request('/seller/profile', operatorToken, {
      displayName: 'Second Profile',
    });

    expect(response.status).toBe(400);
  });
});
