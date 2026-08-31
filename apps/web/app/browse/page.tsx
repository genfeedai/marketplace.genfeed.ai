import PageHeader from '@components/page-header';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/browse');

interface BrowseCategory {
  href: string;
  icon: string;
  label: string;
  description: string;
}

const BROWSE_CATEGORIES: BrowseCategory[] = [
  {
    href: '/workflows',
    icon: '\u2699\uFE0F',
    label: 'Workflows',
    description: 'Automated content workflows ready to deploy',
  },
  {
    href: '/prompts',
    icon: '\uD83D\uDCA1',
    label: 'Prompts',
    description: 'Expertly crafted prompts for AI generation',
  },
  {
    href: '/skills',
    icon: '\uD83E\uDDE0',
    label: 'Skills',
    description: 'Agent skills that extend what your AI can do',
  },
  {
    href: '/videos',
    icon: '\uD83C\uDFA5',
    label: 'Videos',
    description: 'Public AI-generated videos from Genfeed creators',
  },
  {
    href: '/images',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Images',
    description: 'Public AI-generated images from Genfeed creators',
  },
  {
    href: '/music',
    icon: '\uD83C\uDFB5',
    label: 'Music',
    description: 'Public AI-composed music from Genfeed creators',
  },
  {
    href: '/posts',
    icon: '\uD83D\uDCDD',
    label: 'Posts',
    description: 'Public content published by the Genfeed community',
  },
  {
    href: '/leaderboard',
    icon: '\uD83C\uDFC6',
    label: 'Leaderboard',
    description: 'The most-viewed public posts on Genfeed',
  },
];

export default function BrowsePage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83E\uDDED'}
        title="Browse"
        description="Browse creator products and public Genfeed content"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BROWSE_CATEGORIES.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            className="group flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/25 hover:bg-white/10 card-glow"
          >
            <span className="text-3xl">{category.icon}</span>
            <h2 className="text-lg font-semibold text-white">
              {category.label}
            </h2>
            <p className="text-sm text-white/60">{category.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
