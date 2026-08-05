import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Payouts | Marketplace',
  description:
    'How sellers get paid on the Genfeed.ai marketplace — revenue split, payout timing, and Stripe Connect.',
};

export default function PayoutsPage(): ReactNode {
  return (
    <ContentPage
      icon={'\uD83D\uDCB8'}
      title="Payouts"
      description="How money reaches sellers"
    >
      <ContentSection heading="Stripe Connect">
        <p>
          Payouts run through Stripe Connect. Before your first listing can go
          live you complete Stripe&rsquo;s onboarding, which verifies your
          identity and collects the bank details and tax information Stripe
          needs. We never see or store your bank credentials.
        </p>
      </ContentSection>

      <ContentSection heading="Revenue split">
        <p>
          Each sale is split between you and the marketplace. Your share, the
          marketplace commission, and any Stripe processing fee are shown on the
          listing before you publish it and on every order in your dashboard, so
          the net amount is visible before and after each sale.
        </p>
        <p>
          Fees are deducted at the point of sale — the balance that reaches your
          Stripe account is already net of them.
        </p>
      </ContentSection>

      <ContentSection heading="When you get paid">
        <p>
          Funds from a sale land in your Stripe balance once the payment
          settles, and Stripe pays that balance out to your bank on the payout
          schedule set on your connected account. Timing therefore depends on
          your country and your Stripe settings rather than on us.
        </p>
        <p>
          New accounts often have a longer hold on the first payout while Stripe
          completes verification. That is a Stripe control, not a marketplace
          one.
        </p>
      </ContentSection>

      <ContentSection heading="Refunds, disputes, and holds">
        <p>
          If a sale is refunded, the corresponding amount is reversed from your
          balance. Where a chargeback is raised, Stripe&rsquo;s dispute process
          applies and the disputed amount may be held until it resolves. We may
          also hold a payout tied to a listing under review for a breach of the{' '}
          <Link className="text-white underline" href="/guidelines">
            marketplace guidelines
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection heading="Taxes">
        <p>
          You are responsible for your own tax reporting. Stripe issues the tax
          documents it is required to for your jurisdiction, and your sales
          history is available in the seller dashboard for your own accounting.
          We cannot give tax advice.
        </p>
      </ContentSection>

      <ContentSection heading="Where to look">
        <p>
          Balances, individual sales, and payout history live in your{' '}
          <Link className="text-white underline" href="/dashboard">
            seller dashboard
          </Link>
          . If a payout looks wrong or has not arrived when you expected,{' '}
          <Link className="text-white underline" href="/contact">
            contact us
          </Link>{' '}
          with the order reference. If you are not selling yet, start on the{' '}
          <Link className="text-white underline" href="/sell">
            seller page
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
