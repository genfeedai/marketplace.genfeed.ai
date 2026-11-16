import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/contact');

const SUPPORT_EMAIL = 'support@genfeed.ai';

export default function ContactPage(): ReactNode {
  return (
    <ContentPage
      title="Contact"
      description="Tell us what you need and we will point it to the right place"
    >
      <ContentSection heading="Email us">
        <p>
          The fastest route is{' '}
          <a className="text-white underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . We read everything that arrives there.
        </p>
      </ContentSection>

      <ContentSection heading="Orders and refunds">
        <p>
          Include the order reference from your{' '}
          <Link className="text-white underline" href="/library">
            library
          </Link>{' '}
          and say what went wrong. If a product does not work as described, say
          what you expected and what happened.
        </p>
      </ContentSection>

      <ContentSection heading="Reporting a problem with a product">
        <p>
          If something in the store is wrong, broken or misleading, send the
          product name and what you saw. The{' '}
          <Link className="text-white underline" href="/guidelines">
            store standards
          </Link>{' '}
          say what every product has to meet.
        </p>
      </ContentSection>

      <ContentSection heading="Privacy requests">
        <p>
          For access, correction or deletion of your data, write to the same
          address. Our{' '}
          <Link className="text-white underline" href="/privacy">
            privacy policy
          </Link>{' '}
          explains your rights.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
