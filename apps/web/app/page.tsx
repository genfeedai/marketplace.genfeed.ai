import LinkTileGrid from '@components/link-tile-grid';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { GALLERY_LINK, PRODUCT_LINKS } from '@/lib/store-navigation';

export default function HomePage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-12 flex flex-col items-start gap-4 py-6">
        <h1 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
          From brief to feed
        </h1>
        <p className="max-w-xl text-lg text-white/70">
          Workflows, prompts, presets and skills made by Genfeed. Pick one, run
          it, post today.
        </p>
        <Link
          href="/browse"
          className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Browse the store
        </Link>
      </section>

      <LinkTileGrid links={[...PRODUCT_LINKS, GALLERY_LINK]} />
    </main>
  );
}
