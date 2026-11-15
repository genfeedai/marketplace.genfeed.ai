/**
 * Per-client request limits, counted per IP address in one-minute windows.
 *
 * The default covers every route. Checkout and claim create database rows and
 * Stripe sessions, so they get a tighter limit. The store web app renders
 * public pages on the server, so these requests share its address: keep the
 * default well above one page view per second.
 */
export const RATE_LIMIT_WINDOW_MS = 60_000;

export const DEFAULT_RATE_LIMIT = {
  limit: 300,
  ttl: RATE_LIMIT_WINDOW_MS,
};

export const PURCHASE_RATE_LIMIT = {
  default: { limit: 10, ttl: RATE_LIMIT_WINDOW_MS },
};
