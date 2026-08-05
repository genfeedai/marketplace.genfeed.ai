/**
 * Seed Script: GenFeed Core Workflows
 *
 * Seeds official marketplace listings from the published @genfeedai/workflows
 * package into PostgreSQL via Prisma.
 *
 * Usage:
 *   bun run apps/api/scripts/seeds/genfeed-core-workflows.seed.ts
 *   bun run apps/api/scripts/seeds/genfeed-core-workflows.seed.ts --live
 *   bun run apps/api/scripts/seeds/genfeed-core-workflows.seed.ts --source-dir=/abs/path/to/workflows --live
 */

import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, resolve } from 'node:path';
import {
  ListingStatus,
  ListingType,
  PricingTier,
  SellerBadgeTier,
  SellerStatus,
} from '@genfeedai/enums';
import type { Prisma, PrismaClient } from '@prisma/client';
import { createLegacyId } from '../../src/common/prisma/legacy-id.util';
import { runScript } from '../db/connection';
import { deepEqual, parseArgs } from '../db/seed-utils';

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  log: (...args: unknown[]) => console.log(...args),
};

const OFFICIAL_SELLER_ID = '0000000000000000000000a1';
const OFFICIAL_USER_ID = '0000000000000000000000a2';
const OFFICIAL_ORGANIZATION_ID = '0000000000000000000000a3';
const OFFICIAL_SELLER_SLUG = 'genfeed-official';
const OFFICIAL_PACKAGE_SOURCE = 'core';
const require = createRequire(__filename);
const DEFAULT_WORKFLOWS_DIR = dirname(
  require.resolve('@genfeedai/workflows/workflows/full-pipeline.json'),
);

const args = parseArgs();
const sourceDirArg = process.argv
  .find((arg) => arg.startsWith('--source-dir='))
  ?.split('=')[1];
const workflowsDir = resolve(
  sourceDirArg || process.env.GENFEED_WORKFLOWS_DIR || DEFAULT_WORKFLOWS_DIR,
);

const OFFICIAL_SELLER_FIELDS_TO_CHECK = [
  'avatar',
  'badgeTier',
  'bio',
  'displayName',
  'isDeleted',
  'organization',
  'payoutEnabled',
  'social',
  'status',
  'stripeOnboardingComplete',
  'user',
  'website',
] as const;

const LISTING_FIELDS_TO_CHECK = [
  'canBeSoldSeparately',
  'currency',
  'description',
  'downloadData',
  'isDeleted',
  'isOfficial',
  'organization',
  'packageSlug',
  'packageSource',
  'previewData',
  'price',
  'pricingTier',
  'publishedAt',
  'seller',
  'shortDescription',
  'slug',
  'status',
  'tags',
  'title',
  'type',
  'version',
] as const;

interface OfficialSellerSeed {
  id: string;
  avatar?: string;
  badgeTier: string;
  bio?: string;
  displayName: string;
  followerCount: number;
  isDeleted: boolean;
  organization: string;
  payoutEnabled: boolean;
  rating: number;
  reviewCount: number;
  slug: string;
  social: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  status: string;
  stripeOnboardingComplete: boolean;
  totalEarnings: number;
  totalSales: number;
  user: string;
  website?: string;
}

interface ListingSeed {
  canBeSoldSeparately: boolean;
  currency: string;
  description: string;
  downloadData: Record<string, unknown>;
  downloads: number;
  id: string;
  installCount: number;
  isDeleted: boolean;
  isOfficial: boolean;
  likeCount: number;
  organization: string;
  packageSlug: string;
  packageSource: string;
  previewData: Record<string, unknown>;
  previewImages: string[];
  price: number;
  pricingTier: string;
  publishedAt: Date;
  purchases: number;
  rating: number;
  reviewCount: number;
  revenue: number;
  seller: string;
  shortDescription: string;
  slug: string;
  status: string;
  tags: string[];
  title: string;
  type: string;
  version: string;
  views: number;
}

type ListingSeedStatus = 'inserted' | 'unchanged' | 'updated';

const OFFICIAL_SELLER: OfficialSellerSeed = {
  avatar: 'https://genfeed.ai/favicon.ico',
  badgeTier: SellerBadgeTier.VERIFIED,
  bio: 'Official GenFeed AI publisher for core workflow listings.',
  displayName: 'GenFeed AI',
  followerCount: 0,
  id: OFFICIAL_SELLER_ID,
  isDeleted: false,
  organization: OFFICIAL_ORGANIZATION_ID,
  payoutEnabled: false,
  rating: 0,
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
  user: OFFICIAL_USER_ID,
  website: 'https://genfeed.ai',
};

function humanizeWorkflowSlug(workflowSlug: string): string {
  return workflowSlug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
}

function readWorkflowSlugs(sourceDir: string): string[] {
  if (!existsSync(sourceDir)) {
    throw new Error(`Workflow source directory does not exist: ${sourceDir}`);
  }

  return readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => basename(entry.name, '.json'))
    .sort();
}

async function ensureOfficialSeller(
  prisma: PrismaClient,
): Promise<Pick<OfficialSellerSeed, 'id' | 'organization'>> {
  const existing = await prisma.seller.findUnique({
    where: { slug: OFFICIAL_SELLER_SLUG },
  });

  if (!existing) {
    if (args.dryRun) {
      logger.log(`[DRY RUN] WOULD INSERT seller "${OFFICIAL_SELLER_SLUG}"`);
    } else {
      await prisma.seller.create({
        data: {
          ...OFFICIAL_SELLER,
          social: OFFICIAL_SELLER.social as Prisma.InputJsonValue,
        },
      });
      logger.log(`Inserted seller "${OFFICIAL_SELLER_SLUG}"`);
    }

    return {
      id: OFFICIAL_SELLER_ID,
      organization: OFFICIAL_ORGANIZATION_ID,
    };
  }

  const update: Prisma.SellerUpdateInput = {};

  for (const field of OFFICIAL_SELLER_FIELDS_TO_CHECK) {
    const nextValue = OFFICIAL_SELLER[field];
    const currentValue = existing[field];

    if (!deepEqual(currentValue, nextValue)) {
      if (field === 'social') {
        update.social = nextValue as Prisma.InputJsonValue;
      } else {
        update[field] = nextValue as never;
      }
    }
  }

  if (Object.keys(update).length === 0) {
    logger.log(`Unchanged seller "${OFFICIAL_SELLER_SLUG}"`);
    return {
      id: existing.id,
      organization: existing.organization,
    };
  }

  if (args.dryRun) {
    logger.log(
      `[DRY RUN] WOULD UPDATE seller "${OFFICIAL_SELLER_SLUG}": ${Object.keys(update).join(', ')}`,
    );
  } else {
    await prisma.seller.update({
      data: update,
      where: { id: existing.id },
    });
    logger.log(
      `Updated seller "${OFFICIAL_SELLER_SLUG}": ${Object.keys(update).join(', ')}`,
    );
  }

  return {
    id: existing.id,
    organization: existing.organization,
  };
}

function buildListings(
  workflowSlugs: string[],
  sellerRef: Pick<OfficialSellerSeed, 'id' | 'organization'>,
): ListingSeed[] {
  return workflowSlugs.map((workflowSlug) => {
    const title = humanizeWorkflowSlug(workflowSlug);
    const packageSlug = `core-workflow-${workflowSlug}`;

    return {
      canBeSoldSeparately: true,
      currency: 'usd',
      description: `# ${title}\n\nOfficial GenFeed AI workflow template imported from \`@genfeedai/workflows\`.\n\n- Workflow slug: \`${workflowSlug}\`\n- Package source: \`${OFFICIAL_PACKAGE_SOURCE}\`\n`,
      downloadData: {
        sourcePackage: '@genfeedai/workflows',
        workflowSlug,
      },
      downloads: 0,
      id: createLegacyId(),
      installCount: 0,
      isDeleted: false,
      isOfficial: true,
      likeCount: 0,
      organization: sellerRef.organization,
      packageSlug,
      packageSource: OFFICIAL_PACKAGE_SOURCE,
      previewData: {
        sourcePackage: '@genfeedai/workflows',
        workflowSlug,
      },
      previewImages: [],
      price: 0,
      pricingTier: PricingTier.FREE,
      publishedAt: new Date(),
      purchases: 0,
      rating: 0,
      reviewCount: 0,
      revenue: 0,
      seller: sellerRef.id,
      shortDescription: `Official GenFeed AI workflow template: ${title}.`,
      slug: packageSlug,
      status: ListingStatus.PUBLISHED,
      tags: ['workflow', 'official', 'core', ...workflowSlug.split('-')],
      title,
      type: ListingType.WORKFLOW,
      version: '1.0.0',
      views: 0,
    };
  });
}

async function upsertOfficialListing(
  prisma: PrismaClient,
  listing: ListingSeed,
): Promise<ListingSeedStatus> {
  const existing = await prisma.listing.findFirst({
    where: {
      packageSlug: listing.packageSlug,
      packageSource: listing.packageSource,
    },
  });

  if (!existing) {
    if (args.dryRun) {
      logger.log(
        `[DRY RUN] WOULD INSERT "${listing.packageSource}:${listing.packageSlug}"`,
      );
      return 'inserted';
    }

    await prisma.listing.create({
      data: {
        ...listing,
        downloadData: listing.downloadData as Prisma.InputJsonValue,
        previewData: listing.previewData as Prisma.InputJsonValue,
      },
    });
    logger.log(`Inserted "${listing.packageSource}:${listing.packageSlug}"`);
    return 'inserted';
  }

  const update: Prisma.ListingUpdateInput = {};

  for (const field of LISTING_FIELDS_TO_CHECK) {
    const nextValue = listing[field];
    const currentValue = existing[field];

    if (!deepEqual(currentValue, nextValue)) {
      if (field === 'downloadData' || field === 'previewData') {
        update[field] = nextValue as Prisma.InputJsonValue;
      } else {
        update[field] = nextValue as never;
      }
    }
  }

  if (Object.keys(update).length === 0) {
    logger.log(`Unchanged "${listing.packageSource}:${listing.packageSlug}"`);
    return 'unchanged';
  }

  if (args.dryRun) {
    logger.log(
      `[DRY RUN] WOULD UPDATE "${listing.packageSource}:${listing.packageSlug}": ${Object.keys(update).join(', ')}`,
    );
    return 'updated';
  }

  await prisma.listing.update({
    data: update,
    where: { id: existing.id },
  });
  logger.log(
    `Updated "${listing.packageSource}:${listing.packageSlug}": ${Object.keys(update).join(', ')}`,
  );
  return 'updated';
}

async function main(prisma: PrismaClient): Promise<void> {
  const workflowSlugs = readWorkflowSlugs(workflowsDir);
  logger.log(
    `Discovered ${workflowSlugs.length} GenFeed core workflows in ${workflowsDir}`,
  );

  const sellerRef = await ensureOfficialSeller(prisma);
  const listings = buildListings(workflowSlugs, sellerRef);

  const summary = {
    inserted: 0,
    unchanged: 0,
    updated: 0,
  };

  for (const listing of listings) {
    const status = await upsertOfficialListing(prisma, listing);
    summary[status] += 1;
  }

  logger.log('');
  logger.log('='.repeat(50));
  logger.log('SEED SUMMARY');
  logger.log('='.repeat(50));
  logger.log(`Seller slug: ${OFFICIAL_SELLER_SLUG}`);
  logger.log(`Listings inserted: ${summary.inserted}`);
  logger.log(`Listings updated: ${summary.updated}`);
  logger.log(`Listings unchanged: ${summary.unchanged}`);
  logger.log('='.repeat(50));
}

void runScript('Seed GenFeed Core Workflows', main, args.uri).catch((error) => {
  logger.error(error instanceof Error ? error.message : 'Unknown seed failure');
  process.exitCode = 1;
});
