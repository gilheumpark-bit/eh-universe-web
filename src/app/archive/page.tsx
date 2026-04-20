"use client";

// [E 번들] ArchiveClient 지연 로드 — Initial client bundle 에서 분리.
// metadata 는 archive/layout.tsx 로 이동 (Server Component 만 metadata export 가능).
import dynamic from "next/dynamic";
import { ArchiveSkeleton } from "@/components/SkeletonLoader";

const ArchiveClient = dynamic(() => import("./ArchiveClient"), {
  ssr: false,
  loading: () => <ArchiveSkeleton />,
});

export default function ArchivePage() {
  return <ArchiveClient />;
}
