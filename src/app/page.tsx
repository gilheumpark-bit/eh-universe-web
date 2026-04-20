"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

/** Intersection Observer 기반 fade-in 훅 (prefers-reduced-motion 존중) */
function useFadeIn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** 홈 히어로 패널 — 스크롤에 따라 살짝 축소·복원 (prefers-reduced-motion 시 비활성) */
function useHeroScrollShrink(
  panelRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = panelRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = el.closest("section");
    if (!section) return;

    let raf = 0;
    const tick = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = Math.min(96, vh * 0.12);
      const range = Math.max(220, vh * 0.38);
      const raw = Math.max(0, start - rect.top);
      const t = Math.min(1, raw / range);
      const eased = t * (2 - t);
      const scale = 1 - 0.048 * eased;
      el.style.transform = `scale(${scale})`;
      el.style.transformOrigin = "center top";
      el.style.willChange = t > 0 && t < 1 ? "transform" : "auto";
    };

    const onScrollOrResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    onScrollOrResize();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.willChange = "";
    };
  }, [panelRef, enabled]);
}

import SplashScreen from "@/components/home/SplashScreen";
import { getTranslatorStudioHref, NOVEL_STUDIO_PATH } from "@/lib/studio-entry-links";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

function HomePageFallback() {
  return (
    <div className="relative min-h-dvh w-full eh-page-canvas overflow-hidden flex items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-4 animate-in fade-in duration-700">
        <div className="h-10 w-10 flex items-center justify-center rounded-full border border-accent-amber/30 bg-accent-amber/10 font-mono text-[10px] font-bold text-accent-amber animate-pulse">
          EH
        </div>
        <div className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase">
          로어가드 · Loreguard
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HubGrid — Hero(소설 스튜디오 + 번역 스튜디오) + 접힘 섹션(나머지)
// ============================================================
// localStorage 'home_apps_expanded' 로 접힘 상태 저장 (한 번 펼치면 유지).
// Hero 카드 = badge 'NS' (소설 스튜디오) / 'TR' (번역 스튜디오).
// 나머지 카드는 [모든 앱 보기] 토글 섹션에 그리드로 노출.
// ============================================================

type HubItem = {
  href: string;
  badge: string;
  color: 'amber' | 'blue' | 'green' | 'purple';
  title: string;
  desc: string;
  meta: string;
  external?: boolean;
};
type ColorToken = {
  border: string; bg: string; text: string; hoverText: string; glow: string;
};
type ColorMap = Record<HubItem['color'], ColorToken>;

function HubGrid({
  hubs,
  colorMap,
  lang,
  T,
}: {
  hubs: HubItem[];
  colorMap: ColorMap;
  lang: string;
  T: <V,>(v: { ko: V; en: V; ja?: V; zh?: V }) => V;
}) {
  void lang;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('home_apps_expanded');
      if (raw === '1') setExpanded(true);
    } catch { /* private browsing */ }
  }, []);
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => {
      const next = !prev;
      try {
        if (next) localStorage.setItem('home_apps_expanded', '1');
        else localStorage.removeItem('home_apps_expanded');
      } catch { /* quota/private */ }
      return next;
    });
  }, []);

  // Hero: NS(소설 스튜디오) → primary / TR(번역 스튜디오) → secondary
  const heroPrimary = hubs.find(h => h.badge === 'NS');
  const heroSecondary = hubs.find(h => h.badge === 'TR');
  const rest = hubs.filter(h => h.badge !== 'NS' && h.badge !== 'TR');

  const renderCard = (hub: HubItem, variant: 'hero-primary' | 'hero-secondary' | 'rest') => {
    const c = colorMap[hub.color];
    const isExternal = Boolean(hub.external || hub.href.startsWith('http'));
    const sizeCls =
      variant === 'hero-primary'
        ? 'md:col-span-2 md:row-span-2 p-8 md:p-10 min-h-[220px]'
        : variant === 'hero-secondary'
          ? 'md:col-span-2 p-6 md:p-8 min-h-[180px]'
          : 'p-6';
    const badgeCls =
      variant === 'hero-primary'
        ? 'h-14 w-14 text-sm'
        : variant === 'hero-secondary'
          ? 'h-12 w-12 text-xs'
          : 'h-11 w-11 text-xs';
    const titleCls =
      variant === 'hero-primary'
        ? 'text-2xl md:text-3xl tracking-wide normal-case font-display'
        : variant === 'hero-secondary'
          ? 'text-lg md:text-xl tracking-wide normal-case font-display'
          : 'font-[--font-mono] text-sm font-semibold uppercase tracking-widest';

    const inner = (
      <>
        <div className="pointer-events-none absolute inset-0">
          <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${c.glow} blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
        </div>
        <span className={`flex items-center justify-center rounded-full border ${c.border} ${c.bg} font-[--font-mono] tracking-[0.14em] ${c.text} ${badgeCls}`}>
          {hub.badge}
        </span>
        <div className="mt-4">
          <h3 className={`font-semibold text-text-primary transition-colors ${c.hoverText} ${titleCls}`}>
            {hub.title}
          </h3>
          <p className={`mt-2 ${variant === 'hero-primary' ? 'text-base leading-8' : 'text-sm leading-7'} text-text-secondary`}>{hub.desc}</p>
        </div>
        <div className={`mt-4 font-[--font-mono] text-[11px] uppercase tracking-[0.14em] text-text-tertiary transition-colors ${c.hoverText}`}>
          {hub.meta} →
        </div>
      </>
    );
    const cls = `group relative overflow-hidden premium-link-card flex flex-col ${sizeCls}`;
    return isExternal ? (
      <a key={hub.title} href={hub.href} target="_blank" rel="noopener noreferrer"
        className={cls}
        aria-label={`${hub.title} (opens in new tab)`}>
        {inner}
      </a>
    ) : (
      <Link key={hub.title} href={hub.href} className={cls}>
        {inner}
      </Link>
    );
  };

  return (
    <div className="site-shell">
      <div className="mb-8 px-1">
        <p className="site-kicker">
          {T({ ko: "탐색 허브", en: "Explore Hubs", ja: "探索ハブ", zh: "探索中心" })}
        </p>
        <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
          {T({ ko: "지금 시작하세요", en: "Start now", ja: "今すぐ始める", zh: "立即开始" })}
        </h2>
      </div>

      {/* Hero: Studio (primary, 크게) + Translation (secondary) */}
      <div className="grid gap-4 md:grid-cols-2">
        {heroPrimary && renderCard(heroPrimary, 'hero-primary')}
        {heroSecondary && renderCard(heroSecondary, 'hero-secondary')}
      </div>

      {/* 모든 앱 보기 토글 */}
      {rest.length > 0 && (
        <div className="mt-10">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary/40 hover:bg-bg-secondary text-text-secondary hover:text-text-primary font-[--font-mono] text-xs tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-accent-amber"
          >
            <span>
              {T({
                ko: expanded ? "모든 앱 닫기" : "모든 앱 보기",
                en: expanded ? "Hide all apps" : "Show all apps",
                ja: expanded ? "すべてのアプリを閉じる" : "すべてのアプリを表示",
                zh: expanded ? "收起所有应用" : "查看所有应用",
              })}
            </span>
            <span className="opacity-60">({rest.length})</span>
            <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
          </button>

          {expanded && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
              {rest.map(h => renderCard(h, 'rest'))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HomePageContent() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const flags = useFeatureFlags();
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

  // 심사·신규 방문자 설득용 숫자 — 엔지니어링 신뢰성 증명을 앞으로.
  // M1 AUTOSAVE_FORTRESS 투자가 랜딩에서 직접 읽히도록 배치.
  const universeStats = [
    { value: "3,230", label: T({ ko: "통과 테스트", en: "Tests passing", ja: "テスト通過", zh: "通过测试" }) },
    { value: "10K×0", label: T({ ko: "데이터 유실 (10,000회 카오스)", en: "Data loss (10K chaos)", ja: "データ損失 (10,000回カオス)", zh: "数据丢失 (10K混沌)" }) },
    { value: "4", label: T({ ko: "지원 언어", en: "Languages", ja: "対応言語", zh: "支持语言" }) },
    { value: "20/20", label: T({ ko: "장애 시나리오 방어 (FMEA)", en: "Failure modes defended", ja: "障害シナリオ防御", zh: "故障场景防御" }) },
  ];

  const universeHubs = useMemo(
    () => {
    const hubs = [
    {
      href: NOVEL_STUDIO_PATH,
      badge: "NS",
      color: "purple" as const,
      title: T({ ko: "소설 IDE", en: "Novel IDE", ja: "小説IDE", zh: "小说 IDE" }),
      desc: T({
        ko: "집필·문체·원고 워크스페이스. 문체는 스튜디오 안 문체 탭에서 이용합니다.",
        en: "Full NOA authoring workspace. Open the Style tab inside the studio for 문체 tools.",
        ja: "NOA制作ワークスペース。文体はスタジオ内の文体タブから。",
        zh: "NOA 完整创作工作台；文体工具请使用工作室内的文体标签页。",
      }),
      meta: T({ ko: "스튜디오 열기", en: "Open studio", ja: "スタジオへ", zh: "打开工作室" }),
    },
    {
      href: translatorStudioHref,
      badge: "TR",
      color: "green" as const,
      title: T({ ko: "번역 스튜디오", en: "Translation Studio", ja: "翻訳スタジオ", zh: "翻译工作室" }),
      desc: T({
        ko: "소설 전용 번역. 용어집과 문체를 기억하고, 정확성·자연스러움·완성도·포맷 4축으로 채점합니다.",
        en: "Novel-specialized translator. Glossary-aware, style-aware, scored across accuracy, fluency, completeness, and format.",
        ja: "小説専門の翻訳。用語集と文体を記憶し、正確性・自然さ・完成度・フォーマットの4軸で採点します。",
        zh: "小说专用翻译。记忆术语集与文体，按准确性、流畅度、完整性、格式 4 轴评分。",
      }),
      meta: T({ ko: "번역 열기", en: "Open translation", ja: "翻訳へ", zh: "打开翻译" }),
      external: translatorStudioHref.startsWith("http"),
    },
    // [v2.2.0-alpha] Code Studio는 홈 카드에서 비노출 — 주 네비·푸터에서도 숨김.
    // `/code-studio` 라우트는 유지 (URL 직접 접근 가능). 개발자 role에서만 Header 노출.
    {
      href: "/archive",
      badge: "AR",
      color: "amber" as const,
      title: T({ ko: "설정집 아카이브", en: "Lore Archive", ja: "設定集アーカイブ", zh: "设定集档案库" }),
      desc: T({ ko: "6개 카테고리, 109개 설정 문서 + 64개 기밀 보고서.", en: "6 categories, 109 lore docs + 64 classified reports.", ja: "6カテゴリ、109の設定文書＋64の機密報告書。", zh: "6个分类，109篇设定文档 + 64份机密报告。" }),
      meta: T({ ko: "세계관 문서 탐색", en: "Browse lore docs", ja: "世界観文書を探索", zh: "浏览世界观文档" }),
    },
    {
      href: "/reports",
      badge: "RP",
      color: "purple" as const,
      title: T({ ko: "기밀 보고서", en: "Classified Reports", ja: "機密報告書", zh: "机密报告" }),
      desc: T({ ko: "인물 파일, 사건 보고, 기술 사양, 제도 규정 — 53개 기밀 문서.", en: "Personnel files, incident reports, technical specs, protocols — 64 classified documents.", ja: "人物ファイル、事件報告、技術仕様、制度規定 — 64の機密文書。", zh: "人物档案、事件报告、技术规格、制度规定 — 64份机密文件。" }),
      meta: T({ ko: "보고서 열기", en: "Open reports", ja: "報告書を開く", zh: "打开报告" }),
    },
    {
      href: "/network",
      badge: "NW",
      color: "blue" as const,
      title: T({ ko: "작가 네트워크", en: "Writer Network", ja: "作家ネットワーク", zh: "作家网络" }),
      desc: T({ ko: "세계관을 기반으로 연결된 작가들의 행성 시스템. 로그와 게시글을 탐색합니다.", en: "A planet-based network of writers connected through shared worldbuilding. Browse logs and posts.", ja: "世界観を基盤に繋がった作家たちの惑星システム。ログと投稿を探索します。", zh: "基于世界观连接的作家行星系统。浏览日志和帖子。" }),
      meta: T({ ko: "네트워크 진입", en: "Enter network", ja: "ネットワークへ", zh: "进入网络" }),
    },
    {
      href: "/codex",
      badge: "CX",
      color: "green" as const,
      title: T({ ko: "코덱스", en: "Codex", ja: "コデックス", zh: "知识库" }),
      desc: T({ ko: "세계관의 핵심 법칙, 용어, 구조를 빠르게 참조합니다.", en: "Quick reference for the core laws, terms, and structures of the universe.", ja: "世界観の核心法則、用語、構造を素早く参照します。", zh: "快速查阅世界观的核心法则、术语和结构。" }),
      meta: T({ ko: "코덱스 열기", en: "Open codex", ja: "コデックスを開く", zh: "打开知识库" }),
    },
    {
      href: "/rulebook",
      badge: "RB",
      color: "purple" as const,
      title: T({ ko: "룰북 v1.0", en: "Rulebook v1.0", ja: "ルールブック v1.0", zh: "设定手册 v1.0" }),
      desc: T({ ko: "서사 엔진의 구조와 원리. 이 세계관이 어떻게 작동하는지 문서로 확인합니다.", en: "The structure and principles of the narrative engine. How this universe works, documented.", ja: "ナラティブエンジンの構造と原理。この世界観がどう機能するかを文書で確認します。", zh: "叙事引擎的结构与原理。通过文档了解这个世界观如何运作。" }),
      meta: T({ ko: "룰북 읽기", en: "Read rulebook", ja: "ルールブックを読む", zh: "阅读设定手册" }),
    },
    {
      href: "/reference",
      badge: "RF",
      color: "amber" as const,
      title: T({ ko: "EH Open Reference", en: "EH Open Reference", ja: "EH オープンリファレンス", zh: "EH 开放参考" }),
      desc: T({ ko: "프로젝트 전체를 빠르게 훑는 4페이지 요약본.", en: "A fast 4-page summary of the whole EH Universe project.", ja: "プロジェクト全体を素早く概観する4ページの要約。", zh: "快速浏览整个EH Universe项目的4页概要。" }),
      meta: T({ ko: "레퍼런스 보기", en: "Read reference", ja: "リファレンスを読む", zh: "阅读参考" }),
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
    return hubs.filter((h) => {
      if (!flags.NETWORK_COMMUNITY && h.href === "/network") return false;
      return true;
    });
    },
    [translatorStudioHref, T, flags.NETWORK_COMMUNITY],
  );

  const categories = [
    { id: "CORE", label: T({ ko: "핵심 법칙", en: "Core Laws", ja: "核心法則", zh: "核心法则" }), count: 5 },
    { id: "TIMELINE", label: T({ ko: "타임라인", en: "Timeline", ja: "タイムライン", zh: "时间线" }), count: 6 },
    { id: "FACTIONS", label: T({ ko: "세력", en: "Factions", ja: "勢力", zh: "派系" }), count: 9 },
    { id: "MILITARY", label: T({ ko: "군사", en: "Military", ja: "軍事", zh: "军事" }), count: 7 },
    { id: "GEOGRAPHY", label: T({ ko: "지리", en: "Geography", ja: "地理", zh: "地理" }), count: 9 },
    { id: "TECHNOLOGY", label: T({ ko: "기술", en: "Technology", ja: "技術", zh: "技术" }), count: 5 },
  ];

  const colorMap = {
    amber: { border: "border-accent-amber/20", bg: "bg-accent-amber/10", text: "text-accent-amber", hoverText: "group-hover:text-accent-amber", glow: "bg-accent-amber/8" },
    blue: { border: "border-accent-blue/20", bg: "bg-accent-blue/10", text: "text-accent-blue", hoverText: "group-hover:text-accent-blue", glow: "bg-accent-blue/8" },
    green: { border: "border-accent-green/20", bg: "bg-accent-green/10", text: "text-accent-green", hoverText: "group-hover:text-accent-green", glow: "bg-accent-green/8" },
    purple: { border: "border-accent-purple/20", bg: "bg-accent-purple/10", text: "text-accent-purple", hoverText: "group-hover:text-accent-purple", glow: "bg-accent-purple/8" },
  };

  const heroRef = useFadeIn<HTMLElement>();
  const heroPanelRef = useRef<HTMLDivElement>(null);
  useHeroScrollShrink(heroPanelRef, splashState === "hide");
  const catRef = useFadeIn<HTMLElement>();
  const hubRef = useFadeIn<HTMLElement>();
  const ctaRef = useFadeIn<HTMLElement>();

  // SSR → hydration 전까지 구조적 스켈레톤 표시 (검은 화면 방지)
  if (splashState === "loading") {
    return (
      <div className="relative min-h-dvh w-full eh-page-canvas overflow-hidden" aria-busy="true" aria-label="Loading">
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
            <div className="h-10 w-10 flex items-center justify-center rounded-full border border-accent-amber/30 bg-accent-amber/10 font-mono text-[10px] font-bold text-accent-amber animate-pulse">
              EH
            </div>
            <div className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase">
              로어가드 · Loreguard
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSplash) {
    return (
      <SplashScreen
        onUniverse={() => setShowSplash(false)}
        onStudio={() => {
          // [30일 재방문자 스킵] 스튜디오 진입도 "본 것"으로 간주해 타임스탬프 기록.
          markSplashSeen();
          router.push("/studio");
        }}
        onCodeStudio={() => {
          markSplashSeen();
          router.push("/code-studio");
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
                  {T({ ko: "Loreguard — 작가 주도형 집필 IDE", en: "Loreguard — Writer-first Novel IDE", ja: "Loreguard — 作家主導型執筆IDE", zh: "Loreguard — 作家主导型写作 IDE" })}
                </p>
                <h1 className="site-title mt-5 text-4xl font-bold leading-[0.94] sm:text-5xl md:text-7xl xl:text-[5.4rem]">
                  LOREGUARD
                </h1>
                <p className="mt-6 font-document text-base leading-[1.85] text-text-secondary sm:text-lg sm:leading-[1.95] md:text-[1.24rem]">
                  {T({ ko: "글만 쓰면 NOA가 문체를 학습하고, 품질을 검사하고, 연속성을 지킵니다.", en: "Just write. NOA learns your style, audits quality, and preserves continuity.", ja: "書くだけで、NOAが文体を学習し、品質を検査し、連続性を守ります。", zh: "只管写。NOA 学习文体、审核质量、守护连贯性。" })}
                </p>
                <p className="mt-5 font-[--font-mono] text-[11px] uppercase leading-5 tracking-[0.08em] text-text-tertiary sm:text-[0.82rem] sm:leading-8 sm:tracking-[0.16em] md:text-sm">
                  {T({ ko: "Tab 자동완성 · 품질 게이트 · 장르 프리셋 · GitHub 백업", en: "Tab completion · Quality gate · Genre presets · GitHub backup", ja: "Tab補完 · 品質ゲート · ジャンルプリセット · GitHub バックアップ", zh: "Tab 补全 · 质量门 · 类型预设 · GitHub 备份" })}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={NOVEL_STUDIO_PATH} prefetch className="premium-button">
                    {T({ ko: "집필 IDE 시작", en: "Start IDE", ja: "IDEを始める", zh: "启动 IDE" })}
                  </Link>
                  {translatorStudioHref.startsWith("http") ? (
                    <a
                      href={translatorStudioHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="premium-button secondary"
                    >
                      {T({ ko: "번역 스튜디오", en: "Translation", ja: "翻訳", zh: "翻译" })}
                    </a>
                  ) : (
                    <Link href={translatorStudioHref} prefetch className="premium-button secondary">
                      {T({ ko: "번역 스튜디오", en: "Translation", ja: "翻訳", zh: "翻译" })}
                    </Link>
                  )}
                  <Link href="/archive" prefetch className="premium-button secondary">
                    {T({ ko: "아카이브", en: "Archive", ja: "アーカイブ", zh: "档案库" })}
                  </Link>
                  <Link href="/network" prefetch className="premium-button secondary">
                    {T({ ko: "네트워크", en: "Network", ja: "ネットワーク", zh: "网络" })}
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 lg:w-80 lg:shrink-0">
                {universeStats.map((item) => (
                  <div key={item.label} className="card-glow premium-panel-soft rounded-[22px] px-5 py-6 border border-white/6 hover:border-accent-amber/20 transition-[transform,background-color,border-color,box-shadow,color] duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5">
                    <div className="font-display text-[2.4rem] font-bold leading-none text-text-primary">
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

      {/* CATEGORY GRID */}
      <section ref={catRef} className="section-divider py-20">
        <div className="site-shell">
          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="site-kicker">
                  {T({ ko: "아카이브 카테고리", en: "Archive Categories", ja: "アーカイブカテゴリ", zh: "档案库类别" })}
                </p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {T({ ko: "6개 분류, 109개 문서", en: "6 categories, 109 documents", ja: "6カテゴリ、109文書", zh: "6个分类，109个文档" })}
                </h2>
              </div>
              <Link href="/archive" className="font-[--font-mono] text-[11px] uppercase tracking-[0.16em] text-text-tertiary hover:text-accent-amber transition-colors">
                {T({ ko: "전체 보기 →", en: "View all →", ja: "全て見る →", zh: "查看全部 →" })}
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/archive?cat=${cat.id}`} className="premium-link-card group flex items-center justify-between p-5">
                  <div>
                    <p className="font-[--font-mono] text-[10px] uppercase tracking-[0.18em] text-text-tertiary">{cat.id}</p>
                    <h3 className="mt-1 font-[--font-mono] text-sm font-semibold uppercase tracking-widest text-text-primary transition-colors group-hover:text-accent-amber">
                      {cat.label}
                    </h3>
                  </div>
                  <span className="font-display text-2xl font-bold text-text-tertiary group-hover:text-accent-amber transition-colors">
                    {cat.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HUB GRID — Hero(Studio primary + Translation secondary) + collapsed rest */}
      <section ref={hubRef} className="section-divider py-20">
        <HubGrid hubs={universeHubs} colorMap={colorMap} lang={lang} T={T} />
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
                ko: "해줘 시장은 버튼 한 번에 결과만 받습니다. 하라 시장은 작가가 도구의 주인입니다. 문체, 연속성, 용어집, 번역 기준 — 전부 작가가 지시하고 조정합니다. 로어가드는 하라 시장의 유일한 제작 IDE입니다. Adobe가 디자이너에게, VS Code가 개발자에게, Logic Pro가 음악가에게 그랬듯이.",
                en: "The 'do it for me' market delivers a result from a single button. The 'let me do it' market makes the writer the owner of the tool. Style, continuity, glossary, translation standards — the writer directs and tunes all of it. Loreguard is the only authoring IDE in that market — the way Adobe is for designers, VS Code for developers, Logic Pro for musicians.",
                ja: "「やって」市場はボタン一つで結果だけを受け取ります。「やらせて」市場は作家が道具の主人です。文体、連続性、用語集、翻訳基準 — すべて作家が指示し調整します。Loreguardはその市場で唯一の制作IDEです。デザイナーにとってのAdobe、開発者にとってのVS Code、音楽家にとってのLogic Proのように。",
                zh: "“帮我做”市场一键交付结果。“让我做”市场让作家成为工具的主人——文体、连贯性、术语集、翻译基准全部由作家指挥并调校。Loreguard 是这个市场里唯一的创作 IDE——就像 Adobe 之于设计师、VS Code 之于开发者、Logic Pro 之于音乐家。",
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
                  {T({ ko: "집필을 시작하려면", en: "Ready to write?", ja: "執筆を始めるには", zh: "准备开始写作？" })}
                </p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {T({ ko: "이 세계관을 바탕으로 이야기를 쓸 수 있습니다.", en: "You can write stories set in this universe.", ja: "この世界観をもとに物語を書けます。", zh: "您可以在这个世界观中创作故事。" })}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/studio" className="premium-button">
                  {T({ ko: "스튜디오 열기", en: "Open Studio", ja: "スタジオを開く", zh: "打开工作室" })}
                </Link>
                <Link href="/reference" className="premium-button secondary">
                  {T({ ko: "레퍼런스 보기", en: "Read Reference", ja: "リファレンスを読む", zh: "阅读参考" })}
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
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-amber/20 bg-accent-amber/8 font-[--font-mono] text-[9px] font-bold tracking-[0.14em] text-accent-amber">
                EH
              </span>
              <p className="font-[--font-mono] text-xs tracking-[0.16em] text-text-tertiary">
                LOREGUARD · 로어가드 · CC-BY-NC-4.0
              </p>
            </div>
            <p className="font-document text-xs italic text-text-tertiary">
              {T({ ko: "창작에서 번역·출판까지, 한 흐름으로.", en: "From creation to translation & publishing — one pipeline.", ja: "創作から翻訳・出版まで、ひとつの流れで。", zh: "从创作到翻译与出版，一气呵成。" })}
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
