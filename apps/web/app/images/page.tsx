import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';
import { fetchPublicContent, getPublicMediaUrl } from '@/lib/public-content';

export default async function ImagesPage(): Promise<ReactNode> {
  const result = await fetchPublicContent('images');

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDDBC\uFE0F'}
        title="Images"
        description="Public AI-generated images from the Genfeed community"
      />

      {result.status === 'unavailable' && (
        <EmptyState
          icon={'\u26A0\uFE0F'}
          label="Images Unavailable"
          description="Genfeed could not load public images right now. Please try again shortly."
        />
      )}

      {result.status === 'success' && result.items.length === 0 && (
        <EmptyState
          icon={'\uD83D\uDDBC\uFE0F'}
          label="No Public Images Yet"
          description="Images will appear here when creators publish them publicly on Genfeed."
        />
      )}

      {result.status === 'success' && result.items.length > 0 && (
        <div className="columns-1 gap-4 space-y-4 sm:columns-2 md:columns-3 lg:columns-4">
          {result.items.map((image) => (
            <article
              key={image.id}
              className="break-inside-avoid overflow-hidden rounded-lg border border-white/10 bg-white/5 card-glow"
            >
              {/* biome-ignore lint/performance/noImgElement: Public media responses do not expose stable dimensions for next/image. */}
              <img
                alt={image.label ?? 'Public Genfeed image'}
                className="w-full"
                loading="lazy"
                src={getPublicMediaUrl('images', image.id)}
              />
              <div className="p-3">
                <h2 className="truncate text-sm font-medium text-white">
                  {image.label ?? 'Untitled image'}
                </h2>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
