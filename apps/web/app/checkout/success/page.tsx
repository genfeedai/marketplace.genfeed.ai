import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = createNoIndexMetadata({
  title: 'Checkout received',
  description: 'Check your library for your marketplace purchase.',
  path: '/checkout/success',
});

export default function CheckoutSuccessPage(): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <span className="text-6xl block mb-6">{'\u2705'}</span>
      <h1 className="text-3xl font-bold text-white mb-4">Checkout received</h1>
      <p className="text-white/60 mb-8">
        Your purchase will appear in your library once payment is confirmed.
        Refresh your library if confirmation is still processing.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/library"
          className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Go to Library
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
        >
          Browse More
        </Link>
      </div>
    </main>
  );
}
