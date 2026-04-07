import type { ReactNode } from 'react';

/**
 * Authenticated layout shell.
 *
 * Currently a pass-through. When Clerk or another auth provider is
 * wired in, wrap children with the auth guard here.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
