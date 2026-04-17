import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools — Loreguard",
  description:
    "Creator tools: Galaxy Map, Neka Sound system, and Soundtrack archive.",
  openGraph: {
    title: "Tools — Loreguard",
    description: "Interactive creator tools.",
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
