/**
 * Seed Script: Marketplace Packages (Official Workflows & Prompts)
 *
 * Seeds marketplace listings from the published `@genfeedai/workflows` and
 * `@genfeedai/prompts` packages. Creates the official "GenFeed AI" seller and
 * upserts every catalog entry as a published, free, official listing.
 *
 * Catalogs are read through each package's public API (`getAllWorkflows`,
 * `getWorkflowJson`, `getAllPrompts`, `getPromptJson`) — no HTTP endpoint and
 * no build-time catalog copy required.
 *
 * Idempotent: listings key off `slug` (`genfeed-official/<package-slug>`) and
 * only the fields in `LISTING_FIELDS_TO_CHECK` are diffed on re-run.
 *
 * Usage:
 *   bun run apps/api/scripts/seeds/marketplace-packages.seed.ts          # dry run
 *   bun run apps/api/scripts/seeds/marketplace-packages.seed.ts --live   # writes
 *
 * Environment:
 *   MONGODB_URI                 connection string (or pass --uri=)
 *   GENFEED_OFFICIAL_USER_ID    override the official seller's user ref
 *   GENFEED_OFFICIAL_ORG_ID     override the official seller's organization ref
 */

import { runScript } from '../db/connection';
import { parseArgs, seedDocuments } from '../db/seed-utils';
import {
  buildOfficialSeller,
  buildPromptListings,
  buildWorkflowListings,
  DRY_RUN_SELLER_ID,
  findNonFreeCatalogEntries,
  LISTING_COLLECTION,
  LISTING_FIELDS_TO_CHECK,
  OFFICIAL_SELLER_SLUG,
  promptPackageSource,
  resolveOfficialRefs,
  SELLER_COLLECTION,
  SELLER_FIELDS_TO_CHECK,
  workflowPackageSource,
} from './marketplace-packages.mapping';

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  log: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

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

const args = parseArgs();

runScript(
  'Marketplace Packages Seed',
  async (db) => {
    warnOnNonFreeTiers();

    // 1. Official seller
    logger.log('\n📦 Seeding Official Seller...\n');
    const officialSeller = buildOfficialSeller(resolveOfficialRefs());
    const sellerResult = await seedDocuments(
      db,
      SELLER_COLLECTION,
      [officialSeller],
      {
        dryRun: args.dryRun,
        fieldsToCheck: SELLER_FIELDS_TO_CHECK,
        keyField: 'slug',
      },
    );

    // 2. Resolve the seller's real _id for listing references
    const sellerDoc = await db
      .collection(SELLER_COLLECTION)
      .findOne({ slug: OFFICIAL_SELLER_SLUG });

    if (!sellerDoc && !args.dryRun) {
      throw new Error('Failed to find official seller after seeding');
    }

    // Dry runs write nothing, so fall back to deterministic placeholders.
    const refs = {
      organizationId: sellerDoc?.organization ?? officialSeller.organization,
      sellerId: sellerDoc?._id ?? DRY_RUN_SELLER_ID,
    };

    // 3. Workflow listings
    logger.log('\n📦 Seeding Workflow Listings...\n');
    const workflowResult = await seedDocuments(
      db,
      LISTING_COLLECTION,
      buildWorkflowListings(refs),
      {
        dryRun: args.dryRun,
        fieldsToCheck: LISTING_FIELDS_TO_CHECK,
        keyField: 'slug',
      },
    );

    // 4. Prompt listings
    logger.log('\n📦 Seeding Prompt Listings...\n');
    const promptResult = await seedDocuments(
      db,
      LISTING_COLLECTION,
      buildPromptListings(refs),
      {
        dryRun: args.dryRun,
        fieldsToCheck: LISTING_FIELDS_TO_CHECK,
        keyField: 'slug',
      },
    );

    return {
      prompts: promptResult,
      sellers: sellerResult,
      workflows: workflowResult,
    };
  },
  { database: args.database, uri: args.uri },
).catch((error) => {
  logger.error('Seed failed:', error);
  process.exit(1);
});
