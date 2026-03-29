// ============================================================
// useStudioTheme — 테마/포커스 모드/검색/단축키 상태
// ============================================================

import { useState, useMemo } from 'react';
import type { AppLanguage } from '@/lib/studio-types';

// 0=다크, 1=딤, 2=라이트, 3=최대밝기
export type ThemeLevel = 0 | 1 | 2 | 3;
export const THEME_NAMES = ['다크', '딤', '라이트', '최대'] as const;
export const THEME_NAMES_EN = ['Dark', 'Dim', 'Light', 'Max'] as const;

export function useStudioTheme() {
  const [themeLevel, setThemeLevel] = useState<ThemeLevel>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('noa_theme_level');
      if (stored && ['0','1','2','3'].includes(stored)) return Number(stored) as ThemeLevel;
      // 마이그레이션: 기존 noa_light_theme 호환
      if (localStorage.getItem('noa_light_theme') === '1') return 2;
    }
    return 0;
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

  return {
    themeLevel, lightTheme, toggleTheme,
    focusMode, setFocusMode,
    showShortcuts, setShowShortcuts,
    showSearch, setShowSearch,
    searchQuery, setSearchQuery,
  };
}

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
