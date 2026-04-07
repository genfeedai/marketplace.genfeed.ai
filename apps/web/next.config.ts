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
};

export default nextConfig;
