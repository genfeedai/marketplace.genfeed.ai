import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/guidelines');

export default function GuidelinesPage(): ReactNode {
  return (
    <ContentPage
      title="Store standards"
      description="What every product in the store has to meet"
    >
      <ContentSection heading="Made by Genfeed">
        <p>
          Every product in the store is made by Genfeed. There are no outside
          sellers.
        </p>
      </ContentSection>

      <ContentSection heading="Accurate descriptions">
        <p>
          Previews are produced by the product itself. Each listing states what
          it needs, such as a model, a connected account or a file, and exactly
          what you receive.
        </p>
      </ContentSection>

      <ContentSection heading="Quality bar">
        <p>
          Workflows and skills run end to end without manual repair. Prompt
          packs carry structure, variables and guidance, not a thin list. When
          something a product depends on changes, the product is updated or
          removed.
        </p>
      </ContentSection>

      <ContentSection heading="If something is wrong">
        <p>
          Digital products are delivered at once, so purchases are generally
          final. If a product is materially misdescribed or does not work,{' '}
          <Link className="text-white underline" href="/contact">
            contact us
          </Link>{' '}
          and we will review the purchase and may issue a refund. The full legal
          terms are in our{' '}
          <Link className="text-white underline" href="/terms">
            terms of service
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
