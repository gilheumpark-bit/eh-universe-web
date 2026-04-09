// @ts-nocheck
"use client";

import { useLang, type Lang } from "@/lib/LangContext";
import { Globe } from "lucide-react";

interface Props {
  compact?: boolean;
}

export function LanguageSwitch({ compact = false }: Props) {
  const { lang, setLangDirect } = useLang();

  const toggle = () => {
    const next = lang === "ko" ? "en" : "ko";
    setLangDirect(next);
    localStorage.setItem("eh-lang", next); // persist explicit preference
  };

  if (compact) {
    return (
      <button onClick={toggle} className="hover:bg-white/20 rounded px-1 py-0.5 text-[11px] text-white/60 transition-colors"
        title={lang === "ko" ? "Switch to English" : "한국어로 전환"}>
        {lang === "ko" ? "KO" : "EN"}
      </button>
    );
  }

  return (
    <button onClick={toggle}
      className="flex items-center gap-1 hover:bg-white/20 rounded px-1.5 py-0.5 text-[11px] text-white/60 transition-colors"
      title={lang === "ko" ? "Switch to English" : "한국어로 전환"}>
      <Globe size={10} />
      <span>
        {lang === "ko" ? (
          <><span className="font-semibold">한국어</span><span className="opacity-60"> / EN</span></>
        ) : (
          <><span className="opacity-60">KO / </span><span className="font-semibold">EN</span></>
        )}
      </span>
    </button>
  );
}
