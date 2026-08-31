import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata } from '@/lib/seo';

export const metadata: Metadata = createIndexableMetadata('/posts');

export default function PostsLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
