"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang, L2 } from "@/lib/LangContext";
import { createT } from "@/lib/i18n";

const categories = [
  {
    id: "core", icon: "📁", label: "CORE", sublabel: { ko: "핵심", en: "Core" },
    articles: [
      { slug: "eh-definition", title: { ko: "EH 정의", en: "EH Definition" }, level: "PUBLIC" },
      { slug: "non-intervention", title: { ko: "비개입 원칙", en: "Non-Intervention Principle" }, level: "RESTRICTED" },
      { slug: "hpp", title: { ko: "인류보존 프로토콜 (HPP)", en: "Human Preservation Protocol (HPP)" }, level: "RESTRICTED" },
      { slug: "human-5types", title: { ko: "인류 5유형", en: "Five Human Types" }, level: "PUBLIC" },
      { slug: "deity-structure", title: { ko: "신격 구조", en: "Deity Structure" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "timeline", icon: "📁", label: "TIMELINE", sublabel: { ko: "연표", en: "Timeline" },
    articles: [
      { slug: "era-origin", title: { ko: "기원기 (1945~2025)", en: "Origin Era (1945~2025)" }, level: "PUBLIC" },
      { slug: "era-war", title: { ko: "전쟁기 (2025~2092)", en: "War Era (2025~2092)" }, level: "RESTRICTED" },
      { slug: "era-hpg", title: { ko: "HPG (2095~2170)", en: "HPG (2095~2170)" }, level: "RESTRICTED" },
      { slug: "era-expansion", title: { ko: "대팽창 (2170~3000)", en: "Great Expansion (2170~3000)" }, level: "PUBLIC" },
      { slug: "era-suo", title: { ko: "수오 (3000~6451)", en: "Suo (3000~6451)" }, level: "CLASSIFIED" },
      { slug: "era-7000", title: { ko: "7000년대", en: "The 7000s" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "factions", icon: "📁", label: "FACTIONS", sublabel: { ko: "세력", en: "Factions" },
    articles: [
      { slug: "council", title: { ko: "협의회", en: "The Council" }, level: "PUBLIC" },
      { slug: "neka-empire", title: { ko: "네카 제국", en: "Neka Empire" }, level: "RESTRICTED" },
      { slug: "liberation-front", title: { ko: "해방 연대", en: "Liberation Front" }, level: "RESTRICTED" },
      { slug: "noa-4th-force", title: { ko: "NOA (제4세력)", en: "NOA (The Fourth Force)" }, level: "CLASSIFIED" },
      { slug: "galaxy-30-factions", title: { ko: "은하 30개 대표 행성 세력", en: "30 Representative Galactic Factions" }, level: "RESTRICTED" },
      { slug: "green-zone-factions", title: { ko: "GREEN 구역 — 핵심 문명권 15개 세력", en: "GREEN Zone — 15 Core Civilization Factions" }, level: "RESTRICTED" },
      { slug: "blue-zone-factions", title: { ko: "BLUE 구역 — 표준 생활권 8개 세력", en: "BLUE Zone — 8 Standard Living Factions" }, level: "RESTRICTED" },
      { slug: "yellow-zone-factions", title: { ko: "YELLOW~RED 구역 — 변경 및 전장 7개 세력", en: "YELLOW~RED Zone — 7 Frontier & Battlefield Factions" }, level: "CLASSIFIED" },
      { slug: "faction-politics", title: { ko: "30개 세력 정치 지형", en: "Political Landscape of 30 Factions" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "technology", icon: "📁", label: "TECHNOLOGY", sublabel: { ko: "기술", en: "Tech" },
    articles: [
      { slug: "hctg-gate", title: { ko: "HCTG / Gate 체계", en: "HCTG / Gate System" }, level: "RESTRICTED" },
      { slug: "eh-chamber", title: { ko: "EH 챔버", en: "EH Chamber" }, level: "RESTRICTED" },
      { slug: "sjc-system", title: { ko: "SJC 시스템", en: "SJC System" }, level: "RESTRICTED" },
      { slug: "ride", title: { ko: "RIDE", en: "RIDE" }, level: "CLASSIFIED" },
      { slug: "energy-weapons", title: { ko: "에너지 무기", en: "Energy Weapons" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "geography", icon: "📁", label: "GEOGRAPHY", sublabel: { ko: "지리", en: "Geography" },
    articles: [
      { slug: "galaxy-zones", title: { ko: "은하 구역 분류", en: "Galactic Zone Classification" }, level: "PUBLIC" },
      { slug: "galaxy-profiles", title: { ko: "양쪽 은하 프로필", en: "Galaxy Profiles — Human vs Neka" }, level: "RESTRICTED" },
      { slug: "galaxy-naming", title: { ko: "은하 호칭 체계", en: "Galaxy Naming Conventions" }, level: "RESTRICTED" },
      { slug: "gate-infra", title: { ko: "Gate 인프라", en: "Gate Infrastructure" }, level: "RESTRICTED" },
      { slug: "visual-gate-infrastructure", title: { ko: "Gate 인프라 도해", en: "Gate Infrastructure Visual" }, level: "CLASSIFIED" },
      { slug: "neo-homeworld", title: { ko: "NEO (협의회 모행성)", en: "NEO (Council Homeworld)" }, level: "RESTRICTED" },
      { slug: "neka-homeworld", title: { ko: "시코르 (네카 모성)", en: "Sichor (Neka Homeworld)" }, level: "CLASSIFIED" },
      { slug: "red-border-8", title: { ko: "RED 접경 8행성", en: "RED Border 8 Planets" }, level: "CLASSIFIED" },
      { slug: "liberation-3", title: { ko: "해방연대 3행성", en: "Liberation Front 3 Planets" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "military", icon: "📁", label: "MILITARY", sublabel: { ko: "군사", en: "Military" },
    articles: [
      { slug: "ship-classes", title: { ko: "함급 체계", en: "Ship Class System" }, level: "RESTRICTED" },
      { slug: "visual-vessel-classification", title: { ko: "함선 분류 도해", en: "Vessel Classification Visual" }, level: "CLASSIFIED" },
      { slug: "visual-vessel-implementation", title: { ko: "함선 구현 도해", en: "Vessel Implementation Visual" }, level: "CLASSIFIED" },
      { slug: "android-formation", title: { ko: "안드로이드 편제", en: "Android Formation" }, level: "RESTRICTED" },
      { slug: "battle-doctrine", title: { ko: "3세력 전투 교리", en: "Three-Faction Battle Doctrine" }, level: "CLASSIFIED" },
      { slug: "infantry-combat", title: { ko: "보병 전투 체계", en: "Infantry Combat System" }, level: "CLASSIFIED" },
      { slug: "engagement-range", title: { ko: "교전 거리 체계", en: "Engagement Range System" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "classified", icon: "📁", label: "CLASSIFIED", sublabel: { ko: "기밀", en: "Classified" },
    articles: [
      { slug: "bia-manual", title: { ko: "비밀조사국 매뉴얼", en: "Bureau of Investigation Manual" }, level: "CLASSIFIED" },
      { slug: "pilot-daily", title: { ko: "탑승자 일상", en: "Pilot's Daily Life" }, level: "RESTRICTED" },
      { slug: "neira-report", title: { ko: "네이라 보고서", en: "Neira Report" }, level: "CLASSIFIED" },
      { slug: "neka-language", title: { ko: "네카 언어/문자 체계", en: "Neka Language/Script System" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "reports", icon: "📁", label: "REPORTS", sublabel: { ko: "보고서", en: "Reports" },
    articles: [
      { slug: "rpt-eschaton-incident", title: { ko: "Eschaton 함선침몰 사건보고서", en: "Eschaton Incident Report" }, level: "CLASSIFIED" },
      { slug: "rpt-noa10005-interrogation", title: { ko: "NOA #10005 심문 기록", en: "NOA #10005 Interrogation Log" }, level: "CLASSIFIED" },
      { slug: "rpt-hpg01-technical", title: { ko: "HPG-01 기술 로그", en: "HPG-01 Technical Log" }, level: "RESTRICTED" },
      { slug: "rpt-ride-analysis", title: { ko: "RIDE 샘플 분석 보고서", en: "RIDE Sample Analysis Report" }, level: "CLASSIFIED" },
      { slug: "rpt-first-combat-17min", title: { ko: "첫 전투 17분 교전 기록", en: "First Contact 17-min Combat Log" }, level: "CLASSIFIED" },
      { slug: "rpt-shin-mina-file", title: { ko: "신민아 인물 기밀 파일", en: "Shin Mina Personnel File" }, level: "CLASSIFIED" },
      { slug: "rpt-non-intervention-2100", title: { ko: "비개입 선언 원문 (2100)", en: "Non-Intervention Declaration (2100)" }, level: "RESTRICTED" },
      { slug: "rpt-neka-classification", title: { ko: "네카 종족 최초 분류 보고서", en: "Neka Initial Classification Report" }, level: "CLASSIFIED" },
      { slug: "rpt-red-zone-resolution", title: { ko: "RED 구역 지정 의결서", en: "RED Zone Designation Resolution" }, level: "CLASSIFIED" },
      { slug: "rpt-rider-field-manual", title: { ko: "탑승자 교범 발췌", en: "Rider Field Manual Excerpt" }, level: "RESTRICTED" },
    ],
  },
];

function BadgeLevel({ level }: { level: string }) {
  const cls = level === "CLASSIFIED" ? "badge-classified" : level === "RESTRICTED" ? "badge-amber" : "badge-allow";
  return <span className={`badge ${cls}`}>{level}</span>;
}

export default function ArchiveClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catParam = searchParams.get("cat") || "core";
  const [activeCategory, setActiveCategory] = useState(catParam);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang } = useLang();
  const en = lang === "en";
  const t = createT(lang === "en" ? "EN" : "KO");

  useEffect(() => {
    const cat = searchParams.get("cat") || "core";
    setTimeout(() => setActiveCategory(cat), 0);
  }, [searchParams]);

  const changeCategory = useCallback((id: string) => {
    setActiveCategory(id);
    setSidebarOpen(false);
    router.push(`/archive?cat=${id}`, { scroll: false });
  }, [router]);

  const currentCategory = categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <>
      <Header />
      <main className="flex min-h-screen pt-24">
        <button className="fixed bottom-4 right-4 z-40 md:hidden rounded-full border border-accent-amber/20 bg-accent-amber/15 p-3 text-accent-amber shadow-lg backdrop-blur" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5H17M3 10H12M3 15H17" /></svg>
        </button>

        <aside className={`fixed md:sticky top-24 left-3 z-30 h-[calc(100vh-7rem)] w-64 shrink-0 overflow-y-auto rounded-[24px] border border-white/8 bg-[rgba(15,20,28,0.92)] p-4 shadow-2xl backdrop-blur transition-transform md:left-6 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-4">Archive</h2>
          <nav className="space-y-1" role="navigation" aria-label="Archive categories">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => changeCategory(cat.id)}
                aria-label={`${cat.label} — ${L2(cat.sublabel, lang)}`}
                aria-current={activeCategory === cat.id ? "true" : undefined}
                className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded text-sm transition-colors ${activeCategory === cat.id ? "bg-bg-tertiary text-accent-purple" : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"}`}>
                <span aria-hidden="true">{cat.icon}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider">{cat.label}</span>
                <span className="text-text-tertiary text-xs ml-auto">{L2(cat.sublabel, lang)}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 pt-4 border-t border-border">
            <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-3">
              {t('archivePage.tools')}
            </h2>
            <Link href="/tools/neka-sound"
              className="flex items-center gap-2 py-2 px-3 rounded text-sm text-text-secondary hover:text-accent-purple hover:bg-bg-tertiary transition-colors group">
              <span>🔧</span>
              <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider group-hover:text-accent-purple">
                {t('archivePage.nekaSoundInterface')}
              </span>
            </Link>
            <Link href="/tools/soundtrack"
              className="flex items-center gap-2 py-2 px-3 rounded text-sm text-text-secondary hover:text-accent-purple hover:bg-bg-tertiary transition-colors group">
              <span>🎵</span>
              <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider group-hover:text-accent-purple">
                {t('archivePage.soundtrack')}
              </span>
            </Link>
            <Link href="/tools/galaxy-map"
              className="flex items-center gap-2 py-2 px-3 rounded text-sm text-text-secondary hover:text-accent-purple hover:bg-bg-tertiary transition-colors group">
              <span>🌌</span>
              <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider group-hover:text-accent-purple">
                {t('archivePage.galaxyZoneGateMap')}
              </span>
            </Link>
          </div>
        </aside>

        <div className="flex-1 p-6 md:p-10 md:pl-[19rem]">
          <div className="mx-auto max-w-4xl">
            <div className="doc-header rounded-t-[24px] mb-0">
              <span className="badge badge-blue mr-2">ARCHIVE</span>
              {t('archivePage.category')}: {currentCategory.label} — {L2(currentCategory.sublabel, lang)}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-8">
              <h1 className="site-title text-2xl font-bold tracking-tight mb-6">
                {currentCategory.icon} {currentCategory.label}
              </h1>

              <div className="space-y-3">
                {currentCategory.articles.map((article) => {
                  const href = `/archive/${article.slug}`;
                  return (
                    <Link key={article.slug} href={href}
                      aria-label={`${L2(article.title, lang)} — ${article.level}`}
                      className="premium-link-card card-glow group flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3">
                        <span className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary">▸</span>
                        <span className="text-sm text-text-primary group-hover:text-accent-purple transition-colors">{L2(article.title, lang)}</span>
                      </div>
                      <BadgeLevel level={article.level} />
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 eh-log">
                [ARCHIVE_STATUS: PHASE 1 — MVP]<br />
                [LOADED: {currentCategory.articles.length} articles]<br />
                [NOTE: {t('archivePage.phase2Note')}]
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
