import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ProductCatalog from './product-catalog';

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

function stubCatalog(data: unknown[]) {
  const request = vi.fn().mockResolvedValue(Response.json({ data }));
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
      'https://api.example.com/marketplace/listings?type=preset&limit=50',
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
      'https://api.example.com/marketplace/listings?limit=50',
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
});
