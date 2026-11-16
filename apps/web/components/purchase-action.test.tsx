import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Listing } from '@/lib/marketplace-api';
import PurchaseAction from './purchase-action';

function listing(overrides: Partial<Listing>): Listing {
  return {
    id: 'listing-1',
    title: 'Hook Pack',
    slug: 'genfeed/hook-pack',
    shortDescription: '',
    description: '',
    price: 2900,
    currency: 'usd',
    creditPrice: 2175,
    externalCheckout: null,
    previewData: {},
    ...overrides,
  };
}

describe('purchase action', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('offers both card and GEN payment on a listing with a GEN price', () => {
    vi.stubGlobal('React', React);

    const html = renderToStaticMarkup(<PurchaseAction listing={listing({})} />);

    expect(html).toContain('Buy with Stripe');
    expect(html).toContain('Pay with GEN');
  });

  test('offers only the card on a listing without a GEN price', () => {
    vi.stubGlobal('React', React);

    const html = renderToStaticMarkup(
      <PurchaseAction listing={listing({ creditPrice: null })} />,
    );

    expect(html).toContain('Buy with Stripe');
    expect(html).not.toContain('Pay with GEN');
  });

  test('offers no GEN payment on a premium listing', () => {
    vi.stubGlobal('React', React);

    const html = renderToStaticMarkup(
      <PurchaseAction listing={listing({ pricingTier: 'premium' })} />,
    );

    expect(html).toContain('Available with Genfeed Premium');
    expect(html).not.toContain('Pay with GEN');
  });
});
