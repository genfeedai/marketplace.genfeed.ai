import PageHeader from '@components/page-header';
import ProductCatalog, { parsePageParam } from '@components/product-catalog';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/presets');

export const dynamic = 'force-dynamic';

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}): Promise<ReactNode> {
  const { page } = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Presets"
        description="Saved looks and settings for a consistent result every time"
      />
      <ProductCatalog type="preset" page={parsePageParam(page)} />
    </main>
  );
}
