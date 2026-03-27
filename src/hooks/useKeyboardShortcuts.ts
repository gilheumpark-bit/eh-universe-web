// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useEffect, useCallback } from 'react';

export interface ShortcutDef {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  label: string;
  labelKO: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutDef[];
  /** When true, suppress all shortcuts (e.g. modal is open) */
  disabled?: boolean;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ShortcutDef

// ============================================================
// PART 2 — Hook implementation
// ============================================================

export function useKeyboardShortcuts({ shortcuts, disabled }: UseKeyboardShortcutsOptions) {
  const handler = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    for (const s of shortcuts) {
      const matchCtrl = s.ctrl ? ctrl : !ctrl;
      const matchShift = s.shift ? shift : !shift;
      const matchKey = e.key.toLowerCase() === s.key.toLowerCase();

      if (matchCtrl && matchShift && matchKey) {
        e.preventDefault();
        s.action();
        return;
      }
    }
  }, [shortcuts, disabled]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

// IDENTITY_SEAL: PART-2 | role=hook | inputs=shortcuts,disabled | outputs=keyboard listener

// ============================================================
// PART 3 — Shortcut hint helper
// ============================================================

/**
 * Returns a tooltip string with shortcut hint appended.
 * e.g. formatShortcutHint("저장", "Ctrl+S") → "저장 (Ctrl+S)"
 */
export function formatShortcutHint(label: string, shortcut: string): string {
  return `${label} (${shortcut})`;
}

// IDENTITY_SEAL: PART-3 | role=tooltip helper | inputs=label,shortcut | outputs=string
