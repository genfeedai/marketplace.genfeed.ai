import PageHeader from '@components/page-header';
import ProductCatalog from '@components/product-catalog';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/skills');

export const dynamic = 'force-dynamic';

export default function SkillsPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Skills"
        description="Agent skills that teach your AI how to make the content"
      />
      <ProductCatalog type="skill" />
    </main>
  );
}
