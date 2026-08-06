import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/images');

export default function ImagesLayout({ children }: { children: ReactNode }) {
  return children;
}
