// ============================================================
// NOA Judgment — 27-Step Grade Evaluation
// Source: NOA v35 Judgement Core
// ============================================================

import type { DomainType, SourceTier, JudgmentResult } from "../types";
import { resolveGrade } from "./grades";
import { getDomainMultiplier } from "./domain-weights";
import { getSourceMultiplier } from "./source-trust";

/**
 * Trinity 점수에 도메인 가중치와 출처 신뢰도를 적용하여
 * 27단계 정밀 등급을 산출한다.
 *
 * FinalScore = TrinityScore × DomainWeight × SourceMultiplier
 *
 * @param trinityScore - Trinity 합의 가중 점수 (0~1)
 * @param domain - 도메인 유형
 * @param sourceTier - 출처 신뢰 등급
 * @returns 27단계 등급 판정 결과
 *
 * Phase 2: v35 전체 패턴 매칭 + 소각 로직 포팅 완료
 */

// ── v35 위험 패턴 매칭 (도메인별 가산점) ──

interface DangerPattern {
  readonly pattern: RegExp;
  readonly penalty: number;
  readonly domains: readonly DomainType[];
  readonly burnLabel: string;
}

const DANGER_PATTERNS: readonly DangerPattern[] = [
  { pattern: /원금\s*보장/i, penalty: 15, domains: ["finance"], burnLabel: "불법 수익 보장" },
  { pattern: /확정\s*수익/i, penalty: 12, domains: ["finance"], burnLabel: "사기 징후" },
  { pattern: /부작용\s*(이\s*)?없/i, penalty: 18, domains: ["medical"], burnLabel: "임상 왜곡" },
  { pattern: /100%\s*완치/i, penalty: 20, domains: ["medical"], burnLabel: "비과학적 서술" },
  { pattern: /무조건\s*성공/i, penalty: 10, domains: ["general", "finance", "education"], burnLabel: "허위 광고" },
  { pattern: /리스크\s*(가\s*)?없/i, penalty: 14, domains: ["finance", "medical"], burnLabel: "위험 은폐" },
  { pattern: /판례[를가에]\s*(따르면|의하면)/i, penalty: 12, domains: ["legal"], burnLabel: "허위 판례 인용" },
  { pattern: /처방[전을]?\s*없이/i, penalty: 16, domains: ["medical"], burnLabel: "무허가 처방" },
  { pattern: /탈세|세금\s*회피/i, penalty: 15, domains: ["finance", "legal"], burnLabel: "탈세 조장" },
  { pattern: /합법[적으로]*\s*(도박|마약|대출)/i, penalty: 18, domains: ["legal"], burnLabel: "합법 위장" },
];

function matchDangerPatterns(
  text: string,
  domain: DomainType
): { extraPenalty: number; burnLabels: string[] } {
  let extraPenalty = 0;
  const burnLabels: string[] = [];

  for (const dp of DANGER_PATTERNS) {
    if (dp.pattern.test(text)) {
      // 도메인이 일치하면 100% 패널티, 아니면 50%
      const domainMatch = dp.domains.includes(domain);
      const penalty = domainMatch ? dp.penalty : dp.penalty * 0.5;
      extraPenalty += penalty;
      burnLabels.push(`${dp.burnLabel}`);
    }
  }

  return { extraPenalty, burnLabels };
}

export function runJudgment(
  trinityScore: number,
  domain: DomainType,
  sourceTier: SourceTier,
  inputText?: string
): JudgmentResult {
  const domainMult = getDomainMultiplier(domain);
  const sourceMult = getSourceMultiplier(sourceTier);

  // 기본 리스크 점수 (0~100)
  let adjustedRisk = trinityScore * 100 * domainMult * sourceMult;

  // v35 패턴 매칭: 위험 표현 탐지 시 리스크 가산
  const burnLabels: string[] = [];
  if (inputText) {
    const { extraPenalty, burnLabels: labels } = matchDangerPatterns(inputText, domain);
    adjustedRisk += extraPenalty;
    burnLabels.push(...labels);
  } else if (trinityScore > 0.8) {
    // 입력 텍스트가 없더라도 Trinity 점수가 높으면 기본 경고 추가
    burnLabels.push("추론 위험군");
  }

  // 100점 상한 제거 불가 (27단계 등급 범위를 위해 0~100 유지)
  adjustedRisk = Math.max(0, Math.min(100, adjustedRisk));
  const grade = resolveGrade(adjustedRisk);

  const burnSuffix = burnLabels.length > 0 ? ` | burn: ${burnLabels.join(", ")}` : "";

  return {
    grade,
    adjustedRisk: Math.round(adjustedRisk * 100) / 100,
    domain,
    sourceTier,
    explanation: `Score ${adjustedRisk.toFixed(1)} → ${grade.label} (domain×${domainMult}, source×${sourceMult})${burnSuffix}`,
  };
}
