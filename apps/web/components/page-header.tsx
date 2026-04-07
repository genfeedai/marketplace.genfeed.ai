import type { ReactNode } from 'react';

interface PageHeaderProps {
  icon: string;
  title: string;
  description: string;
}

export default function PageHeader({
  icon,
  title,
  description,
}: PageHeaderProps): ReactNode {
  return (
    <div className="text-center mb-10">
      <span className="text-4xl mb-3 block">{icon}</span>
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
        {title}
      </h1>
      <p className="text-base text-white/60">{description}</p>
    </div>
  );
}
