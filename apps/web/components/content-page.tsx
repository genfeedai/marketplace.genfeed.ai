import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';

interface ContentPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function ContentPage({
  title,
  description,
  children,
}: ContentPageProps): ReactNode {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col gap-10">{children}</div>
    </main>
  );
}
