'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  GALLERY_LINK,
  GALLERY_LINKS,
  PRODUCT_LINKS,
} from '@/lib/store-navigation';

const NAV_ITEMS = [...PRODUCT_LINKS, GALLERY_LINK];
const LIBRARY_HREF = '/library';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith(href)) return true;
  // The gallery pages keep their own addresses and belong to the Gallery link.
  return (
    href === GALLERY_LINK.href &&
    GALLERY_LINKS.some((link) => pathname.startsWith(link.href))
  );
}

function linkClass(active: boolean): string {
  return `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
    active
      ? 'bg-white/15 text-white'
      : 'text-white/60 hover:bg-white/5 hover:text-white'
  }`;
}

export default function Nav(): ReactNode {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3"
      >
        <Link
          href="/"
          className="whitespace-nowrap text-lg font-bold tracking-tight text-white"
        >
          Genfeed Store
        </Link>

        <div className="hide-scrollbar flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(isActive(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={LIBRARY_HREF}
            className={linkClass(isActive(pathname, LIBRARY_HREF))}
          >
            Library
          </Link>
        </div>
      </nav>
    </header>
  );
}
