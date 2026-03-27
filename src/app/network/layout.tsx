'use client';

import { RouteErrorBoundary } from '@/components/ErrorBoundary';

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteErrorBoundary section="Network">
      {children}
    </RouteErrorBoundary>
  );
}
