import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';
import { fetchPublicContent, getViewCount } from '@/lib/public-content';

export default async function LeaderboardPage(): Promise<ReactNode> {
  const result = await fetchPublicContent('posts', { limit: 100 });
  const rankedPosts = result.items
    .flatMap((post) => {
      const views = getViewCount(post);
      return views === null ? [] : [{ post, views }];
    })
    .sort((left, right) => right.views - left.views)
    .slice(0, 20);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Leaderboard"
        description="The most-viewed public posts from the Genfeed community"
      />

      {result.status === 'unavailable' && (
        <EmptyState
          label="Leaderboard Unavailable"
          description="Genfeed could not load public post rankings right now. Please try again shortly."
        />
      )}

      {result.status === 'success' && rankedPosts.length === 0 && (
        <EmptyState
          label="No Public Rankings Yet"
          description="Popular posts will appear here when creators publish content publicly on Genfeed."
        />
      )}

      {result.status === 'success' && rankedPosts.length > 0 && (
        <ol className="space-y-3">
          {rankedPosts.map(({ post, views }, index) => (
            <li
              key={post.id}
              className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 card-glow"
            >
              <span className="text-center text-xl font-bold text-white/40">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-white">
                  {post.label ?? 'Untitled post'}
                </h2>
                <p className="text-sm text-white/50">
                  {post.platform ?? 'Genfeed'}
                </p>
              </div>
              <span className="whitespace-nowrap text-sm text-white/70">
                {views.toLocaleString('en-US')} views
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
