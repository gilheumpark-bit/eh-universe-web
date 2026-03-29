import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — EH Universe",
  description:
    "About the EH Universe project. License, credits, and project information for the narrative engine platform.",
  openGraph: {
    title: "About — EH Universe",
    description:
      "About the EH Universe narrative engine project.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
