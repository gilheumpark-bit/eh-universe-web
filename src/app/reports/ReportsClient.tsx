"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useLang, L2 } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import {
  REPORT_CATEGORIES,
  REPORT_SLUG_MAP,
  type ReportSubcategory,
} from "@/lib/report-categories";

// ============================================================
// PART 1 — Report data collected from all archive categories
// ============================================================

type ReportEntry = {
  slug: string;
  title: { ko: string; en: string; jp?: string; cn?: string };
  level: string;
  subcategory: ReportSubcategory;
};

const ALL_REPORTS: ReportEntry[] = [
  // --- CORE ---
  { slug: "rpt-nhdc-grade-classification", title: { ko: "NHDC 등급분류체계 해설서", en: "NHDC Grade Classification Manual" }, level: "RESTRICTED" },
  { slug: "rpt-eh-currency-system", title: { ko: "EH 통화체계 개요서", en: "EH Currency System Overview" }, level: "RESTRICTED" },
  { slug: "rpt-detention-facility-manual", title: { ko: "수용소 운영지침서", en: "Detention Facility Manual" }, level: "CLASSIFIED" },
  { slug: "rpt-97-percent-ignorance", title: { ko: "97% 무지유지 프로토콜", en: "97% Ignorance Protocol" }, level: "CLASSIFIED" },
  { slug: "rpt-hpp-protocol-detail", title: { ko: "HPP 인류보존프로토콜 상세", en: "HPP Protocol Detail" }, level: "RESTRICTED" },
  { slug: "rpt-carters-record-preface", title: { ko: "카터스 레코드 아카이브 서문", en: "Carter's Record Archive Preface" }, level: "RESTRICTED" },
  { slug: "rpt-non-intervention-paradox", title: { ko: "비개입원칙 역설분석", en: "Non-Intervention Paradox Analysis" }, level: "RESTRICTED" },
  { slug: "rpt-records-outlive-people", title: { ko: "기록은 사람보다 오래 산다", en: "Records Outlive People" }, level: "PUBLIC" },
  { slug: "rpt-nob-citizen-grade", title: { ko: "NOB 시민등급 분류표", en: "NOB Citizen Grade Classification" }, level: "RESTRICTED" },
  // --- TIMELINE ---
  { slug: "rpt-eh-universe-timeline", title: { ko: "EH Universe 타임라인", en: "EH Universe Timeline" }, level: "PUBLIC" },
  // --- FACTIONS ---
  { slug: "rpt-sib-overview", title: { ko: "비밀조사국 조직개요", en: "SIB Overview" }, level: "CLASSIFIED" },
  { slug: "rpt-jocei-committee", title: { ko: "JOCEI 한미공동감독위원회", en: "JOCEI Joint Oversight Committee" }, level: "RESTRICTED" },
  { slug: "rpt-sib-agent-depth", title: { ko: "비밀조사국 요원등급체계", en: "SIB Agent Depth Classification" }, level: "CLASSIFIED" },
  // --- TECHNOLOGY ---
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
  // --- GEOGRAPHY ---
  { slug: "rpt-galaxy-threat-assessment", title: { ko: "은하구역 위협도 평가서", en: "Galaxy Zone Threat Assessment" }, level: "RESTRICTED" },
  { slug: "rpt-finis-planet-recon", title: { ko: "Finis 행성 정찰보고", en: "Finis Planet Recon Report" }, level: "CLASSIFIED" },
  // --- MILITARY ---
  { slug: "rpt-delta-zero-operations", title: { ko: "델타제로 부대 작전기록", en: "Delta Zero Operations Log" }, level: "CLASSIFIED" },
  { slug: "rpt-second-war-report", title: { ko: "제2차전쟁 경과보고서", en: "Second War Progress Report" }, level: "CLASSIFIED" },
  // --- CLASSIFIED ---
  { slug: "rpt-1954-asset-custody", title: { ko: "1954년 해외자산위탁 계약서", en: "1954 Overseas Asset Custody Agreement" }, level: "CLASSIFIED" },
  { slug: "rpt-harlan-node-discard", title: { ko: "할란 노드폐기 통보", en: "Harlan Node Discard Notice" }, level: "CLASSIFIED" },
  { slug: "rpt-project-ascendancy", title: { ko: "프로젝트 어센던시 개요서", en: "Project Ascendancy Overview" }, level: "CLASSIFIED" },
  { slug: "rpt-lee-rua-file", title: { ko: "이루아 인물기밀파일", en: "Lee Rua Personnel File" }, level: "CLASSIFIED" },
  { slug: "rpt-kang-taesik-file", title: { ko: "강태식 인물파일", en: "Kang Taesik Personnel File" }, level: "CLASSIFIED" },
  { slug: "rpt-jayden-carter-file", title: { ko: "제이든카터 인물파일", en: "Jayden Carter Personnel File" }, level: "CLASSIFIED" },
  { slug: "rpt-ak-chairman-file", title: { ko: "AK 최고의장 인물파일", en: "AK Supreme Chairman File" }, level: "CLASSIFIED" },
  { slug: "rpt-ram-tintapin-file", title: { ko: "람틴타핀 황제 인물파일", en: "Ram Tintapin Emperor File" }, level: "CLASSIFIED" },
  { slug: "rpt-subprime-human-usa", title: { ko: "서브프라임 휴먼 프로젝트 USA", en: "Subprime Human Project USA" }, level: "CLASSIFIED" },
  // --- REPORTS (dedicated category) ---
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
].map((r) => ({
  ...r,
  subcategory: REPORT_SLUG_MAP[r.slug] ?? ("records" as ReportSubcategory),
}));

// Deduplicate by slug (some reports appear in multiple archive categories)
const REPORTS: ReportEntry[] = Array.from(
  new Map(ALL_REPORTS.map((r) => [r.slug, r])).values()
);

// IDENTITY_SEAL: PART-1 | role=data | inputs=none | outputs=REPORTS[]

// ============================================================
// PART 2 — Classification filter & badge components
// ============================================================

type ClassificationFilter = "ALL" | "CLASSIFIED" | "RESTRICTED" | "PUBLIC";

const CLASSIFICATION_FILTERS: ClassificationFilter[] = [
  "ALL",
  "CLASSIFIED",
  "RESTRICTED",
  "PUBLIC",
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

function SubcategoryBadge({
  subcategory,
  lang,
}: {
  subcategory: ReportSubcategory;
  lang: string;
}) {
  const cat = REPORT_CATEGORIES.find((c) => c.id === subcategory);
  if (!cat || cat.id === "all") return null;
  return (
    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary/60 border border-white/6 rounded px-1.5 py-0.5">
      {(lang === "ko" || lang === "jp" || lang === "cn") ? cat.label : cat.labelEn}
    </span>
  );
}

// IDENTITY_SEAL: PART-2 | role=filters+badges | inputs=level,subcategory | outputs=JSX

// ============================================================
// PART 3 — Tab Navigation (shared with Archive)
// ============================================================

function ArchiveReportsTabs({ active }: { active: "archive" | "reports" }) {
  const { lang } = useLang();
  return (
    <div className="flex gap-2 mb-6">
      <Link
        href="/archive"
        className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-xs font-medium tracking-[0.14em] transition-all duration-150 ${
          active === "archive"
            ? "bg-accent-amber/15 border border-accent-amber/30 text-accent-amber"
            : "border text-text-tertiary hover:text-text-secondary hover:border-white/12"
        }`}
      >
        <span aria-hidden="true">📁</span>
        {L4(lang, {
          ko: "아카이브",
          en: "Archive",
          jp: "アーカイブ",
          cn: "档案",
        })}
      </Link>
      <Link
        href="/reports"
        className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-xs font-medium tracking-[0.14em] transition-all duration-150 ${
          active === "reports"
            ? "bg-accent-red/15 border border-accent-red/30 text-accent-red"
            : "border text-text-tertiary hover:text-text-secondary hover:border-white/12"
        }`}
      >
        <span aria-hidden="true">📋</span>
        {L4(lang, {
          ko: "보고서",
          en: "Reports",
          jp: "報告書",
          cn: "报告书",
        })}
      </Link>
    </div>
  );
}

export { ArchiveReportsTabs };

// IDENTITY_SEAL: PART-3 | role=tab-navigation | inputs=active | outputs=JSX

// ============================================================
// PART 4 — Main ReportsClient component
// ============================================================

export default function ReportsClient() {
  const { lang } = useLang();
  const [activeSubcategory, setActiveSubcategory] =
    useState<ReportSubcategory>("all");
  const [classFilter, setClassFilter] =
    useState<ClassificationFilter>("ALL");

  const filtered = useMemo(() => {
    let list = REPORTS;
    if (activeSubcategory !== "all") {
      list = list.filter((r) => r.subcategory === activeSubcategory);
    }
    if (classFilter !== "ALL") {
      list = list.filter((r) => r.level === classFilter);
    }
    return list;
  }, [activeSubcategory, classFilter]);

  const levelCounts = useMemo(() => {
    const base =
      activeSubcategory === "all"
        ? REPORTS
        : REPORTS.filter((r) => r.subcategory === activeSubcategory);
    return {
      ALL: base.length,
      CLASSIFIED: base.filter((r) => r.level === "CLASSIFIED").length,
      RESTRICTED: base.filter((r) => r.level === "RESTRICTED").length,
      PUBLIC: base.filter((r) => r.level === "PUBLIC").length,
    };
  }, [activeSubcategory]);

  const classFilterColor = (f: ClassificationFilter, active: boolean) => {
    if (!active)
      return "border text-text-tertiary hover:text-text-secondary hover:border-white/12";
    switch (f) {
      case "CLASSIFIED":
        return "bg-accent-red/15 border border-accent-red/30 text-accent-red";
      case "RESTRICTED":
        return "bg-accent-amber/15 border border-accent-amber/30 text-accent-amber";
      case "PUBLIC":
        return "bg-accent-green/15 border border-accent-green/30 text-accent-green";
      default:
        return "bg-white/8 border border-white/15 text-text-primary";
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16">
        <div className="site-shell">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            {/* Tab navigation */}
            <ArchiveReportsTabs active="reports" />

            {/* Header */}
            <div className="doc-header rounded-t-[24px] mb-0">
              <span className="badge badge-classified mr-2">REPORTS</span>
              {L4(lang, {
                ko: "기밀 보고서 아카이브",
                en: "Classified Reports Archive",
                jp: "機密報告書アーカイブ",
                cn: "机密报告档案",
              })}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-8">
              {/* Subcategory filter bar */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveSubcategory(cat.id)}
                    className={`rounded-full px-3.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] transition-all ${
                      activeSubcategory === cat.id
                        ? "bg-white/10 border border-white/20 text-text-primary"
                        : "border border-white/6 text-text-tertiary hover:text-text-secondary hover:border-white/10"
                    }`}
                  >
                    {(lang === "ko" || lang === "jp" || lang === "cn") ? cat.label : cat.labelEn}
                  </button>
                ))}
              </div>

              {/* Classification filter */}
              <div className="flex flex-wrap items-center gap-1.5 mb-6">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-tertiary mr-2">
                  {L4(lang, {
                    ko: "등급",
                    en: "CLASS",
                    jp: "等級",
                    cn: "等级",
                  })}
                </span>
                {CLASSIFICATION_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setClassFilter(f)}
                    className={`rounded-full px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] transition-all ${classFilterColor(f, classFilter === f)}`}
                  >
                    {f}{" "}
                    <span className="opacity-50">({levelCounts[f]})</span>
                  </button>
                ))}
              </div>

              {/* Report count */}
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-4">
                {filtered.length}{" "}
                {L4(lang, {
                  ko: "건",
                  en: "reports",
                  jp: "件",
                  cn: "份",
                })}
              </p>

              {/* Report list */}
              <div className="space-y-2.5">
                {filtered.map((report) => {
                  const isClassified = report.level === "CLASSIFIED";
                  return (
                    <Link
                      key={report.slug}
                      href={`/archive/${report.slug}`}
                      className={`group flex items-center justify-between gap-3 rounded-2xl p-4 transition-all duration-200 ${
                        isClassified
                          ? "border border-accent-red/12 bg-accent-red/[0.03] hover:border-accent-red/25 hover:bg-accent-red/[0.06] hover:-translate-y-0.5"
                          : "premium-link-card card-glow"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SubcategoryBadge
                          subcategory={report.subcategory}
                          lang={lang}
                        />
                        <span
                          className={`text-sm truncate transition-colors ${
                            isClassified
                              ? "text-text-primary group-hover:text-accent-red"
                              : "text-text-primary group-hover:text-accent-purple"
                          }`}
                        >
                          {L2(report.title, lang)}
                        </span>
                      </div>
                      <BadgeLevel level={report.level} />
                    </Link>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-center text-text-tertiary text-sm py-8">
                    {L4(lang, {
                      ko: "해당 조건의 보고서가 없습니다.",
                      en: "No reports match the current filters.",
                      jp: "該当する報告書がありません。",
                      cn: "没有符合条件的报告。",
                    })}
                  </p>
                )}
              </div>

              {/* Footer log */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 eh-log">
                  [REPORTS_STATUS: ACTIVE]
                  <br />
                  [LOADED: {REPORTS.length} classified reports]
                  <br />
                  [ACCESS_LEVEL: RESTRICTED — some documents require clearance]
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: PART-4 | role=main-component | inputs=user-filters | outputs=filtered-report-list
