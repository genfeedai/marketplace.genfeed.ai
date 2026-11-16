import type { ListingRecord } from '@api/common/prisma/marketplace.types';
import { getExternalCheckoutProvider } from '@api/listings/utils/external-checkout';

/**
 * One credit is one cent (the main app's CREDIT_VALUE_DOLLARS is 0.01). A GEN
 * price is the card price in credits less 25%, rounded to a whole credit.
 */
const GEN_PRICE_PERCENT_OF_CARD_PRICE = 75;

/**
 * The GEN credit price of a listing, or null when it cannot be paid in
 * credits: a free listing, a listing priced in another currency, a premium
 * listing, or one bought outside the store.
 */
export function getCreditPrice(
  listing: Pick<
    ListingRecord,
    'price' | 'currency' | 'pricingTier' | 'previewData'
  >,
): number | null {
  if (
    !Number.isInteger(listing.price) ||
    listing.price <= 0 ||
    typeof listing.currency !== 'string' ||
    listing.currency.toLowerCase() !== 'usd' ||
    listing.pricingTier === 'premium' ||
    getExternalCheckoutProvider(listing)
  ) {
    return null;
  }
  const credits = Math.round(
    (listing.price * GEN_PRICE_PERCENT_OF_CARD_PRICE) / 100,
  );
  return credits > 0 ? credits : null;
}
