"use client";

import { useEffect, useState } from "react";

const CHARACTER_RAIL_KEY = "noa-lg-character-rail";

function readCharacterNarrowLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1179.98px)").matches;
}

export function readCharacterPanelOpen(): boolean {
  if (typeof window === "undefined") return false;
  if (readCharacterNarrowLayout()) return false;
  try {
    return window.localStorage.getItem(CHARACTER_RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCharacterPanelOpen(open: boolean): void {
  try {
    window.localStorage.setItem(CHARACTER_RAIL_KEY, open ? "1" : "0");
  } catch {
    /* quota/private mode — 세션 내 상태만 유지 */
  }
}

export function useCharacterPanelSheet(): boolean {
  const [isSheet, setIsSheet] = useState(readCharacterNarrowLayout);

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
