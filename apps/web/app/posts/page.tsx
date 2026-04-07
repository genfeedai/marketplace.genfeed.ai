'use client';

import { useGalleryList } from '@/hooks/use-gallery-list';
import EmptyState from '@components/empty-state';
import Loading from '@components/loading';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';

export default function PostsPage(): ReactNode {
  const { items: posts, isLoading } = useGalleryList({
    type: 'posts',
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDCDD'}
        title="Posts"
        description="Read AI-generated articles and content"
      />

      {isLoading && <Loading />}

      {!isLoading && posts.length === 0 && (
        <EmptyState
          icon={'\uD83D\uDCDD'}
          label="No Posts Yet"
          description="AI-generated articles and content will appear here once creators share them."
        />
      )}

      {!isLoading && posts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-lg border border-white/10 bg-white/5 p-6 card-glow"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                  <span className="text-3xl">{'\uD83D\uDCDD'}</span>
                </div>
                <div className="flex-1 text-center">
                  <h3 className="truncate font-semibold text-white">
                    {post.label ?? 'Untitled'}
                  </h3>
                  {post.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/60">
                      {post.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
