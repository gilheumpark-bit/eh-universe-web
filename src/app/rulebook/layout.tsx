import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rulebook — Loreguard",
  description:
    "Rulebook v1.0: Open-source narrative engine that prevents Story Collapse. Core principles, EH system, SJC judgment, and timeline reference.",
  openGraph: {
    title: "Rulebook — Loreguard",
    description:
      "Open-source narrative engine that prevents Story Collapse.",
  },
};

export default function RulebookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
