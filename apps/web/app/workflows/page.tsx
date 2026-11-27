import PageHeader from '@components/page-header';
import ProductCatalog, { parsePageParam } from '@components/product-catalog';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/workflows');

export const dynamic = 'force-dynamic';

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}): Promise<ReactNode> {
  const { page } = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Workflows"
        description="Content workflows you run from a brief to a finished post"
      />
      <ProductCatalog type="workflow" page={parsePageParam(page)} />
    </main>
  );
}
