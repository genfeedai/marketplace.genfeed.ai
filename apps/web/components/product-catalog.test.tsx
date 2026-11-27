import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ProductCatalog, { parsePageParam } from './product-catalog';

function listing(id: string, title: string, slug: string, price: number) {
  return {
    id,
    type: 'listing',
    attributes: {
      title,
      slug,
      price,
      currency: 'usd',
      shortDescription: `${title} in one line.`,
      description: `${title} in full.`,
    },
  };
}

function stubCatalog(
  data: unknown[],
  pagination?: { page: number; pages: number },
) {
  const request = vi
    .fn()
    .mockResolvedValue(
      Response.json({ data, links: pagination ? { pagination } : undefined }),
    );
  vi.stubGlobal('fetch', request);
  vi.stubGlobal('React', React);
  return request;
}

describe('product catalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test('lists a published preset with its price and a link to its page', async () => {
    vi.stubEnv('NEXT_PUBLIC_MARKETPLACE_API_URL', 'https://api.example.com');
    const request = stubCatalog([
      listing('1', 'Studio Portrait Look', 'genfeed/studio-portrait-look', 900),
    ]);

    const html = renderToStaticMarkup(await ProductCatalog({ type: 'preset' }));

    expect(request.mock.calls[0][0]).toBe(
      'https://api.example.com/marketplace/listings?type=preset&limit=48',
    );
    expect(html).toContain('href="/genfeed/studio-portrait-look"');
    expect(html).toContain('Studio Portrait Look');
    expect(html).toContain('$9.00');
  });

  test('asks for every product type when no type is given', async () => {
    vi.stubEnv('NEXT_PUBLIC_MARKETPLACE_API_URL', 'https://api.example.com');
    const request = stubCatalog([
      listing('1', 'Launch Thread', 'genfeed/launch-thread', 0),
    ]);

    const html = renderToStaticMarkup(await ProductCatalog({}));

    expect(request.mock.calls[0][0]).toBe(
      'https://api.example.com/marketplace/listings?limit=48',
    );
    expect(html).toContain('Free');
  });

  test('an empty catalog promises products from Genfeed, not from sellers', async () => {
    stubCatalog([]);

    const html = renderToStaticMarkup(await ProductCatalog({ type: 'preset' }));

    expect(html).toContain('Nothing here yet');
    expect(html).toContain('New products from Genfeed will appear here.');
    expect(html).not.toMatch(/seller|listing/i);
  });

  test('a failed catalog request shows that the catalog is unavailable', async () => {
    vi.stubGlobal('React', React);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 503 })),
    );

    const html = renderToStaticMarkup(await ProductCatalog({ type: 'skill' }));

    expect(html).toContain('Catalog unavailable');
  });

  test('a catalog with more pages links to the next page and not back', async () => {
    vi.stubEnv('NEXT_PUBLIC_MARKETPLACE_API_URL', 'https://api.example.com');
    stubCatalog([listing('1', 'Hook Writer', 'genfeed/hook-writer', 0)], {
      page: 1,
      pages: 2,
    });

    const html = renderToStaticMarkup(await ProductCatalog({ type: 'skill' }));

    expect(html).toContain('Page 1 of 2');
    expect(html).toContain('href="/skills?page=2"');
    expect(html).not.toContain('Previous');
  });

  test('the second page asks the API for it and links back to the first', async () => {
    vi.stubEnv('NEXT_PUBLIC_MARKETPLACE_API_URL', 'https://api.example.com');
    const request = stubCatalog(
      [listing('2', 'Thread Writer', 'genfeed/thread-writer', 0)],
      { page: 2, pages: 2 },
    );

    const html = renderToStaticMarkup(
      await ProductCatalog({ type: 'skill', page: 2 }),
    );

    expect(request.mock.calls[0][0]).toBe(
      'https://api.example.com/marketplace/listings?type=skill&limit=48&page=2',
    );
    expect(html).toContain('Page 2 of 2');
    expect(html).toContain('href="/skills"');
    expect(html).not.toContain('Next');
  });

  test('a single page shows no paging', async () => {
    vi.stubEnv('NEXT_PUBLIC_MARKETPLACE_API_URL', 'https://api.example.com');
    stubCatalog([listing('1', 'Hook Writer', 'genfeed/hook-writer', 0)], {
      page: 1,
      pages: 1,
    });

    const html = renderToStaticMarkup(await ProductCatalog({ type: 'skill' }));

    expect(html).not.toContain('Page 1 of');
  });

  test('a page query that is not a positive whole number means page 1', () => {
    expect(parsePageParam('3')).toBe(3);
    expect(parsePageParam(['2', '5'])).toBe(2);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('-4')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
    expect(parsePageParam(undefined)).toBe(1);
  });
});
