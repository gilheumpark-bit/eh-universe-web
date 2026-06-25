"use client";

import { useEffect, useState } from "react";

const TX_PANEL_KEY = "noa-lg-tx-panel";

function readNarrowLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1179.98px)").matches;
}

export function readTxPanelOpen(): boolean {
  if (typeof window === "undefined") return false;
  if (readNarrowLayout()) return false;
  try {
    return window.localStorage.getItem(TX_PANEL_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeTxPanelOpen(open: boolean): void {
  try {
    window.localStorage.setItem(TX_PANEL_KEY, open ? "1" : "0");
  } catch {
    /* quota/private mode — 세션 내 상태만 유지 */
  }
}

export function useTxPanelSheet(): boolean {
  const [isSheet, setIsSheet] = useState(readNarrowLayout);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 1179.98px)");
    const sync = () => setIsSheet(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  return isSheet;
}
