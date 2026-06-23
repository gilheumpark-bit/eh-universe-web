export type MobileTab = "world" | "characters" | "plots" | "manuscripts";

export interface WorldMemo {
  id: string;
  text: string;
  updatedAt: number;
}

export interface CharacterSketch {
  id: string;
  name: string;
  role: string;
  traits: string;
  updatedAt: number;
}

export interface PlotIdea {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

export interface MobileSketchStore {
  worldMemos: WorldMemo[];
  characters: CharacterSketch[];
  plots: PlotIdea[];
}

const STORAGE_KEY = "noa_mobile_sketch";

export const DEFAULT_MOBILE_SKETCH_STORE: MobileSketchStore = {
  worldMemos: [],
  characters: [],
  plots: [],
};

export function generateMobileSketchId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function countMobileSketchItems(store: MobileSketchStore): number {
  return store.worldMemos.length + store.characters.length + store.plots.length;
}

export function loadMobileSketchStore(): MobileSketchStore {
  if (typeof window === "undefined") return DEFAULT_MOBILE_SKETCH_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MOBILE_SKETCH_STORE;
    const parsed = JSON.parse(raw) as MobileSketchStore;
    return {
      worldMemos: Array.isArray(parsed.worldMemos) ? parsed.worldMemos : [],
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      plots: Array.isArray(parsed.plots) ? parsed.plots : [],
    };
  } catch {
    return DEFAULT_MOBILE_SKETCH_STORE;
  }
}

export function saveMobileSketchStore(store: MobileSketchStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("noa:mobile-sketch-updated", {
      detail: {
        total: countMobileSketchItems(store),
        worldCount: store.worldMemos.length,
        characterCount: store.characters.length,
        plotCount: store.plots.length,
      },
    }));
  } catch {
    // Local sketch capture should stay usable even when storage quota is unavailable.
  }
}
