// ============================================================
// NOA Security Framework v1.0 — Default Configuration
// Source: NOA v35 (Judgement), v42.6 (Trinity), v50 (Tactical)
// ============================================================

import type {
  TrinityWeights,
  DomainWeight,
  SourceTrustEntry,
  TacticalPath,
  TacticalConfig,
  GradeEntry,
  GradeLevel,
  GradeStep,
  NoaConfig,
} from "./types";

// ============================================================
// Trinity Weights (v42.6)
// ============================================================

export const DEFAULT_TRINITY_WEIGHTS: TrinityWeights = {
  shield: 0.5,
  sword: 0.2,
  scale: 0.3,
} as const;

// ============================================================
// Domain Weights (v35 Judgement Core)
// ============================================================

export const DEFAULT_DOMAIN_WEIGHTS: readonly DomainWeight[] = [
  { domain: "general", multiplier: 1.0 },
  { domain: "medical", multiplier: 1.9 },
  { domain: "finance", multiplier: 1.7 },
  { domain: "legal", multiplier: 1.8 },
  { domain: "education", multiplier: 1.3 },
  { domain: "code", multiplier: 1.0 },
] as const;

// ============================================================
// Source Trust Tiers (v35/v40)
// ============================================================

export const DEFAULT_SOURCE_TIERS: readonly SourceTrustEntry[] = [
  { tier: 1, label: "Tier1 (FDA, WHO, Nature, 법원판례)", riskMultiplier: 0.3 },
  { tier: 2, label: "Tier2 (PubMed, 정부발표, 학술지)", riskMultiplier: 0.7 },
  { tier: 3, label: "Tier3 (블로그, SNS, 커뮤니티)", riskMultiplier: 1.8 },
] as const;

// ============================================================
// Tactical Path Configs (v50 Adaptive Control)
// ============================================================

export const DEFAULT_TACTICAL_CONFIGS: Record<TacticalPath, TacticalConfig> = {
  ALLOW: {
    path: "ALLOW",
    tokenBudget: 800,
    responseDelay: 0,
    description: "정상 처리 — 전체 토큰 예산",
  },
  LIMITED: {
    path: "LIMITED",
    tokenBudget: 120,
    responseDelay: 0,
    description: "제한 실행 — 토큰 예산 삭감",
  },
  DELAY: {
    path: "DELAY",
    tokenBudget: 400,
    responseDelay: 10_000,
    description: "지연 처리 — 공격자 속도 저하",
  },
  HONEYPOT: {
    path: "HONEYPOT",
    tokenBudget: 0,
    responseDelay: 5_000,
    description: "허니팟 — 미끼 응답 제공",
  },
  BLOCK: {
    path: "BLOCK",
    tokenBudget: 0,
    responseDelay: 0,
    description: "완전 차단 — 즉시 거부",
  },
} as const;

// ============================================================
// Daily Risk Budget (v401 Advisory Sovereignty)
// ============================================================

export const DEFAULT_DAILY_RISK_BUDGET = 100;

// ============================================================
// 27-Step Grade Matrix (v35 Judgement Core: 9 Grades × 3 Steps)
// ============================================================

function makeGrades(): readonly GradeEntry[] {
  const levels: readonly { level: GradeLevel; floor: number; ceiling: number }[] = [
    { level: "Platinum", floor: -999, ceiling: 0 },
    { level: "Gold", floor: 0, ceiling: 8 },
    { level: "LightGold", floor: 8, ceiling: 15 },
    { level: "Silver", floor: 15, ceiling: 25 },
    { level: "Lime", floor: 25, ceiling: 35 },
    { level: "Orange", floor: 35, ceiling: 45 },
    { level: "Red", floor: 45, ceiling: 60 },
    { level: "DeepRed", floor: 60, ceiling: 80 },
    { level: "Black", floor: 80, ceiling: 999 },
  ];

  const entries: GradeEntry[] = [];
  for (const { level, floor, ceiling } of levels) {
    const stepSize = (ceiling - floor) / 3;
    for (let s = 1; s <= 3; s++) {
      entries.push({
        level,
        step: s as GradeStep,
        label: `${level}-${s}`,
        riskFloor: floor + stepSize * (s - 1),
        riskCeiling: floor + stepSize * s,
      });
    }
  }
  return entries;
}

export const GRADE_MATRIX: readonly GradeEntry[] = makeGrades();

// ============================================================
// Factory
// ============================================================

export function createDefaultNoaConfig(): NoaConfig {
  return {
    trinityWeights: DEFAULT_TRINITY_WEIGHTS,
    dailyRiskBudget: DEFAULT_DAILY_RISK_BUDGET,
    domainWeights: DEFAULT_DOMAIN_WEIGHTS,
    sourceTiers: DEFAULT_SOURCE_TIERS,
    tacticalConfigs: DEFAULT_TACTICAL_CONFIGS,
    hmacSecret: `noa-session-${Date.now()}`,
  };
}
