import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';
import { fetchPublicContent, getViewCount } from '@/lib/public-content';

function getExternalUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function PostsPage(): Promise<ReactNode> {
  const result = await fetchPublicContent('posts');

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Posts"
        description="Public content published by the Genfeed community"
      />

      {result.status === 'unavailable' && (
        <EmptyState
          label="Posts Unavailable"
          description="Genfeed could not load public posts right now. Please try again shortly."
        />
      )}

      {result.status === 'success' && result.items.length === 0 && (
        <EmptyState
          label="No Public Posts Yet"
          description="Posts will appear here when creators publish them publicly on Genfeed."
        />
      )}

      {result.status === 'success' && result.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((post) => {
            const externalUrl = getExternalUrl(post.url);
            const views = getViewCount(post);

            return (
              <article
                key={post.id}
                className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-6 card-glow"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {post.platform ?? 'Genfeed'}
                  </span>
                  {views !== null && (
                    <span className="text-sm text-white/50">
                      {views.toLocaleString('en-US')} views
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {post.label ?? 'Untitled post'}
                </h2>
                {post.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-white/60">
                    {post.description}
                  </p>
                )}
                {externalUrl && (
                  <a
                    className="mt-5 text-sm font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
                    href={externalUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View published post
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
