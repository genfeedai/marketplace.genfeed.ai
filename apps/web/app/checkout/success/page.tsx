import Link from 'next/link';
import type { ReactNode } from 'react';

export default function CheckoutSuccessPage(): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <span className="text-6xl block mb-6">{'\u2705'}</span>
      <h1 className="text-3xl font-bold text-white mb-4">
        Purchase Complete
      </h1>
      <p className="text-white/60 mb-8">
        Thank you for your purchase. Your content is now available in your library.
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
