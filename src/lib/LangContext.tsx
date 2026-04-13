"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type Lang = "ko" | "en" | "ja" | "zh";

const LANG_CYCLE: Lang[] = ["ko", "en", "ja", "zh"];
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
  document.documentElement.lang = next;
}

function detectLang(): Lang {
  const saved = localStorage.getItem("eh-lang");
  if (saved && VALID_LANGS.has(saved)) return saved as Lang;
  const browserLang = (navigator.language || "").toLowerCase();
  if (browserLang.startsWith("en")) return "en";
  if (browserLang.startsWith("ja")) return "ja";
  if (browserLang.startsWith("zh")) return "zh";
  return "ko";
}

export function LangProvider({ children }: { children: ReactNode }) {
  // Initialize with detected language immediately on client.
  // SSR will use "ko", client will correct on first render via useState initializer.
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ko";
    return detectLang();
  });

  // Sync DOM lang attribute when lang changes
  useEffect(() => {
    document.documentElement.lang = lang;
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

/** Safe lookup for i18n objects — ja/zh fall back to ko if missing, then en */
export function L2(obj: { ko: string; en: string; ja?: string; zh?: string }, lang: Lang): string {
  if (lang === "ko") return obj.ko;
  if (lang === "ja") return obj.ja || obj.ko || obj.en;
  if (lang === "zh") return obj.zh || obj.ko || obj.en;
  return obj.en;
}

/** Generic safe lookup for i18n objects with any value type — ja/zh fall back to ko then en */
export function L2A<T>(obj: { ko: T; en: T; ja?: T; zh?: T }, lang: Lang): T {
  if (lang === "ko") return obj.ko;
  if (lang === "ja") return obj.ja || obj.ko || obj.en;
  if (lang === "zh") return obj.zh || obj.ko || obj.en;
  return obj.en;
}
