import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools — EH Universe",
  description:
    "EH Universe tools: Galaxy Map, Neka Sound system, and Soundtrack archive.",
  openGraph: {
    title: "Tools — EH Universe",
    description: "Interactive tools for the EH Universe.",
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
