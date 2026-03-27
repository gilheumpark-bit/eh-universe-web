"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StarField from "@/components/StarField";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";


function StudioChoiceScreen({ onBack, onWithApi, onWithout }: { onBack: () => void; onWithApi: () => void; onWithout: () => void }) {
  const { lang } = useLang();
  const isKO = lang === "ko";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-primary">
      <StarField />
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center gap-12">
        <div className="text-center">
          <button
            onClick={onBack}
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-text-tertiary hover:text-text-secondary transition-colors mb-6 flex items-center gap-2 mx-auto"
          >
            ← {L4(lang, { ko: "돌아가기", en: "Back", jp: "戻る", cn: "返回" })}
          </button>
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.22em] text-text-tertiary mb-4">
            NOA STUDIO
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-text-primary">
            {L4(lang, { ko: "어떻게 사용할까요?", en: "How will you write?", jp: "どのように書きますか？", cn: "您将如何写作？" })}
          </h1>
          <p className="mt-4 text-sm text-text-tertiary">
            {L4(lang, { ko: "AI 연동 여부에 따라 최적화된 화면으로 진입합니다.", en: "Enter the workspace optimized for your setup.", jp: "設定に合わせた最適な画面に進みます。", cn: "进入为您的设置优化的工作区。" })}
          </p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* WITH API */}
          <button
            onClick={onWithApi}
            className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(14,18,27,0.9),rgba(7,9,13,0.7))] px-8 py-10 text-left transition-all duration-300 hover:border-accent-purple/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-purple/8 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-purple mb-4">
              {L4(lang, { ko: "AI 집필 모드", en: "AI Mode", jp: "AI執筆モード", cn: "AI写作模式" })}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary mb-3">
              {L4(lang, { ko: "API 사용", en: "With API", jp: "API使用", cn: "使用API" })}
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {isKO
                ? "API 키를 연결해 NOA 엔진을 도구로서 활용해보세요."
                : "Connect your API key and use the NOA engine as a tool."}
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary group-hover:text-accent-purple transition-colors">
              {L4(lang, { ko: "API 키 설정하기", en: "Set up API key", jp: "APIキーを設定", cn: "设置API密钥" })} →
            </div>
          </button>

          {/* WITHOUT API */}
          <button
            onClick={onWithout}
            className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(14,18,27,0.9),rgba(7,9,13,0.7))] px-8 py-10 text-left transition-all duration-300 hover:border-accent-amber/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-amber/8 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-amber mb-4">
              {L4(lang, { ko: "수동 집필 모드", en: "Manual Mode", jp: "手動執筆モード", cn: "手动写作模式" })}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary mb-3">
              {L4(lang, { ko: "미사용", en: "Without API", jp: "API不使用", cn: "不使用API" })}
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {isKO
                ? "API 없이 세계관 설계, 캐릭터, 수동 집필 기능을 바로 사용합니다."
                : "Use worldbuilding, character tools, and manual writing without an API key."}
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary group-hover:text-accent-amber transition-colors">
              {L4(lang, { ko: "바로 시작하기", en: "Start now", jp: "すぐに始める", cn: "立即开始" })} →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function SplashScreen({ onUniverse, onStudio }: { onUniverse: () => void; onStudio: () => void }) {
  const { lang } = useLang();
  const isKO = lang === "ko";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-primary">
      <StarField />
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center gap-12">
        <div className="text-center">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.22em] text-text-tertiary mb-4">
            EH UNIVERSE
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-text-primary">
            {L4(lang, { ko: "어디로 향할까요?", en: "Where are you headed?", jp: "どこへ向かいますか？", cn: "您要去哪里？" })}
          </h1>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* UNIVERSE */}
          <button
            onClick={onUniverse}
            className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(14,18,27,0.9),rgba(7,9,13,0.7))] px-8 py-10 text-left transition-all duration-300 hover:border-accent-amber/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-amber/8 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-amber mb-4">
              {L4(lang, { ko: "세계관 탐색", en: "Explore", jp: "世界観探索", cn: "探索世界观" })}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary mb-3">
              UNIVERSE
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {isKO
                ? "아카이브, 네트워크, 세계관 문서를 탐색합니다."
                : "Browse the archive, network, and worldbuilding docs."}
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary group-hover:text-accent-amber transition-colors">
              {L4(lang, { ko: "탐색 시작", en: "Enter", jp: "探索開始", cn: "开始探索" })} →
            </div>
          </button>

          {/* STUDIO */}
          <button
            onClick={onStudio}
            className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(14,18,27,0.9),rgba(7,9,13,0.7))] px-8 py-10 text-left transition-all duration-300 hover:border-accent-purple/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-purple/8 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-purple mb-4">
              {L4(lang, { ko: "집필 시작", en: "Write", jp: "執筆開始", cn: "开始写作" })}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary mb-3">
              STUDIO
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {isKO
                ? "세계관 설계 작업실로 진입합니다."
                : "Enter the world design and writing workspace."}
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary group-hover:text-accent-purple transition-colors">
              {L4(lang, { ko: "스튜디오 열기", en: "Open Studio", jp: "スタジオを開く", cn: "打开工作室" })} →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { lang } = useLang();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [showStudioChoice, setShowStudioChoice] = useState(false);

  const T = <V,>(v: { ko: V; en: V; jp?: V; cn?: V }): V =>
    lang === "ko" ? v.ko : (lang === "jp" && v.jp) ? v.jp : (lang === "cn" && v.cn) ? v.cn : v.en;

  const universeStats = [
    { value: "109", label: T({ ko: "아카이브 문서", en: "Archive docs", jp: "アーカイブ文書", cn: "存档文档" }) },
    { value: "6", label: T({ ko: "세계관 카테고리", en: "Lore categories", jp: "世界観カテゴリ", cn: "世界观类别" }) },
    { value: "200K+", label: T({ ko: "관할 행성계", en: "Planetary systems", jp: "管轄惑星系", cn: "管辖星系" }) },
    { value: "CC-BY-NC", label: T({ ko: "오픈 라이선스", en: "Open license", jp: "オープンライセンス", cn: "开放许可" }) },
  ];

  const universeHubs = [
    {
      href: "/archive",
      badge: "AR",
      color: "amber" as const,
      title: T({ ko: "설정집 아카이브", en: "Lore Archive", jp: "設定集アーカイブ", cn: "设定集存档" }),
      desc: T({ ko: "CORE · TIMELINE · FACTIONS · MILITARY · GEOGRAPHY · TECHNOLOGY — 6개 카테고리, 109개 문서.", en: "CORE · TIMELINE · FACTIONS · MILITARY · GEOGRAPHY · TECHNOLOGY — 6 categories, 109 docs." }),
      meta: T({ ko: "세계관 문서 탐색", en: "Browse lore docs", jp: "世界観文書を探索", cn: "浏览世界观文档" }),
    },
    {
      href: "/network",
      badge: "NW",
      color: "blue" as const,
      title: T({ ko: "작가 네트워크", en: "Writer Network", jp: "作家ネットワーク", cn: "作家网络" }),
      desc: T({ ko: "세계관을 기반으로 연결된 작가들의 행성 시스템. 로그와 게시글을 탐색합니다.", en: "A planet-based network of writers connected through shared worldbuilding. Browse logs and posts." }),
      meta: T({ ko: "네트워크 진입", en: "Enter network", jp: "ネットワークへ", cn: "进入网络" }),
    },
    {
      href: "/codex",
      badge: "CX",
      color: "green" as const,
      title: T({ ko: "코덱스", en: "Codex", jp: "コデックス", cn: "法典" }),
      desc: T({ ko: "세계관의 핵심 법칙, 용어, 구조를 빠르게 참조합니다.", en: "Quick reference for the core laws, terms, and structures of the universe." }),
      meta: T({ ko: "코덱스 열기", en: "Open codex", jp: "コデックスを開く", cn: "打开法典" }),
    },
    {
      href: "/rulebook",
      badge: "RB",
      color: "purple" as const,
      title: T({ ko: "룰북 v1.0", en: "Rulebook v1.0", jp: "ルールブック v1.0", cn: "规则书 v1.0" }),
      desc: T({ ko: "서사 엔진의 구조와 원리. 이 세계관이 어떻게 작동하는지 문서로 확인합니다.", en: "The structure and principles of the narrative engine. How this universe works, documented." }),
      meta: T({ ko: "룰북 읽기", en: "Read rulebook", jp: "ルールブックを読む", cn: "阅读规则书" }),
    },
    {
      href: "/reference",
      badge: "RF",
      color: "amber" as const,
      title: T({ ko: "EH Open Reference", en: "EH Open Reference", jp: "EH オープンリファレンス", cn: "EH 开放参考" }),
      desc: T({ ko: "프로젝트 전체를 빠르게 훑는 4페이지 요약본.", en: "A fast 4-page summary of the whole EH Universe project." }),
      meta: T({ ko: "레퍼런스 보기", en: "Read reference", jp: "リファレンスを読む", cn: "阅读参考" }),
    },
    {
      href: "https://github.com/gilheumpark-bit/eh-universe-web",
      badge: "GH",
      color: "blue" as const,
      title: "GitHub",
      desc: T({ ko: "오픈소스 진행 상황과 코드베이스를 확인합니다.", en: "See the open-source code and current progress." }),
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
    amber: { border: "border-accent-amber/20", bg: "bg-accent-amber/10", text: "text-accent-amber", glow: "bg-accent-amber/8" },
    blue: { border: "border-accent-blue/20", bg: "bg-accent-blue/10", text: "text-accent-blue", glow: "bg-accent-blue/8" },
    green: { border: "border-accent-green/20", bg: "bg-accent-green/10", text: "text-accent-green", glow: "bg-accent-green/8" },
    purple: { border: "border-accent-purple/20", bg: "bg-accent-purple/10", text: "text-accent-purple", glow: "bg-accent-purple/8" },
  };

  if (showStudioChoice) {
    return (
      <StudioChoiceScreen
        onBack={() => setShowStudioChoice(false)}
        onWithApi={() => {
          if (typeof window !== 'undefined') localStorage.setItem('noa_studio_mode', 'api');
          router.push("/studio?setup=1");
        }}
        onWithout={() => {
          if (typeof window !== 'undefined') localStorage.setItem('noa_studio_mode', 'manual');
          router.push("/studio");
        }}
      />
    );
  }

  if (showSplash) {
    return (
      <SplashScreen
        onUniverse={() => router.push('/studio')}
        onStudio={() => setShowStudioChoice(true)}
      />
    );
  }

  return (
    <>
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-32">
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
                <p className="mt-6 font-[family-name:var(--font-document)] text-lg leading-[1.95] text-text-secondary md:text-[1.24rem]">
                  {T({ ko: "은하 중앙 의회가 관할하는 20만 행성계의 역사, 세력, 기술, 지리를 아카이브로 탐색합니다.", en: "Explore the history, factions, technology, and geography of 200,000 planetary systems under the Galactic Central Council.", jp: "銀河中央評議会が管轄する20万惑星系の歴史、勢力、技術、地理をアーカイブで探索します。", cn: "探索银河中央议会管辖的20万星系的历史、派系、技术和地理档案。" })}
                </p>
                <p className="mt-5 font-[family-name:var(--font-mono)] text-[0.82rem] uppercase leading-8 tracking-[0.16em] text-text-tertiary md:text-sm">
                  {T({ ko: "아카이브 · 네트워크 · 코덱스 · 룰북 · 레퍼런스", en: "Archive · Network · Codex · Rulebook · Reference", jp: "アーカイブ · ネットワーク · コデックス · ルールブック · リファレンス", cn: "存档 · 网络 · 法典 · 规则书 · 参考" })}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/archive" className="premium-button">
                    {T({ ko: "아카이브 탐색", en: "Browse Archive", jp: "アーカイブを探索", cn: "浏览存档" })}
                  </Link>
                  <Link href="/network" className="premium-button secondary">
                    {T({ ko: "네트워크 진입", en: "Enter Network", jp: "ネットワークへ", cn: "进入网络" })}
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 lg:w-80 lg:shrink-0">
                {universeStats.map((item) => (
                  <div key={item.label} className="card-glow premium-panel-soft rounded-[22px] px-5 py-5">
                    <div className="font-[family-name:var(--font-display)] text-[1.9rem] font-bold leading-none text-text-primary">
                      {item.value}
                    </div>
                    <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-text-secondary">
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
      <section className="section-divider py-20">
        <div className="site-shell">
          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="site-kicker">
                  {T({ ko: "아카이브 카테고리", en: "Archive Categories", jp: "アーカイブカテゴリ", cn: "存档类别" })}
                </p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {T({ ko: "6개 분류, 109개 문서", en: "6 categories, 109 documents", jp: "6カテゴリ、109文書", cn: "6个分类，109个文档" })}
                </h2>
              </div>
              <Link href="/archive" className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-text-tertiary hover:text-accent-amber transition-colors">
                {T({ ko: "전체 보기 →", en: "View all →", jp: "全て見る →", cn: "查看全部 →" })}
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/archive?category=${cat.id}`} className="premium-link-card group flex items-center justify-between p-5">
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-text-tertiary">{cat.id}</p>
                    <h3 className="mt-1 font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-[0.1em] text-text-primary transition-colors group-hover:text-accent-amber">
                      {cat.label}
                    </h3>
                  </div>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-tertiary group-hover:text-accent-amber transition-colors">
                    {cat.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HUB GRID */}
      <section className="section-divider py-20">
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
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full border ${c.border} ${c.bg} font-[family-name:var(--font-mono)] text-xs tracking-[0.14em] ${c.text}`}>
                    {hub.badge}
                  </span>
                  <div className="mt-4">
                    <h3 className={`font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-[0.1em] text-text-primary transition-colors group-hover:${c.text}`}>
                      {hub.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{hub.desc}</p>
                  </div>
                  <div className={`mt-4 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary transition-colors group-hover:${c.text}`}>
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
      <section className="section-divider pb-24 pt-8">
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
          <div className="premium-panel-soft flex flex-col items-center justify-between gap-4 rounded-[24px] px-6 py-5 sm:flex-row">
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.16em] text-text-tertiary">EH UNIVERSE · CC-BY-NC-4.0</p>
            <p className="font-[family-name:var(--font-document)] text-xs italic text-text-tertiary">
              {T({ ko: "세계관을 탐색하고, 이야기를 만든다.", en: "Explore the universe. Build the story.", jp: "世界観を探索し、物語を作る。", cn: "探索世界观，创造故事。" })}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
