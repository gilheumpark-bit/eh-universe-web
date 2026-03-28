"use client";

import { useEffect } from "react";

interface ShortcutMap {
  [key: string]: (() => void) | undefined;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      let combo = "";
      if (ctrl && shift) combo = `ctrl+shift+${key}`;
      else if (ctrl) combo = `ctrl+${key}`;

      if (combo && shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]!();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
