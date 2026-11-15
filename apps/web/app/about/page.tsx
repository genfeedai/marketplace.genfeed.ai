import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/about');

export default function AboutPage(): ReactNode {
  return (
    <ContentPage
      title="About"
      description="The systems Genfeed uses to make content, ready for you to run"
    >
      <ContentSection heading="What this is">
        <p>
          The Genfeed store sells the workflows, prompts, presets and skills
          that Genfeed builds and uses to make content. Each one is a working
          system, not a loose file: you run it and it produces the post, the
          clip or the carousel.
        </p>
      </ContentSection>

      <ContentSection heading="Who makes it">
        <p>
          Everything here is made and maintained by Genfeed. Each listing says
          what it produces, what it needs and what you receive, so you know what
          you are buying before you pay. The{' '}
          <Link className="text-white underline" href="/guidelines">
            store standards
          </Link>{' '}
          set the bar.
        </p>
      </ContentSection>

      <ContentSection heading="How buying works">
        <p>
          You pay once, by card. What you buy appears in your{' '}
          <Link className="text-white underline" href="/library">
            library
          </Link>
          , ready to download. Free products are added to your library the same
          way.
        </p>
      </ContentSection>

      <ContentSection heading="Relationship to Genfeed.ai">
        <p>
          The store is part of Genfeed.ai. You sign in with your Genfeed
          account. You do not need a paid Genfeed plan to browse or buy here.
        </p>
      </ContentSection>

      <ContentSection heading="Get in touch">
        <p>
          Questions and order problems go through the{' '}
          <Link className="text-white underline" href="/contact">
            contact page
          </Link>
          , which says what to include. Or start by{' '}
          <Link className="text-white underline" href="/browse">
            browsing the store
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
