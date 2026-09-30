import PageHeader from '@components/page-header';
import SellerDashboard from '@components/seller-dashboard';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = createNoIndexMetadata({
  title: 'Seller Dashboard',
  description: 'Manage your marketplace listings, sales, and seller profile.',
  path: '/dashboard',
});

export default function DashboardPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDCCA'}
        title="Seller Dashboard"
        description="Manage your listings, track sales, and view analytics"
      />
      <SellerDashboard />
    </main>
  );
}
