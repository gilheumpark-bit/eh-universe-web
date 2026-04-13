import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NOA Studio — EH Universe",
  description:
    "NOA-powered creative writing studio with multi-provider LLM support. Write stories within the EH Universe narrative engine.",
  openGraph: {
    title: "NOA Studio — EH Universe",
    description:
      "NOA-powered creative writing studio with narrative engine.",
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
