import {
  adminUrl,
  type MarketplaceFixture,
  OPERATOR,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let fixture: MarketplaceFixture;
let operator: string;

const LISTING = {
  description: 'Rewrites a prompt with camera terms',
  downloadData: { files: [{ content: '# Skill', path: 'SKILL.md' }] },
  packageSlug: 'cinematic-prompting',
  packageSource: 'genfeedai/skills',
  price: 0,
  shortDescription: 'Cinematic prompts',
  title: 'Cinematic prompting',
  type: 'skill',
};

describe.skipIf(!adminUrl)('official listings keyed by their source', () => {
  beforeAll(async () => {
    fixture = await startMarketplaceFixture();
    operator = await fixture.token(OPERATOR.user, OPERATOR.organization, true);
    const profile = await fixture.request('/seller/profile', operator, {
      displayName: 'Genfeed Official',
    });
    expect(profile.status).toBe(201);
  });
  afterAll(async () => {
    await fixture?.stop();
  });

  it('stores the source key and lets the operator find the listing by it', async () => {
    const created = await fixture.request(
      '/seller/listings',
      operator,
      LISTING,
    );
    expect(created.status).toBe(201);

    const found = await fixture.request(
      '/admin/marketplace/listings?packageSource=genfeedai%2Fskills&packageSlug=cinematic-prompting',
      operator,
    );
    const body = await found.json();

    expect(
      body.data.map(
        (listing: { attributes: Record<string, unknown> }) =>
          listing.attributes,
      ),
    ).toMatchObject([
      {
        downloadData: LISTING.downloadData,
        packageSlug: 'cinematic-prompting',
        packageSource: 'genfeedai/skills',
        status: 'draft',
      },
    ]);
  });

  it('finds nothing for a key that was never synced', async () => {
    const found = await fixture.request(
      '/admin/marketplace/listings?packageSource=genfeedai%2Fskills&packageSlug=missing',
      operator,
    );

    expect((await found.json()).data).toEqual([]);
  });

  it('keeps one listing per source key', async () => {
    const again = await fixture.request('/seller/listings', operator, LISTING);

    expect(again.status).toBe(409);
    expect(
      await fixture.sql(
        'SELECT id FROM listings WHERE "packageSlug" = \'cinematic-prompting\'',
      ),
    ).toHaveLength(1);
  });
});
