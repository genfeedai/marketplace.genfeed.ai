import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/videos');

export default function VideosLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
