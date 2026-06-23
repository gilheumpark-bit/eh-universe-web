import type { AppTab } from "@/lib/studio-types";

const DOCK_STORAGE_KEY = "eh-dock-order";
export const DOCK_POS_KEY = "eh-dock-position";
export const DOCK_ANCHOR_KEY = "eh-dock-anchor";

export interface DockPosition {
  x: number;
  y: number;
}

export function loadDockPosition(): DockPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(DOCK_POS_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as DockPosition;
  } catch {
    return null;
  }
}

export function saveDockPosition(pos: DockPosition) {
  try {
    localStorage.setItem(DOCK_POS_KEY, JSON.stringify(pos));
  } catch {
    /* private mode */
  }
}

export function loadDockOrder(): AppTab[] | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(DOCK_STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as AppTab[];
  } catch {
    return null;
  }
}

export function saveDockOrder(order: AppTab[]) {
  try {
    localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* private mode */
  }
}
