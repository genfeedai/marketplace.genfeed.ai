import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';
import { fetchPublicContent, getPublicMediaUrl } from '@/lib/public-content';

export default async function VideosPage(): Promise<ReactNode> {
  const result = await fetchPublicContent('videos');

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Videos"
        description="Public AI-generated videos from the Genfeed community"
      />

      {result.status === 'unavailable' && (
        <EmptyState
          label="Videos Unavailable"
          description="Genfeed could not load public videos right now. Please try again shortly."
        />
      )}

      {result.status === 'success' && result.items.length === 0 && (
        <EmptyState
          label="No Public Videos Yet"
          description="Videos will appear here when creators publish them publicly on Genfeed."
        />
      )}

      {result.status === 'success' && result.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {result.items.map((video) => (
            <article
              key={video.id}
              className="overflow-hidden rounded-lg border border-white/10 bg-white/5 card-glow"
            >
              {/* biome-ignore lint/a11y/useMediaCaption: The public API does not provide a caption track. */}
              <video
                className="aspect-[9/16] w-full bg-black object-cover"
                controls
                playsInline
                preload="metadata"
                src={getPublicMediaUrl('videos', video.id)}
              />
              <div className="p-4">
                <h2 className="truncate font-semibold text-white">
                  {video.label ?? 'Untitled video'}
                </h2>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
