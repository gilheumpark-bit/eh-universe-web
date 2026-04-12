import type { AppLanguage } from './studio-types';
import { TRANSLATIONS } from './studio-translations';
import type { Lang } from './LangContext';

/** 4개 언어 인라인 번역 헬퍼 — JP/CN 없으면 KO로 fallback */
export function L4(lang: AppLanguage | Lang | string, t: { ko: string; en: string; ja?: string; zh?: string }): string {
  const raw = typeof lang === 'string' ? lang.toLowerCase() : 'ko';
  if (raw === 'en') return t.en;
  if (raw === 'ja' || raw === 'jp') return t.ja || t.ko;
  if (raw === 'zh' || raw === 'cn') return t.zh || t.ko;
  return t.ko;
}

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
