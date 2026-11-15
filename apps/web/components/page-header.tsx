import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
}

export default function PageHeader({
  title,
  description,
}: PageHeaderProps): ReactNode {
  return (
    <div className="mb-10 text-center">
      <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
        {title}
      </h1>
      <p className="text-base text-white/60">{description}</p>
    </div>
  );
}
