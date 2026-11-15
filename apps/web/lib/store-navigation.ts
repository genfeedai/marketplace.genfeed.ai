interface StoreLink {
  href: string;
  label: string;
  description: string;
}

/** The four product types the store sells, in navigation order. */
const PRODUCT_LINKS: StoreLink[] = [
  {
    href: '/workflows',
    label: 'Workflows',
    description: 'Content workflows you run from a brief to a finished post.',
  },
  {
    href: '/prompts',
    label: 'Prompts',
    description: 'Prompt collections with structure, variables and guidance.',
  },
  {
    href: '/presets',
    label: 'Presets',
    description: 'Saved looks and settings for a consistent result every time.',
  },
  {
    href: '/skills',
    label: 'Skills',
    description: 'Agent skills that teach your AI how to make the content.',
  },
];

/** Public content made with Genfeed. These pages sit behind the Gallery link. */
const GALLERY_LINKS: StoreLink[] = [
  {
    href: '/videos',
    label: 'Videos',
    description: 'Public videos made with Genfeed.',
  },
  {
    href: '/images',
    label: 'Images',
    description: 'Public images made with Genfeed.',
  },
  {
    href: '/music',
    label: 'Music',
    description: 'Public music made with Genfeed.',
  },
  {
    href: '/posts',
    label: 'Posts',
    description: 'Public posts published with Genfeed.',
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    description: 'The most viewed public posts.',
  },
];

const GALLERY_LINK: StoreLink = {
  href: '/gallery',
  label: 'Gallery',
  description: 'Public videos, images, music and posts made with Genfeed.',
};

export { GALLERY_LINK, GALLERY_LINKS, PRODUCT_LINKS, type StoreLink };
