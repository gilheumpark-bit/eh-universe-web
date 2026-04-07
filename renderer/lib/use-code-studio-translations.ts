"use client";

import { useLang } from "@/lib/LangContext";
import { TRANSLATIONS } from "@/lib/studio-translations";
import type { AppLanguage } from "@/lib/studio-types";

/** 코드 스튜디오 `codeStudio` 사전 — 플랫폼 언어(ko/en/ja/zh)와 동기화 */
export function useCodeStudioT() {
  const { lang } = useLang();
  return TRANSLATIONS[lang.toUpperCase() as AppLanguage]?.codeStudio ?? TRANSLATIONS.KO.codeStudio;
}
