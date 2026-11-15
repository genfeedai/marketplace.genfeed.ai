import LinkTileGrid from '@components/link-tile-grid';
import PageHeader from '@components/page-header';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';
import { GALLERY_LINKS } from '@/lib/store-navigation';

export const metadata: Metadata = createIndexableMetadata('/gallery');

export default function GalleryPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Gallery"
        description="Public content made with Genfeed. Nothing here is for sale."
      />
      <LinkTileGrid links={GALLERY_LINKS} />
    </main>
  );
}
