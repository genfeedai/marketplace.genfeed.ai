import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';

export default function LibraryPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDCDA'}
        title="My Library"
        description="Your purchased content and downloads"
      />
      <EmptyState
        icon={'\uD83D\uDCDA'}
        label="No Purchases Yet"
        description="Content you purchase from the marketplace will appear here."
      />
    </main>
  );
}
