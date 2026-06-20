"use client";

import { useLang } from "@/lib/LangContext";

const SKIP_NAV_TEXT = {
  ko: "본문으로 건너뛰기",
  en: "Skip to main content",
  ja: "本文へスキップ",
  zh: "跳至正文",
} as const;

export default function SkipToMainLink() {
  const { lang } = useLang();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-9999 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-md focus:px-4 focus:bg-white focus:text-black focus:underline"
      lang={lang}
    >
      {SKIP_NAV_TEXT[lang]}
    </a>
  );
}
