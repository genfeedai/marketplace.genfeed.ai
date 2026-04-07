import type { ReactNode } from 'react';

interface LoadingProps {
  label?: string;
}

export default function Loading({
  label = 'Loading...',
}: LoadingProps): ReactNode {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="text-sm text-white/50">{label}</p>
      </div>
    </div>
  );
}
