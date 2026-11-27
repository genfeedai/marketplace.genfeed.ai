import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import LeaderboardPage from './leaderboard/page';
import PostsPage from './posts/page';

function stubPublicPosts(
  posts: { attributes: Record<string, unknown>; id: string }[],
): void {
  vi.stubGlobal('React', React);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: posts.map((post) => ({ ...post, type: 'posts' })),
        }),
        { status: 200 },
      ),
    ),
  );
}

const posts = [
  { attributes: { label: 'No analytics yet' }, id: 'none' },
  { attributes: { label: 'Small', totalViews: 40 }, id: 'small' },
  { attributes: { label: 'Zero views', totalViews: 0 }, id: 'zero' },
  { attributes: { label: 'Big', totalViews: 12500 }, id: 'big' },
];

describe('post view counts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('the leaderboard ranks posts by views and leaves out a post with no count', async () => {
    stubPublicPosts(posts);

    const html = renderToStaticMarkup(await LeaderboardPage());

    expect(html).not.toContain('No analytics yet');
    expect(html.indexOf('Big')).toBeLessThan(html.indexOf('Small'));
    expect(html.indexOf('Small')).toBeLessThan(html.indexOf('Zero views'));
    expect(html).toContain('12,500 views');
    expect(html).toContain('0 views');
  });

  test('the posts page shows a count only on a post that has one', async () => {
    stubPublicPosts(posts);

    const html = renderToStaticMarkup(await PostsPage());
    const cards = html.split('<article').slice(1);
    const countOf = (label: string): boolean =>
      /views/.test(cards.find((card) => card.includes(label)) ?? '');

    expect(cards).toHaveLength(4);
    expect(countOf('No analytics yet')).toBe(false);
    expect(countOf('Big')).toBe(true);
    expect(html).toContain('12,500 views');
    expect(html).toContain('0 views');
  });
});
