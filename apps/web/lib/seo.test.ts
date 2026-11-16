import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { metadata as payoutsMetadata } from '../app/payouts/page';
import robots from '../app/robots';
import { metadata as sellMetadata } from '../app/sell/page';
import sitemap from '../app/sitemap';
import nextConfig from '../next.config';
import {
  absoluteMarketplaceUrl,
  createIndexableMetadata,
  createNoIndexMetadata,
  INDEXABLE_ROUTES,
  isRetiredSellerSlug,
  MARKETPLACE_ORIGIN,
  RETIRED_SELLER_SLUGS,
} from './seo';

describe('marketplace SEO contract', () => {
  test('serves pre-optimized CDN images without Vercel transformations', () => {
    expect(nextConfig.images?.unoptimized).toBe(true);
  });

  test('keeps the complete public route inventory in the index', () => {
    expect(INDEXABLE_ROUTES.map((route) => route.path)).toEqual([
      '/',
      '/browse',
      '/workflows',
      '/prompts',
      '/presets',
      '/skills',
      '/gallery',
      '/videos',
      '/images',
      '/music',
      '/posts',
      '/leaderboard',
      '/about',
      '/guidelines',
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

  test('gives every indexable route unique metadata within search snippet limits', () => {
    const layout = readFileSync(
      new URL('../app/layout.tsx', import.meta.url),
      'utf8',
    );
    const defaultTitle = layout.match(/default: '([^']+)'/)?.[1] ?? '';
    const titleTemplate = layout.match(/template: '([^']+)'/)?.[1] ?? '';
    const descriptions = new Set<string>();

    expect(defaultTitle).not.toBe('');
    expect(titleTemplate).toContain('%s');

    for (const route of INDEXABLE_ROUTES) {
      const metadata = createIndexableMetadata(route.path);
      const title =
        route.path === '/'
          ? defaultTitle
          : titleTemplate.replace('%s', String(metadata.title));
      const description = metadata.description ?? '';

      expect(Array.from(title).length).toBeGreaterThanOrEqual(30);
      expect(Array.from(title).length).toBeLessThanOrEqual(60);
      expect(Array.from(description).length).toBeGreaterThanOrEqual(110);
      expect(Array.from(description).length).toBeLessThanOrEqual(160);
      expect(descriptions.has(description)).toBe(false);
      descriptions.add(description);
    }
  });

  test('advertises the marketplace sitemap from robots.txt', () => {
    const value = robots();

    expect(value.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(value.sitemap).toBe('https://marketplace.genfeed.ai/sitemap.xml');
  });

  test('keeps account and transient identities out of the index', () => {
    for (const path of ['/dashboard', '/library']) {
      const metadata = createNoIndexMetadata({
        title: 'Private route',
        description: 'Private marketplace route.',
        path,
      });

      expect(metadata.alternates?.canonical).toBe(path);
      expect(metadata.robots).toMatchObject({
        index: false,
        follow: false,
        noarchive: true,
      });
    }
  });

  test('keeps the unlinked seller pages out of the index', () => {
    expect(sellMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(payoutsMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  test('keeps retired marketplace identities as hard cuts', () => {
    expect(nextConfig.redirects).toBeUndefined();
    expect(RETIRED_SELLER_SLUGS).toEqual(['blog', 'featured', 'free']);

    for (const sellerSlug of RETIRED_SELLER_SLUGS) {
      expect(isRetiredSellerSlug(sellerSlug)).toBe(true);
    }

    expect(isRetiredSellerSlug('creator')).toBe(false);
  });
});
