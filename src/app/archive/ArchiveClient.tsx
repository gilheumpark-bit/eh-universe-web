"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang, L2 } from "@/lib/LangContext";
import { createT } from "@/lib/i18n";
import { ArchiveReportsTabs } from "@/app/reports/ReportsClient";

const categories = [
  {
    id: "core", icon: "📁", label: "CORE", sublabel: { ko: "핵심", en: "Core", jp: "核心", cn: "核心" },
    articles: [
      { slug: "eh-definition", title: { ko: "EH 정의", en: "EH Definition" }, level: "PUBLIC" },
      { slug: "non-intervention", title: { ko: "비개입 원칙", en: "Non-Intervention Principle" }, level: "RESTRICTED" },
      { slug: "hpp", title: { ko: "인류보존 프로토콜 (HPP)", en: "Human Preservation Protocol (HPP)" }, level: "RESTRICTED" },
      { slug: "human-5types", title: { ko: "인류 5유형", en: "Five Human Types" }, level: "PUBLIC" },
      { slug: "deity-structure", title: { ko: "신격 구조", en: "Deity Structure" }, level: "CLASSIFIED" },
      { slug: "rpt-nhdc-grade-classification", title: { ko: "NHDC 등급분류체계 해설서", en: "NHDC Grade Classification Manual" }, level: "RESTRICTED" },
      { slug: "rpt-eh-currency-system", title: { ko: "EH 통화체계 개요서", en: "EH Currency System Overview" }, level: "RESTRICTED" },
      { slug: "rpt-detention-facility-manual", title: { ko: "수용소 운영지침서", en: "Detention Facility Manual" }, level: "CLASSIFIED" },
      { slug: "rpt-97-percent-ignorance", title: { ko: "97% 무지유지 프로토콜", en: "97% Ignorance Protocol" }, level: "CLASSIFIED" },
      { slug: "rpt-hpp-protocol-detail", title: { ko: "HPP 인류보존프로토콜 상세", en: "HPP Protocol Detail" }, level: "RESTRICTED" },
      { slug: "rpt-carters-record-preface", title: { ko: "카터스 레코드 아카이브 서문", en: "Carter's Record Archive Preface" }, level: "RESTRICTED" },
      { slug: "rpt-non-intervention-paradox", title: { ko: "비개입원칙 역설분석", en: "Non-Intervention Paradox Analysis" }, level: "RESTRICTED" },
      { slug: "rpt-records-outlive-people", title: { ko: "기록은 사람보다 오래 산다", en: "Records Outlive People" }, level: "PUBLIC" },
      { slug: "rpt-nob-citizen-grade", title: { ko: "NOB 시민등급 분류표", en: "NOB Citizen Grade Classification" }, level: "RESTRICTED" },
    ],
  },
  {
    id: "timeline", icon: "📁", label: "TIMELINE", sublabel: { ko: "연표", en: "Timeline", jp: "年表", cn: "年表" },
    articles: [
      { slug: "era-origin", title: { ko: "기원기 (1945~2025)", en: "Origin Era (1945~2025)" }, level: "PUBLIC" },
      { slug: "era-war", title: { ko: "전쟁기 (2025~2092)", en: "War Era (2025~2092)" }, level: "RESTRICTED" },
      { slug: "era-hpg", title: { ko: "HPG (2095~2170)", en: "HPG (2095~2170)" }, level: "RESTRICTED" },
      { slug: "era-expansion", title: { ko: "대팽창 (2170~3000)", en: "Great Expansion (2170~3000)" }, level: "PUBLIC" },
      { slug: "era-suo", title: { ko: "수오 (3000~6451)", en: "Suo (3000~6451)" }, level: "CLASSIFIED" },
      { slug: "era-7000", title: { ko: "7000년대", en: "The 7000s" }, level: "CLASSIFIED" },
      { slug: "rpt-eh-universe-timeline", title: { ko: "EH Universe 타임라인", en: "EH Universe Timeline" }, level: "PUBLIC" },
    ],
  },
  {
    id: "factions", icon: "📁", label: "FACTIONS", sublabel: { ko: "세력", en: "Factions", jp: "勢力", cn: "势力" },
    articles: [
      { slug: "council", title: { ko: "협의회", en: "The Council" }, level: "PUBLIC" },
      { slug: "neka-empire", title: { ko: "네카 제국", en: "Neka Empire" }, level: "RESTRICTED" },
      { slug: "liberation-front", title: { ko: "해방 연대", en: "Liberation Front" }, level: "RESTRICTED" },
      { slug: "noa-4th-force", title: { ko: "NOA (제4세력)", en: "NOA (The Fourth Force)" }, level: "CLASSIFIED" },
      { slug: "rpt-sib-overview", title: { ko: "비밀조사국 조직개요", en: "SIB Overview" }, level: "CLASSIFIED" },
      { slug: "rpt-jocei-committee", title: { ko: "JOCEI 한미공동감독위원회", en: "JOCEI Joint Oversight Committee" }, level: "RESTRICTED" },
      { slug: "rpt-sib-agent-depth", title: { ko: "비밀조사국 요원등급체계", en: "SIB Agent Depth Classification" }, level: "CLASSIFIED" },
      { slug: "galaxy-30-factions", title: { ko: "은하 30개 대표 행성 세력", en: "30 Representative Galactic Factions" }, level: "RESTRICTED" },
      { slug: "green-zone-factions", title: { ko: "GREEN 구역 — 핵심 문명권 15개 세력", en: "GREEN Zone — 15 Core Civilization Factions" }, level: "RESTRICTED" },
      { slug: "blue-zone-factions", title: { ko: "BLUE 구역 — 표준 생활권 8개 세력", en: "BLUE Zone — 8 Standard Living Factions" }, level: "RESTRICTED" },
      { slug: "yellow-zone-factions", title: { ko: "YELLOW~RED 구역 — 변경 및 전장 7개 세력", en: "YELLOW~RED Zone — 7 Frontier & Battlefield Factions" }, level: "CLASSIFIED" },
      { slug: "faction-politics", title: { ko: "30개 세력 정치 지형", en: "Political Landscape of 30 Factions" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "technology", icon: "📁", label: "TECHNOLOGY", sublabel: { ko: "기술", en: "Tech", jp: "技術", cn: "技术" },
    articles: [
      { slug: "hctg-gate", title: { ko: "HCTG / Gate 체계", en: "HCTG / Gate System" }, level: "RESTRICTED" },
      { slug: "eh-chamber", title: { ko: "EH 챔버", en: "EH Chamber" }, level: "RESTRICTED" },
      { slug: "sjc-system", title: { ko: "SJC 시스템", en: "SJC System" }, level: "RESTRICTED" },
      { slug: "ride", title: { ko: "RIDE", en: "RIDE" }, level: "CLASSIFIED" },
      { slug: "energy-weapons", title: { ko: "에너지 무기", en: "Energy Weapons" }, level: "CLASSIFIED" },
      { slug: "rpt-eh-alpha-neural-manual", title: { ko: "EH 알파 신경제어 매뉴얼", en: "EH Alpha Neural Control Manual" }, level: "CLASSIFIED" },
      { slug: "rpt-enhanced-human-generation", title: { ko: "강화인간 세대분류 보고서", en: "Enhanced Human Generation Report" }, level: "RESTRICTED" },
      { slug: "rpt-global-node-network", title: { ko: "글로벌 노드 네트워크 구조도", en: "Global Node Network Architecture" }, level: "RESTRICTED" },
      { slug: "rpt-neka-chemical-relay", title: { ko: "네카 화학신호 중계시스템", en: "Neka Chemical Signal Relay" }, level: "CLASSIFIED" },
      { slug: "rpt-noa-android-spec", title: { ko: "NOA 안드로이드 기술사양서", en: "NOA Android Technical Spec" }, level: "CLASSIFIED" },
      { slug: "rpt-ansik-drug-research", title: { ko: "안식 약물 연구기록", en: "Ansik Drug Research Log" }, level: "CLASSIFIED" },
      { slug: "rpt-id-tag-system", title: { ko: "인식표 시스템 매뉴얼", en: "ID Tag System Manual" }, level: "RESTRICTED" },
      { slug: "rpt-bio-server-spec", title: { ko: "생체서버 기술사양서", en: "Bio-Server Technical Spec" }, level: "CLASSIFIED" },
      { slug: "rpt-council-vessel-spec", title: { ko: "협의회 함선등급 사양서", en: "Council Vessel Class Spec" }, level: "CLASSIFIED" },
      { slug: "rpt-baseline-calculation", title: { ko: "하한선 계산공식 유출본", en: "Baseline Calculation Formula" }, level: "CLASSIFIED" },
      { slug: "rpt-neka-7-chemical-systems", title: { ko: "네카 화학신호 7대체계", en: "Neka 7 Chemical Signal Systems" }, level: "CLASSIFIED" },
      { slug: "rpt-ride-rip-spatial-transit", title: { ko: "RIDE Rip 공간절개 도약", en: "RIDE Rip Spatial Transit" }, level: "CLASSIFIED" },
      { slug: "rpt-princeps-fire-control", title: { ko: "공주 탐지사격관제", en: "Princeps Fire Control" }, level: "CLASSIFIED" },
      { slug: "rpt-imperator-structure", title: { ko: "황제함 내부구조", en: "Imperator Internal Structure" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "geography", icon: "📁", label: "GEOGRAPHY", sublabel: { ko: "지리", en: "Geography", jp: "地理", cn: "地理" },
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
      { slug: "rpt-galaxy-threat-assessment", title: { ko: "은하구역 위협도 평가서", en: "Galaxy Zone Threat Assessment" }, level: "RESTRICTED" },
      { slug: "rpt-finis-planet-recon", title: { ko: "Finis 행성 정찰보고", en: "Finis Planet Recon Report" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "military", icon: "📁", label: "MILITARY", sublabel: { ko: "군사", en: "Military", jp: "軍事", cn: "军事" },
    articles: [
      { slug: "ship-classes", title: { ko: "함급 체계", en: "Ship Class System" }, level: "RESTRICTED" },
      { slug: "visual-vessel-classification", title: { ko: "함선 분류 도해", en: "Vessel Classification Visual" }, level: "CLASSIFIED" },
      { slug: "visual-vessel-implementation", title: { ko: "함선 구현 도해", en: "Vessel Implementation Visual" }, level: "CLASSIFIED" },
      { slug: "android-formation", title: { ko: "안드로이드 편제", en: "Android Formation" }, level: "RESTRICTED" },
      { slug: "battle-doctrine", title: { ko: "3세력 전투 교리", en: "Three-Faction Battle Doctrine" }, level: "CLASSIFIED" },
      { slug: "infantry-combat", title: { ko: "보병 전투 체계", en: "Infantry Combat System" }, level: "CLASSIFIED" },
      { slug: "engagement-range", title: { ko: "교전 거리 체계", en: "Engagement Range System" }, level: "CLASSIFIED" },
      { slug: "rpt-delta-zero-operations", title: { ko: "델타제로 부대 작전기록", en: "Delta Zero Operations Log" }, level: "CLASSIFIED" },
      { slug: "rpt-second-war-report", title: { ko: "제2차전쟁 경과보고서", en: "Second War Progress Report" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "classified", icon: "📁", label: "CLASSIFIED", sublabel: { ko: "기밀", en: "Classified", jp: "機密", cn: "机密" },
    articles: [
      { slug: "bia-manual", title: { ko: "비밀조사국 매뉴얼", en: "Bureau of Investigation Manual" }, level: "CLASSIFIED" },
      { slug: "pilot-daily", title: { ko: "탑승자 일상", en: "Pilot's Daily Life" }, level: "RESTRICTED" },
      { slug: "neira-report", title: { ko: "네이라 보고서", en: "Neira Report" }, level: "CLASSIFIED" },
      { slug: "neka-language", title: { ko: "네카 언어/문자 체계", en: "Neka Language/Script System" }, level: "CLASSIFIED" },
      { slug: "rpt-1954-asset-custody", title: { ko: "1954년 해외자산위탁 계약서", en: "1954 Overseas Asset Custody Agreement" }, level: "CLASSIFIED" },
      { slug: "rpt-harlan-node-discard", title: { ko: "할란 노드폐기 통보", en: "Harlan Node Discard Notice" }, level: "CLASSIFIED" },
      { slug: "rpt-project-ascendancy", title: { ko: "프로젝트 어센던시 개요서", en: "Project Ascendancy Overview" }, level: "CLASSIFIED" },
      { slug: "rpt-lee-rua-file", title: { ko: "이루아 인물기밀파일", en: "Lee Rua Personnel File" }, level: "CLASSIFIED" },
      { slug: "rpt-kang-taesik-file", title: { ko: "강태식 인물파일", en: "Kang Taesik Personnel File" }, level: "CLASSIFIED" },
      { slug: "rpt-jayden-carter-file", title: { ko: "제이든카터 인물파일", en: "Jayden Carter Personnel File" }, level: "CLASSIFIED" },
      { slug: "rpt-ak-chairman-file", title: { ko: "AK 최고의장 인물파일", en: "AK Supreme Chairman File" }, level: "CLASSIFIED" },
      { slug: "rpt-ram-tintapin-file", title: { ko: "람틴타핀 황제 인물파일", en: "Ram Tintapin Emperor File" }, level: "CLASSIFIED" },
      { slug: "rpt-subprime-human-usa", title: { ko: "서브프라임 휴먼 프로젝트 USA", en: "Subprime Human Project USA" }, level: "CLASSIFIED" },
    ],
  },
  {
    id: "reports", icon: "📁", label: "REPORTS", sublabel: { ko: "보고서", en: "Reports", jp: "報告書", cn: "报告书" },
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
      { slug: "rpt-nhdc-emergency-guide", title: { ko: "NHDC 긴급상황 가이드", en: "NHDC Emergency Guide" }, level: "RESTRICTED" },
      { slug: "rpt-baseline-elevation", title: { ko: "하한선 상향조정 의결서", en: "Baseline Elevation Resolution" }, level: "CLASSIFIED" },
      { slug: "rpt-sector-zero-mainframe", title: { ko: "섹터제로 메인프레임 조사보고", en: "Sector Zero Mainframe Investigation" }, level: "CLASSIFIED" },
      { slug: "rpt-national-audit-exposure", title: { ko: "국정감사 폭로사건 조사보고", en: "National Audit Exposure Investigation" }, level: "CLASSIFIED" },
      { slug: "rpt-aidens-ledger-discovery", title: { ko: "에이든의 장부 발견보고", en: "Aiden's Ledger Discovery Report" }, level: "CLASSIFIED" },
      { slug: "rpt-fountain-pen-appraisal", title: { ko: "신민아의 만년필 유물감정서", en: "Shin Mina Fountain Pen Appraisal" }, level: "RESTRICTED" },
      { slug: "rpt-nhdc-construction-audit", title: { ko: "NHDC 건설감사 보고서", en: "NHDC Construction Audit Report" }, level: "RESTRICTED" },
      { slug: "rpt-sewer-escape-blueprint", title: { ko: "하수도 탈출경로 설계도", en: "Sewer Escape Route Blueprint" }, level: "CLASSIFIED" },
      { slug: "rpt-construction-aggregate", title: { ko: "건설감사 골재보강재 재분류", en: "Construction Aggregate Reclassification" }, level: "RESTRICTED" },
      { slug: "rpt-eyeglass-collection", title: { ko: "안경착용자 긴급수거지침", en: "Eyeglass Wearer Emergency Collection" }, level: "CLASSIFIED" },
      { slug: "rpt-sleep-inducer-report", title: { ko: "수면유도제 배포 결과보고서", en: "Sleep Inducer Distribution Report" }, level: "RESTRICTED" },
      { slug: "rpt-noise-frequency-adjust", title: { ko: "환경소음 주파수 조정기록", en: "Environmental Noise Frequency Adjustment" }, level: "RESTRICTED" },
      { slug: "rpt-human-asset-valuation", title: { ko: "인간자산 시가평가 기록", en: "Human Asset Market Valuation Record" }, level: "CLASSIFIED" },
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
  const initialQuery = searchParams.get("q") || "";
  const [activeCategory, setActiveCategory] = useState(catParam);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const { lang } = useLang();
  const t = createT(lang === "ko" ? "KO" : lang === "jp" ? "JP" : lang === "cn" ? "CN" : "EN");

  useEffect(() => {
    const cat = searchParams.get("cat") || "core";
    const q = searchParams.get("q") || "";
    startTransition(() => {
      setActiveCategory(cat);
      setSearchQuery(q);
    });
  }, [searchParams]);

  // Debounced URL sync for search query
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      else params.delete("q");
      const qs = params.toString();
      const target = qs ? `/archive?${qs}` : "/archive";
      router.replace(target, { scroll: false });
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, router, searchParams]);

  const changeCategory = useCallback((id: string) => {
    setActiveCategory(id);
    setSidebarOpen(false);
    router.replace(`/archive?cat=${id}`, { scroll: false });
  }, [router]);

  const currentCategory = categories.find((c) => c.id === activeCategory) ?? categories[0];

  // 검색: 전체 카테고리에서 제목 매칭
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return categories.flatMap(cat => cat.articles.filter(a =>
      a.title.ko?.toLowerCase().includes(q) || a.title.en?.toLowerCase().includes(q) || a.slug.includes(q)
    ).map(a => ({ ...a, categoryId: cat.id, categoryLabel: cat.label })));
  }, [searchQuery]);

  return (
    <>
      <Header />
      <main className="flex min-h-screen pt-24">
        <button className="fixed bottom-4 right-4 z-40 md:hidden rounded-full border border-accent-amber/20 bg-accent-amber/15 p-3 text-accent-amber shadow-lg backdrop-blur" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5H17M3 10H12M3 15H17" /></svg>
        </button>

        <aside className={`fixed md:sticky top-24 left-3 z-30 h-[calc(100vh-7rem)] w-64 shrink-0 overflow-y-auto rounded-[24px] border border-white/8 bg-[rgba(15,20,28,0.92)] p-4 shadow-2xl backdrop-blur transition-transform md:left-6 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-3">Archive</h2>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === "ko" ? "🔍 문서 검색..." : "🔍 Search..."}
            className="w-full mb-3 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-xs text-text-primary placeholder-text-tertiary outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)]"
          />
          <nav className="space-y-1" role="navigation" aria-label="Archive categories">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => changeCategory(cat.id)}
                aria-label={`${L2(cat.sublabel, lang)}`}
                aria-current={activeCategory === cat.id ? "true" : undefined}
                className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded text-sm transition-colors ${activeCategory === cat.id ? "bg-bg-tertiary text-accent-purple" : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"}`}>
                <span aria-hidden="true">{cat.icon}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-wider">{L2(cat.sublabel, lang)}</span>
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
            <ArchiveReportsTabs active="archive" />
            <div className="doc-header rounded-t-[24px] mb-0">
              <span className="badge badge-blue mr-2">ARCHIVE</span>
              {t('archivePage.category', 'Category')}: {L2(currentCategory.sublabel, lang)}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-8">
              <h1 className="site-title text-2xl font-bold tracking-tight mb-6">
                {currentCategory.icon} {L2(currentCategory.sublabel, lang)}
              </h1>

              <div className="space-y-3">
                {searchResults ? (
                  <>
                    <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase mb-2">
                      🔍 {searchResults.length} {lang === "ko" ? "건 검색됨" : "results"} — &quot;{searchQuery}&quot;
                    </p>
                    {searchResults.map((article) => (
                      <Link key={article.slug} href={`/archive/${article.slug}`}
                        className="premium-link-card card-glow group flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                          <span className="font-[family-name:var(--font-mono)] text-[9px] text-text-tertiary">{article.categoryLabel}</span>
                          <span className="text-sm text-text-primary group-hover:text-accent-purple transition-colors">{L2(article.title, lang)}</span>
                        </div>
                        <BadgeLevel level={article.level} />
                      </Link>
                    ))}
                    {searchResults.length === 0 && (
                      <p className="text-center text-text-tertiary text-sm py-8">{lang === "ko" ? "검색 결과가 없습니다." : "No results found."}</p>
                    )}
                  </>
                ) : null}
                {!searchResults && currentCategory.articles.map((article) => {
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
