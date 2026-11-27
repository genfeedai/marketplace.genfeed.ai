import EmptyState from '@components/empty-state';
import Link from 'next/link';
import {
  formatPrice,
  type Listing,
  listingFromResource,
  listingHref,
  parseCollection,
  parsePageCount,
  publicRequest,
} from '@/lib/marketplace-api';

interface ProductCatalogProps {
  /** Leave out to list every product type. */
  type?: 'workflow' | 'prompt' | 'preset' | 'skill';
  /** Page to show, from 1. */
  page?: number;
}

const PAGE_SIZE = 48;

/** Read the page number from a `?page=` query value; anything else is page 1. */
export function parsePageParam(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function ProductCatalog({
  type,
  page = 1,
}: ProductCatalogProps) {
  const query = `${type ? `type=${type}&` : ''}limit=${PAGE_SIZE}${
    page > 1 ? `&page=${page}` : ''
  }`;
  let listings: Listing[];
  let pages = 1;
  try {
    const payload = await publicRequest(`/marketplace/listings?${query}`);
    pages = parsePageCount(payload);
    listings = parseCollection(payload).map(listingFromResource);
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
  const pathname = type ? `/${type}s` : '/browse';
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={listingHref(listing.slug)}
            className="rounded-lg border border-white/10 bg-white/5 p-6 hover:bg-white/10"
          >
            <h2 className="text-lg font-semibold text-white">
              {listing.title}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {listing.shortDescription}
            </p>
            <p className="mt-4 text-white">
              {formatPrice(listing.price, listing.currency)}
            </p>
          </Link>
        ))}
      </div>
      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-between text-sm text-white"
        >
          {page > 1 ? (
            <Link href={page === 2 ? pathname : `${pathname}?page=${page - 1}`}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-white/60">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={`${pathname}?page=${page + 1}`}>Next</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
