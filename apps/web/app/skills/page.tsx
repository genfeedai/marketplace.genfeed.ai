import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/skills');

export default function SkillsPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83E\uDDE0'}
        title="Skills"
        description="Agent skills that extend what your AI can do"
      />
      <EmptyState
        icon={'\uD83E\uDDE0'}
        label="Skills Coming Soon"
        description="Packaged agent skills from the community will be available here soon."
      />
    </main>
  );
}
