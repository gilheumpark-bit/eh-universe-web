/**
 * apps/desktop/renderer/lib/theme-controller.ts
 *
 * Single source of truth for theme state.
 *
 * PART 1 — Types + storage
 * PART 2 — Resolver (auto -> system)
 * PART 3 — Apply (DOM + Monaco)
 * PART 4 — React hook
 */

import { useEffect, useState, useCallback } from 'react';

// ============================================================
// PART 1 — Types + storage
// ============================================================

export type ThemeMode = 'dark' | 'light' | 'auto';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'cs:theme';

function loadStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* localStorage may be blocked */
  }
  return 'dark';
}

function persistMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* noop */
  }
}

// ============================================================
// PART 2 — Resolver
// ============================================================

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return getSystemPrefersDark() ? 'dark' : 'light';
}

// ============================================================
// PART 3 — Apply
// ============================================================

type MonacoLike = {
  editor: { setTheme: (name: string) => void };
};

let monacoRef: MonacoLike | null = null;

/** Called once by CodeStudioShell after Monaco loads. */
export function registerMonaco(monaco: MonacoLike): void {
  monacoRef = monaco;
  // Apply current theme immediately so Monaco doesn't flash
  const resolved = resolveTheme(loadStoredMode());
  applyMonaco(resolved);
}

function applyDom(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  // For browsers that honor color-scheme (scrollbar, form controls)
  document.documentElement.style.colorScheme = theme;
}

function applyMonaco(theme: ResolvedTheme): void {
  if (!monacoRef) return;
  monacoRef.editor.setTheme(theme === 'dark' ? 'eh-dark' : 'eh-light');
}

export function applyTheme(theme: ResolvedTheme): void {
  applyDom(theme);
  applyMonaco(theme);
}

// ============================================================
// PART 4 — React hook
// ============================================================

export interface UseThemeReturn {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export function useTheme(): UseThemeReturn {
  const [mode, setModeState] = useState<ThemeMode>(() => loadStoredMode());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(loadStoredMode()));

  // Apply on mount and on changes
  useEffect(() => {
    const next = resolveTheme(mode);
    setResolved(next);
    applyTheme(next);
  }, [mode]);

  // Listen to OS preference when in auto
  useEffect(() => {
    if (mode !== 'auto' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next: ResolvedTheme = mq.matches ? 'dark' : 'light';
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persistMode(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      // auto cycles to manual opposite of currently resolved
      let next: ThemeMode;
      if (prev === 'auto') {
        next = resolved === 'dark' ? 'light' : 'dark';
      } else if (prev === 'dark') {
        next = 'light';
      } else {
        next = 'dark';
      }
      persistMode(next);
      return next;
    });
  }, [resolved]);

  return { mode, resolved, setMode, toggle };
}
