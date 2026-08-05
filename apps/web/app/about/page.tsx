import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'About | Marketplace',
  description:
    'What the Genfeed.ai marketplace is, who it is for, and how it relates to Genfeed.ai.',
};

export default function AboutPage(): ReactNode {
  return (
    <ContentPage
      icon={'\u2728'}
      title="About"
      description="Curated systems for creators with taste"
    >
      <ContentSection heading="What this is">
        <p>
          The Genfeed.ai marketplace is where creators buy and sell the systems
          behind their output — automated workflows, prompt collections, agent
          skills, and presets. Not one-off files, but the repeatable machinery
          that produces work at a consistent standard.
        </p>
      </ContentSection>

      <ContentSection heading="Why curated">
        <p>
          Volume is easy and quality is not. Every listing is reviewed against
          our{' '}
          <Link className="text-white underline" href="/guidelines">
            guidelines
          </Link>{' '}
          before it goes live, so previews reflect what a listing actually
          produces and dependencies are declared up front. The aim is a
          catalogue you can buy from without having to verify each claim
          yourself.
        </p>
      </ContentSection>

      <ContentSection heading="For sellers">
        <p>
          If you have already built the workflow, prompt system, or skill that
          your own work depends on, it is likely worth something to someone
          else. Sellers keep ownership of what they list and are paid through
          Stripe — the{' '}
          <Link className="text-white underline" href="/sell">
            seller page
          </Link>{' '}
          covers how to start and{' '}
          <Link className="text-white underline" href="/payouts">
            payouts
          </Link>{' '}
          covers the money.
        </p>
      </ContentSection>

      <ContentSection heading="Relationship to Genfeed.ai">
        <p>
          The marketplace is part of Genfeed.ai, the content operating system
          for create, remix, publish, repeat. Purchases install into your
          Genfeed.ai workspace, though you do not need a Genfeed.ai subscription
          to browse or buy here.
        </p>
      </ContentSection>

      <ContentSection heading="Get in touch">
        <p>
          Questions, listing reports, and partnership enquiries all go through
          our{' '}
          <Link className="text-white underline" href="/contact">
            contact page
          </Link>
          . Or start with{' '}
          <Link className="text-white underline" href="/browse">
            browsing the catalogue
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
