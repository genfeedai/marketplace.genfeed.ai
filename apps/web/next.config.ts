import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.genfeed.ai',
      },
      {
        protocol: 'https',
        hostname: '*.genfeed.ai',
      },
    ],
  },
  // Legacy marketplace URLs that were linked from the previous nav/footer but
  // never had a page behind them. They stay reachable so existing backlinks and
  // sitemap entries resolve instead of 404ing.
  async redirects() {
    return [
      // The marketplace has no journal of its own; editorial lives on the main
      // site. External destination, so this is a redirect rather than a page.
      {
        source: '/blog',
        destination: 'https://genfeed.ai/articles',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: 'https://genfeed.ai/articles',
        permanent: true,
      },
      // `/featured/*` was a hardcoded staff-picks carousel with placeholder
      // slugs — the collections behind it never existed. Browse is the real
      // equivalent.
      {
        source: '/featured',
        destination: '/browse',
        permanent: true,
      },
      {
        source: '/featured/:slug',
        destination: '/browse',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
