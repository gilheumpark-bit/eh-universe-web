import type { Metadata } from "next";

// [E 번들] page.tsx 를 "use client" 로 전환했기에 metadata 는 서버 layout 으로 분리.
export const metadata: Metadata = {
  title: "Archive — EH Universe",
  description:
    "200+ articles spanning 66 million years of verified SF universe. Explore the EH Universe archive.",
  openGraph: {
    title: "Archive — EH Universe",
    description:
      "200+ articles spanning 66 million years of verified SF universe.",
  },
};

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
