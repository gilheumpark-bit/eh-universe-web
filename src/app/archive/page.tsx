"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState } from "react";

const categories = [
  {
    id: "core",
    icon: "📁",
    label: "CORE",
    sublabel: "핵심",
    articles: [
      { slug: "eh-definition", title: "EH 정의", level: "PUBLIC" },
      { slug: "non-intervention", title: "비개입 원칙", level: "RESTRICTED" },
      { slug: "hpp", title: "인류보존 프로토콜 (HPP)", level: "RESTRICTED" },
      { slug: "human-5types", title: "인류 5유형", level: "PUBLIC" },
      { slug: "deity-structure", title: "신격 구조", level: "CLASSIFIED" },
    ],
  },
  {
    id: "timeline",
    icon: "📁",
    label: "TIMELINE",
    sublabel: "연표",
    articles: [
      { slug: "era-origin", title: "기원기 (1945~2025)", level: "PUBLIC" },
      { slug: "era-war", title: "전쟁기 (2025~2092)", level: "RESTRICTED" },
      { slug: "era-hpg", title: "HPG (2095~2170)", level: "RESTRICTED" },
      { slug: "era-expansion", title: "대팽창 (2170~3000)", level: "PUBLIC" },
      { slug: "era-suo", title: "수오 (3000~6451)", level: "CLASSIFIED" },
      { slug: "era-7000", title: "7000년대", level: "CLASSIFIED" },
    ],
  },
  {
    id: "factions",
    icon: "📁",
    label: "FACTIONS",
    sublabel: "세력",
    articles: [
      { slug: "council", title: "협의회", level: "PUBLIC" },
      { slug: "neka-empire", title: "네카 제국", level: "RESTRICTED" },
      { slug: "liberation-front", title: "해방 연대", level: "RESTRICTED" },
      { slug: "noa-4th-force", title: "NOA (제4세력)", level: "CLASSIFIED" },
    ],
  },
  {
    id: "technology",
    icon: "📁",
    label: "TECHNOLOGY",
    sublabel: "기술",
    articles: [
      { slug: "hctg-gate", title: "HCTG / Gate 체계", level: "RESTRICTED" },
      { slug: "eh-chamber", title: "EH 챔버", level: "RESTRICTED" },
      { slug: "sjc-system", title: "SJC 시스템", level: "RESTRICTED" },
      { slug: "ride", title: "RIDE", level: "CLASSIFIED" },
      { slug: "energy-weapons", title: "에너지 무기", level: "CLASSIFIED" },
    ],
  },
  {
    id: "geography",
    icon: "📁",
    label: "GEOGRAPHY",
    sublabel: "지리",
    articles: [
      { slug: "galaxy-zones", title: "은하 구역 분류", level: "PUBLIC" },
      { slug: "gate-infra", title: "Gate 인프라", level: "RESTRICTED" },
      { slug: "neo-homeworld", title: "NEO (협의회 모행성)", level: "RESTRICTED" },
      { slug: "neka-homeworld", title: "시코르 (네카 모성)", level: "CLASSIFIED" },
      { slug: "red-border-8", title: "RED 접경 8행성", level: "CLASSIFIED" },
      { slug: "liberation-3", title: "해방연대 3행성", level: "CLASSIFIED" },
    ],
  },
  {
    id: "military",
    icon: "📁",
    label: "MILITARY",
    sublabel: "군사",
    articles: [
      { slug: "ship-classes", title: "함급 체계", level: "RESTRICTED" },
      { slug: "android-formation", title: "안드로이드 편제", level: "RESTRICTED" },
      { slug: "battle-doctrine", title: "3세력 전투 교리", level: "CLASSIFIED" },
      { slug: "infantry-combat", title: "보병 전투 체계", level: "CLASSIFIED" },
      { slug: "engagement-range", title: "교전 거리 체계", level: "CLASSIFIED" },
    ],
  },
  {
    id: "classified",
    icon: "📁",
    label: "CLASSIFIED",
    sublabel: "기밀",
    articles: [
      { slug: "bia-manual", title: "비밀조사국 매뉴얼", level: "CLASSIFIED" },
      { slug: "pilot-daily", title: "탑승자 일상", level: "RESTRICTED" },
      { slug: "neira-report", title: "네이라 보고서", level: "CLASSIFIED" },
      { slug: "neka-language", title: "네카 언어/문자 체계", level: "CLASSIFIED" },
    ],
  },
];

function BadgeLevel({ level }: { level: string }) {
  const cls =
    level === "CLASSIFIED"
      ? "badge-classified"
      : level === "RESTRICTED"
      ? "badge-amber"
      : "badge-allow";
  return <span className={`badge ${cls}`}>{level}</span>;
}

export default function ArchivePage() {
  const [activeCategory, setActiveCategory] = useState("core");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentCategory = categories.find((c) => c.id === activeCategory)!;

  return (
    <>
      <Header />
      <main className="pt-14 flex min-h-screen">
        {/* Mobile sidebar toggle */}
        <button
          className="fixed bottom-4 right-4 z-40 md:hidden rounded-full bg-accent-purple p-3 text-white shadow-lg"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="사이드바 토글"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5H17M3 10H12M3 15H17" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-bg-secondary p-4 transition-transform md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-4">
            Archive
          </h2>
          <nav className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded text-sm transition-colors ${
                  activeCategory === cat.id
                    ? "bg-bg-tertiary text-accent-purple"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                }`}
              >
                <span>{cat.icon}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider">
                  {cat.label}
                </span>
                <span className="text-text-tertiary text-xs ml-auto">
                  {cat.sublabel}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="doc-header rounded-t mb-0">
              <span className="badge badge-blue mr-2">ARCHIVE</span>
              카테고리: {currentCategory.label} — {currentCategory.sublabel}
            </div>

            <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-6 sm:p-8">
              <h1 className="font-[family-name:var(--font-mono)] text-2xl font-bold tracking-tight mb-6">
                {currentCategory.icon} {currentCategory.label}
              </h1>

              <div className="space-y-3">
                {currentCategory.articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/archive/${article.slug}`}
                    className="card-glow group flex items-center justify-between gap-4 rounded border border-border bg-bg-primary p-4 transition hover:border-accent-purple/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary">
                        ▸
                      </span>
                      <span className="text-sm text-text-primary group-hover:text-accent-purple transition-colors">
                        {article.title}
                      </span>
                    </div>
                    <BadgeLevel level={article.level} />
                  </Link>
                ))}
              </div>

              <div className="mt-8 eh-log">
                [ARCHIVE_STATUS: PHASE 1 — MVP]
                <br />
                [LOADED: {currentCategory.articles.length} articles]
                <br />
                [NOTE: 상세 아티클은 Phase 2에서 추가 예정]
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
