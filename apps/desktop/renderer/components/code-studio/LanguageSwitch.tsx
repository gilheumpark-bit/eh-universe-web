"use client";

import { useState } from "react";
import { Globe } from "lucide-react";

interface Props {
  compact?: boolean;
}

const STORAGE_KEY = "eh-locale";

function getLocale(): string {
  if (typeof window === "undefined") return "ko";
  return localStorage.getItem(STORAGE_KEY) ?? "ko";
}

export function LanguageSwitch({ compact = false }: Props) {
  const [locale, setLocaleState] = useState(getLocale);

  const toggle = () => {
    const next = locale === "ko" ? "en" : "ko";
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  if (compact) {
    return (
      <button onClick={toggle} className="hover:bg-white/20 rounded px-1 py-0.5 text-[11px] text-white/60 transition-colors"
        title={locale === "ko" ? "Switch to English" : "한국어로 전환"}>
        {locale === "ko" ? "KO" : "EN"}
      </button>
    );
  }

  return (
    <button onClick={toggle}
      className="flex items-center gap-1 hover:bg-white/20 rounded px-1.5 py-0.5 text-[11px] text-white/60 transition-colors"
      title={locale === "ko" ? "Switch to English" : "한국어로 전환"}>
      <Globe size={10} />
      <span>
        {locale === "ko" ? (
          <><span className="font-semibold">한국어</span><span className="opacity-60"> / EN</span></>
        ) : (
          <><span className="opacity-60">KO / </span><span className="font-semibold">EN</span></>
        )}
      </span>
    </button>
  );
}
