import PurchaseAction from '@components/purchase-action';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  formatCredits,
  formatPrice,
  type Listing,
  listingFromResource,
  MarketplaceError,
  parseSingle,
  publicRequest,
} from '@/lib/marketplace-api';
import { createNoIndexMetadata, isRetiredSellerSlug } from '@/lib/seo';

function assertActiveSellerSlug(sellerSlug: string): void {
  if (isRetiredSellerSlug(sellerSlug)) {
    notFound();
  }
}

interface ListingPageProps {
  params: Promise<{
    sellerSlug: string;
    listingSlug: string;
  }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { sellerSlug, listingSlug } = await params;
  assertActiveSellerSlug(sellerSlug);

  const title = listingSlug.replaceAll('-', ' ');

  return createNoIndexMetadata({
    title,
    description: 'A product from the Genfeed store.',
    path: `/${sellerSlug}/${listingSlug}`,
  });
}

export default async function ListingPage({
  params,
}: ListingPageProps): Promise<ReactNode> {
  const { sellerSlug, listingSlug } = await params;
  assertActiveSellerSlug(sellerSlug);

  let listing: Listing;
  try {
    listing = listingFromResource(
      parseSingle(
        await publicRequest(
          `/marketplace/listings/${encodeURIComponent(sellerSlug)}/${encodeURIComponent(listingSlug)}`,
        ),
      ),
    );
  } catch (cause) {
    if (cause instanceof MarketplaceError && cause.status === 404) notFound();
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Listing unavailable</h1>
        <p className="mt-4 text-white/60">
          We could not load this listing. Please try again shortly.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <p className="mb-2 text-sm text-white/50">By Genfeed</p>
        <h1 className="text-3xl font-bold text-white mb-4">{listing.title}</h1>
        <p className="text-xl font-semibold">
          {formatPrice(listing.price, listing.currency)}
        </p>
        {listing.creditPrice !== null && (
          <p className="mt-1 text-white/70">
            or {formatCredits(listing.creditPrice)}, 25% below the card price
          </p>
        )}
        <p className="mt-6 whitespace-pre-wrap text-white/70">
          {listing.description}
        </p>
        <PurchaseAction listing={listing} />
      </div>
    </main>
  );
}
