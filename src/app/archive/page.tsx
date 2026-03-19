"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/LangContext";

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
      { slug: "gate-infra", title: { ko: "Gate 인프라", en: "Gate Infrastructure" }, level: "RESTRICTED" },
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
];

function BadgeLevel({ level }: { level: string }) {
  const cls = level === "CLASSIFIED" ? "badge-classified" : level === "RESTRICTED" ? "badge-amber" : "badge-allow";
  return <span className={`badge ${cls}`}>{level}</span>;
}

export default function ArchivePage() {
  const [activeCategory, setActiveCategory] = useState("core");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang } = useLang();
  const en = lang === "en";

  const currentCategory = categories.find((c) => c.id === activeCategory)!;

  return (
    <>
      <Header />
      <main className="pt-14 flex min-h-screen">
        <button className="fixed bottom-4 right-4 z-40 md:hidden rounded-full bg-accent-purple p-3 text-white shadow-lg" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5H17M3 10H12M3 15H17" /></svg>
        </button>

        <aside className={`fixed md:sticky top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-bg-secondary p-4 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-4">Archive</h2>
          <nav className="space-y-1">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSidebarOpen(false); }}
                className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded text-sm transition-colors ${activeCategory === cat.id ? "bg-bg-tertiary text-accent-purple" : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"}`}>
                <span>{cat.icon}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider">{cat.label}</span>
                <span className="text-text-tertiary text-xs ml-auto">{cat.sublabel[lang]}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="doc-header rounded-t mb-0">
              <span className="badge badge-blue mr-2">ARCHIVE</span>
              {en ? "Category" : "카테고리"}: {currentCategory.label} — {currentCategory.sublabel[lang]}
            </div>

            <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-6 sm:p-8">
              <h1 className="font-[family-name:var(--font-mono)] text-2xl font-bold tracking-tight mb-6">
                {currentCategory.icon} {currentCategory.label}
              </h1>

              <div className="space-y-3">
                {currentCategory.articles.map((article) => (
                  <Link key={article.slug} href={`/archive/${article.slug}`}
                    className="card-glow group flex items-center justify-between gap-4 rounded border border-border bg-bg-primary p-4 transition hover:border-accent-purple/50">
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary">▸</span>
                      <span className="text-sm text-text-primary group-hover:text-accent-purple transition-colors">{article.title[lang]}</span>
                    </div>
                    <BadgeLevel level={article.level} />
                  </Link>
                ))}
              </div>

              <div className="mt-8 eh-log">
                [ARCHIVE_STATUS: PHASE 1 — MVP]<br />
                [LOADED: {currentCategory.articles.length} {en ? "articles" : "articles"}]<br />
                [NOTE: {en ? "Additional articles planned for Phase 2" : "상세 아티클은 Phase 2에서 추가 예정"}]
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
