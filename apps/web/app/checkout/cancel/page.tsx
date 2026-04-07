import Link from 'next/link';
import type { ReactNode } from 'react';

export default function CheckoutCancelPage(): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <span className="text-6xl block mb-6">{'\u274C'}</span>
      <h1 className="text-3xl font-bold text-white mb-4">
        Checkout Cancelled
      </h1>
      <p className="text-white/60 mb-8">
        Your purchase was not completed. No charges were made.
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
      >
        Return to Marketplace
      </Link>
    </main>
  );
}
