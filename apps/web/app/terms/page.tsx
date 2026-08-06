import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/terms');

const LAST_UPDATED = '5 August 2026';

export default function TermsPage(): ReactNode {
  return (
    <ContentPage
      icon={'\uD83D\uDCC4'}
      title="Terms of Service"
      description={`Last updated ${LAST_UPDATED}`}
    >
      <ContentSection heading="1. Agreement">
        <p>
          These terms govern your access to and use of the Genfeed.ai
          marketplace at marketplace.genfeed.ai (the &ldquo;Marketplace&rdquo;).
          By browsing, purchasing, or listing content you agree to them. If you
          are using the Marketplace on behalf of an organisation, you confirm
          you are authorised to bind that organisation.
        </p>
      </ContentSection>

      <ContentSection heading="2. Accounts">
        <p>
          Some features require an account. You are responsible for the accuracy
          of your account details, for keeping your credentials secure, and for
          all activity that occurs under your account. You must be old enough to
          form a binding contract in your jurisdiction.
        </p>
      </ContentSection>

      <ContentSection heading="3. Buying">
        <p>
          Purchases are processed by Stripe. Prices are shown before checkout
          and are payable in the currency displayed. On successful payment you
          receive a licence to use the purchased content as described on the
          listing. Purchased items appear in your{' '}
          <Link className="text-white underline" href="/library">
            library
          </Link>
          .
        </p>
        <p>
          Digital content is delivered immediately, so purchases are generally
          final. If a listing is materially misdescribed, does not function, or
          infringes someone&rsquo;s rights,{' '}
          <Link className="text-white underline" href="/contact">
            contact us
          </Link>{' '}
          and we will review the purchase and may issue a refund.
        </p>
      </ContentSection>

      <ContentSection heading="4. Selling">
        <p>
          Sellers are independent of Genfeed.ai. By listing content you confirm
          you own it or hold the rights needed to sell it, and you grant us a
          licence to host, display, and distribute it to buyers. Listings must
          follow the{' '}
          <Link className="text-white underline" href="/guidelines">
            marketplace guidelines
          </Link>
          .
        </p>
        <p>
          We may decline, edit, unlist, or remove any listing, and may suspend a
          seller account, where content breaches these terms or the guidelines.
          Commission, payout timing, and the payout mechanism are described on
          the{' '}
          <Link className="text-white underline" href="/payouts">
            payouts page
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection heading="5. Acceptable use">
        <p>
          Do not use the Marketplace to distribute unlawful material, infringe
          intellectual property, misrepresent authorship, circumvent payment,
          scrape at a scale that degrades the service, or attempt to gain
          unauthorised access to systems or accounts.
        </p>
      </ContentSection>

      <ContentSection heading="6. Intellectual property">
        <p>
          Sellers retain ownership of the content they list. Genfeed.ai retains
          ownership of the Marketplace itself, including its software, branding,
          and design. Buying a listing grants the licence stated on that
          listing, not ownership of the underlying work.
        </p>
      </ContentSection>

      <ContentSection heading="7. Availability and disclaimers">
        <p>
          The Marketplace is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis. We do not warrant that it will be
          uninterrupted or error-free, and we do not endorse or guarantee the
          quality, legality, or fitness for purpose of seller content.
        </p>
      </ContentSection>

      <ContentSection heading="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Genfeed.ai is not liable for
          indirect, incidental, or consequential losses, or for loss of profit,
          revenue, or data, arising from your use of the Marketplace. Nothing in
          these terms excludes liability that cannot lawfully be excluded.
        </p>
      </ContentSection>

      <ContentSection heading="9. Termination">
        <p>
          You may stop using the Marketplace at any time. We may suspend or
          terminate access where these terms are breached or where required by
          law. Licences already granted to buyers for purchased content survive
          termination.
        </p>
      </ContentSection>

      <ContentSection heading="10. Changes">
        <p>
          We may update these terms as the Marketplace evolves. Material changes
          will be reflected in the &ldquo;last updated&rdquo; date above.
          Continuing to use the Marketplace after a change means you accept the
          revised terms.
        </p>
      </ContentSection>

      <ContentSection heading="11. Contact">
        <p>
          Questions about these terms can be sent through our{' '}
          <Link className="text-white underline" href="/contact">
            contact page
          </Link>
          . See also our{' '}
          <Link className="text-white underline" href="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
