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
    title: 'Genfeed Store',
    description:
      'Buy the workflows, prompts, presets and agent skills Genfeed uses to make content. Pick one, run it and post the result the same day.',
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    path: '/browse',
    title: 'All Store Products',
    description:
      'Browse every product in the Genfeed store in one list: content workflows, prompt collections, presets and agent skills, all made by Genfeed.',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    path: '/workflows',
    title: 'Content Workflows',
    description:
      'Content workflows from the Genfeed store. Each one runs from a brief to a finished post, clip or carousel without manual repair along the way.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/prompts',
    title: 'AI Prompt Collections',
    description:
      'Prompt collections from the Genfeed store, built with structure, variables and guidance so each prompt produces work you can post.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/presets',
    title: 'Content Presets',
    description:
      'Presets from the Genfeed store: saved looks and settings that give your images, videos and posts the same consistent result every time.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/skills',
    title: 'AI Agent Skills',
    description:
      'Agent skills from the Genfeed store. Install a skill and your AI agent knows how to plan, write and produce a specific kind of content.',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/gallery',
    title: 'Public Content Gallery',
    description:
      'See what people make with Genfeed: a gallery of public videos, images, music and posts, plus a leaderboard of the most viewed posts.',
    changeFrequency: 'daily',
    priority: 0.7,
  },
  {
    path: '/videos',
    title: 'Public AI Videos',
    description:
      'Watch public AI-generated videos shared by Genfeed.ai creators, with playback controls and titles in a gallery of community video content.',
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    path: '/images',
    title: 'Public AI Images',
    description:
      'Browse a gallery of public AI-generated images shared by Genfeed.ai creators, with image previews and titles from the community.',
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    path: '/music',
    title: 'Public AI Music',
    description:
      'Listen to public AI-composed music shared by Genfeed.ai creators, with audio playback controls and track titles from the community.',
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    path: '/posts',
    title: 'Public Creator Posts',
    description:
      'Read public content shared by Genfeed.ai creators. Explore community posts and open individual entries to see their published content.',
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    path: '/leaderboard',
    title: 'Public Content Leaderboard',
    description:
      'See public Genfeed community posts ranked by their view counts, with post titles and publishing platforms in the content leaderboard.',
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    path: '/about',
    title: 'About the Genfeed Store',
    description:
      'Learn what the Genfeed store sells, who makes the products, how buying and your library work, and how the store relates to Genfeed.ai.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/guidelines',
    title: 'Store Standards',
    description:
      'Read the standards every Genfeed store product meets: accurate descriptions, declared requirements, a quality bar and what happens if one fails.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/contact',
    title: 'Contact Store Support',
    description:
      'Contact the Genfeed store team for help with orders, refunds, a product that does not work as described, and privacy requests about your data.',
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description:
      'Read the terms for buying in the Genfeed store, including accounts, purchases, product licences, refunds and acceptable use of the service.',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description:
      'Learn what personal data the Genfeed store collects, how it is used, who it is shared with, and how to request access, export, or deletion.',
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
      siteName: 'Genfeed Store',
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

export {
  absoluteMarketplaceUrl,
  createIndexableMetadata,
  createNoIndexMetadata,
  INDEXABLE_ROUTES,
  isRetiredSellerSlug,
  MARKETPLACE_ORIGIN,
  RETIRED_SELLER_SLUGS,
};
