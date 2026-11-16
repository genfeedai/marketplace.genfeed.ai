import Link from 'next/link';
import type { ReactNode } from 'react';
import { GALLERY_LINK, PRODUCT_LINKS } from '@/lib/store-navigation';

interface FooterLink {
  href: string;
  label: string;
  isExternal?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Store',
    links: [
      ...PRODUCT_LINKS,
      GALLERY_LINK,
      { href: '/library', label: 'Library' },
    ],
  },
  {
    title: 'Genfeed',
    links: [
      { href: '/about', label: 'About' },
      { href: '/guidelines', label: 'Store standards' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
    ],
  },
];

const EXTERNAL_LINKS: FooterLink[] = [
  { href: 'https://genfeed.ai', label: 'Genfeed.ai', isExternal: true },
  { href: 'https://genfeed.ai/articles', label: 'Journal', isExternal: true },
  { href: 'https://x.com/genfeedai', label: 'X', isExternal: true },
  { href: 'https://discord.gg/Qy867n83Z4', label: 'Discord', isExternal: true },
  {
    href: 'https://instagram.com/genfeedai',
    label: 'Instagram',
    isExternal: true,
  },
];

const LINK_CLASS = 'text-sm text-white/60 transition-colors hover:text-white';

function FooterAnchor({ link }: { link: FooterLink }): ReactNode {
  if (link.isExternal) {
    return (
      <a
        className={LINK_CLASS}
        href={link.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link className={LINK_CLASS} href={link.href}>
      {link.label}
    </Link>
  );
}

export default function Footer(): ReactNode {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Link className="text-lg font-bold text-white" href="/">
              Genfeed Store
            </Link>
            <p className="max-w-xs text-sm text-white/60">
              Workflows, prompts, presets and skills made by Genfeed.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav
              key={section.title}
              aria-label={`${section.title} links`}
              className="flex flex-col gap-3"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <FooterAnchor link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/40">
            &copy; {currentYear} Genfeed.ai. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {EXTERNAL_LINKS.map((link) => (
              <FooterAnchor key={link.href} link={link} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
