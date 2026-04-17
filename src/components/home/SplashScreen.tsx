"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { LogIn } from "lucide-react";
import UnifiedSettingsBar from "@/components/home/UnifiedSettingsBar";
import { useAuth } from "@/lib/AuthContext";

export default function SplashScreen({
  onStudio,
}: {
  onUniverse: () => void;
  onStudio: () => void;
  onCodeStudio: () => void;
  onTranslationStudio: () => void;
}) {
  const { lang: contextLang, toggleLang } = useLang();
  const { user, signInWithGoogle, isConfigured: authConfigured } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
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
              {L4(lang, {
                ko: '로어가드 · 집필 OS',
                en: 'Loreguard · Writing OS',
                ja: 'ローアガード · 執筆 OS',
                zh: '洛尔加德 · 写作 OS',
              })}
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
            className="mt-6 px-8 min-h-[48px] rounded-xl bg-accent-amber text-[#1a1a1a] font-bold text-sm tracking-wide hover:bg-accent-amber/90 active:scale-[0.98] transition-all shadow-lg"
          >
            {L4(lang, { ko: "바로 시작하기 →", en: "Start Now →", ja: "今すぐ始める →", zh: "立即开始 →" })}
          </button>

          {/* 로그인 CTA — 비로그인 사용자에게만 명시 노출 */}
          {authConfigured && !user && (
            <button
              onClick={async () => {
                if (loginBusy) return;
                setLoginBusy(true);
                try { await signInWithGoogle(); } catch { /* 실패 시 AuthContext.error로 노출 */ }
                finally { setLoginBusy(false); }
              }}
              disabled={loginBusy}
              className="mt-3 inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl border border-border bg-bg-secondary/70 hover:bg-bg-secondary text-text-secondary hover:text-text-primary text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loginBusy
                ? L4(lang, { ko: "연결 중…", en: "Connecting…", ja: "接続中…", zh: "连接中…" })
                : L4(lang, { ko: "Google로 로그인", en: "Sign in with Google", ja: "Googleでログイン", zh: "使用 Google 登录" })}
            </button>
          )}
        </div>

        {/* Settings Bar */}
        <div
          className={`w-full transition-all duration-700 delay-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <UnifiedSettingsBar />
        </div>

        {/* Footer — 4언어 브랜드명 + 태그라인 */}
        <div
          className={`flex flex-col items-center gap-1 transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <p className="text-[11px] text-text-secondary font-mono tracking-[0.2em] uppercase">
            {L4(lang, {
              ko: '로어가드',
              en: 'Loreguard',
              ja: 'ローアガード',
              zh: '洛尔加德',
            })}
          </p>
          <p className="text-[10px] text-text-tertiary font-mono tracking-wide">
            {L4(lang, {
              ko: '© EH · 창작 · 번역 · 출판',
              en: '© EH · Create · Translate · Publish',
              ja: '© EH · 創作 · 翻訳 · 出版',
              zh: '© EH · 创作 · 翻译 · 出版',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
