'use client';

import { fetchLeaderboard, type GalleryItem } from '@/lib/api';
import EmptyState from '@components/empty-state';
import Loading from '@components/loading';
import PageHeader from '@components/page-header';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode, useCallback, useEffect, useState } from 'react';

function LeaderboardContent(): ReactNode {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams?.get('page') ?? '1', 10);

  const [posts, setPosts] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPosts = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        const data = await fetchLeaderboard({ page }, signal);

        if (signal?.aborted) return;

        setPosts(data);
      } catch (error) {
        if (signal?.aborted) return;
        // Silently handle - empty state will show
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [page],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadPosts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadPosts]);

  if (isLoading) {
    return <Loading />;
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={'\uD83C\uDFC6'}
        label="No Top Videos Yet"
        description="Share your AI-generated videos to appear on the leaderboard."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {posts.map((post) => {
        const ingredient = post.ingredients?.[0];

        return (
          <div
            key={post.id}
            className="rounded-lg border border-white/10 bg-white/5 p-4 card-glow"
          >
            <div className="flex flex-col space-y-4">
              <div className="aspect-video w-full overflow-hidden rounded bg-black">
                {ingredient?.ingredientUrl ? (
                  <video
                    src={ingredient.ingredientUrl}
                    poster={ingredient.thumbnailUrl ?? undefined}
                    controls
                    preload="metadata"
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-white/20">
                    {'\uD83C\uDFA5'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="truncate font-semibold text-white">
                  {post.label ?? 'Untitled'}
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {post.totalViews ?? 0} views
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83C\uDFC6'}
        title="Leaderboard"
        description="Most viewed video posts this week"
      />
      <Suspense fallback={<Loading />}>
        <LeaderboardContent />
      </Suspense>
    </main>
  );
}
