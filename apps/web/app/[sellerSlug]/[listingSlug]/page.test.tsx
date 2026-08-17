import { describe, expect, test } from 'vitest';
import ListingPage, { generateMetadata } from './page';

const retiredSellerSlugs = ['blog', 'free', 'featured'] as const;

describe('marketplace listing route', () => {
  test.each(retiredSellerSlugs)(
    'hard-cuts the retired /%s/* route family',
    async (sellerSlug) => {
      const params = Promise.resolve({
        listingSlug: 'legacy-listing',
        sellerSlug,
      });

      await expect(generateMetadata({ params })).rejects.toThrow();
      await expect(ListingPage({ params })).rejects.toThrow();
    },
  );

  test('keeps ordinary seller listing URLs available', async () => {
    const params = Promise.resolve({
      listingSlug: 'portrait-workflow',
      sellerSlug: 'creator',
    });

    await expect(generateMetadata({ params })).resolves.toMatchObject({
      alternates: { canonical: '/creator/portrait-workflow' },
      robots: { follow: false, index: false },
    });
    await expect(ListingPage({ params })).resolves.toBeDefined();
  });
});
