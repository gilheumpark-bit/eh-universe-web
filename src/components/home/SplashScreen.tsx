"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
// lucide-react icons removed — CTA simplified
import UnifiedSettingsBar from "@/components/home/UnifiedSettingsBar";

export default function SplashScreen({
  onStudio,
}: {
  onUniverse: () => void;
  onStudio: () => void;
  onCodeStudio: () => void;
  onTranslationStudio: () => void;
}) {
  const { lang: contextLang, toggleLang } = useLang();
  const [mounted, setMounted] = useState(false);
  const [resolvedLang, setResolvedLang] = useState<"ko" | "en" | "ja" | "zh">("ko");

  useEffect(() => {
    // Read directly from storage to bypass SSR hydration lag
    let saved: string | null = null;
    try { saved = localStorage.getItem("eh-lang"); } catch { /* private browsing */ }
    const detected = saved && ["ko", "en", "ja", "zh"].includes(saved)
      ? (saved as typeof resolvedLang)
      : contextLang;
    setResolvedLang(detected);
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when user toggles language via button
  useEffect(() => {
    setResolvedLang(contextLang);
  }, [contextLang]);

  const lang = resolvedLang;
  void toggleLang; // keep reference for UnifiedSettingsBar

  return (
    <div className="relative min-h-dvh flex w-full items-center justify-center overflow-hidden eh-page-canvas">
      <div className="relative z-10 w-full max-w-lg mx-auto px-6 flex flex-col items-center gap-10">

        {/* Badge */}
        <div
          className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg-secondary/60 backdrop-blur-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-amber/20 font-mono text-[8px] font-bold tracking-wider text-accent-amber">
              EH
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
              Universe · Writing Studio
            </span>
          </div>
        </div>

        {/* Headline */}
        <div
          className={`text-center transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-text-primary leading-snug">
            {L4(lang, {
              ko: "오늘도 쓰러 오셨군요.",
              en: "Ready to write today?",
              ja: "今日も書きに来ましたね。",
              zh: "今天也来写作了。",
            })}
          </h1>
          <p className="mt-3 text-sm text-text-tertiary font-mono uppercase tracking-widest">
            {L4(lang, {
              ko: "웹소설 집필 스튜디오",
              en: "Web Novel Writing Studio",
              ja: "ウェブ小説執筆スタジオ",
              zh: "网络小说写作工作室",
            })}
          </p>
          {/* Primary CTA — above the fold, instant action */}
          <button
            onClick={onStudio}
            className="mt-6 px-8 py-3 rounded-xl bg-accent-amber text-[#1a1a1a] font-bold text-sm tracking-wide hover:bg-accent-amber/90 active:scale-[0.98] transition-all shadow-lg"
          >
            {L4(lang, { ko: "바로 시작하기 →", en: "Start Now →", ja: "今すぐ始める →", zh: "立即开始 →" })}
          </button>
        </div>

        {/* Settings Bar */}
        <div
          className={`w-full transition-all duration-700 delay-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <UnifiedSettingsBar />
        </div>

        {/* Info Card (non-clickable) */}
        <div
          className={`w-full transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="rounded-2xl border border-border/30 bg-bg-secondary/60 backdrop-blur-xl px-6 py-5 text-center">
            <p className="text-xs text-text-secondary leading-relaxed">
              {L4(lang, {
                ko: "세계관 · 인물 · 원고를 한 화면에서 관리하고, 유니버스 · 코드 · 번역은 하단 독에서 이동합니다.",
                en: "Manage world, characters & manuscript in one place. Access Universe, Code & Translate from the dock.",
                ja: "世界観・人物・原稿を一画面で管理。ユニバース・コード・翻訳はドックから。",
                zh: "一个界面管理世界观、人物和原稿。从Dock访问宇宙、代码和翻译。",
              })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <p
          className={`text-xs text-text-tertiary font-mono tracking-wide transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          CC-BY-NC-4.0 · 로어가드 by EH
        </p>
      </div>
    </div>
  );
}
