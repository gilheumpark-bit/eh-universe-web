"use client";

import { useEffect } from "react";

function isElectronRenderer(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { electron?: unknown }).electron);
}

/**
 * Registers optional PWA features on web. Skipped in Electron (no service worker stack).
 */
export default function WebFeaturesInit() {
  useEffect(() => {
    if (isElectronRenderer()) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* no sw asset in many builds */
    });
  }, []);

  return null;
}
