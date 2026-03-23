import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reference — EH Universe",
  description:
    "EH Open Reference: 4-page summary of the EH definition, human types, non-intervention principle, and deity structure.",
  openGraph: {
    title: "Reference — EH Universe",
    description:
      "4-page summary of the EH Universe core concepts.",
  },
};

export default function ReferenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
