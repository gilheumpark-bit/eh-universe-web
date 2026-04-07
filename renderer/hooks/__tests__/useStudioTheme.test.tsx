/**
 * Tests for useStudioTheme (UI state) and useStudioLanguage hooks.
 * Theme cycling/persistence tests have been moved to UnifiedSettingsContext tests,
 * since theme logic is now consolidated there.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioTheme, useStudioLanguage } from '@/hooks/useStudioTheme';

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
// PART 2 — useStudioTheme Tests (UI State Only)
// ============================================================

describe('useStudioTheme', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('manages shortcuts panel state', () => {
    const { get, cleanup } = createThemeHarness();
    expect(get().showShortcuts).toBe(false);

    act(() => { get().setShowShortcuts(true); });
    expect(get().showShortcuts).toBe(true);

    act(() => { get().setShowShortcuts(false); });
    expect(get().showShortcuts).toBe(false);
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
