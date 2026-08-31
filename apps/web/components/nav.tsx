'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/workflows', label: 'Workflows' },
  { href: '/prompts', label: 'Prompts' },
  { href: '/skills', label: 'Skills' },
  { href: '/videos', label: 'Videos' },
  { href: '/images', label: 'Images' },
  { href: '/music', label: 'Music' },
  { href: '/posts', label: 'Posts' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function Nav(): ReactNode {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          Marketplace
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
