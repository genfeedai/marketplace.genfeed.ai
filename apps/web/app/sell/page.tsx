import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/sell');

export default function SellPage(): ReactNode {
  return (
    <ContentPage
      icon={'\uD83C\uDFEA'}
      title="Sell on the Marketplace"
      description="Turn the systems you already use into products"
    >
      <ContentSection heading="What you can sell">
        <p>
          The marketplace accepts packaged, reusable assets: automated
          workflows, prompt collections, agent skills, and presets. Listings are
          delivered as downloadable content that buyers can install directly
          into their own Genfeed.ai workspace.
        </p>
      </ContentSection>

      <ContentSection heading="How it works">
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            Create a seller profile and connect a Stripe account so payouts can
            reach you.
          </li>
          <li>
            Submit a listing with a title, description, preview media, price,
            and the downloadable payload.
          </li>
          <li>
            We review the listing against the{' '}
            <Link className="text-white underline" href="/guidelines">
              marketplace guidelines
            </Link>{' '}
            before it goes live.
          </li>
          <li>
            Buyers purchase through Stripe Checkout, and your share is
            transferred to your connected account.
          </li>
        </ol>
      </ContentSection>

      <ContentSection heading="Getting paid">
        <p>
          Payouts run through Stripe Connect, so balances, schedules, and tax
          documents are handled by Stripe directly. See the{' '}
          <Link className="text-white underline" href="/payouts">
            payouts page
          </Link>{' '}
          for the revenue split, payout timing, and supported countries.
        </p>
      </ContentSection>

      <ContentSection heading="Ready to start?">
        <p>
          Seller onboarding lives in your dashboard. Head to the{' '}
          <Link className="text-white underline" href="/dashboard">
            seller dashboard
          </Link>{' '}
          to create your profile and submit a first listing. If you have
          questions before you start,{' '}
          <Link className="text-white underline" href="/contact">
            get in touch
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
