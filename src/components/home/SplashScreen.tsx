"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { FilePlus2, FolderOpen, Languages, LogIn, Monitor, Upload } from "lucide-react";
import UnifiedSettingsBar from "@/components/home/UnifiedSettingsBar";
import { useAuth } from "@/lib/AuthContext";

// [priority 4 2026-06-08] Onboarding sequence note:
// 현재 흐름: SplashScreen -> /studio -> (FirstVisitOnboarding hint) -> (옵션) OnboardingGuide.
// QuickStartModal 은 /studio 내부에서 noa:open-quickstart 이벤트로 호출.
// 4-flow 통합은 routing 변경 + 컴포넌트 합치기 필요. 별도 ADR-0005 작성 시 단행.
// 여기서는 진입점 가시성만 보강 (Primary CTA + 부가 안내).

const PROJECT_STORAGE_KEYS = ["noa_projects_v2", "noa_projects"] as const;

function countSavedProjects(): number {
  if (typeof window === "undefined") return 0;
  for (const key of PROJECT_STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.length;
    } catch {
      /* ignore corrupted local project cache */
    }
  }
  return 0;
}

export default function SplashScreen({
  onStudio,
  onProjectManage,
  onProjectImport,
  onTranslationStudio,
}: {
  onUniverse: () => void;
  onStudio: () => void;
  onProjectManage: () => void;
  onProjectImport: () => void;
  onTranslationStudio: () => void;
}) {
  const { lang: contextLang, toggleLang } = useLang();
  const { user, signInWithGoogle, isConfigured: authConfigured, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [resolvedLang, setResolvedLang] = useState<"ko" | "en" | "ja" | "zh">("ko");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [savedProjectCount, setSavedProjectCount] = useState(0);
  const [projectMenuNotice, setProjectMenuNotice] = useState<"empty" | null>(null);

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

  useEffect(() => {
    const refreshProjectCount = () => setSavedProjectCount(countSavedProjects());
    refreshProjectCount();
    window.addEventListener("storage", refreshProjectCount);
    window.addEventListener("noa:projects-updated", refreshProjectCount);
    return () => {
      window.removeEventListener("storage", refreshProjectCount);
      window.removeEventListener("noa:projects-updated", refreshProjectCount);
    };
  }, []);

  const lang = resolvedLang;
  void toggleLang; // keep reference for UnifiedSettingsBar
  const hasSavedProjects = savedProjectCount > 0;

  return (
    <main className="relative min-h-dvh flex w-full items-center justify-center overflow-hidden eh-page-canvas">
      {/* 2026-04-21: desktop 와이드 스크린에서 sparse 해 보이는 문제 완화.
          - gap 압축 (10 → 6) : 세로 공백 제거
          - 파이프라인 요소 간격을 콤팩트하게 */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-10 flex flex-col items-center gap-6 sm:gap-8">

        {/* Badge */}
        <div
          className={`transition-transform duration-700 ${mounted ? 'translate-y-0' : 'translate-y-2'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg-secondary/60 backdrop-blur-sm">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
              {L4(lang, {
                ko: 'Loreguard · 창작 전문 IDE',
                en: 'Loreguard · Creative IDE',
                ja: 'ローアガード · 創作専門IDE',
                zh: '洛尔加德 · 创作专业 IDE',
              })}
            </span>
          </div>
        </div>

        {/* Headline */}
        <div
          className={`text-center transition-transform duration-700 delay-100 ${mounted ? 'translate-y-0' : 'translate-y-2'}`}
        >
          <h1 className="font-serif text-[clamp(2.25rem,8vw,3.5rem)] font-bold text-text-primary leading-tight whitespace-nowrap tracking-normal">
            {L4(lang, {
              ko: "작품을 시작하는 첫 작업실",
              en: "Start a new creative workspace",
              ja: "作品を始める最初の作業室",
              zh: "开启作品的第一间工作室",
            })}
          </h1>
          <p className="mt-3 text-sm text-text-tertiary font-mono uppercase tracking-widest">
            {L4(lang, {
              ko: "과정이 기록되고, 권리가 정리되는 창작 IDE",
              en: "A creative IDE for process records and rights-ready work",
              ja: "過程を残し、権利を整理する創作IDE",
              zh: "记录过程、整理权利的创作专业 IDE",
            })}
          </p>
          {/* Primary CTA: above the fold, instant action */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onStudio}
              aria-label={L4(lang, { ko: "프로젝트 생성", en: "Create project", ja: "プロジェクト作成", zh: "创建项目" })}
              style={{ color: '#ffffff' }}
              className="inline-flex items-center justify-center gap-2 px-8 min-h-[48px] rounded-xl bg-accent-amber font-bold text-sm tracking-wide hover:bg-accent-amber/90 active:scale-[0.98] transition-[transform,background-color,border-color,color] shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-amber"
            >
              <Monitor className="w-4 h-4" />
              {L4(lang, { ko: "프로젝트 생성", en: "Create Project", ja: "プロジェクト作成", zh: "创建项目" })}
            </button>
            <button
              type="button"
              onClick={() => {
                setProjectMenuNotice(null);
                setSavedProjectCount(countSavedProjects());
                setProjectMenuOpen((open) => !open);
              }}
              aria-expanded={projectMenuOpen}
              aria-controls="home-project-menu"
              className="inline-flex items-center justify-center gap-2 px-6 min-h-[48px] rounded-xl border border-border bg-bg-secondary/70 hover:bg-bg-secondary text-text-secondary hover:text-text-primary text-sm font-semibold active:scale-[0.98] transition-[transform,background-color,border-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-blue"
            >
              <FolderOpen className="w-4 h-4" />
              {L4(lang, { ko: "작품 보관함", en: "Project Library", ja: "作品保管庫", zh: "作品库" })}
              {hasSavedProjects && (
                <span className="rounded-full bg-accent-blue/10 px-2 py-0.5 text-[10px] font-bold text-accent-blue">
                  {savedProjectCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onTranslationStudio}
              className="inline-flex items-center justify-center gap-2 px-6 min-h-[48px] rounded-xl border border-border bg-bg-secondary/70 hover:bg-bg-secondary text-text-secondary hover:text-text-primary text-sm font-semibold active:scale-[0.98] transition-[transform,background-color,border-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-green"
            >
              <Languages className="w-4 h-4" />
              {L4(lang, { ko: "번역·현지화", en: "Translation", ja: "翻訳・ローカライズ", zh: "翻译·本地化" })}
            </button>

            {/* 로그인 CTA: 비로그인 사용자에게만 명시 노출 (auth 확인 전 FOUC 방지) */}
            {mounted && authConfigured && !user && !authLoading && (
              <button
                onClick={async () => {
                  if (loginBusy) return;
                  setLoginBusy(true);
                  try { await signInWithGoogle(); } catch { /* 실패 시 AuthContext.error로 노출 */ }
                  finally { setLoginBusy(false); }
                }}
                disabled={loginBusy}
                className="inline-flex items-center justify-center gap-2 px-6 min-h-[48px] rounded-xl border border-border bg-bg-secondary/70 hover:bg-bg-secondary text-text-secondary hover:text-text-primary text-sm font-medium active:scale-[0.98] transition-[transform,background-color,border-color,color] disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {loginBusy
                  ? L4(lang, { ko: "연결 중…", en: "Connecting…", ja: "接続中…", zh: "连接中…" })
                  : L4(lang, { ko: "Google로 로그인", en: "Sign in with Google", ja: "Googleでログイン", zh: "使用 Google 登录" })}
              </button>
            )}
          </div>
          {projectMenuOpen && (
            <div
              id="home-project-menu"
              className="mt-4 grid w-full max-w-[460px] gap-3 rounded-2xl border border-border bg-bg-primary/90 p-3 text-left shadow-lg backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-accent-blue">
                    {L4(lang, { ko: "작품 보관함", en: "Project Library", ja: "作品保管庫", zh: "作品库" })}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-text-tertiary">
                    {hasSavedProjects
                      ? L4(lang, {
                        ko: "저장된 작품을 열어 이어서 작업합니다.",
                        en: "Open a saved work and continue.",
                        ja: "保存済み作品を開いて続けます。",
                        zh: "打开已保存作品并继续。",
                      })
                      : L4(lang, {
                        ko: "새 작품을 만들거나 기존 파일을 불러와 보관함을 채울 수 있습니다.",
                        en: "Create a new work or import files to start filling the library.",
                        ja: "新しい作品を作成するか、既存ファイルを読み込んで保管庫を使い始めます。",
                        zh: "可以创建新作品，或导入文件来开始填充作品库。",
                      })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-bg-secondary px-3 py-1 text-[11px] font-bold text-text-secondary">
                  {hasSavedProjects
                    ? L4(lang, {
                      ko: `${savedProjectCount}개`,
                      en: `${savedProjectCount} saved`,
                      ja: `${savedProjectCount}件`,
                      zh: `${savedProjectCount}个`,
                    })
                    : L4(lang, { ko: "비어 있음", en: "Empty", ja: "空", zh: "空" })}
                </span>
              </div>
              {hasSavedProjects && (
                <button
                  type="button"
                  onClick={() => {
                    const nextCount = countSavedProjects();
                    setSavedProjectCount(nextCount);
                    if (nextCount > 0) {
                      setProjectMenuNotice(null);
                      onProjectManage();
                      return;
                    }
                    setProjectMenuNotice("empty");
                  }}
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border border-accent-blue/20 bg-accent-blue/10 px-3 py-2 text-left transition-colors hover:bg-accent-blue/15 focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-accent-blue" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-text-primary">
                      {L4(lang, { ko: "최근 프로젝트 열기", en: "Open Recent Projects", ja: "最近のプロジェクトを開く", zh: "打开最近项目" })}
                    </span>
                    <span className="block text-[11px] leading-5 text-text-tertiary">
                      {L4(lang, {
                        ko: `${savedProjectCount}개 프로젝트 목록과 관리 항목을 엽니다.`,
                        en: `Open ${savedProjectCount} saved project${savedProjectCount === 1 ? "" : "s"}.`,
                        ja: `${savedProjectCount}件の保存済みプロジェクトを開きます。`,
                        zh: `打开 ${savedProjectCount} 个已保存项目。`,
                      })}
                    </span>
                  </span>
                </button>
              )}
              {(!hasSavedProjects || projectMenuNotice === "empty") && (
                <div className="rounded-xl border border-accent-blue/20 bg-accent-blue/10 px-3 py-3" role="status" aria-live="polite">
                  <p className="text-sm font-bold text-text-primary">
                    {L4(lang, {
                      ko: "아직 저장된 프로젝트가 없습니다.",
                      en: "No saved projects yet.",
                      ja: "保存済みプロジェクトはまだありません。",
                      zh: "还没有已保存项目。",
                    })}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-text-tertiary">
                    {L4(lang, {
                      ko: "새 프로젝트를 만들거나 기존 원고·설정집을 파일에서 불러오세요.",
                      en: "Create a new project or import an existing manuscript or setting book.",
                      ja: "新しいプロジェクトを作成するか、既存の原稿・設定集を読み込んでください。",
                      zh: "请创建新项目，或导入已有稿件/设定集。",
                    })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onStudio}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-amber px-3 text-xs font-bold !text-white transition-colors hover:bg-accent-amber/90 focus-visible:ring-2 focus-visible:ring-accent-amber"
                    >
                      {L4(lang, { ko: "새 프로젝트", en: "New project", ja: "新規作成", zh: "新项目" })}
                    </button>
                    <button
                      type="button"
                      onClick={onProjectImport}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-bg-secondary px-3 text-xs font-bold text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-accent-green"
                    >
                      {L4(lang, { ko: "파일에서 불러오기", en: "Import files", ja: "ファイル読込", zh: "导入文件" })}
                    </button>
                  </div>
                </div>
              )}
              {hasSavedProjects && (
                <div className="grid gap-2 border-t border-border pt-3">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
                    {L4(lang, { ko: "다른 시작 방법", en: "Other start options", ja: "別の開始方法", zh: "其他开始方式" })}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onStudio}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 text-xs font-bold text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-accent-amber"
                    >
                      <FilePlus2 className="h-4 w-4 text-accent-amber" />
                      {L4(lang, { ko: "새 프로젝트", en: "New Project", ja: "新規作成", zh: "新项目" })}
                    </button>
                    <button
                      type="button"
                      onClick={onProjectImport}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 text-xs font-bold text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-accent-green"
                    >
                      <Upload className="h-4 w-4 text-accent-green" />
                      {L4(lang, { ko: "파일 불러오기", en: "Import Files", ja: "読込", zh: "导入" })}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Bar */}
        <div
          className={`w-full transition-transform duration-700 delay-150 ${mounted ? 'translate-y-0' : 'translate-y-2'}`}
        >
          <UnifiedSettingsBar />
        </div>

        {/* Footer: 4언어 브랜드명 + 태그라인 */}
        <div
          className={`flex flex-col items-center gap-1 transition-transform duration-700 delay-300 ${mounted ? 'translate-y-0' : 'translate-y-2'}`}
        >
          <p className="text-[11px] text-text-secondary font-mono tracking-[0.2em] uppercase">
            {L4(lang, {
              ko: 'Loreguard',
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
    </main>
  );
}
