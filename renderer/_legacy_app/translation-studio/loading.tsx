"use client";

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

export default function TranslationStudioLoading() {
  const { lang } = useLang();

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="text-center">
        <div
          className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "rgb(251 191 36 / 0.6)", borderTopColor: "transparent" }}
        />
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          {L4(lang, {
            ko: "번역 스튜디오 로딩 중…",
            en: "LOADING TRANSLATION STUDIO…",
            ja: "翻訳スタジオを読み込み中…",
            zh: "正在加载翻译工作室…",
          })}
        </p>
      </div>
    </div>
  );
}
