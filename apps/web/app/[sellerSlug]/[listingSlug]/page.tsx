import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createNoIndexMetadata } from '@/lib/seo';

interface ListingPageProps {
  params: Promise<{
    sellerSlug: string;
    listingSlug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { sellerSlug, listingSlug } = await params;
  const title = listingSlug.replaceAll('-', ' ');

  return createNoIndexMetadata({
    title,
    description: `Marketplace listing by ${sellerSlug}.`,
    path: `/${sellerSlug}/${listingSlug}`,
  });
}

export default async function ListingPage({
  params,
}: ListingPageProps): Promise<ReactNode> {
  const { sellerSlug, listingSlug } = await params;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <p className="text-sm text-white/50 mb-2">
          Seller: <span className="text-white/80">{sellerSlug}</span>
        </p>
        <h1 className="text-3xl font-bold text-white mb-4">{listingSlug}</h1>
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <span className="text-5xl block mb-4">{'\uD83D\uDED2'}</span>
          <p className="text-white/60">Listing detail page — coming soon.</p>
          <p className="text-sm text-white/40 mt-2">
            This page will display the full listing with preview, pricing, and
            purchase options.
          </p>
        </div>
      </div>
    </main>
  );
}
