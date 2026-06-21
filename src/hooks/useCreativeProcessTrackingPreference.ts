"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  isCreativeProcessTrackingEnabled,
  setCreativeProcessTrackingEnabled,
  subscribeCreativeProcessTracking,
} from "@/lib/creative-process/tracking-consent";

export function useCreativeProcessTrackingPreference(): readonly [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(
    subscribeCreativeProcessTracking,
    isCreativeProcessTrackingEnabled,
    () => false,
  );

  const setEnabled = useCallback((next: boolean) => {
    setCreativeProcessTrackingEnabled(next);
  }, []);

  return [enabled, setEnabled] as const;
}

