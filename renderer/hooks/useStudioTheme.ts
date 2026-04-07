// ============================================================
// useStudioTheme — 포커스 모드/검색/단축키 UI 상태
// 테마(밤/낮)는 UnifiedSettingsContext에서 관리
// ============================================================

import { useState } from 'react';
import type { AppLanguage } from '@/lib/studio-types';

/** Manages focus mode, search overlay, and shortcuts panel (UI state only).
 *  Theme management has been consolidated into UnifiedSettingsContext. */
export function useStudioTheme() {
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return {
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
