import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/leaderboard');

export default function LeaderboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
