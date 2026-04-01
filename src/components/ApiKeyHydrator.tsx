"use client";

import { useEffect } from "react";

/**
 * #19: Pre-loads v4 AES-GCM keys into memory cache on app start.
 * ai-providers는 동적 import로 분리해 루트 번들에 큰 동기 청크를 붙이지 않음.
 */
export default function ApiKeyHydrator() {
  useEffect(() => {
    const hydrate = () => {
      void import("@/lib/ai-providers")
        .then((m) => m.hydrateAllApiKeys())
        .catch(() => {
          /* keys load lazily on first use */
        });
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(hydrate, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(hydrate, 0);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
