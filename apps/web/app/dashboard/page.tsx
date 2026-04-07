import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';

export default function DashboardPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDCCA'}
        title="Seller Dashboard"
        description="Manage your listings, track sales, and view analytics"
      />
      <EmptyState
        icon={'\uD83D\uDCCA'}
        label="Dashboard Coming Soon"
        description="Seller analytics and listing management will be available here."
      />
    </main>
  );
}
