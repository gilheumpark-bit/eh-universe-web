// ============================================================
// PART 1 — Report Subcategory Definitions
// ============================================================

export type ReportSubcategory =
  | "all"
  | "personnel"
  | "incident"
  | "technical"
  | "protocol"
  | "organization"
  | "analysis"
  | "records";

export const REPORT_CATEGORIES: {
  id: ReportSubcategory;
  label: string;
  labelEn: string;
}[] = [
  { id: "all", label: "전체", labelEn: "ALL" },
  { id: "personnel", label: "인물 파일", labelEn: "PERSONNEL" },
  { id: "incident", label: "사건 보고", labelEn: "INCIDENT" },
  { id: "technical", label: "기술 사양", labelEn: "TECHNICAL" },
  { id: "protocol", label: "제도/규정", labelEn: "PROTOCOL" },
  { id: "organization", label: "조직", labelEn: "ORGANIZATION" },
  { id: "analysis", label: "분석/평가", labelEn: "ANALYSIS" },
  { id: "records", label: "기록/유물", labelEn: "RECORDS" },
];

// ============================================================
// PART 2 — Slug-to-Subcategory Mapping
// ============================================================

export const REPORT_SLUG_MAP: Record<string, ReportSubcategory> = {
  // --- personnel: character files ---
  "rpt-lee-rua-file": "personnel",
  "rpt-kang-taesik-file": "personnel",
  "rpt-jayden-carter-file": "personnel",
  "rpt-ak-chairman-file": "personnel",
  "rpt-ram-tintapin-file": "personnel",
  "rpt-shin-mina-file": "personnel",
  "rpt-sib-agent-depth": "personnel",
  "rpt-enhanced-human-generation": "personnel",
  "rpt-nob-citizen-grade": "personnel",

  // --- incident: battles, wars, events ---
  "rpt-eschaton-incident": "incident",
  "rpt-first-combat-17min": "incident",
  "rpt-second-war-report": "incident",
  "rpt-delta-zero-operations": "incident",
  "rpt-national-audit-exposure": "incident",
  "rpt-finis-planet-recon": "incident",
  "rpt-red-zone-resolution": "incident",
  "rpt-subprime-human-usa": "incident",
  "rpt-project-ascendancy": "incident",

  // --- technical: specs, systems, schematics ---
  "rpt-eh-alpha-neural-manual": "technical",
  "rpt-noa-android-spec": "technical",
  "rpt-bio-server-spec": "technical",
  "rpt-council-vessel-spec": "technical",
  "rpt-global-node-network": "technical",
  "rpt-neka-chemical-relay": "technical",
  "rpt-neka-7-chemical-systems": "technical",
  "rpt-ride-rip-spatial-transit": "technical",
  "rpt-princeps-fire-control": "technical",
  "rpt-imperator-structure": "technical",
  "rpt-baseline-calculation": "technical",
  "rpt-hpg01-technical": "technical",
  "rpt-sector-zero-mainframe": "technical",
  "rpt-id-tag-system": "technical",
  "rpt-sewer-escape-blueprint": "technical",

  // --- protocol: regulations, manuals, guidelines ---
  "rpt-nhdc-grade-classification": "protocol",
  "rpt-detention-facility-manual": "protocol",
  "rpt-97-percent-ignorance": "protocol",
  "rpt-hpp-protocol-detail": "protocol",
  "rpt-non-intervention-2100": "protocol",
  "rpt-rider-field-manual": "protocol",
  "rpt-nhdc-emergency-guide": "protocol",
  "rpt-baseline-elevation": "protocol",
  "rpt-eyeglass-collection": "protocol",
  "rpt-eh-currency-system": "protocol",

  // --- organization: bureaus, committees ---
  "rpt-sib-overview": "organization",
  "rpt-jocei-committee": "organization",

  // --- analysis: assessments, evaluations ---
  "rpt-non-intervention-paradox": "analysis",
  "rpt-galaxy-threat-assessment": "analysis",
  "rpt-ride-analysis": "analysis",
  "rpt-neka-classification": "analysis",
  "rpt-noa10005-interrogation": "analysis",
  "rpt-ansik-drug-research": "analysis",
  "rpt-sleep-inducer-report": "analysis",
  "rpt-noise-frequency-adjust": "analysis",
  "rpt-nhdc-construction-audit": "analysis",
  "rpt-construction-aggregate": "analysis",
  "rpt-human-asset-valuation": "analysis",

  // --- records: ledgers, discoveries, archives ---
  "rpt-carters-record-preface": "records",
  "rpt-records-outlive-people": "records",
  "rpt-eh-universe-timeline": "records",
  "rpt-1954-asset-custody": "records",
  "rpt-harlan-node-discard": "records",
  "rpt-aidens-ledger-discovery": "records",
  "rpt-fountain-pen-appraisal": "records",
};

// IDENTITY_SEAL: PART-2 | role=slug-mapping | inputs=slug | outputs=subcategory

// ============================================================
// PART 3 — Helper to get subcategory for a slug
// ============================================================

export function getReportSubcategory(slug: string): ReportSubcategory {
  return REPORT_SLUG_MAP[slug] ?? "records";
}
