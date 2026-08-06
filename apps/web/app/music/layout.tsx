import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/music');

export default function MusicLayout({ children }: { children: ReactNode }) {
  return children;
}
