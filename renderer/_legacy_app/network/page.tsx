import { Suspense } from "react";
import { NetworkSkeleton } from "@/components/SkeletonLoader";
import { NetworkHomeClient } from "@/components/network/NetworkHomeClient";

export default function NetworkPage() {
  return (
    <Suspense fallback={<NetworkSkeleton />}>
      <NetworkHomeClient />
    </Suspense>
  );
}
