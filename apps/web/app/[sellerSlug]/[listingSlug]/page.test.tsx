import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ListingPage, { generateMetadata } from './page';

const PARAMS = Promise.resolve({
  sellerSlug: 'genfeed',
  listingSlug: 'ugc-selfie-ad',
});

function stubListing(attributes: Record<string, unknown> = {}) {
  const request = vi.fn().mockResolvedValue(
    Response.json({
      data: {
        id: 'l1',
        attributes: {
          title: 'UGC selfie ad',
          slug: 'genfeed/ugc-selfie-ad',
          price: 0,
          shortDescription: 'A casual handheld selfie ad for a product.',
          description: 'The long description.',
          ...attributes,
        },
      },
    }),
  );
  vi.stubGlobal('fetch', request);
  vi.stubGlobal('React', React);
  return request;
}

describe('listing page', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('titles the page with the listing, not the slug', async () => {
    stubListing();

    const metadata = await generateMetadata({ params: PARAMS });

    expect(metadata.title).toBe('UGC selfie ad');
    expect(metadata.description).toBe(
      'A casual handheld selfie ad for a product.',
    );
    expect(metadata.openGraph?.title).toBe('UGC selfie ad');
    expect(metadata.alternates?.canonical).toBe('/genfeed/ugc-selfie-ad');
  });

  test('uses the thumbnail as the share image', async () => {
    stubListing({ thumbnail: 'https://cdn.genfeed.ai/presets/poster.jpg' });

    const metadata = await generateMetadata({ params: PARAMS });

    expect(metadata.openGraph?.images).toEqual([
      'https://cdn.genfeed.ai/presets/poster.jpg',
    ]);
    expect((metadata.twitter as { card?: string } | null)?.card).toBe(
      'summary_large_image',
    );
  });

  test('falls back to the long description when there is no short one', async () => {
    stubListing({ shortDescription: '' });

    const metadata = await generateMetadata({ params: PARAMS });

    expect(metadata.description).toBe('The long description.');
  });

  test('answers 404 for a listing that does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
    );

    await expect(generateMetadata({ params: PARAMS })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
  });

  test('never builds a title from the slug when the store is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 500 })),
    );

    const metadata = await generateMetadata({ params: PARAMS });

    expect(metadata.title).toBe('Listing unavailable');
  });

  test('shows the listing media above the title', async () => {
    stubListing({
      thumbnail: 'https://cdn.genfeed.ai/presets/poster.jpg',
      previewVideo: 'https://cdn.genfeed.ai/presets/clip.mp4',
      previewData: { mediaType: 'video', aspectRatio: '9:16' },
    });

    const html = renderToStaticMarkup(await ListingPage({ params: PARAMS }));

    expect(html).toContain('<video');
    expect(html).toContain('UGC selfie ad');
    expect(html).toContain('Video');
    expect(html.indexOf('<video')).toBeLessThan(html.indexOf('<h1'));
  });
});
