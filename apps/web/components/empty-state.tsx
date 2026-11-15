import type { ReactNode } from 'react';

interface EmptyStateProps {
  label: string;
  description: string;
}

export default function EmptyState({
  label,
  description,
}: EmptyStateProps): ReactNode {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
        <h3 className="text-xl font-semibold text-white">{label}</h3>
        <p className="text-sm text-white/60">{description}</p>
      </div>
    </div>
  );
}
