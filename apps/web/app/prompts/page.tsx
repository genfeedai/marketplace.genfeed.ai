import EmptyState from '@components/empty-state';
import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';

export default function PromptsPage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83D\uDCA1'}
        title="Prompts"
        description="Expertly crafted prompts for AI generation"
      />
      <EmptyState
        icon={'\uD83D\uDCA1'}
        label="Prompts Coming Soon"
        description="Expertly crafted prompts for AI generation will be available here soon."
      />
    </main>
  );
}
