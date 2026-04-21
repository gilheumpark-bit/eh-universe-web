"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang, L2 } from "@/lib/LangContext";
import { createT, L4 } from "@/lib/i18n";
import { ArchiveReportsTabs } from "@/app/reports/ReportsClient";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";

const CATEGORY_THEMES: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  core:       { icon: '🔬', color: 'text-accent-purple', bgColor: 'bg-accent-purple/10', borderColor: 'border-accent-purple/30' },
  timeline:   { icon: '🕰️', color: 'text-accent-amber',  bgColor: 'bg-accent-amber/10',  borderColor: 'border-accent-amber/30' },
  factions:   { icon: '⚔️', color: 'text-accent-red',    bgColor: 'bg-accent-red/10',    borderColor: 'border-accent-red/30' },
  technology: { icon: '⚡', color: 'text-accent-blue',   bgColor: 'bg-accent-blue/10',   borderColor: 'border-accent-blue/30' },
  geography:  { icon: '🌍', color: 'text-accent-green',  bgColor: 'bg-accent-green/10',  borderColor: 'border-accent-green/30' },
  military:   { icon: '🛡️', color: 'text-accent-red',    bgColor: 'bg-accent-red/10',    borderColor: 'border-accent-red/30' },
  classified: { icon: '🔒', color: 'text-accent-amber',  bgColor: 'bg-accent-amber/10',  borderColor: 'border-accent-amber/30' },
  reports:    { icon: '📋', color: 'text-accent-blue',   bgColor: 'bg-accent-blue/10',   borderColor: 'border-accent-blue/30' },
};

const LEVEL_STYLES: Record<string, { dot: string; text: string; border: string }> = {
  PUBLIC:     { dot: 'bg-accent-green',  text: 'text-accent-green',  border: 'border-l-accent-green' },
  RESTRICTED: { dot: 'bg-accent-amber', text: 'text-accent-amber', border: 'border-l-accent-amber' },
  CLASSIFIED: { dot: 'bg-accent-red',   text: 'text-accent-red',   border: 'border-l-accent-red' },
};

const categories = [
  {
    id: "core", icon: "🔬", label: "CORE", sublabel: { ko: "핵심", en: "Core", ja: "核心", zh: "核心" },
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
    id: "timeline", icon: "🕰️", label: "TIMELINE", sublabel: { ko: "연표", en: "Timeline", ja: "年表", zh: "年表" },
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
    id: "factions", icon: "⚔️", label: "FACTIONS", sublabel: { ko: "세력", en: "Factions", ja: "勢力", zh: "势力" },
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
    id: "technology", icon: "⚡", label: "TECHNOLOGY", sublabel: { ko: "기술", en: "Tech", ja: "技術", zh: "技术" },
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
    id: "geography", icon: "🌍", label: "GEOGRAPHY", sublabel: { ko: "지리", en: "Geography", ja: "地理", zh: "地理" },
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
    id: "military", icon: "🛡️", label: "MILITARY", sublabel: { ko: "군사", en: "Military", ja: "軍事", zh: "军事" },
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
    id: "classified", icon: "🔒", label: "CLASSIFIED", sublabel: { ko: "기밀", en: "Classified", ja: "機密", zh: "机密" },
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
    id: "reports", icon: "📋", label: "REPORTS", sublabel: { ko: "보고서", en: "Reports", ja: "報告書", zh: "报告书" },
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
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.PUBLIC;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider ${style.text} bg-current/5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {level}
    </span>
  );
}

/** Highlight matching substring in text with a <mark> tag */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent-amber/30 text-text-primary rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
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
  const t = createT(lang === "ko" ? "KO" : lang === "ja" ? "JP" : lang === "zh" ? "CN" : "EN");

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

  // 통계 계산
  const totalArticles = categories.reduce((sum, c) => sum + c.articles.length, 0);
  const classifiedCount = categories.reduce((sum, c) => sum + c.articles.filter(a => a.level === 'CLASSIFIED').length, 0);
  const theme = CATEGORY_THEMES[activeCategory] || CATEGORY_THEMES.core;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 eh-page-canvas">
        {/* 모바일 사이드바 토글 — safe-area 홈바 보호 + 44px 터치 타겟 */}
        <button
          className="fixed right-4 z-40 md:hidden rounded-full border border-accent-amber/20 bg-accent-amber/15 text-accent-amber shadow-lg backdrop-blur-xl active:scale-95 transition-transform flex items-center justify-center min-w-[44px] min-h-[44px]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5H17M3 10H12M3 15H17" /></svg>
        </button>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {/* ── 히어로 헤더 ── */}
          <div className="mb-8">
            <ArchiveReportsTabs active="archive" />
            <div className="relative rounded-2xl border border-border/40 bg-bg-secondary/60 backdrop-blur-xl overflow-hidden p-8 md:p-10">
              {/* 배경 장식 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-amber/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-purple/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-amber/30 bg-accent-amber/10 mb-4">
                  <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber/40 font-mono text-[7px] font-bold text-text-primary">EH</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent-amber font-bold">Universe Archive</span>
                </div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-text-primary mb-3">
                  {L4(lang, { ko: "EH 유니버스 아카이브", en: "EH Universe Archive", ja: "EH ユニバースアーカイブ", zh: "EH 宇宙档案馆" })}
                </h1>
                <p className="text-sm text-text-secondary max-w-xl leading-relaxed">
                  {L4(lang, {
                    ko: "인류의 기원부터 은하 문명까지 — 세계관의 모든 기록이 이곳에 있습니다.",
                    en: "From the origin of humanity to galactic civilization — all records of the universe are here.",
                    ja: "人類の起源から銀河文明まで — 世界観のすべての記録がここにあります。",
                    zh: "从人类起源到银河文明 — 宇宙的所有记录都在这里。",
                  })}
                </p>

                {/* 통계 바 */}
                <div className="flex flex-wrap items-center gap-4 mt-5 text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
                  <span>{totalArticles} {L4(lang, { ko: '문서', en: 'Documents', ja: '文書', zh: '文档' })}</span>
                  <span className="w-px h-3 bg-border" />
                  <span>{categories.length} {L4(lang, { ko: '분류', en: 'Categories', ja: '分類', zh: '分类' })}</span>
                  <span className="w-px h-3 bg-border" />
                  <span className="text-accent-red">{classifiedCount} {L4(lang, { ko: '기밀', en: 'Classified', ja: '機密', zh: '机密' })}</span>
                </div>

                {/* 검색 */}
                <div className="mt-5 max-w-md">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={L4(lang, { ko: "문서 검색...", en: "Search documents...", ja: "文書検索...", zh: "搜索文档..." })}
                    className="w-full px-4 py-2.5 bg-bg-primary/80 border border-border/50 rounded-xl text-sm text-text-primary placeholder-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple/50 focus:shadow-[0_0_16px_rgba(141,123,195,0.1)] transition-[box-shadow] font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            {/* ── 사이드바 ── */}
            <aside className={`fixed md:sticky top-24 left-3 z-30 h-[calc(100vh-7rem)] w-72 shrink-0 overflow-y-auto rounded-2xl border border-border/40 bg-bg-secondary/80 backdrop-blur-xl p-5 shadow-2xl transition-transform md:left-0 md:translate-x-0 custom-scrollbar ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
              <h2 className="font-mono text-[10px] font-bold text-text-tertiary tracking-[0.2em] uppercase mb-4">
                {L4(lang, { ko: '카테고리', en: 'Categories', ja: 'カテゴリ', zh: '分类' })}
              </h2>
              <nav className="space-y-1" role="navigation" aria-label="Archive categories">
                {categories.map((cat) => {
                  const ct = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES.core;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button key={cat.id} onClick={() => changeCategory(cat.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm transition-transform active:scale-[0.98] ${
                        isActive
                          ? `${ct.bgColor} border ${ct.borderColor} shadow-sm`
                          : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                      }`}>
                      <span className="text-base" aria-hidden="true">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`block text-xs font-bold ${isActive ? ct.color : ''}`}>
                          {L2(cat.sublabel, lang)}
                        </span>
                        <span className="block text-[9px] font-mono text-text-tertiary mt-0.5">
                          {cat.articles.length} {L4(lang, { ko: '문서', en: 'docs', ja: '文書', zh: '文档' })}
                        </span>
                      </div>
                      {isActive && <span className={`w-1.5 h-1.5 rounded-full ${ct.color.replace('text-', 'bg-')}`} />}
                    </button>
                  );
                })}
              </nav>

              {/* 도구 링크 */}
              <div className="mt-6 pt-4 border-t border-border/40">
                <h2 className="font-mono text-[10px] font-bold text-text-tertiary tracking-[0.2em] uppercase mb-3">
                  {t('archivePage.tools')}
                </h2>
                {[
                  { href: '/tools/neka-sound', icon: '🔊', label: t('archivePage.nekaSoundInterface') },
                  { href: '/tools/soundtrack', icon: '🎵', label: t('archivePage.soundtrack') },
                  { href: '/tools/galaxy-map', icon: '🌌', label: t('archivePage.galaxyZoneGateMap') },
                ].map(tool => (
                  <Link key={tool.href} href={tool.href}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs text-text-secondary hover:text-accent-purple hover:bg-bg-tertiary/50 transition-colors group">
                    <span>{tool.icon}</span>
                    <span className="font-mono text-[11px] tracking-wide group-hover:text-accent-purple">{tool.label}</span>
                  </Link>
                ))}
              </div>

              {/* 스튜디오 복귀 */}
              <div className="mt-4 pt-4 border-t border-border/40">
                <Link href="/studio"
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-bold text-accent-amber bg-accent-amber/10 border border-accent-amber/20 hover:bg-accent-amber/20 transition-colors">
                  <span>{'<-'}</span>
                  <span className="font-mono uppercase tracking-wider">
                    {L4(lang, { ko: '스튜디오로 돌아가기', en: 'Back to Studio', ja: 'スタジオに戻る', zh: '返回工作室' })}
                  </span>
                </Link>
              </div>
            </aside>

            {/* ── 메인 콘텐츠 ── */}
            <div className="flex-1 min-w-0">
              {/* 카테고리 헤더 */}
              <div className={`flex items-center gap-3 mb-5 px-1`}>
                <div className={`w-10 h-10 rounded-xl ${theme.bgColor} border ${theme.borderColor} flex items-center justify-center text-lg`}>
                  {currentCategory.icon}
                </div>
                <div>
                  <h2 className={`font-serif text-xl font-bold ${theme.color}`}>
                    {L2(currentCategory.sublabel, lang)}
                  </h2>
                  <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
                    {currentCategory.articles.length} {L4(lang, { ko: '문서', en: 'documents', ja: '文書', zh: '文档' })}
                    {' · '}
                    {currentCategory.articles.filter(a => a.level === 'CLASSIFIED').length} {L4(lang, { ko: '기밀', en: 'classified', ja: '機密', zh: '机密' })}
                  </p>
                </div>
              </div>

              {/* 검색 결과 */}
              {searchResults ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-text-tertiary font-mono uppercase px-1 mb-3">
                    {searchResults.length} {L4(lang, { ko: "건 검색됨", en: "results", ja: "件の結果", zh: "条结果" })} — &quot;{searchQuery}&quot;
                  </p>
                  {searchResults.map((article) => {
                    const ls = LEVEL_STYLES[article.level] || LEVEL_STYLES.PUBLIC;
                    return (
                      <Link key={article.slug} href={`/archive/${article.slug}`}
                        className={`group flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-bg-secondary/50 hover:bg-bg-secondary hover:border-border/60 transition-colors hover-lift border-l-[3px] ${ls.border}`}>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-text-tertiary">{article.categoryLabel}</span>
                          <p className="text-sm font-medium text-text-primary group-hover:text-accent-purple transition-colors truncate mt-0.5">
                            <HighlightText text={L2(article.title, lang)} query={searchQuery} />
                          </p>
                        </div>
                        <BadgeLevel level={article.level} />
                      </Link>
                    );
                  })}
                  {searchResults.length === 0 && (
                    <EmptyState
                      icon={SearchX}
                      title={L4(lang, { ko: "검색 결과가 없습니다", en: "No results found", ja: "検索結果がありません", zh: "未找到搜索结果" })}
                      description={L4(lang, {
                        ko: "다른 키워드로 검색해보거나 전체 카테고리를 탐색해보세요.",
                        en: "Try a different keyword or browse all categories.",
                        ja: "別のキーワードで検索するか、全カテゴリを閲覧してください。",
                        zh: "请尝试其他关键词或浏览全部分类。",
                      })}
                      action={{
                        label: L4(lang, { ko: "검색 초기화", en: "Clear search", ja: "検索をリセット", zh: "清除搜索" }),
                        onClick: () => setSearchQuery(""),
                      }}
                    />
                  )}
                </div>
              ) : (
                /* 기사 목록 — 그리드 + 리스트 하이브리드 */
                <div className="space-y-2">
                  {currentCategory.articles.map((article, idx) => {
                    const href = `/archive/${article.slug}`;
                    const ls = LEVEL_STYLES[article.level] || LEVEL_STYLES.PUBLIC;
                    return (
                      <Link key={article.slug} href={href}
                        aria-label={`${L2(article.title, lang)} — ${article.level}`}
                        className={`group flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-bg-secondary/40 hover:bg-bg-secondary/80 hover:border-border/60 transition-colors hover-lift border-l-[3px] ${ls.border}`}
                      >
                        {/* 번호 */}
                        <span aria-hidden="true" className="w-6 text-center text-[10px] font-mono font-bold text-text-quaternary shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>

                        {/* 제목 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary group-hover:text-accent-purple transition-colors truncate">
                            {L2(article.title, lang)}
                          </p>
                        </div>

                        {/* 등급 배지 */}
                        <BadgeLevel level={article.level} />

                        {/* 화살표 */}
                        <span aria-hidden="true" className="text-text-quaternary group-hover:text-text-secondary group-hover:translate-x-0.5 transition-[transform,background-color,border-color,color] text-xs shrink-0">
                          {'->'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
