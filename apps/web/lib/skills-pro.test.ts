import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  fetchSkillsProBundle,
  parseSkillsProStorefront,
  startSkillsProCheckout,
} from './skills-pro';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const storefront = {
  bundlePrice: 49,
  skills: [
    {
      slug: 'x-warmup-pro',
      name: 'X Warmup Pro',
      category: 'warmup',
      description: 'Run a paid X warmup.',
    },
  ],
};

describe('Skills Pro bundle', () => {
  test('reads the bundle price in cents and the packs it contains', () => {
    expect(parseSkillsProStorefront(storefront)).toEqual({
      priceCents: 4900,
      packs: [
        {
          slug: 'x-warmup-pro',
          name: 'X Warmup Pro',
          category: 'warmup',
          description: 'Run a paid X warmup.',
        },
      ],
    });
  });

  test('shows a new registry price on the next read', async () => {
    vi.stubEnv('NEXT_PUBLIC_GENFEED_API_URL', 'https://api.example.com');
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json(storefront))
      .mockResolvedValueOnce(Response.json({ ...storefront, bundlePrice: 39 }));
    vi.stubGlobal('fetch', request);
    expect((await fetchSkillsProBundle()).priceCents).toBe(4900);
    expect((await fetchSkillsProBundle()).priceCents).toBe(3900);
    expect(request.mock.calls[0][0]).toBe(
      'https://api.example.com/v1/skills-pro/storefront',
    );
  });

  test.each([
    [null],
    [{ bundlePrice: 'free', skills: [] }],
    [{ bundlePrice: 49, skills: [{ name: 'No slug' }] }],
  ])('rejects the invalid catalog %j', (payload) => {
    expect(() => parseSkillsProStorefront(payload)).toThrow(
      'invalid Skills Pro catalog',
    );
  });
});

describe('Skills Pro checkout', () => {
  test('asks the Genfeed API for a checkout that returns to the store', async () => {
    vi.stubEnv('NEXT_PUBLIC_GENFEED_API_URL', 'https://api.example.com');
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    const request = vi
      .fn()
      .mockResolvedValue(
        Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
      );
    vi.stubGlobal('fetch', request);
    await startSkillsProCheckout('https://shop.genfeed.ai/');
    expect(request.mock.calls[0][0]).toBe(
      'https://api.example.com/v1/skills-pro/checkout',
    );
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      cancelUrl: 'https://shop.genfeed.ai/skills',
      successUrl:
        'https://shop.genfeed.ai/skills/purchased?session_id={CHECKOUT_SESSION_ID}',
    });
    expect(assign).toHaveBeenCalledWith(
      'https://checkout.stripe.com/c/pay/cs_test_1',
    );
  });

  test('refuses a link that is not on Stripe', async () => {
    vi.stubGlobal('window', { location: { assign: vi.fn() } });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ url: 'https://evil.example/x' })),
    );
    await expect(startSkillsProCheckout('https://m.example')).rejects.toThrow(
      'invalid checkout link',
    );
  });

  test('reports an unavailable checkout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 503 })),
    );
    await expect(startSkillsProCheckout('https://m.example')).rejects.toThrow(
      'not available',
    );
  });
});
