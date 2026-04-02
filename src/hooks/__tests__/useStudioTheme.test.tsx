/**
 * Tests for useStudioTheme and useStudioLanguage hooks.
 * Covers: theme cycling, localStorage persistence, legacy migration, language state.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioTheme, useStudioLanguage, type ThemeLevel } from '@/hooks/useStudioTheme';

// ============================================================
// PART 1 — Test Harnesses
// ============================================================

function createThemeHarness() {
  const ref: { current: ReturnType<typeof useStudioTheme> | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const hook = useStudioTheme();
    React.useEffect(() => { ref.current = hook; });
    return null;
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TestComponent));
  });

  return {
    get: () => ref.current!,
    cleanup: () => {
      act(() => { root.unmount(); });
      document.body.removeChild(container);
    },
  };
}

function createLanguageHarness() {
  const ref: { current: ReturnType<typeof useStudioLanguage> | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const hook = useStudioLanguage();
    React.useEffect(() => { ref.current = hook; });
    return null;
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TestComponent));
  });

  return {
    get: () => ref.current!,
    cleanup: () => {
      act(() => { root.unmount(); });
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// PART 2 — useStudioTheme Tests
// ============================================================

describe('useStudioTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to light theme (level 2) when no stored value', () => {
    const { get, cleanup } = createThemeHarness();
    expect(get().themeLevel).toBe(2);
    expect(get().lightTheme).toBe(true);
    cleanup();
  });

  it('restores theme level from localStorage', () => {
    localStorage.setItem('noa_theme_level', '2');
    const { get, cleanup } = createThemeHarness();
    expect(get().themeLevel).toBe(2);
    expect(get().lightTheme).toBe(true);
    cleanup();
  });

  it('migrates legacy noa_light_theme to level 2', () => {
    localStorage.setItem('noa_light_theme', '1');
    const { get, cleanup } = createThemeHarness();
    expect(get().themeLevel).toBe(2);
    cleanup();
  });

  it('cycles theme levels on toggleTheme: 2 → 3 → 0 → 1 → 2', () => {
    const { get, cleanup } = createThemeHarness();
    expect(get().themeLevel).toBe(2);

    act(() => { get().toggleTheme(); });
    expect(get().themeLevel).toBe(3);
    expect(get().lightTheme).toBe(true);

    act(() => { get().toggleTheme(); });
    expect(get().themeLevel).toBe(0);
    expect(get().lightTheme).toBe(false);

    act(() => { get().toggleTheme(); });
    expect(get().themeLevel).toBe(1);
    expect(get().lightTheme).toBe(false);

    act(() => { get().toggleTheme(); });
    expect(get().themeLevel).toBe(2);
    expect(get().lightTheme).toBe(true);

    cleanup();
  });

  it('persists theme level to localStorage on toggle', () => {
    const { get, cleanup } = createThemeHarness();
    act(() => { get().toggleTheme(); });
    expect(localStorage.getItem('noa_theme_level')).toBe('3');
    cleanup();
  });

  it('initializes focus mode as false', () => {
    const { get, cleanup } = createThemeHarness();
    expect(get().focusMode).toBe(false);
    cleanup();
  });

  it('toggles focus mode', () => {
    const { get, cleanup } = createThemeHarness();
    act(() => { get().setFocusMode(true); });
    expect(get().focusMode).toBe(true);
    act(() => { get().setFocusMode(false); });
    expect(get().focusMode).toBe(false);
    cleanup();
  });

  it('manages search state', () => {
    const { get, cleanup } = createThemeHarness();
    expect(get().showSearch).toBe(false);
    expect(get().searchQuery).toBe('');

    act(() => { get().setShowSearch(true); });
    expect(get().showSearch).toBe(true);

    act(() => { get().setSearchQuery('test'); });
    expect(get().searchQuery).toBe('test');
    cleanup();
  });

  it('ignores invalid stored theme values', () => {
    localStorage.setItem('noa_theme_level', '99');
    const { get, cleanup } = createThemeHarness();
    expect(get().themeLevel).toBe(2);
    cleanup();
  });

  it('defaults color theme to default when no stored value', () => {
    const { get, cleanup } = createThemeHarness();
    expect(get().colorTheme).toBe('default');
    cleanup();
  });

  it('restores valid color theme from localStorage', () => {
    localStorage.setItem('noa_color_theme', 'beige');
    const { get, cleanup } = createThemeHarness();
    expect(get().colorTheme).toBe('beige');
    cleanup();
  });

  it('migrates legacy ocean color theme to bright and persists', () => {
    localStorage.setItem('noa_color_theme', 'ocean');
    const { get, cleanup } = createThemeHarness();
    expect(get().colorTheme).toBe('bright');
    expect(localStorage.getItem('noa_color_theme')).toBe('bright');
    cleanup();
  });
});

// ============================================================
// PART 3 — useStudioLanguage Tests
// ============================================================

describe('useStudioLanguage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to KO when no stored value', () => {
    const { get, cleanup } = createLanguageHarness();
    expect(get().language).toBe('KO');
    expect(get().isKO).toBe(true);
    cleanup();
  });

  it('restores language from localStorage', () => {
    localStorage.setItem('noa_studio_lang', 'EN');
    const { get, cleanup } = createLanguageHarness();
    expect(get().language).toBe('EN');
    expect(get().isKO).toBe(false);
    cleanup();
  });

  it('persists language change to localStorage', () => {
    const { get, cleanup } = createLanguageHarness();
    act(() => { get().setLanguage('JP'); });
    expect(get().language).toBe('JP');
    expect(localStorage.getItem('noa_studio_lang')).toBe('JP');
    cleanup();
  });

  it('supports all 4 languages', () => {
    const { get, cleanup } = createLanguageHarness();
    const langs = ['KO', 'EN', 'JP', 'CN'] as const;
    for (const lang of langs) {
      act(() => { get().setLanguage(lang); });
      expect(get().language).toBe(lang);
    }
    cleanup();
  });
});
