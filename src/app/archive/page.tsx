import { Suspense } from "react";
import type { Metadata } from "next";
import ArchiveClient from "./ArchiveClient";

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

export default function ArchivePage() {
  return (
    <Suspense>
      <ArchiveClient />
    </Suspense>
  );
}
