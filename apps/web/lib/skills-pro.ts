import { record, stripeRedirect, text } from './marketplace-api';
import { getApiBaseUrl } from './public-content';

export interface SkillsProPack {
  slug: string;
  name: string;
  category: string;
  description: string;
}

export interface SkillsProBundle {
  /** Bundle price in cents, read from the Skills Pro registry on every call. */
  priceCents: number;
  packs: SkillsProPack[];
}

/** The path the buyer returns to after Stripe; the store page reads `session_id`. */
export const SKILLS_PRO_SUCCESS_PATH = '/skills/purchased';
export const SKILLS_PRO_CANCEL_PATH = '/skills';

export function parseSkillsProStorefront(payload: unknown): SkillsProBundle {
  if (
    !record(payload) ||
    typeof payload.bundlePrice !== 'number' ||
    !Number.isFinite(payload.bundlePrice) ||
    payload.bundlePrice < 0 ||
    !Array.isArray(payload.skills)
  ) {
    throw new Error('Genfeed returned an invalid Skills Pro catalog.');
  }
  const packs = payload.skills.map((entry): SkillsProPack => {
    if (!record(entry) || typeof entry.slug !== 'string' || !entry.slug) {
      throw new Error('Genfeed returned an invalid Skills Pro catalog.');
    }
    return {
      slug: entry.slug,
      name: text(entry.name) || entry.slug,
      category: text(entry.category),
      description: text(entry.description),
    };
  });
  return { priceCents: Math.round(payload.bundlePrice * 100), packs };
}

export async function fetchSkillsProBundle(): Promise<SkillsProBundle> {
  const response = await fetch(`${getApiBaseUrl()}/skills-pro/storefront`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error('Genfeed could not load the Skills Pro catalog.');
  }
  return parseSkillsProStorefront(await response.json());
}

/**
 * Starts the existing Skills Pro checkout on the Genfeed API for the whole
 * bundle and sends the browser to Stripe. No store purchase is created.
 */
export async function startSkillsProCheckout(origin: string): Promise<void> {
  const base = origin.replace(/\/+$/, '');
  const response = await fetch(`${getApiBaseUrl()}/skills-pro/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cancelUrl: `${base}${SKILLS_PRO_CANCEL_PATH}`,
      successUrl: `${base}${SKILLS_PRO_SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error('Skills Pro checkout is not available right now.');
  }
  const payload: unknown = await response.json().catch(() => null);
  stripeRedirect(record(payload) ? payload.url : undefined);
}
