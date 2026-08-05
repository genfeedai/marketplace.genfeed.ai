import PageHeader from '@components/page-header';
import type { ReactNode } from 'react';

interface ContentPageProps {
  icon: string;
  title: string;
  description: string;
  children: ReactNode;
}

export default function ContentPage({
  icon,
  title,
  description,
  children,
}: ContentPageProps): ReactNode {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader icon={icon} title={title} description={description} />
      <div className="flex flex-col gap-10">{children}</div>
    </main>
  );
}
