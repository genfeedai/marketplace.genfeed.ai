'use client';

import { useGalleryList } from '@/hooks/use-gallery-list';
import EmptyState from '@components/empty-state';
import Loading from '@components/loading';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';

export default function VideosPage(): ReactNode {
  const { items: videos, isLoading } = useGalleryList({
    type: 'videos',
    queryParams: { format: 'portrait', scope: 'public' },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon="\uD83C\uDFA5"
        title="Videos"
        description="Browse AI-generated videos from the community"
      />

      {isLoading && <Loading />}

      {!isLoading && videos.length === 0 && (
        <EmptyState
          icon="\uD83C\uDFA5"
          label="No Videos Yet"
          description="AI-generated videos will appear here once creators share them."
        />
      )}

      {!isLoading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-white/5 card-glow"
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.label ?? 'Video'}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-white/20">
                  {'\uD83C\uDFA5'}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="truncate text-sm font-medium text-white">
                  {video.label ?? 'Untitled'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
