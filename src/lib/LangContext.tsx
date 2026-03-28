"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

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

// Stable pure function — defined at module level to avoid hoisting issues
function applyLangToDOM(next: Lang): void {
  localStorage.setItem("eh-lang", next);
  document.documentElement.lang = next === "jp" ? "ja" : next === "cn" ? "zh" : next;
}

function detectLang(): Lang {
  const saved = localStorage.getItem("eh-lang");
  if (saved && VALID_LANGS.has(saved)) return saved as Lang;
  const browserLang = (navigator.language || "").toLowerCase();
  if (browserLang.startsWith("en")) return "en";
  if (browserLang.startsWith("ja")) return "jp";
  if (browserLang.startsWith("zh")) return "cn";
  return "ko";
}

export function LangProvider({ children }: { children: ReactNode }) {
  // Always start with 'ko' to match SSR — detect real language in useEffect
  const [lang, setLang] = useState<Lang>("ko");

  // Detect browser/saved language after hydration to avoid mismatch
  useEffect(() => {
    const detected = detectLang();
    if (detected !== "ko") {
      queueMicrotask(() => setLang(detected));
    }
  }, []);

  // Sync DOM lang attribute when lang changes
  useEffect(() => {
    document.documentElement.lang = lang === "jp" ? "ja" : lang === "cn" ? "zh" : lang;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const idx = LANG_CYCLE.indexOf(prev);
      const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
      applyLangToDOM(next);
      return next;
    });
  }, []);

  const setLangDirect = useCallback((l: Lang) => {
    applyLangToDOM(l);
    setLang(l);
  }, []);

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
