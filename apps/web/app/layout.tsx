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
      <body className="min-h-screen bg-black text-white antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
