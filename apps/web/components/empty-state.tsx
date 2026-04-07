import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  label: string;
  description: string;
}

export default function EmptyState({
  icon,
  label,
  description,
}: EmptyStateProps): ReactNode {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
        <span className="text-5xl">{icon}</span>
        <h3 className="text-xl font-semibold text-white">{label}</h3>
        <p className="text-sm text-white/60">{description}</p>
      </div>
    </div>
  );
}
