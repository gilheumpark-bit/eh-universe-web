"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "ko" | "en" | "jp" | "cn";

const LANG_CYCLE: Lang[] = ["ko", "en", "jp", "cn"];
const VALID_LANGS = new Set<string>(LANG_CYCLE);

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  setLangDirect: (l: Lang) => void;
}

const LangContext = createContext<LangContextType>({
  lang: "ko",
  toggleLang: () => {},
  setLangDirect: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    const saved = localStorage.getItem("eh-lang");
    if (saved && VALID_LANGS.has(saved)) {
      setTimeout(() => setLang(saved as Lang), 0);
      document.documentElement.lang = saved === "jp" ? "ja" : saved === "cn" ? "zh" : saved;
    } else {
      // 브라우저 언어 자동 감지 — 첫 방문 시만 적용
      const browserLang = (navigator.language || '').toLowerCase();
      let detected: Lang = "ko";
      if (browserLang.startsWith("en")) detected = "en";
      else if (browserLang.startsWith("ja")) detected = "jp";
      else if (browserLang.startsWith("zh")) detected = "cn";
      // ko는 기본값이므로 별도 처리 불필요
      if (detected !== "ko") {
        setTimeout(() => setLang(detected), 0);
        applyLang(detected);
      }
    }
  }, []);

  const applyLang = (next: Lang) => {
    localStorage.setItem("eh-lang", next);
    document.documentElement.lang = next === "jp" ? "ja" : next === "cn" ? "zh" : next;
    return next;
  };

  const toggleLang = () => {
    setLang((prev) => {
      const idx = LANG_CYCLE.indexOf(prev);
      const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
      return applyLang(next);
    });
  };

  const setLangDirect = (l: Lang) => {
    setLang(applyLang(l));
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang, setLangDirect }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Safe lookup for i18n objects — jp/cn fall back to ko if missing, then en */
export function L2(obj: { ko: string; en: string; jp?: string; cn?: string }, lang: Lang): string {
  if (lang === "ko") return obj.ko;
  if (lang === "jp") return obj.jp || obj.ko || obj.en;
  if (lang === "cn") return obj.cn || obj.ko || obj.en;
  return obj.en;
}

/** Generic safe lookup for i18n objects with any value type — jp/cn fall back to ko then en */
export function L2A<T>(obj: { ko: T; en: T; jp?: T; cn?: T }, lang: Lang): T {
  if (lang === "ko") return obj.ko;
  if (lang === "jp") return obj.jp || obj.ko || obj.en;
  if (lang === "cn") return obj.cn || obj.ko || obj.en;
  return obj.en;
}
