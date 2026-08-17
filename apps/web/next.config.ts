import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Marketplace media is pre-optimized and delivered through CloudFront.
    unoptimized: true,
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
};

export default nextConfig;
