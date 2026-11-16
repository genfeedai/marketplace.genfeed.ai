import ContentPage from '@components/content-page';
import ContentSection from '@components/content-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/terms');

const LAST_UPDATED = '16 November 2026';

export default function TermsPage(): ReactNode {
  return (
    <ContentPage
      title="Terms of Service"
      description={`Last updated ${LAST_UPDATED}`}
    >
      <ContentSection heading="1. Agreement">
        <p>
          These terms govern your access to and use of the Genfeed store at
          marketplace.genfeed.ai (the &ldquo;Store&rdquo;). By browsing or
          purchasing you agree to them. If you are using the Store on behalf of
          an organisation, you confirm you are authorised to bind that
          organisation.
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
          Every product in the Store is sold by Genfeed.ai. Purchases are
          processed by Stripe. Prices are shown before checkout and are payable
          in the currency displayed. On successful payment you receive a licence
          to use the purchased product as described on its page. Purchased
          products appear in your{' '}
          <Link className="text-white underline" href="/library">
            library
          </Link>
          .
        </p>
        <p>
          A paid product that shows a GEN price can also be bought with the GEN
          credits in your Genfeed account. The credits are taken once, when you
          confirm, and the product goes straight to your library. If the
          purchase cannot be completed, no credits are taken, and a refunded GEN
          purchase is repaid in GEN credits. GEN credits are used to pay for
          Genfeed products and services. They are not money, and they cannot be
          exchanged for money.
        </p>
        <p>
          Skills Pro is sold in the Store but checked out and delivered through
          Genfeed.ai. You receive a receipt that unlocks the CLI download and
          the install into your Genfeed workspace, and the purchase does not
          appear in your library.
        </p>
        <p>
          Digital products are delivered immediately, so purchases are generally
          final. If a product is materially misdescribed or does not function,{' '}
          <Link className="text-white underline" href="/contact">
            contact us
          </Link>{' '}
          and we will review the purchase and may issue a refund.
        </p>
      </ContentSection>

      <ContentSection heading="4. Acceptable use">
        <p>
          Do not use the Store to distribute unlawful material, infringe
          intellectual property, misrepresent authorship, circumvent payment,
          scrape at a scale that degrades the service, or attempt to gain
          unauthorised access to systems or accounts.
        </p>
      </ContentSection>

      <ContentSection heading="5. Intellectual property">
        <p>
          Genfeed.ai owns the Store and the products sold in it, including their
          software, branding, and design. Buying a product grants the licence
          stated on its page, not ownership of the underlying work.
        </p>
      </ContentSection>

      <ContentSection heading="6. Availability and disclaimers">
        <p>
          The Store is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis. We do not warrant that it will be
          uninterrupted or error-free, or that a product is fit for a particular
          purpose.
        </p>
      </ContentSection>

      <ContentSection heading="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Genfeed.ai is not liable for
          indirect, incidental, or consequential losses, or for loss of profit,
          revenue, or data, arising from your use of the Store. Nothing in these
          terms excludes liability that cannot lawfully be excluded.
        </p>
      </ContentSection>

      <ContentSection heading="8. Termination">
        <p>
          You may stop using the Store at any time. We may suspend or terminate
          access where these terms are breached or where required by law.
          Licences already granted to buyers for purchased products survive
          termination.
        </p>
      </ContentSection>

      <ContentSection heading="9. Changes">
        <p>
          We may update these terms as the Store evolves. Material changes will
          be reflected in the &ldquo;last updated&rdquo; date above. Continuing
          to use the Store after a change means you accept the revised terms.
        </p>
      </ContentSection>

      <ContentSection heading="10. Contact">
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
