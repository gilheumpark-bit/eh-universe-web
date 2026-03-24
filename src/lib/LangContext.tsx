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

/** Safe lookup for {ko, en} objects — jp/cn fall back to en */
export function L2(obj: { ko: string; en: string }, lang: Lang): string {
  if (lang === "ko") return obj.ko;
  return obj.en; // en/jp/cn all use English for 2-lang objects
}

/** Generic safe lookup for {ko, en} objects with any value type — jp/cn fall back to en */
export function L2A<T>(obj: { ko: T; en: T }, lang: Lang): T {
  if (lang === "ko") return obj.ko;
  return obj.en;
}
