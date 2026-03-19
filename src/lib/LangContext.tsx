"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "ko" | "en";

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: "ko",
  toggleLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    const saved = localStorage.getItem("eh-lang") as Lang | null;
    if (saved === "en" || saved === "ko") setLang(saved);
  }, []);

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === "ko" ? "en" : "ko";
      localStorage.setItem("eh-lang", next);
      return next;
    });
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
