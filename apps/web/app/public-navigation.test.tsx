import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Footer from '../components/footer';
import Nav from '../components/nav';
import BrowsePage from './browse/page';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const PRODUCT_ROUTES = ['/workflows', '/prompts', '/skills'] as const;
const RETIRED_MEDIA_ROUTES = [
  '/videos',
  '/images',
  '/music',
  '/posts',
  '/leaderboard',
] as const;

describe('marketplace public navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('advertises product categories without retired media galleries', () => {
    vi.stubGlobal('React', React);

    const html = [
      renderToStaticMarkup(Nav()),
      renderToStaticMarkup(BrowsePage()),
      renderToStaticMarkup(Footer()),
    ].join('');

    for (const href of PRODUCT_ROUTES) {
      expect(html).toContain(`href="${href}"`);
    }

    for (const href of RETIRED_MEDIA_ROUTES) {
      expect(html).not.toContain(`href="${href}"`);
    }
  });
});
