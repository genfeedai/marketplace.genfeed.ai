import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Footer from '../components/footer';
import Nav from '../components/nav';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const PUBLIC_ROUTES = [
  '/workflows',
  '/prompts',
  '/skills',
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

  test('advertises products and public Genfeed content', () => {
    vi.stubGlobal('React', React);

    const html = [
      renderToStaticMarkup(Nav()),
      renderToStaticMarkup(Footer()),
    ].join('');

    for (const href of PUBLIC_ROUTES) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
