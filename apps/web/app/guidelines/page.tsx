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
      icon={'\uD83D\uDCCB'}
      title="Marketplace Guidelines"
      description="What we expect from every listing and every seller"
    >
      <ContentSection heading="Why these exist">
        <p>
          Buyers need to trust that a listing does what it says. These
          guidelines set the bar every submission is reviewed against, and they
          apply equally to first-time and established sellers.
        </p>
      </ContentSection>

      <ContentSection heading="Originality and rights">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            List only work you created or hold clear rights to resell. Reselling
            someone else&rsquo;s pack, even with edits, is not acceptable.
          </li>
          <li>
            Respect third-party licences. If your listing bundles assets,
            models, or code from elsewhere, confirm that redistribution is
            permitted and credit the source.
          </li>
          <li>
            Do not use another creator&rsquo;s name, branding, or preview media
            to imply an association that does not exist.
          </li>
        </ul>
      </ContentSection>

      <ContentSection heading="Accurate descriptions">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Preview media must be produced by the listing itself. Do not
            showcase output the buyer cannot reproduce.
          </li>
          <li>
            State any dependency the buyer needs — a specific model, plan,
            external API key, or paid third-party service.
          </li>
          <li>
            Describe exactly what is delivered: file formats, the number of
            assets, and how the content is installed or used.
          </li>
        </ul>
      </ContentSection>

      <ContentSection heading="Quality bar">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Workflows and skills must run end to end without manual repair.
          </li>
          <li>
            Prompt packs should be more than a thin list — structure, variables,
            and guidance are what make them worth buying.
          </li>
          <li>
            Keep listings maintained. If a dependency changes and your listing
            breaks, update it or unlist it.
          </li>
        </ul>
      </ContentSection>

      <ContentSection heading="Prohibited content">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Sexual content involving minors, in any form.</li>
          <li>
            Non-consensual intimate imagery, or likenesses of real people used
            without permission.
          </li>
          <li>
            Content that harasses, degrades, or incites violence against people
            or groups.
          </li>
          <li>
            Malware, credential harvesting, or anything designed to exfiltrate a
            buyer&rsquo;s data or keys.
          </li>
          <li>
            Deceptive material, including deepfakes presented as genuine and
            content designed to mislead about elections or health.
          </li>
        </ul>
      </ContentSection>

      <ContentSection heading="Review and enforcement">
        <p>
          Every listing is reviewed before it goes live. We may request changes,
          decline a submission, unlist content, withhold a payout tied to
          disputed sales, or suspend a seller account for repeated or serious
          breaches. Where a listing is removed after sale, affected buyers may
          be refunded.
        </p>
        <p>
          If you believe a decision was wrong, or you want to report a listing
          that breaks these rules, use our{' '}
          <Link className="text-white underline" href="/contact">
            contact page
          </Link>
          . The full legal terms are in our{' '}
          <Link className="text-white underline" href="/terms">
            terms of service
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
