import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';
import { fetchPublicContent, getPublicMediaUrl } from '@/lib/public-content';

function formatDuration(duration: number | undefined): string | null {
  if (!duration || duration < 0) return null;

  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default async function MusicPage(): Promise<ReactNode> {
  const result = await fetchPublicContent('musics');

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83C\uDFB5'}
        title="Music"
        description="Public AI-composed music from the Genfeed community"
      />

      {result.status === 'unavailable' && (
        <EmptyState
          icon={'\u26A0\uFE0F'}
          label="Music Unavailable"
          description="Genfeed could not load public music right now. Please try again shortly."
        />
      )}

      {result.status === 'success' && result.items.length === 0 && (
        <EmptyState
          icon={'\uD83C\uDFB5'}
          label="No Public Music Yet"
          description="Music will appear here when creators publish it publicly on Genfeed."
        />
      )}

      {result.status === 'success' && result.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((music) => {
            const duration = formatDuration(music.duration);

            return (
              <article
                key={music.id}
                className="rounded-lg border border-white/10 bg-white/5 p-5 card-glow"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-white">
                      {music.label ?? 'Untitled track'}
                    </h2>
                    {duration && (
                      <p className="mt-1 text-sm text-white/50">{duration}</p>
                    )}
                  </div>
                  <span aria-hidden="true" className="text-2xl">
                    {'\uD83C\uDFB5'}
                  </span>
                </div>
                {/* biome-ignore lint/a11y/useMediaCaption: Music tracks do not have a spoken-caption track. */}
                <audio
                  className="w-full"
                  controls
                  preload="metadata"
                  src={getPublicMediaUrl('musics', music.id)}
                />
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
