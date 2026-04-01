// ============================================================
// useStudioTheme — 테마/포커스 모드/검색/단축키 상태
// ============================================================

import { useState, useEffect } from 'react';
import type { AppLanguage } from '@/lib/studio-types';

// 0=다크, 1=딤, 2=라이트, 3=최대밝기
export type ThemeLevel = 0 | 1 | 2 | 3;
export const THEME_NAMES = ['다크', '딤', '라이트', '최대'] as const;
export const THEME_NAMES_EN = ['Dark', 'Dim', 'Light', 'Max'] as const;

// Color themes
export type ColorTheme = 'default' | 'beige' | 'ocean' | 'forest' | 'rose' | 'midnight' | 'violet' | 'sapphire' | 'emerald';
export const COLOR_THEMES: { id: ColorTheme; name: string; nameEn: string; preview: string }[] = [
  { id: 'default', name: '기본', nameEn: 'Default', preview: '#07090d' },
  { id: 'beige', name: '베이지', nameEn: 'Beige', preview: '#f5f0e8' },
  { id: 'ocean', name: '오션', nameEn: 'Ocean', preview: '#0a1628' },
  { id: 'forest', name: '포레스트', nameEn: 'Forest', preview: '#0d1a14' },
  { id: 'rose', name: '로즈', nameEn: 'Rose', preview: '#1a0d14' },
  { id: 'midnight', name: '미드나잇', nameEn: 'Midnight', preview: '#0d0d1a' },
  { id: 'violet', name: '바이올렛', nameEn: 'Violet', preview: '#8B5CF6' },
  { id: 'sapphire', name: '사파이어', nameEn: 'Sapphire', preview: '#3B82F6' },
  { id: 'emerald', name: '에메랄드', nameEn: 'Emerald', preview: '#10B981' },
];

/** Manages 4-level theme (dark/dim/light/max), color theme, focus mode, search overlay, and shortcuts panel */
export function useStudioTheme() {
  const [themeLevel, setThemeLevel] = useState<ThemeLevel>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('noa_theme_level');
      if (stored && ['0','1','2','3'].includes(stored)) return Number(stored) as ThemeLevel;
      // 마이그레이션: 기존 noa_light_theme 호환
      if (localStorage.getItem('noa_light_theme') === '1') return 2;
    }
    return 2; // 아카이브형 미래감: 밝은 모드 기본. 기존 저장값 있으면 영향 없음
  });
  
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('noa_color_theme') as ColorTheme;
      if (stored && COLOR_THEMES.some(t => t.id === stored)) return stored;
    }
    return 'default';
  });
  
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 하위호환: lightTheme = themeLevel >= 2
  const lightTheme = themeLevel >= 2;

  const toggleTheme = () => {
    setThemeLevel(prev => {
      const next = ((prev + 1) % 4) as ThemeLevel;
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

  // Apply theme level to document
  useEffect(() => {
    const themeValue = (['', 'dim', 'light', 'max'] as const)[themeLevel] || '';
    if (themeValue) {
      document.documentElement.setAttribute('data-theme', themeValue);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    // Also apply to body for full coverage
    document.body.setAttribute('data-theme', themeValue);
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
