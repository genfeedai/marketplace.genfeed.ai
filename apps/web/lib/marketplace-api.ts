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
  /** Price in GEN credits, 25% below the card price; null when the listing cannot be paid with GEN. */
  creditPrice: number | null;
  pricingTier?: string;
  /** Set when the listing is bought outside the store (the Skills Pro bundle). */
  externalCheckout: 'skills-pro' | null;
  /** Public listing data: what the bundle contains, for example. */
  previewData: Record<string, unknown>;
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

function parseResource(value: unknown): Resource {
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
  const previewData = record(a.previewData) ? a.previewData : {};
  return {
    id: resource.id,
    title: a.title,
    slug: a.slug,
    price: a.price,
    currency: text(a.currency) || 'usd',
    creditPrice:
      typeof a.creditPrice === 'number' &&
      Number.isInteger(a.creditPrice) &&
      a.creditPrice > 0
        ? a.creditPrice
        : null,
    shortDescription: text(a.shortDescription),
    description: text(a.description),
    pricingTier: text(a.pricingTier),
    previewData,
    externalCheckout:
      record(previewData.externalCheckout) &&
      previewData.externalCheckout.provider === 'skills-pro'
        ? 'skills-pro'
        : null,
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

export function formatCredits(credits: number): string {
  return `${new Intl.NumberFormat('en-US').format(credits)} GEN`;
}

function marketplaceBaseUrl(): string {
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

async function sessionToken(): Promise<string> {
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
  return identity.token;
}

/** The first readable message of a Marketplace or Genfeed error body. */
function errorMessage(payload: unknown, fallback: string): string {
  if (!record(payload)) return fallback;
  if (typeof payload.message === 'string') return payload.message;
  const first = Array.isArray(payload.errors) ? payload.errors[0] : undefined;
  if (record(first)) {
    if (typeof first.detail === 'string') return first.detail;
    if (typeof first.title === 'string') return first.title;
  }
  return fallback;
}

async function signedRequest(
  url: string,
  body: unknown,
  fallback: string,
): Promise<unknown> {
  const token = await sessionToken();
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new MarketplaceError(
      errorMessage(payload, fallback),
      response.status,
    );
  }
  return response.json();
}

export async function authenticatedRequest(
  path: string,
  body?: unknown,
): Promise<unknown> {
  return signedRequest(
    `${marketplaceBaseUrl()}${path}`,
    body,
    'Marketplace could not complete this request.',
  );
}

/**
 * Pays for a listing with the signed-in organization's GEN credits. The call
 * goes to the Genfeed API, which takes the credits and records the purchase in
 * Marketplace. The same `idempotencyKey` on a retry never charges twice.
 */
export async function payWithCredits(
  listingId: string,
  idempotencyKey: string,
): Promise<void> {
  await signedRequest(
    `${genfeedAppUrl()}/v1/marketplace-purchases/${encodeURIComponent(listingId)}/credits`,
    { idempotencyKey },
    'Could not pay with GEN. Nothing was taken.',
  );
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
