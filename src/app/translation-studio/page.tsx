"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BookOpen, Home, ShieldCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { type Lang, useLang } from "@/lib/LangContext";
import { getNovelStudioHref } from "@/lib/studio-entry-links";
import MobileDesktopOnlyGate from "@/components/studio/MobileDesktopOnlyGate";

const TranslatorStudioApp = dynamic(
  () => import("@/components/translator/TranslatorStudioApp"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[70vh] items-center justify-center font-mono text-sm text-text-tertiary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-accent-amber/30 border-t-accent-amber rounded-full animate-spin" />
          <span>번역·현지화 작업실</span>
        </div>
      </div>
    ),
  },
);

function readForceDesktopPreference(): boolean {
  if (typeof window === "undefined") return false;
  const searchParams = new URLSearchParams(window.location.search);
  return (
    searchParams.get("force") === "desktop" ||
    window.localStorage.getItem("noa_force_desktop") === "1"
  );
}

export default function TranslationStudioPage() {
  const isMobile = useIsMobile();
  const { lang, setLangDirect } = useLang();
  const [forceDesktop] = useState(readForceDesktopPreference);
  const studioHref = getNovelStudioHref("create");

  if (isMobile && !forceDesktop) {
    return (
      <MobileDesktopOnlyGate
        featureNameKo="번역·현지화 작업실"
        featureNameEn="Translation & Localization Workspace"
        featureNameJa="翻訳・ローカライズ作業室"
        featureNameZh="翻译与本地化工作台"
        reasonKo="원문/번역 듀얼 에디터, 문단 편집, 품질 점검 화면은 데스크톱에서 가장 안정적으로 사용할 수 있습니다."
        reasonEn="The source/target editor, paragraph editing, and quality review views work best on desktop."
        reasonJa="原文/訳文デュアルエディター、段落編集、品質確認画面はデスクトップで最も安定して利用できます。"
        reasonZh="原文/译文双编辑器、段落编辑和质量检查界面在桌面端使用最稳定。"
      />
    );
  }

  // [I-09 priority-medium 2026-06-14] Studio 9단계와 연결되는 번역·현지화 입구 카피.
  const HEADER_COPY = {
    ko: {
      stage: '9 번역·현지화',
      note: '작품 설정 · 용어 · 회차 맥락 연결',
      status: '노아 준비 · 작가 승인 · 과정기록',
      home: '홈',
      studio: '작품 작업실',
      docs: '도움말',
    },
    en: {
      stage: 'Step 9 · Translation',
      note: 'Story context · glossary · episode memory',
      status: 'Noa prepares · Author approves · Process recorded',
      home: 'Home',
      studio: 'Workspace',
      docs: 'Help',
    },
    ja: {
      stage: '9 翻訳・ローカライズ',
      note: '作品設定・用語・各話文脈を接続',
      status: 'ノア準備 · 作者承認 · 過程記録',
      home: 'ホーム',
      studio: '作品作業室',
      docs: 'ヘルプ',
    },
    zh: {
      stage: '9 翻译与本地化',
      note: '作品设定、术语、章节语境连接',
      status: '诺亚准备 · 作者确认 · 过程记录',
      home: '首页',
      studio: '作品工作台',
      docs: '帮助',
    },
  } as const;
  const copy = HEADER_COPY[(lang as keyof typeof HEADER_COPY)] ?? HEADER_COPY.ko;
  const languageOptions: Array<{ id: Lang; label: string }> = [
    { id: "ko", label: "한" },
    { id: "en", label: "EN" },
    { id: "ja", label: "日" },
    { id: "zh", label: "中" },
  ];

  return (
    <main
      aria-label="로어가드 번역·현지화 작업실"
      className="flex h-screen min-h-0 flex-col overflow-hidden bg-bg-primary"
    >
      <h1 className="sr-only">로어가드 번역·현지화 작업실</h1>
      <header className="shrink-0 border-b border-border bg-bg-primary/95 px-3 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-3">
          <Link
            href="/"
            className="translator-header-brand inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg-secondary/70 px-3 text-[12px] font-semibold transition-colors hover:border-accent-indigo/40 hover:text-accent-indigo focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            <span className="translator-header-badge flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black">
              LG
            </span>
            로어가드
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <span className="rounded-full border border-accent-indigo/20 bg-accent-indigo/10 px-2.5 py-1 text-[11px] font-bold text-accent-indigo">
              {copy.stage}
            </span>
            <span className="translator-header-muted truncate text-[12px]">{copy.note}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-green/25 bg-accent-green/10 px-2.5 py-1 text-[11px] font-semibold text-text-primary">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              {copy.status}
            </span>
          </div>

          <div className="hidden items-center rounded-full border border-border bg-bg-secondary/50 p-0.5 lg:flex">
            {languageOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLangDirect(option.id)}
                className={`min-h-11 min-w-11 rounded-full px-2 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue ${
                  lang === option.id
                    ? "bg-accent-indigo text-white"
                    : "translator-header-lang hover:bg-bg-tertiary"
                }`}
                aria-label={`${option.label} language`}
                aria-pressed={lang === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>

          <nav className="flex items-center gap-2" aria-label="번역·현지화 이동">
            <Link
              href="/"
              className="translator-header-link inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-[12px] font-medium transition-colors hover:border-accent-indigo/40 focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Home className="h-3.5 w-3.5" aria-hidden />
              {copy.home}
            </Link>
            <Link
              href={studioHref}
              className="translator-header-link inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-[12px] font-medium transition-colors hover:border-accent-indigo/40 focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {copy.studio}
            </Link>
            <Link
              href="/docs"
              className="translator-header-link inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-[12px] font-medium transition-colors hover:border-accent-indigo/40 focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {copy.docs}
            </Link>
          </nav>
        </div>
      </header>
      <section className="min-h-0 flex-1">
        <TranslatorStudioApp />
      </section>
    </main>
  );
}
