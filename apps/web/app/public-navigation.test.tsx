import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Footer from '../components/footer';
import Nav from '../components/nav';
import { INDEXABLE_ROUTES } from '../lib/seo';
import AboutPage from './about/page';
import ContactPage from './contact/page';
import GalleryPage from './gallery/page';
import GuidelinesPage from './guidelines/page';
import HomePage from './page';

vi.mock('next/navigation', () => ({ usePathname: () => '/videos' }));

function internalLinks(html: string): string[] {
  return [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
}

describe('store public navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('the top navigation lists the product types, the gallery and the library', () => {
    vi.stubGlobal('React', React);

    expect(internalLinks(renderToStaticMarkup(Nav()))).toEqual([
      '/',
      '/workflows',
      '/prompts',
      '/presets',
      '/skills',
      '/gallery',
      '/library',
    ]);
  });

  test('a gallery page keeps the Gallery link highlighted', () => {
    vi.stubGlobal('React', React);

    expect(renderToStaticMarkup(Nav())).toMatch(
      /href="\/gallery"[^>]*bg-white\/15|bg-white\/15[^>]*href="\/gallery"/,
    );
  });

  test('the footer lists the store, Genfeed and legal pages', () => {
    vi.stubGlobal('React', React);

    expect(internalLinks(renderToStaticMarkup(Footer()))).toEqual([
      '/',
      '/workflows',
      '/prompts',
      '/presets',
      '/skills',
      '/gallery',
      '/library',
      '/about',
      '/guidelines',
      '/contact',
      '/terms',
      '/privacy',
    ]);
  });

  test('the gallery page links the five public content pages', () => {
    vi.stubGlobal('React', React);

    expect(internalLinks(renderToStaticMarkup(GalleryPage()))).toEqual([
      '/videos',
      '/images',
      '/music',
      '/posts',
      '/leaderboard',
    ]);
  });

  test('every public page the navigation and footer link to is in the sitemap', () => {
    const sitemapPaths = INDEXABLE_ROUTES.map((route) => route.path);

    // The library is an account page and stays out of the index.
    expect(sitemapPaths).toEqual(
      expect.arrayContaining([
        '/',
        '/workflows',
        '/prompts',
        '/presets',
        '/skills',
        '/gallery',
        '/about',
        '/guidelines',
        '/contact',
        '/terms',
        '/privacy',
      ]),
    );
    expect(sitemapPaths).not.toContain('/library');
  });

  test('nothing on the public pages invites a visitor to sell', () => {
    vi.stubGlobal('React', React);

    const html = [
      Nav(),
      Footer(),
      HomePage(),
      AboutPage(),
      GuidelinesPage(),
      ContactPage(),
      GalleryPage(),
    ]
      .map((page) => renderToStaticMarkup(page))
      .join('');

    expect(html).not.toMatch(
      /href="\/(sell|payouts|dashboard)"|be a seller|sell on|payout|seller (profile|dashboard|page)|create your first listing/i,
    );
  });
});
