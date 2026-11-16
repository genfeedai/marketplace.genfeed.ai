import PageHeader from '@components/page-header';
import ProductCatalog from '@components/product-catalog';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/browse');

export const dynamic = 'force-dynamic';

export default function BrowsePage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="All products"
        description="Every workflow, prompt, preset and skill in the store"
      />
      <ProductCatalog />
    </main>
  );
}
