export interface Resource {
  id: string;
  attributes: Record<string, unknown>;
}

export interface Listing {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  currency: string;
  pricingTier?: string;
}

export class MarketplaceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseResource(value: unknown): Resource {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !record(value.attributes)
  ) {
    throw new Error('Marketplace returned an invalid resource.');
  }
  return { id: value.id, attributes: value.attributes };
}

export function parseCollection(payload: unknown): Resource[] {
  if (!record(payload) || !Array.isArray(payload.data)) {
    throw new Error('Marketplace returned an invalid collection.');
  }
  return payload.data.map(parseResource);
}

export function parseSingle(payload: unknown): Resource {
  if (!record(payload))
    throw new Error('Marketplace returned an invalid response.');
  return parseResource(payload.data);
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function listingFromResource(resource: Resource): Listing {
  const a = resource.attributes;
  if (
    typeof a.title !== 'string' ||
    typeof a.slug !== 'string' ||
    typeof a.price !== 'number' ||
    !Number.isFinite(a.price)
  ) {
    throw new Error('Marketplace returned an invalid listing.');
  }
  return {
    id: resource.id,
    title: a.title,
    slug: a.slug,
    price: a.price,
    currency: text(a.currency) || 'usd',
    shortDescription: text(a.shortDescription),
    description: text(a.description),
    pricingTier: text(a.pricingTier),
  };
}

export function listingHref(slug: string): string {
  const parts = slug.split('/');
  if (parts.length !== 2 || parts.some((part) => !/^[a-z0-9-]+$/.test(part))) {
    throw new Error('Marketplace returned an invalid listing address.');
  }
  return `/${parts.join('/')}`;
}

export function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    price / 100,
  );
}

export function marketplaceBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETPLACE_API_URL ||
    'https://api.marketplace.genfeed.ai'
  ).replace(/\/+$/, '');
}

export function genfeedAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_GENFEED_APP_URL || 'https://app.genfeed.ai'
  ).replace(/\/+$/, '');
}

export async function publicRequest(path: string): Promise<unknown> {
  const response = await fetch(`${marketplaceBaseUrl()}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new MarketplaceError(
      'Marketplace could not load this content.',
      response.status,
    );
  return response.json();
}

export async function authenticatedRequest(
  path: string,
  body?: unknown,
): Promise<unknown> {
  // Fetch through the app origin, where the host-scoped Genfeed session lives.
  // The bearer token remains in memory for this request only.
  const auth = await fetch(`${genfeedAppUrl()}/v1/auth/token`, {
    credentials: 'include',
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!auth.ok)
    throw new MarketplaceError('Sign in to Genfeed, then try again.', 401);
  const identity: unknown = await auth.json();
  if (
    !record(identity) ||
    typeof identity.token !== 'string' ||
    !identity.token
  ) {
    throw new MarketplaceError('Sign in to Genfeed, then try again.', 401);
  }
  const response = await fetch(`${marketplaceBaseUrl()}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${identity.token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message =
      record(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'Marketplace could not complete this request.';
    throw new MarketplaceError(message, response.status);
  }
  return response.json();
}

export function stripeRedirect(url: unknown): void {
  if (typeof url !== 'string')
    throw new Error('Stripe did not return a checkout link.');
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    !['checkout.stripe.com', 'connect.stripe.com'].includes(parsed.hostname)
  ) {
    throw new Error('Stripe returned an invalid checkout link.');
  }
  window.location.assign(parsed.href);
}
