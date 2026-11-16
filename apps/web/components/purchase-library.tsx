'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  authenticatedRequest,
  genfeedAppUrl,
  parseCollection,
  parseSingle,
  type Resource,
  record,
  text,
} from '@/lib/marketplace-api';

export default function PurchaseLibrary() {
  const [items, setItems] = useState<Resource[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setItems(
        parseCollection(
          await authenticatedRequest('/marketplace/purchases?limit=100'),
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Library unavailable.');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function download(item: Resource) {
    setError('');
    try {
      const result = parseSingle(
        await authenticatedRequest(
          `/marketplace/purchases/${encodeURIComponent(item.id)}/download-data`,
        ),
      );
      if (!record(result.attributes.downloadData))
        throw new Error('This purchase has no downloadable data.');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(result.attributes.downloadData, null, 2)], {
          type: 'application/json',
        }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `marketplace-${item.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Download failed.');
    }
  }
  return (
    <div className="space-y-4">
      {busy && <p role="status">Loading your library…</p>}
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
          Refresh library
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
      {!busy && !error && !items.length && (
        <p className="text-white/60">No purchases in this workspace yet.</p>
      )}
      {items.map((item) => {
        const info = record(item.attributes.listingInfo)
          ? item.attributes.listingInfo
          : {};
        return (
          <article
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-white/10 p-5"
          >
            <div>
              <h2 className="font-semibold">
                {text(info.title) || 'Store purchase'}
              </h2>
              <p className="text-sm text-white/60">
                {text(item.attributes.status)}
              </p>
            </div>
            {item.attributes.status === 'completed' && (
              <button
                type="button"
                onClick={() => download(item)}
                className="rounded-lg bg-white px-4 py-2 text-black"
              >
                Download JSON
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
