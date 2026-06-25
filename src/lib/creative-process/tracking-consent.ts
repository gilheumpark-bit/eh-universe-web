"use client";

// Creative-process tracking is opt-in. Explicit exports/imports can still run,
// but automatic authorship journaling should only start after the author asks.

export const CREATIVE_PROCESS_TRACKING_STORAGE_KEY = "loreguard_creative_process_tracking";
export const CREATIVE_PROCESS_TRACKING_CHANGED_EVENT = "noa:creative-process-tracking-changed";

type TrackingChangeDetail = {
  enabled: boolean;
};

export function isCreativeProcessTrackingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CREATIVE_PROCESS_TRACKING_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setCreativeProcessTrackingEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(CREATIVE_PROCESS_TRACKING_STORAGE_KEY, "on");
    } else {
      window.localStorage.setItem(CREATIVE_PROCESS_TRACKING_STORAGE_KEY, "off");
    }
  } catch {
    // Private browsing or quota issues should not block the visible toggle.
  }
  try {
    window.dispatchEvent(
      new CustomEvent<TrackingChangeDetail>(CREATIVE_PROCESS_TRACKING_CHANGED_EVENT, {
        detail: { enabled },
      }),
    );
  } catch {
    // No-op in unusual browser shells.
  }
}

export function subscribeCreativeProcessTracking(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === CREATIVE_PROCESS_TRACKING_STORAGE_KEY) listener();
  };
  const onLocalChange = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(CREATIVE_PROCESS_TRACKING_CHANGED_EVENT, onLocalChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CREATIVE_PROCESS_TRACKING_CHANGED_EVENT, onLocalChange);
  };
}

