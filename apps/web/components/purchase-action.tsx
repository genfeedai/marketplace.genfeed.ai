'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  authenticatedRequest,
  formatCredits,
  genfeedAppUrl,
  type Listing,
  MarketplaceError,
  parseSingle,
  payWithCredits,
  stripeRedirect,
} from '@/lib/marketplace-api';

interface PurchaseActionProps {
  listing: Listing;
}

export default function PurchaseAction({ listing }: PurchaseActionProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [claimed, setClaimed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // One key per attempt: a retry after an unclear failure reuses it, so the
  // buyer's credits are taken once.
  const attemptKey = useRef<string | null>(null);
  const creditPrice = listing.creditPrice;
  const isPremium = listing.pricingTier === 'premium';

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

  async function payWithGen() {
    setBusy(true);
    setError('');
    attemptKey.current ??= crypto.randomUUID();
    try {
      await payWithCredits(listing.id, attemptKey.current);
      attemptKey.current = null;
      setConfirming(false);
      setClaimed(true);
    } catch (cause) {
      // A clear refusal (not enough GEN, already owned, price changed) ends
      // the attempt; anything else may have gone through, so keep the key.
      if (
        cause instanceof MarketplaceError &&
        cause.status >= 400 &&
        cause.status < 500
      ) {
        attemptKey.current = null;
      }
      setConfirming(false);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not pay with GEN. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (claimed) {
    return (
      <div className="mt-6 space-y-3">
        <Link href="/library" className="underline">
          Open your library
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={purchase}
          disabled={busy || isPremium}
          className="rounded-lg bg-white px-6 py-3 font-medium text-black disabled:opacity-50"
        >
          {busy && !confirming
            ? 'Please wait…'
            : isPremium
              ? 'Available with Genfeed Premium'
              : listing.price === 0
                ? 'Add to library'
                : 'Buy with Stripe'}
        </button>
        {creditPrice !== null && !isPremium && (
          <button
            type="button"
            onClick={() => {
              setError('');
              setConfirming(true);
            }}
            disabled={busy || confirming}
            className="rounded-lg border border-white/30 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            Pay with GEN
          </button>
        )}
      </div>
      {confirming && creditPrice !== null && (
        <section
          aria-label="Confirm payment with GEN"
          className="space-y-3 rounded-lg border border-white/20 p-4"
        >
          <p>
            Pay {formatCredits(creditPrice)} for {listing.title}? It is taken
            from your Genfeed credits and the item goes straight to your
            library.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={payWithGen}
              disabled={busy}
              className="rounded-lg bg-white px-5 py-2 font-medium text-black disabled:opacity-50"
            >
              {busy ? 'Paying…' : `Pay ${formatCredits(creditPrice)}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-lg border border-white/30 px-5 py-2 text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </section>
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
