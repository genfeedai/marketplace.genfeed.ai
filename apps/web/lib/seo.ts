import type { Metadata, MetadataRoute } from 'next';

const MARKETPLACE_ORIGIN = 'https://marketplace.genfeed.ai';

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
      'Discover curated workflows, prompts, skills, and AI-generated media from the Genfeed.ai creator community.',
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    path: '/browse',
    title: 'Browse',
    description:
      'Browse every category on the Genfeed.ai marketplace, including workflows, prompts, skills, videos, images, music, and posts.',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    path: '/workflows',
    title: 'Workflows',
    description:
      'Discover automated content workflows built by the Genfeed.ai creator community and ready to deploy.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/prompts',
    title: 'Prompts',
    description:
      'Explore expertly crafted prompts for AI generation on the Genfeed.ai marketplace.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/skills',
    title: 'Skills',
    description:
      'Discover packaged agent skills that extend what your AI can do.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/videos',
    title: 'Videos',
    description:
      'Browse AI-generated videos shared by the Genfeed.ai creator community.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/images',
    title: 'Images',
    description:
      'Explore AI-generated images shared by the Genfeed.ai creator community.',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    path: '/music',
    title: 'Music',
    description:
      'Listen to AI-composed music shared by the Genfeed.ai creator community.',
    changeFrequency: 'daily',
    priority: 0.7,
  },
  {
    path: '/posts',
    title: 'Posts',
    description:
      'Read AI-generated articles and creative content from the Genfeed.ai community.',
    changeFrequency: 'daily',
    priority: 0.7,
  },
  {
    path: '/leaderboard',
    title: 'Leaderboard',
    description:
      'See the most-viewed AI-generated video posts from the Genfeed.ai community.',
    changeFrequency: 'daily',
    priority: 0.7,
  },
  {
    path: '/sell',
    title: 'Sell on the Marketplace',
    description:
      'List your workflows, prompts, and skills on the Genfeed.ai marketplace and get paid through Stripe.',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/guidelines',
    title: 'Marketplace Guidelines',
    description:
      'Read the quality, originality, and conduct standards every Genfeed.ai marketplace listing must meet.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/payouts',
    title: 'Seller Payouts',
    description:
      'Learn how sellers get paid on the Genfeed.ai marketplace, including payout timing and Stripe Connect.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/about',
    title: 'About',
    description:
      'Learn what the Genfeed.ai marketplace is, who it is for, and how curated creator products work.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/contact',
    title: 'Contact',
    description:
      'Contact the Genfeed.ai marketplace team about orders, listings, sellers, payouts, or privacy.',
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description:
      'Read the terms that govern buying and selling on the Genfeed.ai marketplace.',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description:
      'Learn what data the Genfeed.ai marketplace collects, why it is used, and the rights you have over it.',
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

export type { IndexablePath, IndexableRoute };
export {
  absoluteMarketplaceUrl,
  createIndexableMetadata,
  createNoIndexMetadata,
  INDEXABLE_ROUTES,
  MARKETPLACE_ORIGIN,
};
