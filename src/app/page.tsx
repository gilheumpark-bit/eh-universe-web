"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { getNovelStudioHref, getTranslatorStudioHref } from "@/lib/studio-entry-links";
import {
  HubGrid,
  HomePageFallback,
  useFadeIn,
  useHeroScrollShrink,
  type ColorMap,
  type HubItem,
} from "./home-page-parts";

// 2026-04-21 [PERF] SplashScreen을 dynamic으로 분리 — 재방문자(30일 내)는 splash 스킵이라
// 초기 번들에서 제외. 첫 방문자만 UnifiedSettingsBar + APIKeySlotManager까지 lazy 로드.
// Bundle expect: / First Load JS ~55-80 KB 감소 예상.
const SplashScreen = dynamic(() => import("@/components/home/SplashScreen"), {
  ssr: false,
  loading: () => (
    <main className="relative min-h-dvh w-full eh-page-canvas overflow-hidden flex items-center justify-center" aria-label="Loreguard 홈 로딩">
      <div className="relative z-10 flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <div className="flex h-10 items-center justify-center rounded-full border border-accent-indigo/40 bg-accent-indigo px-4 font-mono text-[10px] font-bold !text-white animate-pulse">
          Loreguard
        </div>
      </div>
    </main>
  ),
});

function HomePageContent() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stellarWhite = searchParams.get("skin") === "white";
  // 첫 방문 여부를 초기 렌더부터 알아야 깜빡임이 없다.
  // SSR에서는 항상 null, hydration 후 sessionStorage 체크.
  const [splashState, setSplashState] = useState<"loading" | "show" | "hide">("loading");

  useEffect(() => {
    if (stellarWhite) {
      queueMicrotask(() => setSplashState("hide"));
      return;
    }
    // 스플래시를 메인 초기 화면으로 고정 — 매 방문마다 표시 (유니버스 허브 직진입 방지)
    queueMicrotask(() => setSplashState("show"));
  }, [stellarWhite]);

  useEffect(() => {
    if (!stellarWhite) return;
    const prev = document.title;
    document.title = "Universe Studio | Stellar White";
    return () => {
      document.title = prev;
    };
  }, [stellarWhite]);

  const showSplash = splashState === "show";
  // [30일 재방문자 스킵] 스플래시를 닫을 때 타임스탬프를 기록해 30일간 재노출되지 않도록 한다.
  const markSplashSeen = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("loreguard_splash_seen_at", String(Date.now()));
    } catch {
      /* storage 접근 불가 시 무시 */
    }
  };
  const setShowSplash = (v: boolean) => {
    setSplashState(v ? "show" : "hide");
    if (!v) markSplashSeen();
  };

  // Auto-dismiss is removed as requested by the user so they can choose a path.
  // The splash screen will now wait for explicit user action.

  const T = useCallback(<V,>(v: { ko: V; en: V; ja?: V; zh?: V }): V =>
    L4(lang, v as unknown as { ko: string; en: string; ja?: string; zh?: string }) as unknown as V, [lang]);

  const translatorStudioHref = useMemo(() => getTranslatorStudioHref(), []);

  // 심사·신규 방문자 설득용 숫자. 엔지니어링 수치보다 창작 흐름을 우선한다.
  // M1 AUTOSAVE_FORTRESS 투자가 랜딩에서 직접 읽히도록 배치.
  const universeStats = [
    { value: "10", label: T({ ko: "창작 공정", en: "Creative steps", ja: "創作工程", zh: "创作流程" }) },
    { value: "1", label: T({ ko: "출고 패키지", en: "Release package", ja: "出稿パッケージ", zh: "出库包" }) },
    { value: "4", label: T({ ko: "작업 언어", en: "Work languages", ja: "作業言語", zh: "工作语言" }) },
    { value: "24h", label: T({ ko: "연재 작업 리듬", en: "Serial workflow", ja: "連載リズム", zh: "连载节奏" }) },
  ];

  const universeHubs = useMemo<HubItem[]>(
    () => {
    const hubs = [
    {
      href: getNovelStudioHref("create"),
      badge: "NS",
      color: "purple" as const,
      title: T({ ko: "창작 전문 IDE", en: "Creative IDE", ja: "創作専門IDE", zh: "创作专业 IDE" }),
      desc: T({
        ko: "프로젝트 생성, 세계관, 캐릭터, 씬시트, 집필, 퇴고, 출고를 한 흐름으로 관리합니다.",
        en: "Manage project setup, world, characters, scene sheets, writing, revision, and release in one workspace.",
        ja: "ノア制作ワークスペース。文体はスタジオ内の文体タブから。",
        zh: "诺亚完整创作工作台；文体工具请使用工作室内的文体标签页。",
      }),
      meta: T({ ko: "스튜디오 열기", en: "Open studio", ja: "スタジオへ", zh: "打开工作室" }),
    },
    {
      href: translatorStudioHref,
      badge: "TR",
      color: "green" as const,
      title: T({ ko: "번역·현지화", en: "Translation & Localization", ja: "翻訳・ローカライズ", zh: "翻译·本地化" }),
      desc: T({
        ko: "작품의 용어, 말투, 장면 맥락을 함께 보며 번역본과 현지화본을 나란히 다듬습니다.",
        en: "Translate with glossary, voice, and scene context, then refine source-faithful and localized versions side by side.",
        ja: "小説専門の翻訳。用語集と文体を記憶し、正確性・自然さ・完成度・フォーマットの4軸で採点します。",
        zh: "小说专用翻译。记忆术语集与文体，按准确性、流畅度、完整性、格式 4 轴评分。",
      }),
      meta: T({ ko: "번역·현지화 열기", en: "Open translation", ja: "翻訳へ", zh: "打开翻译" }),
      external: translatorStudioHref.startsWith("http"),
    },
    {
      href: "/docs",
      badge: "DOC",
      color: "purple" as const,
      title: T({ ko: "제품 문서", en: "Product Docs", ja: "製品ドキュメント", zh: "产品文档" }),
      desc: T({ ko: "창작 전문 IDE의 핵심 흐름, 출고 패키지, 과정기록 기준을 한곳에서 확인합니다.", en: "Read the core workflow, release package, and process-record standards for the creative IDE.", ja: "創作専門IDEの主要フロー、出荷パッケージ、過程記録基準を確認します。", zh: "查看创作专业 IDE 的核心流程、出库包与过程记录标准。" }),
      meta: T({ ko: "문서 열기", en: "Open docs", ja: "ドキュメントを開く", zh: "打开文档" }),
    },
    {
      href: "/verify",
      badge: "VR",
      color: "green" as const,
      title: T({ ko: "확인 문서 조회", en: "Verification Lookup", ja: "確認文書照会", zh: "确认文档查询" }),
      desc: T({ ko: "출고 패키지와 공개용 확인 카드의 식별자를 조회합니다. 원고 본문은 보여주지 않습니다.", en: "Look up release-package and public verification-card identifiers. Manuscript text stays hidden.", ja: "出荷パッケージと公開確認カードの識別子を照会します。本文は表示しません。", zh: "查询出库包与公开确认卡标识，不展示正文。" }),
      meta: T({ ko: "조회 열기", en: "Open lookup", ja: "照会を開く", zh: "打开查询" }),
    },
    {
      href: "/status",
      badge: "ST",
      color: "amber" as const,
      title: T({ ko: "상태", en: "Status", ja: "ステータス", zh: "状态" }),
      desc: T({ ko: "서비스 상태, 점검 정보, 운영 공지를 확인합니다.", en: "Check service status, maintenance notes, and operation notices.", ja: "サービス状態、点検情報、運用告知を確認します。", zh: "查看服务状态、维护信息与运行公告。" }),
      meta: T({ ko: "상태 보기", en: "Open status", ja: "状態を見る", zh: "查看状态" }),
    },
    {
      href: "https://github.com/gilheumpark-bit/eh-universe-web",
      badge: "GH",
      color: "blue" as const,
      title: "GitHub",
      desc: T({ ko: "오픈소스 진행 상황과 코드베이스를 확인합니다.", en: "See the open-source code and current progress.", ja: "オープンソースの進行状況とコードベースを確認します。", zh: "查看开源进展和代码库。" }),
      meta: T({ ko: "GitHub 열기", en: "Open GitHub", ja: "GitHubを開く", zh: "打开GitHub" }),
    },
  ];
    return hubs;
    },
    [translatorStudioHref, T],
  );

  const colorMap: ColorMap = {
    amber: { border: "border-accent-amber/20", bg: "bg-accent-amber/10", text: "text-accent-amber", hoverText: "group-hover:text-accent-amber", glow: "bg-accent-amber/8" },
    blue: { border: "border-accent-blue/20", bg: "bg-accent-blue/10", text: "text-accent-blue", hoverText: "group-hover:text-accent-blue", glow: "bg-accent-blue/8" },
    green: { border: "border-accent-green/20", bg: "bg-accent-green/10", text: "text-accent-green", hoverText: "group-hover:text-accent-green", glow: "bg-accent-green/8" },
    purple: { border: "border-accent-purple/20", bg: "bg-accent-purple/10", text: "text-accent-purple", hoverText: "group-hover:text-accent-purple", glow: "bg-accent-purple/8" },
  };

  const heroRef = useFadeIn<HTMLElement>();
  const heroPanelRef = useRef<HTMLDivElement>(null);
  useHeroScrollShrink(heroPanelRef, splashState === "hide");
  const hubRef = useFadeIn<HTMLElement>();
  const ctaRef = useFadeIn<HTMLElement>();

  // SSR → hydration 전까지 구조적 스켈레톤 표시 (검은 화면 방지)
  if (splashState === "loading") {
    return (
      <main className="relative min-h-dvh w-full eh-page-canvas overflow-hidden" aria-busy="true" aria-label="Loreguard 홈 로딩">
        {/* Skeleton header */}
        <div className="h-14 border-b border-border/20 bg-bg-secondary/30 animate-pulse" />
        {/* Skeleton hero */}
        <div className="site-shell pt-28 md:pt-32 px-6">
          <div className="premium-panel px-6 py-8 md:px-10 md:py-12">
            <div className="space-y-4 max-w-2xl">
              <div className="h-3 w-32 rounded bg-bg-tertiary/40 animate-pulse" />
              <div className="h-12 w-64 rounded bg-bg-tertiary/40 animate-pulse" />
              <div className="h-4 w-full max-w-lg rounded bg-bg-tertiary/30 animate-pulse" />
              <div className="h-4 w-3/4 max-w-md rounded bg-bg-tertiary/30 animate-pulse" />
              <div className="flex gap-3 pt-4">
                <div className="h-10 w-28 rounded-lg bg-bg-tertiary/30 animate-pulse" />
                <div className="h-10 w-28 rounded-lg bg-bg-tertiary/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        {/* Centered logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
            <div className="flex h-10 items-center justify-center rounded-full border border-accent-indigo/40 bg-accent-indigo px-4 font-mono text-[10px] font-bold !text-white animate-pulse">
              Loreguard
            </div>
            <div className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase">
              Loreguard
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (showSplash) {
    return (
      <SplashScreen
        onUniverse={() => setShowSplash(false)}
        onStudio={() => {
          // [30일 재방문자 스킵] 스튜디오 진입도 "본 것"으로 간주해 타임스탬프 기록.
          markSplashSeen();
          router.push(getNovelStudioHref("create"));
        }}
        onProjectManage={() => {
          markSplashSeen();
          router.push(getNovelStudioHref("manage"));
        }}
        onProjectImport={() => {
          markSplashSeen();
          router.push(getNovelStudioHref("import"));
        }}
        onTranslationStudio={() => {
          markSplashSeen();
          const href = getTranslatorStudioHref();
          if (href.startsWith("http")) {
            window.open(href, "_blank", "noopener,noreferrer");
          } else {
            router.push(href);
          }
        }}
      />
    );
  }

  const homeInner = (
    <>
      <Header stellarWhite={stellarWhite} />

      {/* [2026-05-16] 점검중 배너 — 본심 대비 알파 시각 시그널. NEXT_PUBLIC_MAINTENANCE_MODE='false' 로 OFF */}
      <MaintenanceBanner />

      {/* [C] <main> 랜드마크 — skip link 타겟은 상위 MainContentRegion#main-content 유지, 여기는 semantic main */}
      <main>
      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-32">
        <div className="site-shell relative z-10">
          <div
            ref={heroPanelRef}
            className="premium-panel premium-grid-accent px-6 py-8 md:px-10 md:py-12 xl:px-14"
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative z-10 max-w-2xl">
                <p className="site-kicker">
                  {T({ ko: "Loreguard · 창작 전문 IDE", en: "Loreguard · Creative IDE", ja: "Loreguard · 創作専門IDE", zh: "Loreguard · 创作专业 IDE" })}
                </p>
                <h1 className="site-title mt-5 text-4xl font-bold leading-[0.94] sm:text-5xl md:text-7xl xl:text-[5.4rem]">
                  Loreguard
                </h1>
                <p className="mt-6 font-document text-base leading-[1.85] text-text-secondary sm:text-lg sm:leading-[1.95] md:text-[1.24rem]">
                  {T({ ko: "아이디어를 작품으로 묶는 작업대입니다. 질문으로 기준을 잡고, 캔버스에서 작가 결정을 확정하고, 과정기록·권리/IP·출고 패키지로 정리합니다.", en: "A workspace for turning ideas into finished creative assets. Set the baseline through questions, lock author decisions on the canvas, and prepare process records, rights/IP notes, and release packages.", ja: "アイデアを作品にまとめる作業台です。質問で基準を定め、キャンバスで作者の判断を確定し、過程記録・権利/IP・出稿パッケージに整理します。", zh: "把想法整理成作品资产的工作台。通过问题确定基准，在画布上确认作者决策，并整理为过程记录、权利/IP 与出库包。" })}
                </p>
                <p className="mt-5 font-[--font-mono] text-[11px] uppercase leading-5 tracking-[0.08em] text-text-tertiary sm:text-[0.82rem] sm:leading-8 sm:tracking-[0.16em] md:text-sm">
                  {T({ ko: "프로젝트 생성 · 세계관 · 씬시트 · 집필 · 퇴고 · 번역 · 출고", en: "Project · World · Scene sheet · Writing · Revision · Localization · Release", ja: "プロジェクト · 世界観 · シーン表 · 執筆 · 推敲 · 翻訳 · 出稿", zh: "项目 · 世界观 · 场景表 · 写作 · 修订 · 翻译 · 出库" })}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={getNovelStudioHref("create")} prefetch className="premium-button">
                    {T({ ko: "프로젝트 생성", en: "Create Project", ja: "プロジェクト作成", zh: "创建项目" })}
                  </Link>
                  {translatorStudioHref.startsWith("http") ? (
                    <a
                      href={translatorStudioHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="premium-button secondary"
                    >
                      {T({ ko: "번역·현지화", en: "Translation", ja: "翻訳", zh: "翻译" })}
                    </a>
                  ) : (
                    <Link href={translatorStudioHref} prefetch className="premium-button secondary">
                      {T({ ko: "번역·현지화", en: "Translation", ja: "翻訳", zh: "翻译" })}
                    </Link>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 lg:w-80 lg:shrink-0">
                {universeStats.map((item) => (
                  <div key={item.label} className="card-glow premium-panel-soft rounded-[22px] px-5 py-6 border border-white/6 hover:border-accent-amber/20 transition-[transform,background-color,border-color,box-shadow,color] duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5">
                    {/* [D] tabular-nums — 숫자 폭 고정해 통계 카드 칼각 정렬 (3,230 / 10K×0 등) */}
                    <div className="font-display text-[2.4rem] font-bold leading-none text-text-primary tabular-nums">
                      {item.value}
                    </div>
                    <p className="mt-3 font-[--font-mono] text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HUB GRID — Hero(Studio primary + Translation secondary) + collapsed rest */}
      <section ref={hubRef} className="section-divider py-20">
        <HubGrid hubs={universeHubs} colorMap={colorMap} T={T} />

        {/* [P7+P21 루프2 — 2026-06-08] Capability matrix — Novel/Translation 이 모바일·데스크톱
            각각 어떻게 동작하는지 명시. iPad 작가가 진입 시 일관된 기대치 형성. */}
        <div className="site-shell mt-10">
          <div className="rounded-2xl border border-border/30 bg-bg-elevated/40 px-5 py-4 text-xs text-text-secondary md:text-sm">
            <p className="font-semibold text-text-primary mb-2">
              {T({
                ko: '기기 호환 안내',
                en: 'Device compatibility',
                ja: 'デバイス互換性',
                zh: '设备兼容性',
              })}
            </p>
            <ul className="space-y-1.5">
              <li>
                <span className="inline-block min-w-[120px] font-mono text-accent-purple">
                  {T({ ko: "창작 전문 IDE", en: "Creative IDE", ja: "創作専門IDE", zh: "创作专业 IDE" })}
                </span>
                {': '}
                {T({
                  ko: '모바일 가능 (가벼운 편집기) · 데스크톱 권장 (전체 기능)',
                  en: 'Mobile OK (lite editor) · Desktop recommended (full IDE)',
                  ja: 'モバイル可 (簡易) · デスクトップ推奨 (全機能)',
                  zh: '移动端可用 (轻量) · 桌面端推荐 (完整功能)',
                })}
              </li>
              <li>
                <span className="inline-block min-w-[120px] font-mono text-accent-green">
                  {T({ ko: "번역·현지화", en: "Translation", ja: "翻訳", zh: "翻译" })}
                </span>
                {': '}
                {T({
                  ko: '데스크톱 전용 (Monaco 에디터). 모바일 작가는 데모만 체험 가능.',
                  en: 'Desktop only (Monaco editor). Mobile users see demo only.',
                  ja: 'デスクトップ専用 (Monaco)。モバイルはデモのみ。',
                  zh: '仅桌面端 (Monaco)。移动端仅可体验演示。',
                })}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CATEGORY DECLARATION — "해줘 vs 하라" (SEO below-fold) */}
      <section className="section-divider py-16" aria-labelledby="category-heading">
        <div className="site-shell">
          <div className="premium-panel-soft rounded-[22px] border border-white/6 px-6 py-8 md:px-10 md:py-10">
            <p className="site-kicker">
              {T({ ko: "카테고리 선언", en: "Category Declaration", ja: "カテゴリ宣言", zh: "类别宣言" })}
            </p>
            <h2 id="category-heading" className="site-title mt-3 text-2xl font-semibold sm:text-3xl">
              {T({
                ko: "해줘가 아니라, 하라.",
                en: "Not 'do it for me'. 'Let me do it'.",
                ja: "「やって」ではなく「やらせて」。",
                zh: "不是“帮我做”，而是“让我做”。",
              })}
            </h2>
            <p className="mt-4 font-document text-[0.98rem] leading-[1.9] text-text-secondary md:text-base">
              {T({
                ko: "버튼 한 번으로 결과만 받는 도구가 아닙니다. 작가가 방향을 정하고, 노아가 질문하고, 캔버스가 결정을 남깁니다. 문체, 연속성, 용어집, 번역 기준까지 작가가 직접 지휘하는 제작 IDE입니다.",
                en: "This is not a one-button output tool. The author sets direction, Noah asks the right questions, and the canvas records decisions. Style, continuity, glossary, and localization standards stay under the author's control.",
                ja: "ボタン一つで結果だけを受け取る道具ではありません。作家が方向を決め、ノアが問い、キャンバスが決定を残します。文体、連続性、用語集、翻訳基準まで作家が指揮します。",
                zh: "这不是一键生成结果的工具。作者确定方向，诺亚提出问题，画布记录决定。文体、连贯性、术语集与本地化标准都由作者掌控。",
              })}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="section-divider pb-24 pt-8">
        <div className="site-shell">
          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="site-kicker">
                  {T({ ko: "작품을 시작하려면", en: "Ready to build the work?", ja: "作品を始めるには", zh: "准备开始作品？" })}
                </p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {T({ ko: "먼저 프로젝트를 만들고, 세계관부터 출고까지 한 번에 이어가세요.", en: "Create a project first, then carry it from world-building to release.", ja: "まずプロジェクトを作成し、世界観から出稿までつなげて進めましょう。", zh: "先创建项目，再从世界观一路推进到出库。" })}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={getNovelStudioHref("create")} className="premium-button">
                  {T({ ko: "프로젝트 생성", en: "Create Project", ja: "プロジェクト作成", zh: "创建项目" })}
                </Link>
                <Link href="/docs" className="premium-button secondary">
                  {T({ ko: "문서 보기", en: "Read Docs", ja: "ドキュメントを読む", zh: "阅读文档" })}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      <footer className="px-4 pb-10">
        <div className="site-shell">
          {/* gradient divider */}
          <div className="mx-auto mb-8 h-px w-2/3 bg-[linear-gradient(90deg,transparent,rgba(202,161,92,0.22),transparent)]" />
          <div className="premium-panel-soft flex flex-col items-center gap-5 rounded-xl px-6 py-7 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 items-center justify-center rounded-full border border-accent-amber/20 bg-accent-amber/8 px-3 font-[--font-mono] text-[9px] font-bold tracking-[0.14em] text-accent-amber">
                Loreguard
              </span>
              <p className="font-[--font-mono] text-xs tracking-[0.16em] text-text-tertiary">
                {T({
                  ko: "Loreguard · 창작 전문 IDE",
                  en: "Loreguard · Creative IDE",
                  ja: "Loreguard · 創作専門IDE",
                  zh: "Loreguard · 创作专业 IDE",
                })}
              </p>
            </div>
            <p className="font-document text-xs italic text-text-tertiary">
              {T({ ko: "창작에서 번역과 출고까지, 한 흐름으로.", en: "From creation to localization and release, in one flow.", ja: "創作から翻訳と出稿まで、ひとつの流れで。", zh: "从创作到翻译与出库，一气呵成。" })}
            </p>
          </div>
        </div>
      </footer>
    </>
  );

  if (stellarWhite) {
    return (
      <div className="home-skin-stellar-white relative min-h-dvh w-full eh-page-canvas overflow-x-hidden">
        {homeInner}
      </div>
    );
  }

  return homeInner;
}

export default function Home() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
