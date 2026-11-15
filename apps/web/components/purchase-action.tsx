'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  authenticatedRequest,
  genfeedAppUrl,
  type Listing,
  parseSingle,
  stripeRedirect,
} from '@/lib/marketplace-api';

interface PurchaseActionProps {
  listing: Listing;
}

export default function PurchaseAction({ listing }: PurchaseActionProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [claimed, setClaimed] = useState(false);
  async function purchase() {
    setBusy(true);
    setError('');
    try {
      const path = `/marketplace/listings/${encodeURIComponent(listing.id)}`;
      if (listing.price === 0) {
        await authenticatedRequest(`${path}/claim`, {});
        setClaimed(true);
      } else {
        const result = parseSingle(
          await authenticatedRequest(`${path}/checkout`, {}),
        );
        stripeRedirect(result.attributes.url);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Purchase failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 space-y-3">
      {claimed ? (
        <Link href="/library" className="underline">
          Open your library
        </Link>
      ) : (
        <button
          type="button"
          onClick={purchase}
          disabled={busy || listing.pricingTier === 'premium'}
          className="rounded-lg bg-white px-6 py-3 font-medium text-black disabled:opacity-50"
        >
          {busy
            ? 'Please wait…'
            : listing.pricingTier === 'premium'
              ? 'Available with Genfeed Premium'
              : listing.price === 0
                ? 'Get it now'
                : 'Buy with Stripe'}
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <p className="text-sm text-white/60">
        Use your Genfeed account.{' '}
        <a
          href={`${genfeedAppUrl()}/login`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
