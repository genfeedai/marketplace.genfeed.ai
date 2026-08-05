/**
 * Mapping tests for the official packages seed.
 *
 * Pure functions only — no database connection is opened. Fixture-driven cases
 * pin the mapping contract; the final block runs the same mapping over the
 * real installed catalogs to catch upstream package drift.
 */

import { ListingStatus, ListingType, PricingTier } from '@genfeedai/enums';
import type { PromptTemplate } from '@genfeedai/prompts';
import type { WorkflowJson, WorkflowMetadata } from '@genfeedai/workflows';
import { describe, expect, it } from 'vitest';
import {
  buildOfficialSeller,
  buildPromptListings,
  buildWorkflowListings,
  findNonFreeCatalogEntries,
  OFFICIAL_SELLER_SLUG,
  PROMPT_PACKAGE_SOURCE,
  type PromptCatalogSource,
  promptPackageSource,
  resolveOfficialRefs,
  WORKFLOW_PACKAGE_SOURCE,
  type WorkflowCatalogSource,
  workflowPackageSource,
} from '../marketplace-packages.mapping';

const REFS = {
  organizationId: '687514009f59b22a757bcf04',
  sellerId: '6813b131bc7686bf101cb35b',
};

const SEEDED_AT = new Date('2026-01-01T00:00:00.000Z');

const workflowMeta: WorkflowMetadata = {
  category: 'image-generation',
  defaultModel: 'nano-banana-pro',
  description: 'Generate an AI image from a source image',
  icon: '🖼️',
  inputTypes: ['image', 'text'],
  outputTypes: ['image'],
  slug: 'single-image',
  tags: ['image', 'img2img'],
  tier: 'free',
  title: 'Single Image Generation',
  version: 2,
};

const workflowJson = {
  createdAt: '2025-01-01T00:00:00.000Z',
  description: 'Generate an AI image from a source image',
  edgeStyle: 'bezier',
  edges: [
    { id: 'e1', source: 'a', target: 'b' },
    { id: 'e2', source: 'b', target: 'c' },
  ],
  name: 'Single Image Generation',
  nodes: [
    { id: 'a', type: 'imageInput' },
    { id: 'b', type: 'prompt' },
    { id: 'c', type: 'imageInput' },
  ],
  updatedAt: '2025-01-02T00:00:00.000Z',
  version: 3,
} as unknown as WorkflowJson;

const promptTemplate: PromptTemplate = {
  category: 'content',
  description: 'Outline a blog post',
  icon: '📝',
  id: 'blog-outline',
  tags: ['blog', 'writing'],
  template: 'Write an outline about {{topic}}',
  tier: 'free',
  title: 'Blog Outline',
  variables: [
    { label: 'Blog Topic', name: 'topic', required: true, type: 'text' },
  ],
  version: 4,
};

const workflowFixture: WorkflowCatalogSource = {
  list: () => [workflowMeta],
  loadJson: () => workflowJson,
};

const promptFixture: PromptCatalogSource = {
  list: () => [promptTemplate],
  loadJson: () => promptTemplate,
};

describe('buildOfficialSeller', () => {
  it('creates the approved, verified "GenFeed AI" seller', () => {
    const seller = buildOfficialSeller({
      organization: REFS.organizationId,
      user: REFS.sellerId,
    });

    expect(seller).toMatchObject({
      badgeTier: 'verified',
      displayName: 'GenFeed AI',
      isDeleted: false,
      slug: OFFICIAL_SELLER_SLUG,
      status: 'approved',
      website: 'https://genfeed.ai',
    });
    expect(seller.organization).toBe(REFS.organizationId);
    expect(seller.user).toBe(REFS.sellerId);
  });
});

describe('resolveOfficialRefs', () => {
  it('falls back to the production identities', () => {
    const refs = resolveOfficialRefs({});

    expect(refs.user).toBe('6813b131bc7686bf101cb35b');
    expect(refs.organization).toBe('687514009f59b22a757bcf04');
  });

  it('honours environment overrides', () => {
    const refs = resolveOfficialRefs({
      GENFEED_OFFICIAL_ORG_ID: '0000000000000000000000ff',
      GENFEED_OFFICIAL_USER_ID: '0000000000000000000000aa',
    });

    expect(refs.user).toBe('0000000000000000000000aa');
    expect(refs.organization).toBe('0000000000000000000000ff');
  });
});

describe('buildWorkflowListings', () => {
  const [listing] = buildWorkflowListings(REFS, workflowFixture, SEEDED_AT);

  it('maps catalog metadata onto an official published listing', () => {
    expect(listing).toMatchObject({
      canBeSoldSeparately: true,
      currency: 'usd',
      isDeleted: false,
      isOfficial: true,
      packageSlug: 'single-image',
      packageSource: WORKFLOW_PACKAGE_SOURCE,
      price: 0,
      pricingTier: PricingTier.FREE,
      shortDescription: workflowMeta.description,
      slug: `${OFFICIAL_SELLER_SLUG}/single-image`,
      status: ListingStatus.PUBLISHED,
      title: 'Single Image Generation',
      type: ListingType.WORKFLOW,
    });
    expect(listing.publishedAt).toEqual(SEEDED_AT);
  });

  it('references the official seller and organization', () => {
    expect(listing.seller).toBe(REFS.sellerId);
    expect(listing.organization).toBe(REFS.organizationId);
  });

  it('appends category and "official" to the catalog tags', () => {
    expect(listing.tags).toEqual([
      'image',
      'img2img',
      'image-generation',
      'official',
    ]);
  });

  it('summarises the node graph in previewData and de-duplicates node types', () => {
    expect(listing.previewData).toEqual({
      connections: 2,
      nodeTypes: ['imageInput', 'prompt'],
      nodes: 3,
      version: 3,
    });
  });

  it('carries the full workflow JSON as downloadData and versions from it', () => {
    expect(listing.downloadData).toBe(workflowJson);
    expect(listing.version).toBe('3.0.0');
  });

  it('throws when a catalog entry has no workflow JSON', () => {
    expect(() =>
      buildWorkflowListings(
        REFS,
        { list: () => [workflowMeta], loadJson: () => undefined },
        SEEDED_AT,
      ),
    ).toThrow(/single-image/);
  });
});

describe('buildPromptListings', () => {
  const [listing] = buildPromptListings(REFS, promptFixture, SEEDED_AT);

  it('maps prompt metadata onto an official published listing', () => {
    expect(listing).toMatchObject({
      isOfficial: true,
      packageSlug: 'blog-outline',
      packageSource: PROMPT_PACKAGE_SOURCE,
      price: 0,
      pricingTier: PricingTier.FREE,
      slug: `${OFFICIAL_SELLER_SLUG}/blog-outline`,
      status: ListingStatus.PUBLISHED,
      title: 'Blog Outline',
      type: ListingType.PROMPT,
      version: '4.0.0',
    });
  });

  it('exposes template and variable shape in previewData', () => {
    expect(listing.previewData).toEqual({
      category: 'content',
      template: 'Write an outline about {{topic}}',
      variableCount: 1,
      variables: [{ label: 'Blog Topic', name: 'topic', type: 'text' }],
    });
  });

  it('throws when a catalog entry has no prompt JSON', () => {
    expect(() =>
      buildPromptListings(
        REFS,
        { list: () => [promptTemplate], loadJson: () => undefined },
        SEEDED_AT,
      ),
    ).toThrow(/blog-outline/);
  });
});

describe('official pricing override', () => {
  it('forces pricingTier free even when the catalog says otherwise', () => {
    const paid: WorkflowMetadata = { ...workflowMeta, tier: 'premium' };
    const [listing] = buildWorkflowListings(
      REFS,
      { list: () => [paid], loadJson: () => workflowJson },
      SEEDED_AT,
    );

    expect(listing.pricingTier).toBe(PricingTier.FREE);
    expect(listing.price).toBe(0);
  });

  it('reports catalog entries that drift off the free tier', () => {
    expect(findNonFreeCatalogEntries([{ tier: 'free' }])).toEqual([]);
    expect(findNonFreeCatalogEntries([{ tier: 'paid' }])).toHaveLength(1);
  });
});

describe('idempotency', () => {
  it('produces stable slugs across runs so upserts match existing documents', () => {
    const first = buildWorkflowListings(REFS, workflowFixture, new Date());
    const second = buildWorkflowListings(REFS, workflowFixture, new Date());

    expect(first.map((l) => l.slug)).toEqual(second.map((l) => l.slug));
  });
});

describe('installed catalogs', () => {
  const workflows = buildWorkflowListings(
    REFS,
    workflowPackageSource,
    SEEDED_AT,
  );
  const prompts = buildPromptListings(REFS, promptPackageSource, SEEDED_AT);

  it('maps every published workflow and prompt without throwing', () => {
    expect(workflows.length).toBeGreaterThan(0);
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('emits only free, official, published listings', () => {
    for (const listing of [...workflows, ...prompts]) {
      expect(listing.isOfficial).toBe(true);
      expect(listing.pricingTier).toBe(PricingTier.FREE);
      expect(listing.price).toBe(0);
      expect(listing.status).toBe(ListingStatus.PUBLISHED);
    }
  });

  it('namespaces every listing slug under the official seller, uniquely', () => {
    const slugs = [...workflows, ...prompts].map((l) => l.slug);

    for (const slug of slugs) {
      expect(slug.startsWith(`${OFFICIAL_SELLER_SLUG}/`)).toBe(true);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('satisfies the listing schema length constraints', () => {
    for (const listing of [...workflows, ...prompts]) {
      expect(listing.title.length).toBeLessThanOrEqual(200);
      expect(listing.slug.length).toBeLessThanOrEqual(300);
      expect(listing.shortDescription.length).toBeLessThanOrEqual(300);
      expect(listing.description.length).toBeLessThanOrEqual(10000);
    }
  });
});
