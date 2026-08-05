'use client';

import EmptyState from '@components/empty-state';
import Loading from '@components/loading';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';
import { useGalleryList } from '@/hooks/use-gallery-list';

export default function ImagesPage(): ReactNode {
  const { items: images, isLoading } = useGalleryList({
    type: 'images',
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDDBC\uFE0F'}
        title="Images"
        description="Explore stunning AI-generated images"
      />

      {isLoading && <Loading />}

      {!isLoading && images.length === 0 && (
        <EmptyState
          icon={'\uD83D\uDDBC\uFE0F'}
          label="No Images Yet"
          description="AI-generated images will appear here once creators share them."
        />
      )}

      {!isLoading && images.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="break-inside-avoid overflow-hidden rounded-lg bg-white/5 card-glow cursor-pointer group"
            >
              {image.ingredientUrl ? (
                <img
                  src={image.ingredientUrl}
                  alt={image.label ?? 'Image'}
                  className="w-full transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : image.thumbnailUrl ? (
                <img
                  src={image.thumbnailUrl}
                  alt={image.label ?? 'Image'}
                  className="w-full transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-4xl text-white/20">
                  {'\uD83D\uDDBC\uFE0F'}
                </div>
              )}
              {image.label && (
                <div className="p-3">
                  <p className="truncate text-sm text-white/80">
                    {image.label}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
