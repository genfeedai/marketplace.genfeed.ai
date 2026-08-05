/**
 * Seed Script: Marketplace Packages (Official Workflows & Prompts)
 *
 * Seeds marketplace listings from the published `@genfeedai/workflows` and
 * `@genfeedai/prompts` packages through Prisma. Creates the official
 * "GenFeed AI" seller and upserts every catalog entry as a published, free,
 * official listing.
 *
 * Usage:
 *   bun run apps/api/scripts/seeds/marketplace-packages.seed.ts
 *   bun run apps/api/scripts/seeds/marketplace-packages.seed.ts --live
 *
 * Environment:
 *   DATABASE_URL                connection string (or pass --uri=)
 *   GENFEED_OFFICIAL_USER_ID    override the official seller's user ref
 *   GENFEED_OFFICIAL_ORG_ID     override the official seller's organization ref
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import { createLegacyId } from '../../src/common/prisma/legacy-id.util';
import { runScript } from '../db/connection';
import { deepEqual, parseArgs } from '../db/seed-utils';
import {
  buildOfficialSeller,
  buildPromptListings,
  buildWorkflowListings,
  DRY_RUN_SELLER_ID,
  findNonFreeCatalogEntries,
  LISTING_FIELDS_TO_CHECK,
  type ListingDocument,
  OFFICIAL_SELLER_SLUG,
  promptPackageSource,
  resolveOfficialRefs,
  SELLER_FIELDS_TO_CHECK,
  workflowPackageSource,
} from './marketplace-packages.mapping';

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  log: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

type SeedStatus = 'inserted' | 'unchanged' | 'updated';

const args = parseArgs();

function warnOnNonFreeTiers(): void {
  const drifted = [
    ...findNonFreeCatalogEntries(workflowPackageSource.list()),
    ...findNonFreeCatalogEntries(promptPackageSource.list()),
  ];

  for (const entry of drifted) {
    logger.warn(
      `Catalog entry declares tier "${entry.tier}" — forcing pricingTier "free" for official listing`,
    );
  }
}

async function ensureOfficialSeller(
  prisma: PrismaClient,
): Promise<{ organizationId: string; sellerId: string }> {
  const seller = buildOfficialSeller(resolveOfficialRefs());
  const existing = await prisma.seller.findUnique({
    where: { slug: OFFICIAL_SELLER_SLUG },
  });

  if (!existing) {
    if (args.dryRun) {
      logger.log(`[DRY RUN] WOULD INSERT seller "${OFFICIAL_SELLER_SLUG}"`);
      return {
        organizationId: seller.organization,
        sellerId: DRY_RUN_SELLER_ID,
      };
    }

    const created = await prisma.seller.create({
      data: {
        id: createLegacyId(),
        ...seller,
        social: seller.social as Prisma.InputJsonValue,
      },
    });
    logger.log(`Inserted seller "${OFFICIAL_SELLER_SLUG}"`);
    return {
      organizationId: created.organization,
      sellerId: created.id,
    };
  }

  const update: Prisma.SellerUpdateInput = {};

  for (const field of SELLER_FIELDS_TO_CHECK) {
    const nextValue = seller[field];
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
  } else if (args.dryRun) {
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
    organizationId: existing.organization,
    sellerId: existing.id,
  };
}

async function upsertListing(
  prisma: PrismaClient,
  listing: ListingDocument,
): Promise<SeedStatus> {
  const existing = await prisma.listing.findUnique({
    where: { slug: listing.slug },
  });

  if (!existing) {
    if (args.dryRun) {
      logger.log(`[DRY RUN] WOULD INSERT "${listing.slug}"`);
      return 'inserted';
    }

    await prisma.listing.create({
      data: {
        id: createLegacyId(),
        ...listing,
        downloadData: listing.downloadData as Prisma.InputJsonValue,
        previewData: listing.previewData as Prisma.InputJsonValue,
      },
    });
    logger.log(`Inserted "${listing.slug}"`);
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
    logger.log(`Unchanged "${listing.slug}"`);
    return 'unchanged';
  }

  if (args.dryRun) {
    logger.log(
      `[DRY RUN] WOULD UPDATE "${listing.slug}": ${Object.keys(update).join(', ')}`,
    );
    return 'updated';
  }

  await prisma.listing.update({
    data: update,
    where: { id: existing.id },
  });
  logger.log(`Updated "${listing.slug}": ${Object.keys(update).join(', ')}`);
  return 'updated';
}

async function seedListings(
  prisma: PrismaClient,
  listings: ListingDocument[],
): Promise<Record<SeedStatus, number>> {
  const summary = {
    inserted: 0,
    unchanged: 0,
    updated: 0,
  };

  for (const listing of listings) {
    const status = await upsertListing(prisma, listing);
    summary[status] += 1;
  }

  return summary;
}

async function main(prisma: PrismaClient): Promise<void> {
  warnOnNonFreeTiers();

  const refs = await ensureOfficialSeller(prisma);
  const workflows = await seedListings(prisma, buildWorkflowListings(refs));
  const prompts = await seedListings(prisma, buildPromptListings(refs));

  logger.log('');
  logger.log('='.repeat(50));
  logger.log('SEED SUMMARY');
  logger.log('='.repeat(50));
  logger.log(`Seller slug: ${OFFICIAL_SELLER_SLUG}`);
  logger.log(
    `Workflow listings: ${workflows.inserted} inserted, ${workflows.updated} updated, ${workflows.unchanged} unchanged`,
  );
  logger.log(
    `Prompt listings: ${prompts.inserted} inserted, ${prompts.updated} updated, ${prompts.unchanged} unchanged`,
  );
  logger.log('='.repeat(50));
}

void runScript('Seed Marketplace Packages', main, args.uri).catch((error) => {
  logger.error(error instanceof Error ? error.message : 'Unknown seed failure');
  process.exitCode = 1;
});
