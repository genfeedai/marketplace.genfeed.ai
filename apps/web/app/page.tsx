import Link from 'next/link';
import type { ReactNode } from 'react';

const MARKETPLACE_ITEMS = [
  {
    description: 'Automated content workflows ready to deploy',
    href: '/workflows',
    icon: '\u2699\uFE0F',
    label: 'Workflows',
  },
  {
    description: 'Expertly crafted prompts for AI generation',
    href: '/prompts',
    icon: '\uD83D\uDCA1',
    label: 'Prompts',
  },
  {
    description: 'Agent skills that extend what your AI can do',
    href: '/skills',
    icon: '\uD83E\uDDE0',
    label: 'Skills',
  },
];

export default function HomePage(): ReactNode {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
          Marketplace
        </h1>
        <p className="text-lg text-white/70">
          Discover curated workflows, prompts, and agent skills
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {MARKETPLACE_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <div className="h-48 sm:h-60 md:h-72 relative overflow-hidden transform rounded-lg border border-white/10 bg-white/5 transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:shadow-2xl card-glow">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent transition-transform duration-500 group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
              />

              <div className="relative z-10 flex flex-col justify-end text-white p-6 h-full">
                <div className="transform transition-transform duration-300 group-hover:translate-y-0 translate-y-2">
                  <div className="mb-4 text-4xl">{item.icon}</div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">
                    {item.label}
                  </h3>
                  <p className="text-sm text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <span className="text-white text-sm">&rarr;</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
