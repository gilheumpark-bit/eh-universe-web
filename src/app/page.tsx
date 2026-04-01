"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StarField from "@/components/StarField";
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


import SplashScreen from "@/components/home/SplashScreen";

export default function Home() {
  const { lang } = useLang();
  const router = useRouter();
  // 첫 방문 여부를 초기 렌더부터 알아야 깜빡임이 없다.
  // SSR에서는 항상 null, hydration 후 sessionStorage 체크.
  const [splashState, setSplashState] = useState<"loading" | "show" | "hide">("loading");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSplashState(sessionStorage.getItem("eh-splash-seen") ? "hide" : "show");
  }, []);
  const showSplash = splashState === "show";
  const setShowSplash = (v: boolean) => setSplashState(v ? "show" : "hide");

  // Auto-dismiss: desktop 2.5s, mobile needs more time to read & tap
  useEffect(() => {
    if (!showSplash) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const delay = isMobile ? 6000 : 2500;
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("eh-splash-seen", "1");
    }, delay);
    return () => clearTimeout(timer);
  }, [showSplash]);

  const T = <V,>(v: { ko: V; en: V; jp?: V; cn?: V }): V =>
    L4(lang, v as unknown as { ko: string; en: string; jp?: string; cn?: string }) as unknown as V;

  const universeStats = [
    { value: "173", label: T({ ko: "문서 + 보고서", en: "Docs + reports", jp: "文書+報告書", cn: "文档+报告" }) },
    { value: "6", label: T({ ko: "세계관 카테고리", en: "Lore categories", jp: "世界観カテゴリ", cn: "世界观类别" }) },
    { value: "200K+", label: T({ ko: "관할 행성계", en: "Planetary systems", jp: "管轄惑星系", cn: "管辖星系" }) },
    { value: "CC-BY-NC", label: T({ ko: "오픈 라이선스", en: "Open license", jp: "オープンライセンス", cn: "开放许可" }) },
  ];

  const universeHubs = [
    {
      href: "/archive",
      badge: "AR",
      color: "amber" as const,
      title: T({ ko: "설정집 아카이브", en: "Lore Archive", jp: "設定集アーカイブ", cn: "设定集档案库" }),
      desc: T({ ko: "6개 카테고리, 109개 설정 문서 + 64개 기밀 보고서.", en: "6 categories, 109 lore docs + 64 classified reports.", jp: "6カテゴリ、109の設定文書＋64の機密報告書。", cn: "6个分类，109篇设定文档 + 64份机密报告。" }),
      meta: T({ ko: "세계관 문서 탐색", en: "Browse lore docs", jp: "世界観文書を探索", cn: "浏览世界观文档" }),
    },
    {
      href: "/reports",
      badge: "RP",
      color: "purple" as const,
      title: T({ ko: "기밀 보고서", en: "Classified Reports", jp: "機密報告書", cn: "机密报告" }),
      desc: T({ ko: "인물 파일, 사건 보고, 기술 사양, 제도 규정 — 53개 기밀 문서.", en: "Personnel files, incident reports, technical specs, protocols — 64 classified documents.", jp: "人物ファイル、事件報告、技術仕様、制度規定 — 64の機密文書。", cn: "人物档案、事件报告、技术规格、制度规定 — 64份机密文件。" }),
      meta: T({ ko: "보고서 열기", en: "Open reports", jp: "報告書を開く", cn: "打开报告" }),
    },
    {
      href: "/network",
      badge: "NW",
      color: "blue" as const,
      title: T({ ko: "작가 네트워크", en: "Writer Network", jp: "作家ネットワーク", cn: "作家网络" }),
      desc: T({ ko: "세계관을 기반으로 연결된 작가들의 행성 시스템. 로그와 게시글을 탐색합니다.", en: "A planet-based network of writers connected through shared worldbuilding. Browse logs and posts.", jp: "世界観を基盤に繋がった作家たちの惑星システム。ログと投稿を探索します。", cn: "基于世界观连接的作家行星系统。浏览日志和帖子。" }),
      meta: T({ ko: "네트워크 진입", en: "Enter network", jp: "ネットワークへ", cn: "进入网络" }),
    },
    {
      href: "/codex",
      badge: "CX",
      color: "green" as const,
      title: T({ ko: "코덱스", en: "Codex", jp: "コデックス", cn: "知识库" }),
      desc: T({ ko: "세계관의 핵심 법칙, 용어, 구조를 빠르게 참조합니다.", en: "Quick reference for the core laws, terms, and structures of the universe.", jp: "世界観の核心法則、用語、構造を素早く参照します。", cn: "快速查阅世界观的核心法则、术语和结构。" }),
      meta: T({ ko: "코덱스 열기", en: "Open codex", jp: "コデックスを開く", cn: "打开知识库" }),
    },
    {
      href: "/rulebook",
      badge: "RB",
      color: "purple" as const,
      title: T({ ko: "룰북 v1.0", en: "Rulebook v1.0", jp: "ルールブック v1.0", cn: "设定手册 v1.0" }),
      desc: T({ ko: "서사 엔진의 구조와 원리. 이 세계관이 어떻게 작동하는지 문서로 확인합니다.", en: "The structure and principles of the narrative engine. How this universe works, documented.", jp: "ナラティブエンジンの構造と原理。この世界観がどう機能するかを文書で確認します。", cn: "叙事引擎的结构与原理。通过文档了解这个世界观如何运作。" }),
      meta: T({ ko: "룰북 읽기", en: "Read rulebook", jp: "ルールブックを読む", cn: "阅读设定手册" }),
    },
    {
      href: "/reference",
      badge: "RF",
      color: "amber" as const,
      title: T({ ko: "EH Open Reference", en: "EH Open Reference", jp: "EH オープンリファレンス", cn: "EH 开放参考" }),
      desc: T({ ko: "프로젝트 전체를 빠르게 훑는 4페이지 요약본.", en: "A fast 4-page summary of the whole EH Universe project.", jp: "プロジェクト全体を素早く概観する4ページの要約。", cn: "快速浏览整个EH Universe项目的4页概要。" }),
      meta: T({ ko: "레퍼런스 보기", en: "Read reference", jp: "リファレンスを読む", cn: "阅读参考" }),
    },
    {
      href: "https://github.com/gilheumpark-bit/eh-universe-web",
      badge: "GH",
      color: "blue" as const,
      title: "GitHub",
      desc: T({ ko: "오픈소스 진행 상황과 코드베이스를 확인합니다.", en: "See the open-source code and current progress.", jp: "オープンソースの進行状況とコードベースを確認します。", cn: "查看开源进展和代码库。" }),
      meta: T({ ko: "GitHub 열기", en: "Open GitHub", jp: "GitHubを開く", cn: "打开GitHub" }),
    },
  ];

  const categories = [
    { id: "CORE", label: T({ ko: "핵심 법칙", en: "Core Laws", jp: "核心法則", cn: "核心法则" }), count: 5 },
    { id: "TIMELINE", label: T({ ko: "타임라인", en: "Timeline", jp: "タイムライン", cn: "时间线" }), count: 6 },
    { id: "FACTIONS", label: T({ ko: "세력", en: "Factions", jp: "勢力", cn: "派系" }), count: 9 },
    { id: "MILITARY", label: T({ ko: "군사", en: "Military", jp: "軍事", cn: "军事" }), count: 7 },
    { id: "GEOGRAPHY", label: T({ ko: "지리", en: "Geography", jp: "地理", cn: "地理" }), count: 9 },
    { id: "TECHNOLOGY", label: T({ ko: "기술", en: "Technology", jp: "技術", cn: "技术" }), count: 5 },
  ];

  const colorMap = {
    amber: { border: "border-accent-amber/20", bg: "bg-accent-amber/10", text: "text-accent-amber", hoverText: "group-hover:text-accent-amber", glow: "bg-accent-amber/8" },
    blue: { border: "border-accent-blue/20", bg: "bg-accent-blue/10", text: "text-accent-blue", hoverText: "group-hover:text-accent-blue", glow: "bg-accent-blue/8" },
    green: { border: "border-accent-green/20", bg: "bg-accent-green/10", text: "text-accent-green", hoverText: "group-hover:text-accent-green", glow: "bg-accent-green/8" },
    purple: { border: "border-accent-purple/20", bg: "bg-accent-purple/10", text: "text-accent-purple", hoverText: "group-hover:text-accent-purple", glow: "bg-accent-purple/8" },
  };

  const heroRef = useFadeIn<HTMLElement>();
  const catRef = useFadeIn<HTMLElement>();
  const hubRef = useFadeIn<HTMLElement>();
  const ctaRef = useFadeIn<HTMLElement>();

  // SSR → hydration 전까지 빈 화면 (깜빡임 방지)
  if (splashState === "loading") {
    return <div className="min-h-screen bg-bg-primary" />;
  }

  if (showSplash) {
    return (
      <SplashScreen
        onUniverse={() => {
          setShowSplash(false);
          if (typeof window !== "undefined") sessionStorage.setItem("eh-splash-seen", "1");
        }}
        onStudio={() => {
          setShowSplash(false);
          if (typeof window !== "undefined") sessionStorage.setItem("eh-splash-seen", "1");
          router.push("/studio");
        }}
        onCodeStudio={() => {
          setShowSplash(false);
          if (typeof window !== "undefined") sessionStorage.setItem("eh-splash-seen", "1");
          router.push("/code-studio");
        }}
      />
    );
  }

  return (
    <>
      <Header />

      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-32">
        <StarField />
        <div className="site-shell relative z-10">
          <div className="premium-panel premium-grid-accent px-6 py-8 md:px-10 md:py-12 xl:px-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative z-10 max-w-2xl">
                <p className="site-kicker">
                  {T({ ko: "세계관 탐색 포털", en: "Worldbuilding Portal", jp: "世界観探索ポータル", cn: "世界观探索门户" })}
                </p>
                <h1 className="site-title mt-5 text-5xl font-bold leading-[0.94] sm:text-6xl md:text-7xl xl:text-[5.4rem]">
                  EH UNIVERSE
                </h1>
                <p className="mt-6 font-document text-lg leading-[1.95] text-text-secondary md:text-[1.24rem]">
                  {T({ ko: "은하 중앙 의회가 관할하는 20만 행성계의 역사, 세력, 기술, 지리를 아카이브로 탐색합니다.", en: "Explore the history, factions, technology, and geography of 200,000 planetary systems under the Galactic Central Council.", jp: "銀河中央評議会が管轄する20万惑星系の歴史、勢力、技術、地理をアーカイブで探索します。", cn: "探索银河中央议会管辖的20万星系的历史、派系、技术和地理档案。" })}
                </p>
                <p className="mt-5 font-[--font-mono] text-[0.82rem] uppercase leading-8 tracking-[0.16em] text-text-tertiary md:text-sm">
                  {T({ ko: "아카이브 · 네트워크 · 코덱스 · 룰북 · 레퍼런스", en: "Archive · Network · Codex · Rulebook · Reference", jp: "アーカイブ · ネットワーク · コデックス · ルールブック · リファレンス", cn: "档案库 · 网络 · 知识库 · 设定手册 · 参考" })}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/archive" className="premium-button">
                    {T({ ko: "아카이브 탐색", en: "Browse Archive", jp: "アーカイブを探索", cn: "浏览档案库" })}
                  </Link>
                  <Link href="/network" className="premium-button secondary">
                    {T({ ko: "네트워크 진입", en: "Enter Network", jp: "ネットワークへ", cn: "进入网络" })}
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 lg:w-80 lg:shrink-0">
                {universeStats.map((item) => (
                  <div key={item.label} className="card-glow premium-panel-soft rounded-[22px] px-5 py-6 border border-white/6 hover:border-accent-amber/20 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5">
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
                  {T({ ko: "아카이브 카테고리", en: "Archive Categories", jp: "アーカイブカテゴリ", cn: "档案库类别" })}
                </p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {T({ ko: "6개 분류, 109개 문서", en: "6 categories, 109 documents", jp: "6カテゴリ、109文書", cn: "6个分类，109个文档" })}
                </h2>
              </div>
              <Link href="/archive" className="font-[--font-mono] text-[11px] uppercase tracking-[0.16em] text-text-tertiary hover:text-accent-amber transition-colors">
                {T({ ko: "전체 보기 →", en: "View all →", jp: "全て見る →", cn: "查看全部 →" })}
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

      {/* HUB GRID */}
      <section ref={hubRef} className="section-divider py-20">
        <div className="site-shell">
          <div className="mb-8 px-1">
            <p className="site-kicker">
              {T({ ko: "탐색 허브", en: "Explore Hubs", jp: "探索ハブ", cn: "探索中心" })}
            </p>
            <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
              {T({ ko: "세계관의 모든 입구", en: "Every entry point into the universe", jp: "世界観へのすべての入口", cn: "进入世界观的所有入口" })}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {universeHubs.map((hub) => {
              const c = colorMap[hub.color];
              const isExternal = hub.href.startsWith("http");
              const inner = (
                <>
                  <div className="pointer-events-none absolute inset-0">
                    <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${c.glow} blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  </div>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full border ${c.border} ${c.bg} font-[--font-mono] text-xs tracking-[0.14em] ${c.text}`}>
                    {hub.badge}
                  </span>
                  <div className="mt-4">
                    <h3 className={`font-[--font-mono] text-sm font-semibold uppercase tracking-widest text-text-primary transition-colors ${c.hoverText}`}>
                      {hub.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{hub.desc}</p>
                  </div>
                  <div className={`mt-4 font-[--font-mono] text-[11px] uppercase tracking-[0.14em] text-text-tertiary transition-colors ${c.hoverText}`}>
                    {hub.meta} →
                  </div>
                </>
              );

              return isExternal ? (
                <a key={hub.title} href={hub.href} target="_blank" rel="noopener noreferrer"
                  className="group relative overflow-hidden premium-link-card flex flex-col p-6"
                  aria-label={`${hub.title} (opens in new tab)`}>
                  {inner}
                </a>
              ) : (
                <Link key={hub.title} href={hub.href} className="group relative overflow-hidden premium-link-card flex flex-col p-6">
                  {inner}
                </Link>
              );
            })}
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
                  {T({ ko: "집필을 시작하려면", en: "Ready to write?", jp: "執筆を始めるには", cn: "准备开始写作？" })}
                </p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {T({ ko: "이 세계관을 바탕으로 이야기를 쓸 수 있습니다.", en: "You can write stories set in this universe.", jp: "この世界観をもとに物語を書けます。", cn: "您可以在这个世界观中创作故事。" })}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/studio" className="premium-button">
                  {T({ ko: "스튜디오 열기", en: "Open Studio", jp: "スタジオを開く", cn: "打开工作室" })}
                </Link>
                <Link href="/reference" className="premium-button secondary">
                  {T({ ko: "레퍼런스 보기", en: "Read Reference", jp: "リファレンスを読む", cn: "阅读参考" })}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                EH UNIVERSE · CC-BY-NC-4.0
              </p>
            </div>
            <p className="font-document text-xs italic text-text-tertiary">
              {T({ ko: "세계관을 탐색하고, 이야기를 만든다.", en: "Explore the universe. Build the story.", jp: "世界観を探索し、物語を作る。", cn: "探索世界观，创造故事。" })}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
