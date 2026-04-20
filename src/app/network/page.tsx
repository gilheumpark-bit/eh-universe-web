"use client";

// [E 번들] NetworkHomeClient 지연 로드 — Initial client bundle 에서 분리.
// network 라우트는 원래 metadata export 없어 layout 이동 불필요.
import dynamic from "next/dynamic";
import { NetworkSkeleton } from "@/components/SkeletonLoader";

const NetworkHomeClient = dynamic(
  () => import("@/components/network/NetworkHomeClient").then((m) => ({ default: m.NetworkHomeClient })),
  {
    ssr: false,
    loading: () => <NetworkSkeleton />,
  },
);

export default function NetworkPage() {
  return <NetworkHomeClient />;
}
