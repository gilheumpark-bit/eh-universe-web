// ============================================================
// useStudioTheme — 테마/포커스 모드/검색/단축키 상태
// ============================================================

import { useState, useEffect } from 'react';
import type { AppLanguage } from '@/lib/studio-types';

// 0=밤(다크), 1=낮(라이트) — 2단계 간소화
export type ThemeLevel = 0 | 1;
export const THEME_NAMES = ['밤', '낮'] as const;
export const THEME_NAMES_EN = ['Night', 'Day'] as const;

// Color themes (3종: 기본 / 밝은 / 베이지)
export type ColorTheme = 'default' | 'bright' | 'beige';

const LEGACY_COLOR_THEME_MAP: Record<string, ColorTheme> = {
  default: 'default',
  bright: 'bright',
  beige: 'beige',
  ocean: 'bright',
  sapphire: 'bright',
  emerald: 'bright',
  violet: 'bright',
  forest: 'default',
  midnight: 'default',
  rose: 'beige',
};

function normalizeStoredColorTheme(raw: string | null): ColorTheme {
  if (!raw) return 'default';
  if (raw === 'default' || raw === 'bright' || raw === 'beige') return raw;
  return LEGACY_COLOR_THEME_MAP[raw] ?? 'default';
}

export const COLOR_THEMES: { id: ColorTheme; name: string; nameEn: string; preview: string }[] = [
  { id: 'default', name: '기본', nameEn: 'Default', preview: '#11100e' },
  { id: 'bright', name: '밝은', nameEn: 'Bright', preview: '#f8fafc' },
  { id: 'beige', name: '베이지', nameEn: 'Beige', preview: '#f5f0e8' },
];

/** Manages 2-level theme (dark/light), color theme, focus mode, search overlay, and shortcuts panel */
export function useStudioTheme() {
  const [themeLevel, setThemeLevel] = useState<ThemeLevel>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('noa_theme_level');
      // 마이그레이션: 기존 4단계 → 2단계 (0,1=밤 / 2,3=낮)
      if (stored === '0' || stored === '1') return 0;
      if (stored === '2' || stored === '3') return 1;
      // 마이그레이션: 기존 noa_light_theme 호환
      if (localStorage.getItem('noa_light_theme') === '1') return 1;
    }
    return 1; // 기본: 낮(라이트)
  });
  
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') return 'default';
    const raw = localStorage.getItem('noa_color_theme');
    const normalized = normalizeStoredColorTheme(raw);
    if (raw !== null && normalized !== raw) {
      localStorage.setItem('noa_color_theme', normalized);
    }
    return normalized;
  });
  
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 하위호환: lightTheme = themeLevel === 1 (낮)
  const lightTheme = themeLevel === 1;

  const toggleTheme = () => {
    setThemeLevel(prev => {
      const next = (prev === 0 ? 1 : 0) as ThemeLevel;
      localStorage.setItem('noa_theme_level', String(next));
      return next;
    });
  };

  const setColorThemeWithPersist = (theme: ColorTheme) => {
    setColorTheme(theme);
    localStorage.setItem('noa_color_theme', theme);
    // Update document attribute for CSS
    document.documentElement.setAttribute('data-color-theme', theme);
  };

  // Apply theme level to document — 2단계: 'dark' | 'light'
  // Tailwind CSS 4 inlines oklch colors, ignoring CSS variable overrides.
  // We must set variables via JS inline style to override the cascade.
  useEffect(() => {
    const themeValue = themeLevel === 0 ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeValue);
    document.body.setAttribute('data-theme', themeValue);
    const root = document.documentElement;
    if (themeValue === 'light') {
      const vars: Record<string, string> = {
        '--color-bg-primary': '#FAFAF8',
        '--color-bg-secondary': '#F0F0EC',
        '--color-bg-tertiary': '#E4E4E0',
        '--color-text-primary': '#111111',
        '--color-text-secondary': '#333333',
        '--color-text-tertiary': '#555550',
        '--color-border': '#CDCDC5',
        '--color-accent-purple': '#5b4b93',
        '--color-accent-amber': '#8a6a20',
        '--color-accent-red': '#c16258',
        '--color-accent-green': '#2f9b83',
        '--color-accent-blue': '#4a6a8f',
        '--color-surface-strong': 'rgba(250,250,248,0.97)',
        '--color-surface-soft': 'rgba(240,240,236,0.88)',
      };
      for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    } else {
      // Remove inline overrides so @theme defaults apply
      const keys = ['--color-bg-primary','--color-bg-secondary','--color-bg-tertiary',
        '--color-text-primary','--color-text-secondary','--color-text-tertiary',
        '--color-border','--color-accent-purple','--color-accent-amber',
        '--color-accent-red','--color-accent-green','--color-accent-blue',
        '--color-surface-strong','--color-surface-soft'];
      for (const k of keys) root.style.removeProperty(k);
    }
  }, [themeLevel]);
  
  // Apply color theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
    document.body.setAttribute('data-color-theme', colorTheme);
  }, [colorTheme]);

  return {
    themeLevel, lightTheme, toggleTheme,
    colorTheme, setColorTheme: setColorThemeWithPersist,
    focusMode, setFocusMode,
    showShortcuts, setShowShortcuts,
    showSearch, setShowSearch,
    searchQuery, setSearchQuery,
  };
}

/** Manages app-wide language setting (KO/EN/JP/CN) persisted to localStorage */
export function useStudioLanguage() {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('noa_studio_lang') as AppLanguage) || 'KO';
    }
    return 'KO';
  });
  const isKO = language === 'KO';

  const setLang = (lang: AppLanguage) => {
    setLanguage(lang);
    localStorage.setItem('noa_studio_lang', lang);
  };

  return { language, setLanguage: setLang, isKO };
}
