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
      'Discover creator workflows, prompts, and agent skills, plus public videos, images, music, and posts from the Genfeed.ai community.',
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    path: '/browse',
    title: 'Browse Creator Products',
    description:
      'Browse creator workflows, prompts, and agent skills alongside public videos, images, music, and posts shared by the Genfeed.ai community.',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    path: '/workflows',
    title: 'Workflows',
    description:
      'Explore content workflows built by Genfeed.ai creators. Review each listing for previews, required tools, and setup details before you buy.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/prompts',
    title: 'AI Prompt Collections',
    description:
      'Explore AI prompt collections from Genfeed.ai creators. Review examples, supported models, and included instructions before choosing a listing.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/skills',
    title: 'AI Agent Skills',
    description:
      'Discover packaged AI agent skills from Genfeed.ai creators. Review each listing for capabilities, dependencies, and setup instructions.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/videos',
    title: 'Public Videos',
    description:
      'Watch public AI-generated videos shared by Genfeed.ai creators. Explore community video posts and open individual posts for more details.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/images',
    title: 'Public Images',
    description:
      'Explore public AI-generated images shared by Genfeed.ai creators. Browse community image posts and open individual posts for more details.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/music',
    title: 'Public Music',
    description:
      'Listen to public AI-composed music shared by Genfeed.ai creators. Browse community audio posts and open individual posts for more details.',
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
      'Explore the most-viewed public posts from the Genfeed.ai community, and open individual entries to discover the content creators are sharing.',
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
      'Read the terms for buying and selling on the Genfeed.ai marketplace, including listing responsibilities, purchases, licences, and disputes.',
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
