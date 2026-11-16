import PageHeader from '@components/page-header';
import ProductCatalog from '@components/product-catalog';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/prompts');

export const dynamic = 'force-dynamic';

export default function PromptsPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Prompts"
        description="Prompt collections with structure, variables and guidance"
      />
      <ProductCatalog type="prompt" />
    </main>
  );
}
