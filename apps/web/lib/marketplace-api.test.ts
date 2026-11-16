import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  authenticatedRequest,
  formatCredits,
  formatPrice,
  listingFromResource,
  listingHref,
  parseCollection,
  parseSingle,
  payWithCredits,
  publicRequest,
  stripeRedirect,
} from './marketplace-api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Marketplace browser contract', () => {
  test('uses the app session to obtain a token, then sends it only to Marketplace', async () => {
    vi.stubEnv('NEXT_PUBLIC_GENFEED_APP_URL', 'https://app.example.com');
    vi.stubEnv(
      'NEXT_PUBLIC_MARKETPLACE_API_URL',
      'https://marketplace-api.example.com',
    );
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: 'signed-fixture' }))
      .mockResolvedValueOnce(Response.json({ data: [] }));
    vi.stubGlobal('fetch', request);
    expect(await authenticatedRequest('/marketplace/purchases')).toEqual({
      data: [],
    });
    expect(request.mock.calls[0]).toEqual([
      'https://app.example.com/v1/auth/token',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
    ]);
    expect(request.mock.calls[1]).toEqual([
      'https://marketplace-api.example.com/marketplace/purchases',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer signed-fixture',
          'Content-Type': 'application/json',
        },
      }),
    ]);
  });
  test('stops before sending a Marketplace request without a signed-in session', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', request);
    await expect(authenticatedRequest('/seller/profile')).rejects.toMatchObject(
      { status: 401 },
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  test('browses publicly without session credentials and reports outages', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', request);
    await expect(publicRequest('/marketplace/listings')).rejects.toMatchObject({
      status: 503,
    });
    expect(request.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
    });
  });
  test('parses JSON:API and validates listing addresses before using links', () => {
    const resource = {
      id: 'a',
      attributes: {
        title: 'Workflow',
        slug: 'seller/workflow',
        price: 250,
        currency: 'usd',
      },
    };
    expect(listingFromResource(parseSingle({ data: resource })).title).toBe(
      'Workflow',
    );
    expect(parseCollection({ data: [resource] })).toHaveLength(1);
    expect(listingHref('seller/workflow')).toBe('/seller/workflow');
    expect(() => listingHref('//attacker.example')).toThrow();
    expect(() => parseCollection({ docs: [] })).toThrow();
    expect(() =>
      listingFromResource({ id: 'a', attributes: { price: '250' } }),
    ).toThrow();
    expect(formatPrice(250, 'usd')).toBe('$2.50');
    expect(formatPrice(0, 'usd')).toBe('Free');
  });
  test('accepts only Stripe checkout and Connect links', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    stripeRedirect('https://checkout.stripe.com/c/pay/fixture');
    stripeRedirect('https://connect.stripe.com/setup/fixture');
    expect(assign).toHaveBeenCalledTimes(2);
    expect(() =>
      stripeRedirect('https://checkout.stripe.com.attacker.example/pay'),
    ).toThrow();
    expect(() => stripeRedirect('javascript:alert(1)')).toThrow();
  });

  test.each([
    [2175, 2175],
    [0, null],
    [-5, null],
    [12.5, null],
    ['2175', null],
    [null, null],
    [undefined, null],
  ])('reads a GEN price of %j as %j', (creditPrice, expected) => {
    const listing = listingFromResource({
      id: 'a',
      attributes: {
        title: 'Item',
        slug: 'genfeed/item',
        price: 2900,
        creditPrice,
      },
    });

    expect(listing.creditPrice).toBe(expected);
  });
  test('formats GEN amounts with a thousands separator', () => {
    expect(formatCredits(2175)).toBe('2,175 GEN');
    expect(formatCredits(749)).toBe('749 GEN');
  });
});

describe('Paying with GEN', () => {
  test('sends the session token and the attempt key to the Genfeed API only', async () => {
    vi.stubEnv('NEXT_PUBLIC_GENFEED_APP_URL', 'https://app.example.com');
    vi.stubEnv(
      'NEXT_PUBLIC_MARKETPLACE_API_URL',
      'https://marketplace-api.example.com',
    );
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: 'signed-fixture' }))
      .mockResolvedValueOnce(Response.json({ creditsPaid: 2175 }));
    vi.stubGlobal('fetch', request);

    await payWithCredits('listing 1', 'attempt-1');

    expect(request.mock.calls[1]).toEqual([
      'https://app.example.com/v1/marketplace-purchases/listing%201/credits',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idempotencyKey: 'attempt-1' }),
        headers: {
          Authorization: 'Bearer signed-fixture',
          'Content-Type': 'application/json',
        },
      }),
    ]);
  });
  test('shows the missing-GEN message the Genfeed API returns on a 402', async () => {
    vi.stubEnv('NEXT_PUBLIC_GENFEED_APP_URL', 'https://app.example.com');
    const detail =
      'You need 120 more GEN to buy this. It costs 2175 and you have 2055. Nothing was taken.';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ token: 'signed-fixture' }))
        .mockResolvedValueOnce(
          Response.json(
            { errors: [{ detail, title: 'Insufficient credits' }] },
            { status: 402 },
          ),
        ),
    );

    await expect(
      payWithCredits('listing-1', 'attempt-1'),
    ).rejects.toMatchObject({ message: detail, status: 402 });
  });
  test('does not call the Genfeed API without a signed-in session', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', request);

    await expect(
      payWithCredits('listing-1', 'attempt-1'),
    ).rejects.toMatchObject({ status: 401 });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
