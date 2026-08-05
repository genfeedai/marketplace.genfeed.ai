import Footer from '@components/footer';
import Nav from '@components/nav';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createIndexableMetadata, MARKETPLACE_ORIGIN } from '@/lib/seo';
import './globals.css';
import '../styles/marketplace.css';

const rootMetadata = createIndexableMetadata('/');

export const metadata: Metadata = {
  ...rootMetadata,
  metadataBase: new URL(MARKETPLACE_ORIGIN),
  title: {
    default: 'Creator Marketplace | Genfeed.ai',
    template: '%s | Genfeed Marketplace',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-black text-white antialiased">
        <Nav />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
