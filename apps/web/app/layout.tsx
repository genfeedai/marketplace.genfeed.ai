import Footer from '@components/footer';
import Nav from '@components/nav';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import '../styles/marketplace.css';

export const metadata: Metadata = {
  title: 'Marketplace | Genfeed.ai',
  description:
    'Browse and discover AI-generated content — videos, images, music, prompts, and more.',
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
