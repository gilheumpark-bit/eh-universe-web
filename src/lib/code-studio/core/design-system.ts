// ============================================================
// Code Studio — Design System
// ============================================================
// CSS 변수 토큰, 테마 전환 (dark/light), 컬러 팔레트, 스페이싱 스케일, 타이포그래피.

export type Theme = 'dark' | 'light' | 'system';

// ============================================================
// PART 1 — Color Tokens
// ============================================================

export interface ColorPalette {
  bg: { primary: string; secondary: string; tertiary: string; elevated: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  border: { primary: string; secondary: string; focus: string };
  accent: { primary: string; secondary: string; hover: string; active: string };
  status: { error: string; warning: string; success: string; info: string };
}

const DARK_PALETTE: ColorPalette = {
  bg: { primary: '#0d1117', secondary: '#161b22', tertiary: '#21262d', elevated: '#1c2128' },
  text: { primary: '#c9d1d9', secondary: '#8b949e', tertiary: '#6e7681', inverse: '#0d1117' },
  border: { primary: '#30363d', secondary: '#21262d', focus: '#58a6ff' },
  accent: { primary: '#58a6ff', secondary: '#388bfd', hover: '#79c0ff', active: '#1f6feb' },
  status: { error: '#f85149', warning: '#d29922', success: '#3fb950', info: '#58a6ff' },
};

const LIGHT_PALETTE: ColorPalette = {
  bg: { primary: '#ffffff', secondary: '#f6f8fa', tertiary: '#eaeef2', elevated: '#ffffff' },
  text: { primary: '#24292f', secondary: '#57606a', tertiary: '#8c959f', inverse: '#ffffff' },
  border: { primary: '#d0d7de', secondary: '#eaeef2', focus: '#0969da' },
  accent: { primary: '#0969da', secondary: '#0550ae', hover: '#218bff', active: '#0969da' },
  status: { error: '#cf222e', warning: '#9a6700', success: '#1a7f37', info: '#0969da' },
};

// IDENTITY_SEAL: PART-1 | role=ColorTokens | inputs=none | outputs=ColorPalette

// ============================================================
// PART 2 — Spacing & Typography
// ============================================================

/** Spacing scale (4px base) */
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

/** Font size scale */
export const fontSize = {
  xs: '11px',
  sm: '12px',
  base: '13px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
  '3xl': '24px',
} as const;

/** Font families */
export const fontFamily = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

// IDENTITY_SEAL: PART-2 | role=SpacingTypography | inputs=none | outputs=spacing,fontSize,fontFamily

// ============================================================
// PART 3 — Theme Application
// ============================================================

/** Get the color palette for a theme */
export function getPalette(theme: Theme): ColorPalette {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return LIGHT_PALETTE;
    }
    return DARK_PALETTE;
  }
  return theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
}

/** Apply theme CSS variables to document root */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const palette = getPalette(theme);
  const root = document.documentElement;

  function setGroup(prefix: string, obj: Record<string, string>): void {
    for (const [key, value] of Object.entries(obj)) {
      root.style.setProperty(`--${prefix}-${key}`, value);
    }
  }

  setGroup('bg', palette.bg);
  setGroup('text', palette.text);
  setGroup('border', palette.border);
  setGroup('accent', palette.accent);
  setGroup('status', palette.status);

  // Set data attribute for CSS selectors
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  root.setAttribute('data-theme', resolved);

  // Persist preference
  try { localStorage.setItem('eh-cs-theme', theme); } catch { /* */ }
}

/** Get stored theme preference */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem('eh-cs-theme');
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch { /* */ }
  return 'dark';
}

/** Listen for system theme changes */
export function onSystemThemeChange(callback: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

// IDENTITY_SEAL: PART-3 | role=ThemeApplication | inputs=Theme | outputs=void,ColorPalette
