import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  allowedMediaUrl,
  type Listing,
  listingFromResource,
} from '@/lib/marketplace-api';
import { ListingCardMedia, ListingPageMedia } from './listing-media';

function listing(attributes: Record<string, unknown> = {}): Listing {
  return listingFromResource({
    id: 'l1',
    attributes: {
      title: 'UGC selfie ad',
      slug: 'genfeed/ugc-selfie-ad',
      price: 0,
      ...attributes,
    },
  });
}

const CLIP = {
  thumbnail: 'https://cdn.genfeed.ai/presets/poster.jpg',
  previewVideo: 'https://cdn.genfeed.ai/presets/clip.mp4',
  previewData: {
    mediaType: 'video',
    aspectRatio: '9:16',
    mediaAlt: 'A founder talks to camera.',
  },
};

describe('listing media', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('a card with a thumbnail shows it at the listing ratio with its alt text', () => {
    vi.stubGlobal('React', React);

    const html = renderToStaticMarkup(
      <ListingCardMedia listing={listing(CLIP)} />,
    );

    expect(html).toContain('src="https://cdn.genfeed.ai/presets/poster.jpg"');
    expect(html).toContain('alt="A founder talks to camera."');
    expect(html).toContain('aspect-ratio:9 / 16');
  });

  test('a card without media renders nothing, no empty frame', () => {
    vi.stubGlobal('React', React);

    expect(renderToStaticMarkup(<ListingCardMedia listing={listing()} />)).toBe(
      '',
    );
    expect(renderToStaticMarkup(<ListingPageMedia listing={listing()} />)).toBe(
      '',
    );
  });

  test('the listing page plays the clip muted, with controls and no autoplay', () => {
    vi.stubGlobal('React', React);

    const html = renderToStaticMarkup(
      <ListingPageMedia listing={listing(CLIP)} />,
    );

    expect(html).toContain('<video');
    expect(html).toContain('src="https://cdn.genfeed.ai/presets/clip.mp4"');
    expect(html).toContain(
      'poster="https://cdn.genfeed.ai/presets/poster.jpg"',
    );
    expect(html).toContain('controls');
    expect(html).toContain('muted');
    expect(html).not.toContain('autoplay');
  });

  test('the listing page shows every preview image', () => {
    vi.stubGlobal('React', React);

    const html = renderToStaticMarkup(
      <ListingPageMedia
        listing={listing({
          thumbnail: 'https://cdn.genfeed.ai/presets/after.png',
          previewImages: [
            'https://cdn.genfeed.ai/presets/before.png',
            'https://cdn.genfeed.ai/presets/after.png',
          ],
        })}
      />,
    );

    expect(html).toContain('presets/before.png');
    expect(html).toContain('presets/after.png');
  });

  test('a thumbnail alone is shown on the listing page', () => {
    vi.stubGlobal('React', React);

    const html = renderToStaticMarkup(
      <ListingPageMedia
        listing={listing({ thumbnail: 'https://cdn.genfeed.ai/presets/a.png' })}
      />,
    );

    expect(html).toContain('presets/a.png');
  });

  test('an address on another host is never rendered', () => {
    vi.stubGlobal('React', React);
    const foreign = listing({
      thumbnail: 'https://example.com/a.png',
      previewImages: [
        'https://example.com/b.png',
        'http://cdn.genfeed.ai/c.png',
      ],
      previewVideo: 'https://genfeed.ai.example.com/v.mp4',
    });

    expect(renderToStaticMarkup(<ListingCardMedia listing={foreign} />)).toBe(
      '',
    );
    expect(renderToStaticMarkup(<ListingPageMedia listing={foreign} />)).toBe(
      '',
    );
    expect(allowedMediaUrl('https://assets.genfeed.ai/a.png')).toBe(
      'https://assets.genfeed.ai/a.png',
    );
    expect(allowedMediaUrl('javascript:alert(1)')).toBeNull();
  });
});
