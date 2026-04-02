"use client";

import { useEffect, useState } from "react";
import { getAllFlags, type FeatureFlags } from "@/lib/feature-flags";

/**
 * 클라이언트에서 플래그 스냅샷을 구독합니다.
 * 다른 탭에서 `localStorage ff_*` 변경 시 storage 이벤트로 갱신됩니다.
 */
export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(() => getAllFlags());

  useEffect(() => {
    queueMicrotask(() => setFlags(getAllFlags()));
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("ff_")) queueMicrotask(() => setFlags(getAllFlags()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return flags;
}
