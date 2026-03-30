import type { Metadata } from "next";
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: "Code Studio — EH Universe",
  description:
    "Monaco-based coding environment with integrated terminal and AI assistant. Part of the EH Universe project.",
  openGraph: {
    title: "Code Studio — EH Universe",
    description: "AI-powered code editing environment with terminal and pipeline.",
  },
};

export default function CodeStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary variant="full-page">{children}</ErrorBoundary>;
}
