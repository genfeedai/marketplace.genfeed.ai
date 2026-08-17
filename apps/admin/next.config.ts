import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Keep the admin aligned with the CloudFront-backed marketplace frontend.
    unoptimized: true,
  },
};

export default nextConfig;
