'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  authenticatedRequest,
  genfeedAppUrl,
  MarketplaceError,
  parseCollection,
  parseSingle,
  type Resource,
  stripeRedirect,
  text,
} from '@/lib/marketplace-api';

export default function SellerDashboard() {
  const [profile, setProfile] = useState<Resource | null>(null);
  const [listings, setListings] = useState<Resource[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    setReady(false);
    try {
      let seller: Resource;
      try {
        seller = parseSingle(await authenticatedRequest('/seller/profile'));
      } catch (cause) {
        if (cause instanceof MarketplaceError && cause.status === 404) {
          setProfile(null);
          setListings([]);
          setReady(true);
          return;
        }
        throw cause;
      }
      if (seller.attributes.stripeAccountId) {
        const status = parseSingle(
          await authenticatedRequest('/seller/stripe/status'),
        );
        seller.attributes.stripeOnboardingComplete =
          status.attributes.complete === true &&
          status.attributes.chargesEnabled === true;
      }
      setProfile(seller);
      setListings(
        parseCollection(
          await authenticatedRequest('/seller/listings?limit=100'),
        ),
      );
      setReady(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Dashboard unavailable.',
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(path: string, body: unknown) {
    setBusy(true);
    setError('');
    try {
      await authenticatedRequest(path, body);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  }
  async function connectStripe() {
    setBusy(true);
    setError('');
    try {
      stripeRedirect(
        parseSingle(await authenticatedRequest('/seller/stripe/connect', {}))
          .attributes.url,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Stripe onboarding unavailable.',
      );
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    'block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2';
  return (
    <div className="space-y-6">
      {busy && <p role="status">Loading…</p>}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="underline"
        >
          Refresh dashboard
        </button>
        <a
          href={`${genfeedAppUrl()}/login`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Sign in to Genfeed
        </a>
      </div>
      {ready && !profile && (
        <form
          className="max-w-xl space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void action('/seller/profile', {
              displayName: String(data.get('displayName')),
              bio: String(data.get('bio') || ''),
            });
          }}
        >
          <h2 className="text-xl font-semibold">Create your seller profile</h2>
          <label className="block">
            Display name
            <input
              name="displayName"
              required
              maxLength={100}
              className={inputClass}
            />
          </label>
          <label className="block">
            Bio
            <textarea name="bio" maxLength={500} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-white px-5 py-2 text-black"
          >
            Create profile
          </button>
        </form>
      )}
      {ready && profile && (
        <>
          <div className="rounded-lg border border-white/10 p-5">
            <h2 className="text-xl font-semibold">
              {text(profile.attributes.displayName)}
            </h2>
            <p className="my-2 text-white/60">
              Connect Stripe to receive payouts from paid listings.
            </p>
            <button
              type="button"
              onClick={connectStripe}
              disabled={busy}
              className="underline"
            >
              {profile.attributes.stripeOnboardingComplete
                ? 'Continue Stripe onboarding'
                : 'Connect Stripe'}
            </button>
          </div>
          <form
            className="max-w-2xl space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              try {
                const downloadData: unknown = JSON.parse(
                  String(data.get('downloadData')),
                );
                if (
                  typeof downloadData !== 'object' ||
                  downloadData === null ||
                  Array.isArray(downloadData)
                )
                  throw new Error('Download data must be a JSON object.');
                void action('/seller/listings', {
                  title: String(data.get('title')),
                  type: String(data.get('type')),
                  shortDescription: String(data.get('shortDescription')),
                  description: String(data.get('description')),
                  price: Math.round(Number(data.get('price')) * 100),
                  currency: 'usd',
                  downloadData,
                });
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : 'Invalid download data.',
                );
              }
            }}
          >
            <h2 className="text-xl font-semibold">Create a listing</h2>
            <label className="block">
              Title
              <input
                name="title"
                required
                maxLength={200}
                className={inputClass}
              />
            </label>
            <label className="block">
              Type
              <select name="type" className={inputClass}>
                <option value="workflow">Workflow</option>
                <option value="prompt">Prompt</option>
                <option value="skill">Skill</option>
              </select>
            </label>
            <label className="block">
              Short description
              <input
                name="shortDescription"
                required
                maxLength={300}
                className={inputClass}
              />
            </label>
            <label className="block">
              Description
              <textarea
                name="description"
                required
                maxLength={10000}
                className={inputClass}
              />
            </label>
            <label className="block">
              Price in USD (0 for free)
              <input
                name="price"
                type="number"
                min="0"
                max="500"
                step="0.01"
                defaultValue="0"
                required
                className={inputClass}
              />
            </label>
            <label className="block">
              Download data (JSON)
              <textarea
                name="downloadData"
                required
                defaultValue="{}"
                rows={6}
                className={inputClass}
              />
            </label>
            <p className="text-sm text-white/60">
              Save a draft, then submit it for review. Download data is
              available only after purchase.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-white px-5 py-2 text-black"
            >
              Save draft
            </button>
          </form>
          <section className="space-y-3" aria-label="Your listings">
            <h2 className="text-xl font-semibold">Your listings</h2>
            {!listings.length && (
              <p className="text-white/60">No listings yet.</p>
            )}
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="flex items-center justify-between rounded-lg border border-white/10 p-4"
              >
                <div>
                  <h3>{text(listing.attributes.title)}</h3>
                  <p className="text-sm text-white/60">
                    {text(listing.attributes.status)}
                  </p>
                  {Boolean(listing.attributes.rejectionReason) && (
                    <p className="text-sm text-red-300">
                      {text(listing.attributes.rejectionReason)}
                    </p>
                  )}
                </div>
                {['draft'].includes(text(listing.attributes.status)) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      action(
                        `/seller/listings/${encodeURIComponent(listing.id)}/submit`,
                        {},
                      )
                    }
                    className="underline"
                  >
                    Submit for review
                  </button>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
