/**
 * Marketplace Packages — Catalog → Listing Mapping
 *
 * Pure mapping layer between the official GenFeed package catalogs
 * (`@genfeedai/workflows`, `@genfeedai/prompts`) and marketplace documents.
 *
 * Kept free of database access so the mapping can be unit tested without a
 * live MongoDB connection. All I/O lives in `marketplace-packages.seed.ts`.
 */

import { createRequire } from 'node:module';
import {
  ListingStatus,
  ListingType,
  PricingTier,
  SellerBadgeTier,
  SellerStatus,
} from '@genfeedai/enums';
import {
  getAllPrompts,
  getPrompt,
  type PromptTemplate,
} from '@genfeedai/prompts';
import {
  getAllWorkflows,
  type WorkflowJson,
  type WorkflowMetadata,
} from '@genfeedai/workflows';
import { ObjectId } from 'mongodb';

// ============================================================================
// CONSTANTS
// ============================================================================

export const SELLER_COLLECTION = 'sellers';
export const LISTING_COLLECTION = 'listings';

export const OFFICIAL_SELLER_SLUG = 'genfeed-official';

export const WORKFLOW_PACKAGE_SOURCE = '@genfeedai/workflows';
export const PROMPT_PACKAGE_SOURCE = '@genfeedai/prompts';

/**
 * Deterministic placeholder used only in dry-run mode, where the seller is
 * never written and therefore has no real `_id` to reference.
 */
export const DRY_RUN_SELLER_ID = new ObjectId('000000000000000000000001');

/**
 * Production identities for the official seller, carried over from the
 * original genfeed.ai seed so re-runs stay idempotent against already-seeded
 * data. Overridable for non-production databases.
 */
const DEFAULT_OFFICIAL_USER_ID = '6813b131bc7686bf101cb35b';
const DEFAULT_OFFICIAL_ORG_ID = '687514009f59b22a757bcf04';

export const SELLER_FIELDS_TO_CHECK = [
  'displayName',
  'bio',
  'avatar',
  'website',
  'social',
  'badgeTier',
  'status',
  'isDeleted',
];

export const LISTING_FIELDS_TO_CHECK = [
  'title',
  'shortDescription',
  'description',
  'price',
  'tags',
  'previewData',
  'downloadData',
  'version',
  'pricingTier',
  'isOfficial',
  'packageSource',
  'packageSlug',
  'isDeleted',
];

// ============================================================================
// TYPES
// ============================================================================

export interface OfficialRefs {
  sellerId: ObjectId;
  organizationId: ObjectId;
}

export interface SellerDocument {
  slug: string;
  user: ObjectId;
  organization: ObjectId;
  displayName: string;
  bio: string;
  avatar: string;
  website: string;
  social: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    youtube?: string;
  };
  badgeTier: string;
  status: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  totalSales: number;
  totalEarnings: number;
  stripeOnboardingComplete: boolean;
  payoutEnabled: boolean;
  isDeleted: boolean;
}

export interface ListingDocument {
  slug: string;
  seller: ObjectId;
  organization: ObjectId;
  type: string;
  title: string;
  shortDescription: string;
  description: string;
  price: number;
  currency: string;
  tags: string[];
  previewImages: string[];
  previewData: Record<string, unknown>;
  downloadData: Record<string, unknown>;
  views: number;
  downloads: number;
  purchases: number;
  rating: number;
  reviewCount: number;
  likeCount: number;
  revenue: number;
  version: string;
  status: string;
  publishedAt: Date;
  canBeSoldSeparately: boolean;
  isDeleted: boolean;
  packageSource: string;
  packageSlug: string;
  pricingTier: string;
  isOfficial: boolean;
  installCount: number;
}

/**
 * Catalog readers are injectable so tests can drive the mapping from fixtures
 * instead of the installed package version.
 */
export interface WorkflowCatalogSource {
  list: () => WorkflowMetadata[];
  loadJson: (slug: string) => WorkflowJson | undefined;
}

export interface PromptCatalogSource {
  list: () => PromptTemplate[];
  loadJson: (id: string) => PromptTemplate | undefined;
}

const requireFromHere = createRequire(import.meta.url);

/**
 * Loads a workflow's node graph from the package's exported `./workflows/*`
 * subpath.
 *
 * We deliberately do not use the package's own `getWorkflowJson`: it resolves
 * the file via `__dirname`, which is undefined in the package's ESM build
 * (`dist/index.mjs`), where it silently returns `undefined`. The exported
 * subpath resolves identically under CJS and ESM.
 */
function loadWorkflowJson(slug: string): WorkflowJson | undefined {
  try {
    return requireFromHere(
      `${WORKFLOW_PACKAGE_SOURCE}/workflows/${slug}.json`,
    ) as WorkflowJson;
  } catch {
    return undefined;
  }
}

export const workflowPackageSource: WorkflowCatalogSource = {
  list: getAllWorkflows,
  loadJson: loadWorkflowJson,
};

/**
 * Prompt templates are fully inlined in the package's registry — the shipped
 * JSON files carry no extra data — so the registry lookup is the safe source
 * (the package's `getPromptJson` has the same ESM `__dirname` defect).
 */
export const promptPackageSource: PromptCatalogSource = {
  list: getAllPrompts,
  loadJson: getPrompt,
};

// ============================================================================
// OFFICIAL SELLER
// ============================================================================

export function resolveOfficialRefs(
  env: NodeJS.ProcessEnv = process.env,
): Pick<SellerDocument, 'user' | 'organization'> {
  return {
    organization: new ObjectId(
      env.GENFEED_OFFICIAL_ORG_ID || DEFAULT_OFFICIAL_ORG_ID,
    ),
    user: new ObjectId(
      env.GENFEED_OFFICIAL_USER_ID || DEFAULT_OFFICIAL_USER_ID,
    ),
  };
}

export function buildOfficialSeller(
  refs: Pick<SellerDocument, 'user' | 'organization'>,
): SellerDocument {
  return {
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=genfeed-official',
    badgeTier: SellerBadgeTier.VERIFIED,
    bio: 'Official workflows and prompts from the GenFeed AI team. Production-ready templates for content creation, automation, and AI-powered media generation.',
    displayName: 'GenFeed AI',
    followerCount: 0,
    isDeleted: false,
    organization: refs.organization,
    payoutEnabled: false,
    rating: 5.0,
    reviewCount: 0,
    slug: OFFICIAL_SELLER_SLUG,
    social: {
      github: 'genfeedai',
      twitter: 'genfeedai',
    },
    status: SellerStatus.APPROVED,
    stripeOnboardingComplete: false,
    totalEarnings: 0,
    totalSales: 0,
    user: refs.user,
    website: 'https://genfeed.ai',
  };
}

// ============================================================================
// PREVIEW DATA
// ============================================================================

export function buildWorkflowPreviewData(
  workflowJson: WorkflowJson,
): Record<string, unknown> {
  const nodes = workflowJson.nodes ?? [];
  const edges = workflowJson.edges ?? [];

  return {
    connections: edges.length,
    nodes: nodes.length,
    nodeTypes: [...new Set(nodes.map((node) => node.type))],
    version: workflowJson.version ?? 1,
  };
}

export function buildPromptPreviewData(
  promptJson: PromptTemplate,
): Record<string, unknown> {
  const variables = promptJson.variables ?? [];

  return {
    category: promptJson.category,
    template: promptJson.template,
    variableCount: variables.length,
    variables: variables.map((variable) => ({
      label: variable.label,
      name: variable.name,
      type: variable.type,
    })),
  };
}

// ============================================================================
// LISTINGS
// ============================================================================

/**
 * Official listings are always published free of charge under the GenFeed AI
 * seller, regardless of the `tier` declared in the upstream catalog. Catalog
 * entries that disagree are surfaced by `findNonFreeCatalogEntries` so the
 * override is visible rather than silent.
 */
function officialListingDefaults() {
  return {
    canBeSoldSeparately: true,
    currency: 'usd',
    downloads: 0,
    installCount: 0,
    isDeleted: false,
    isOfficial: true,
    likeCount: 0,
    previewImages: [],
    price: 0,
    pricingTier: PricingTier.FREE,
    purchases: 0,
    rating: 0,
    revenue: 0,
    reviewCount: 0,
    status: ListingStatus.PUBLISHED,
    views: 0,
  };
}

export function buildWorkflowListings(
  refs: OfficialRefs,
  source: WorkflowCatalogSource = workflowPackageSource,
  now: Date = new Date(),
): ListingDocument[] {
  return source.list().map((entry) => {
    const workflowJson = source.loadJson(entry.slug);

    if (!workflowJson) {
      throw new Error(
        `Workflow "${entry.slug}" is listed in ${WORKFLOW_PACKAGE_SOURCE} but has no workflow JSON`,
      );
    }

    return {
      ...officialListingDefaults(),
      description: `# ${entry.title}\n\n${entry.description}\n\n**Category:** ${entry.category}\n**Default Model:** ${entry.defaultModel}\n**Input Types:** ${entry.inputTypes.join(', ')}\n**Output Types:** ${entry.outputTypes.join(', ')}\n\nOfficial workflow template by GenFeed AI. Ready to use in your workspace.`,
      downloadData: workflowJson as unknown as Record<string, unknown>,
      organization: refs.organizationId,
      packageSlug: entry.slug,
      packageSource: WORKFLOW_PACKAGE_SOURCE,
      previewData: buildWorkflowPreviewData(workflowJson),
      publishedAt: now,
      seller: refs.sellerId,
      shortDescription: entry.description,
      slug: `${OFFICIAL_SELLER_SLUG}/${entry.slug}`,
      tags: [...entry.tags, entry.category, 'official'],
      title: entry.title,
      type: ListingType.WORKFLOW,
      version: `${workflowJson.version ?? 1}.0.0`,
    };
  });
}

export function buildPromptListings(
  refs: OfficialRefs,
  source: PromptCatalogSource = promptPackageSource,
  now: Date = new Date(),
): ListingDocument[] {
  return source.list().map((entry) => {
    const promptJson = source.loadJson(entry.id);

    if (!promptJson) {
      throw new Error(
        `Prompt "${entry.id}" is listed in ${PROMPT_PACKAGE_SOURCE} but has no prompt JSON`,
      );
    }

    return {
      ...officialListingDefaults(),
      description: `# ${entry.title}\n\n${entry.description}\n\n**Category:** ${entry.category}\n\nOfficial prompt template by GenFeed AI. Customize variables and use in your content pipeline.`,
      downloadData: promptJson as unknown as Record<string, unknown>,
      organization: refs.organizationId,
      packageSlug: entry.id,
      packageSource: PROMPT_PACKAGE_SOURCE,
      previewData: buildPromptPreviewData(promptJson),
      publishedAt: now,
      seller: refs.sellerId,
      shortDescription: entry.description,
      slug: `${OFFICIAL_SELLER_SLUG}/${entry.id}`,
      tags: [...entry.tags, entry.category, 'official'],
      title: entry.title,
      type: ListingType.PROMPT,
      version: `${promptJson.version ?? 1}.0.0`,
    };
  });
}

/**
 * Catalog entries whose upstream tier is not `free`. Official listings are
 * forced to free, so any hit here is drift worth reporting.
 */
export function findNonFreeCatalogEntries(
  entries: Array<{ tier: string }> = [],
): Array<{ tier: string }> {
  return entries.filter((entry) => entry.tier !== PricingTier.FREE);
}
