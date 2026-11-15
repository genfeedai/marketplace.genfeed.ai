import PageHeader from '@components/page-header';
import ProductCatalog from '@components/product-catalog';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/workflows');

export const dynamic = 'force-dynamic';

export default function WorkflowsPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Workflows"
        description="Content workflows you run from a brief to a finished post"
      />
      <ProductCatalog type="workflow" />
    </main>
  );
}
