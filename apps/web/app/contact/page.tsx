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
      icon={'\u2709\uFE0F'}
      title="Contact"
      description="Tell us what you need and we will point it to the right place"
    >
      <ContentSection heading="Email us">
        <p>
          The fastest route is{' '}
          <a className="text-white underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . We read everything that arrives there and route it internally.
        </p>
      </ContentSection>

      <ContentSection heading="Orders and refunds">
        <p>
          Include the order reference from your{' '}
          <Link className="text-white underline" href="/library">
            library
          </Link>{' '}
          and describe what went wrong. If a listing does not work as described,
          say what you expected and what actually happened — it speeds up the
          review considerably.
        </p>
      </ContentSection>

      <ContentSection heading="Selling and payouts">
        <p>
          For onboarding questions, listing reviews, or a payout that has not
          arrived, include your seller profile name and the relevant order or
          payout reference. Background on both is on the{' '}
          <Link className="text-white underline" href="/sell">
            seller
          </Link>{' '}
          and{' '}
          <Link className="text-white underline" href="/payouts">
            payouts
          </Link>{' '}
          pages.
        </p>
      </ContentSection>

      <ContentSection heading="Reporting a listing">
        <p>
          To report content that breaches our{' '}
          <Link className="text-white underline" href="/guidelines">
            guidelines
          </Link>{' '}
          — including copyright and likeness complaints — send the listing URL
          and the reason. Rights-holder complaints should also state your
          relationship to the work.
        </p>
      </ContentSection>

      <ContentSection heading="Privacy requests">
        <p>
          Requests to access, export, or delete your personal data go to the
          same address. Our{' '}
          <Link className="text-white underline" href="/privacy">
            privacy policy
          </Link>{' '}
          sets out what we hold and the rights you have over it.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
