import type { AppLanguage } from './studio-types';
import { TRANSLATIONS } from './studio-translations';

/**
 * Create a translator function for the given language.
 * Reads from the centralized TRANSLATIONS object in studio-constants.ts.
 *
 * Usage:
 *   const t = useT(language);       // in components
 *   t('sidebar.newProject')         // → "새로운 소설 시작" (KO)
 *   t('engine.cancel')              // → "Cancel" (EN)
 *   t('missing.key', 'fallback')    // → "fallback"
 */
export function createT(language: AppLanguage) {
  const dict = TRANSLATIONS[language] ?? TRANSLATIONS.KO;

  return function t(key: string, fallback?: string): string {
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = dict;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return fallback ?? key;
      cur = cur[p];
    }
    return typeof cur === 'string' ? cur : (fallback ?? key);
  };
}
