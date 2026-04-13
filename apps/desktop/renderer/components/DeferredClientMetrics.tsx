"use client";

import { useEffect } from "react";

/**
 * Lightweight idle-time navigation timing (no third-party SDK).
 */
export function DeferredClientMetrics() {
  useEffect(() => {
    const id = requestIdleCallback(() => {
      if (typeof performance === "undefined" || !performance.getEntriesByType) return;
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav && process.env.NODE_ENV !== "production") {
        console.debug("[metrics] navigation", {
          domComplete: nav.domComplete,
          loadEventEnd: nav.loadEventEnd,
        });
      }
    });
    return () => cancelIdleCallback(id);
  }, []);

  return null;
}
