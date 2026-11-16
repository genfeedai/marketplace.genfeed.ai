/** Audience of a token the Genfeed API signs to call the marketplace. */
export const MARKETPLACE_SERVICE_AUDIENCE = 'marketplace-service';

/** Subject of those tokens: the one service allowed to call the routes. */
export const MARKETPLACE_SERVICE_SUBJECT = 'genfeed-api';

/** A service token may not live longer than this, whatever its expiry says. */
export const MARKETPLACE_SERVICE_MAX_TOKEN_SECONDS = 300;

export const MARKETPLACE_SERVICE_SCOPES = {
  recordPurchase: 'purchases:record',
  refundPurchase: 'purchases:refund',
} as const;

export type MarketplaceServiceScope =
  (typeof MARKETPLACE_SERVICE_SCOPES)[keyof typeof MARKETPLACE_SERVICE_SCOPES];
