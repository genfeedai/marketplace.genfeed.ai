import type { ListingRecord } from '@api/common/prisma/marketplace.types';

/**
 * A listing sold outside the store. The Skills Pro bundle is bought through
 * the main Genfeed API's Skills Pro checkout and delivered by receipt, so the
 * store must never create a purchase for it.
 */
export type ExternalCheckoutProvider = 'skills-pro';

const EXTERNAL_CHECKOUT_PROVIDERS: readonly string[] = ['skills-pro'];

/** Reads `previewData.externalCheckout.provider`; anything else is a normal listing. */
export function getExternalCheckoutProvider(
  listing: Pick<ListingRecord, 'previewData'>,
): ExternalCheckoutProvider | null {
  const marker = listing.previewData?.externalCheckout;
  if (typeof marker !== 'object' || marker === null || Array.isArray(marker)) {
    return null;
  }
  const provider = (marker as Record<string, unknown>).provider;
  return typeof provider === 'string' &&
    EXTERNAL_CHECKOUT_PROVIDERS.includes(provider)
    ? (provider as ExternalCheckoutProvider)
    : null;
}

export const EXTERNAL_CHECKOUT_MESSAGE =
  'This listing is bought on Genfeed, not in the store. Use its Buy button.';
