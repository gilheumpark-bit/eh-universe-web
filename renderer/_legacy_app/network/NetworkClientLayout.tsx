"use client";

import Header from "@/components/Header";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";

export default function NetworkClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary section="Network">
      <Header />
      {children}
    </RouteErrorBoundary>
  );
}
