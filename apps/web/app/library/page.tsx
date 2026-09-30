import PageHeader from '@components/page-header';
import PurchaseLibrary from '@components/purchase-library';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = createNoIndexMetadata({
  title: 'My Library',
  description: 'Access marketplace purchases and downloads in your library.',
  path: '/library',
});

export default function LibraryPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDCDA'}
        title="My Library"
        description="Your purchased content and downloads"
      />
      <PurchaseLibrary />
    </main>
  );
}
