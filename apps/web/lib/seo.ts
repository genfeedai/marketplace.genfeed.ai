import type { Metadata, MetadataRoute } from 'next';

const MARKETPLACE_ORIGIN = 'https://marketplace.genfeed.ai';
const RETIRED_SELLER_SLUGS = ['blog', 'featured', 'free'] as const;

interface IndexableRoute {
  path: string;
  title: string;
  description: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

const INDEXABLE_ROUTES = [
  {
    path: '/',
    title: 'Creator Marketplace',
    description:
      'Explore public videos, images, music, and posts from Genfeed.ai creators, alongside upcoming marketplace categories for workflows, prompts, and skills.',
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    path: '/browse',
    title: 'Browse Creator Products',
    description:
      'Find public videos, images, music, and posts from Genfeed.ai creators, plus the upcoming marketplace categories for workflows, prompts, and skills.',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    path: '/workflows',
    title: 'Workflows',
    description:
      'Community-built content workflows are coming soon to the Genfeed.ai marketplace. This category will hold workflows for content creation.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/prompts',
    title: 'AI Prompt Collections',
    description:
      'AI prompt collections are coming soon to the Genfeed.ai marketplace. This category is reserved for prompts shared by the creator community.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/skills',
    title: 'AI Agent Skills',
    description:
      'Packaged AI agent skills are coming soon to the Genfeed.ai marketplace. This category is reserved for skills from the creator community.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/videos',
    title: 'Public Videos',
    description:
      'Watch public AI-generated videos shared by Genfeed.ai creators, with playback controls and titles in a gallery of community video content.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/images',
    title: 'Public Images',
    description:
      'Browse a gallery of public AI-generated images shared by Genfeed.ai creators, with image previews and titles from the community.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/music',
    title: 'Public Music',
    description:
      'Listen to public AI-composed music shared by Genfeed.ai creators, with audio playback controls and track titles from the community.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/posts',
    title: 'Public Posts',
    description:
      'Read public content shared by Genfeed.ai creators. Explore community posts and open individual entries to see their published content.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/leaderboard',
    title: 'Public Content Leaderboard',
    description:
      'See public Genfeed community posts ranked by their view counts, with post titles and publishing platforms in the content leaderboard.',
    changeFrequency: 'daily',
    priority: 0.7,
  },
  {
    path: '/sell',
    title: 'Sell on the Marketplace',
    description:
      'Learn how to list workflows, prompts, and agent skills on the Genfeed.ai marketplace, prepare your seller profile, and receive Stripe payouts.',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/guidelines',
    title: 'Marketplace Guidelines',
    description:
      'Read the quality, originality, and conduct standards for Genfeed.ai marketplace listings, including rights, dependencies, and seller responsibilities.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/payouts',
    title: 'Seller Payouts',
    description:
      'Learn how Genfeed.ai marketplace sellers receive Stripe Connect payouts, including onboarding, fees, payout timing, and payment support.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/about',
    title: 'About the Marketplace',
    description:
      'Learn how the Genfeed.ai marketplace connects creators with workflows, prompts, and agent skills, and what curated listings mean for buyers.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/contact',
    title: 'Contact Marketplace Support',
    description:
      'Contact the Genfeed.ai marketplace team for help with orders, listings, seller onboarding, payouts, privacy requests, and content reports.',
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description:
      'Read the terms for buying and selling on the Genfeed.ai marketplace, including listing responsibilities, purchases, licences, and refunds.',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description:
      'Learn what personal data the Genfeed.ai marketplace collects, how it is used, and how to request access, export, or deletion of your information.',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
] as const satisfies readonly IndexableRoute[];

type IndexablePath = (typeof INDEXABLE_ROUTES)[number]['path'];

function getIndexableRoute(path: IndexablePath): IndexableRoute {
  const route = INDEXABLE_ROUTES.find((candidate) => candidate.path === path);

  if (!route) {
    throw new Error(`Missing SEO metadata for ${path}`);
  }

  return route;
}

function createMetadata({
  title,
  description,
  path,
  index,
}: {
  title: string;
  description: string;
  path: string;
  index: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'Genfeed Marketplace',
      title,
      description,
      url: path,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true },
  };
}

function createIndexableMetadata(path: IndexablePath): Metadata {
  const route = getIndexableRoute(path);

  return createMetadata({ ...route, index: true });
}

function createNoIndexMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return createMetadata({ title, description, path, index: false });
}

function absoluteMarketplaceUrl(path: string): string {
  return new URL(path, MARKETPLACE_ORIGIN).toString();
}

function isRetiredSellerSlug(sellerSlug: string): boolean {
  return RETIRED_SELLER_SLUGS.some((retired) => retired === sellerSlug);
}

export type { IndexablePath, IndexableRoute };
export {
  absoluteMarketplaceUrl,
  createIndexableMetadata,
  createNoIndexMetadata,
  INDEXABLE_ROUTES,
  isRetiredSellerSlug,
  MARKETPLACE_ORIGIN,
  RETIRED_SELLER_SLUGS,
};
