// ============================================================
// useStudioTheme — 테마/포커스 모드/검색/단축키 상태
// ============================================================

import { useState, useMemo } from 'react';
import type { AppLanguage } from '@/lib/studio-types';

export function useStudioTheme() {
  const [lightTheme, setLightTheme] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('noa_light_theme') === '1';
    return false;
  });
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleTheme = () => {
    setLightTheme(prev => {
      const next = !prev;
      localStorage.setItem('noa_light_theme', next ? '1' : '0');
      return next;
    });
  };

  return {
    lightTheme, toggleTheme,
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
