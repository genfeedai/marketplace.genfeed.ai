import type { Metadata } from 'next';
import { Suspense } from 'react';

import MarketplacePage from './marketplace-page';

export const metadata: Metadata = {
  title: 'Marketplace | Admin',
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="admin-container">
          <p className="text-muted text-sm">Loading marketplace...</p>
        </div>
      }
    >
      <MarketplacePage />
    </Suspense>
  );
}
