import Link from 'next/link';
import type { ReactNode } from 'react';
import type { StoreLink } from '@/lib/store-navigation';

interface LinkTileGridProps {
  links: StoreLink[];
}

export default function LinkTileGrid({ links }: LinkTileGridProps): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="card-glow flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/25 hover:bg-white/10"
        >
          <h2 className="text-lg font-semibold text-white">{link.label}</h2>
          <p className="text-sm text-white/60">{link.description}</p>
        </Link>
      ))}
    </div>
  );
}
