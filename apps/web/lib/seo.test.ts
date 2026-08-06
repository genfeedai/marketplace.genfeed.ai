import { describe, expect, test } from 'vitest';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import nextConfig from '../next.config';
import {
  absoluteMarketplaceUrl,
  createIndexableMetadata,
  createNoIndexMetadata,
  INDEXABLE_ROUTES,
  MARKETPLACE_ORIGIN,
} from './seo';

describe('marketplace SEO contract', () => {
  test('keeps the complete public route inventory in the index', () => {
    expect(INDEXABLE_ROUTES.map((route) => route.path)).toEqual([
      '/',
      '/browse',
      '/workflows',
      '/prompts',
      '/skills',
      '/videos',
      '/images',
      '/music',
      '/posts',
      '/leaderboard',
      '/sell',
      '/guidelines',
      '/payouts',
      '/about',
      '/contact',
      '/terms',
      '/privacy',
    ]);
  });

  test('publishes a unique, intended-origin-only sitemap', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(entries).toHaveLength(INDEXABLE_ROUTES.length);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toEqual(
      INDEXABLE_ROUTES.map((route) => absoluteMarketplaceUrl(route.path)),
    );

    for (const url of urls) {
      expect(new URL(url).origin).toBe(MARKETPLACE_ORIGIN);
    }
  });

  test('gives every sitemap route a description and self canonical', () => {
    for (const route of INDEXABLE_ROUTES) {
      const metadata = createIndexableMetadata(route.path);

      expect(metadata.description).toBe(route.description);
      expect(route.description.trim().length).toBeGreaterThan(0);
      expect(metadata.alternates?.canonical).toBe(route.path);
      expect(metadata.robots).toMatchObject({ index: true, follow: true });
    }
  });

  test('advertises the marketplace sitemap from robots.txt', () => {
    const value = robots();

    expect(value.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(value.sitemap).toBe('https://marketplace.genfeed.ai/sitemap.xml');
  });

  test('keeps account and transient identities out of the index', () => {
    const metadata = createNoIndexMetadata({
      title: 'Private route',
      description: 'Private marketplace route.',
      path: '/library',
    });

    expect(metadata.alternates?.canonical).toBe('/library');
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
    });
  });

  test('redirects retired legacy identities to their real destinations', async () => {
    const redirects = nextConfig.redirects ? await nextConfig.redirects() : [];
    const destinations = new Map(
      redirects.map((redirect) => [redirect.source, redirect.destination]),
    );

    expect(destinations.get('/free')).toBe('/browse');
    expect(destinations.get('/free/:path*')).toBe('/browse');
    expect(destinations.get('/featured')).toBe('/browse');
    expect(destinations.get('/featured/:path*')).toBe('/browse');
    expect(destinations.get('/blog')).toBe('https://genfeed.ai/articles');
    expect(destinations.get('/blog/:path*')).toBe(
      'https://genfeed.ai/articles',
    );
  });
});
