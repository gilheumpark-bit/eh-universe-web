"use client";

import { useEffect, useState } from "react";

const PLOT_RAIL_KEY = "noa-lg-plot-rail";

function readPlotNarrowLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1179.98px)").matches;
}

export function readPlotPanelOpen(): boolean {
  if (typeof window === "undefined") return false;
  if (readPlotNarrowLayout()) return false;
  try {
    return window.localStorage.getItem(PLOT_RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePlotPanelOpen(open: boolean): void {
  try {
    window.localStorage.setItem(PLOT_RAIL_KEY, open ? "1" : "0");
  } catch {
    /* quota/private mode — 세션 내 상태만 유지 */
  }
}

export function usePlotPanelSheet(): boolean {
  const [isSheet, setIsSheet] = useState(readPlotNarrowLayout);

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
