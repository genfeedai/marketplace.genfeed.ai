import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/privacy');

const LAST_UPDATED = '5 August 2026';

export default function PrivacyPage(): ReactNode {
  return (
    <ContentPage
      title="Privacy Policy"
      description={`Last updated ${LAST_UPDATED}`}
    >
      <ContentSection heading="Scope">
        <p>
          This policy covers the Genfeed.ai marketplace at
          marketplace.genfeed.ai. It explains what we collect, why we collect
          it, who we share it with, and the choices you have.
        </p>
      </ContentSection>

      <ContentSection heading="What we collect">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <span className="text-white/80">Account data</span> — the name,
            email address, and profile details you provide when you register or
            create a seller profile.
          </li>
          <li>
            <span className="text-white/80">Transaction data</span> — the
            listings you buy or sell, order references, and payout records. Card
            details are entered directly with Stripe and never reach our
            servers.
          </li>
          <li>
            <span className="text-white/80">Listing content</span> — the media,
            descriptions, and files sellers upload.
          </li>
          <li>
            <span className="text-white/80">Technical data</span> — IP address,
            browser and device information, and request logs generated when you
            use the Marketplace.
          </li>
        </ul>
      </ContentSection>

      <ContentSection heading="Why we use it">
        <p>
          We use this data to operate the Marketplace: to authenticate you, show
          your library, process payments and payouts, review listings, provide
          support, prevent fraud and abuse, meet legal and tax obligations, and
          understand aggregate usage so we can improve the product.
        </p>
      </ContentSection>

      <ContentSection heading="Who we share it with">
        <p>
          We share only what is needed with the providers that run the service —
          notably Stripe for payments and payouts, our hosting and database
          providers, and error-monitoring tooling. We also share data where the
          law requires it. We do not sell your personal data.
        </p>
        <p>
          When you buy a listing, the seller receives the information needed to
          fulfil and support that sale. When you sell, buyers see your public
          seller profile.
        </p>
      </ContentSection>

      <ContentSection heading="Retention">
        <p>
          We keep account and content data for as long as your account is
          active. Transaction and payout records are kept for as long as tax and
          accounting rules require, even after an account closes. Logs are kept
          for a limited period and then deleted or aggregated.
        </p>
      </ContentSection>

      <ContentSection heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access,
          correct, export, or delete your personal data, to object to or
          restrict certain processing, and to withdraw consent. To exercise any
          of these, use our{' '}
          <Link className="text-white underline" href="/contact">
            contact page
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection heading="International transfers">
        <p>
          The Marketplace and its providers may process data in countries other
          than your own. Where that happens we rely on the safeguards offered by
          those providers for lawful international transfers.
        </p>
      </ContentSection>

      <ContentSection heading="Cookies">
        <p>
          We use cookies and similar storage to keep you signed in, remember
          preferences, and measure aggregate usage. You can clear or block
          cookies in your browser, though parts of the Marketplace may stop
          working correctly if you do.
        </p>
      </ContentSection>

      <ContentSection heading="Changes">
        <p>
          We may update this policy as the Marketplace evolves. Material changes
          will be reflected in the &ldquo;last updated&rdquo; date above. See
          also our{' '}
          <Link className="text-white underline" href="/terms">
            terms of service
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
