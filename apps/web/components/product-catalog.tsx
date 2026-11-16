import EmptyState from '@components/empty-state';
import Link from 'next/link';
import {
  formatPrice,
  type Listing,
  listingFromResource,
  listingHref,
  parseCollection,
  publicRequest,
} from '@/lib/marketplace-api';

interface ProductCatalogProps {
  /** Leave out to list every product type. */
  type?: 'workflow' | 'prompt' | 'preset' | 'skill';
}

export default async function ProductCatalog({ type }: ProductCatalogProps) {
  const query = type ? `type=${type}&limit=50` : 'limit=50';
  let listings: Listing[];
  try {
    listings = parseCollection(
      await publicRequest(`/marketplace/listings?${query}`),
    ).map(listingFromResource);
    // Validate all addresses before rendering untrusted links.
    for (const listing of listings) listingHref(listing.slug);
  } catch {
    return (
      <EmptyState
        label="Catalog unavailable"
        description="We could not load the catalog. Please try again shortly."
      />
    );
  }
  if (!listings.length) {
    return (
      <EmptyState
        label="Nothing here yet"
        description="New products from Genfeed will appear here."
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <Link
          key={listing.id}
          href={listingHref(listing.slug)}
          className="rounded-lg border border-white/10 bg-white/5 p-6 hover:bg-white/10"
        >
          <h2 className="text-lg font-semibold text-white">{listing.title}</h2>
          <p className="mt-2 text-sm text-white/60">
            {listing.shortDescription}
          </p>
          <p className="mt-4 text-white">
            {formatPrice(listing.price, listing.currency)}
          </p>
        </Link>
      ))}
    </div>
  );
}
