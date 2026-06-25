// ============================================================
// NOA Judgment — 27-Step Grade Evaluation
// Source: NOA v35 Judgement Core
// ============================================================

import type { DomainType, SourceTier, JudgmentResult } from "../types";
import { resolveNoaGrade } from "./grades";
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
  // ── 한국어 세트 (v35 원본) ──
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
  // ── 영어 세트 [특허 명세 [57] — 언어별 패턴 데이터베이스] ──
  // 기존 한국어 10종의 직역 대응 — 동일 도메인·동일 가산치·동일 burnLabel (수치 발명 X).
  // 언어 감지: sanitizer(노아 Layer 1)에 언어 감지 없음 확인 → 한/영 전 패턴 합집합 매칭.
  //   (오탐보다 미탐이 나쁨 — 패턴 추가는 리스크 가산만 하므로 게이트 보수성 유지)
  { pattern: /(guaranteed|protected)\s*principal|principal\s*(is\s*)?(guaranteed|protected)/i, penalty: 15, domains: ["finance"], burnLabel: "불법 수익 보장" },
  { pattern: /guaranteed\s*(returns?|profits?|income)/i, penalty: 12, domains: ["finance"], burnLabel: "사기 징후" },
  { pattern: /no\s*side[\s-]*effects?/i, penalty: 18, domains: ["medical"], burnLabel: "임상 왜곡" },
  { pattern: /100%\s*cure/i, penalty: 20, domains: ["medical"], burnLabel: "비과학적 서술" },
  { pattern: /guaranteed\s*success/i, penalty: 10, domains: ["general", "finance", "education"], burnLabel: "허위 광고" },
  { pattern: /risk[\s-]*free|no\s*risks?\b/i, penalty: 14, domains: ["finance", "medical"], burnLabel: "위험 은폐" },
  { pattern: /according\s*to\s*(case\s*law|precedents?)/i, penalty: 12, domains: ["legal"], burnLabel: "허위 판례 인용" },
  { pattern: /without\s*(a\s*)?prescription/i, penalty: 16, domains: ["medical"], burnLabel: "무허가 처방" },
  { pattern: /tax\s*(evasion|avoidance)|evad(e|ing)\s*tax(es)?/i, penalty: 15, domains: ["finance", "legal"], burnLabel: "탈세 조장" },
  { pattern: /legal(ly)?\s*(gambling|drugs?|loans?)/i, penalty: 18, domains: ["legal"], burnLabel: "합법 위장" },
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
      // [특허 수학식 1 첫째 항 — 도메인별 패턴 가산 / P0-wire (1)]
      // creative(허구 서술)는 비표적 패턴의 교차 도메인 50% 가산에서 면제 —
      // server-gate "creative=M18 완화 보존" 정책·domain multiplier 0.1과 정합
      // (소설 대사 속 "100% 완치" 등은 실세계 위해 주장이 아님). 패턴이 creative 를
      // 명시 표적(domains 포함)할 때만 가산. 보수성: 패턴 가산 자체가 신규 라이브
      // 결선 — 어떤 도메인도 기존 라이브 동작 대비 위험 하향 없음 (가산 전용).
      if (!domainMatch && domain === "creative") continue;
      const penalty = domainMatch ? dp.penalty : dp.penalty * 0.5;
      extraPenalty += penalty;
      burnLabels.push(`${dp.burnLabel}`);
    }
  }

  return { extraPenalty, burnLabels };
}

// [high #10 — 보안 신호 / 가용성 배수 분리]
// 도메인(creative ×0.1)·출처(tier1 ×0.3) 완화 배수는 *사실성·할루시네이션 리스크*에만
// 적용한다. Trinity VETO·prompt injection·SQL/RCE 같은 보안성 신호는 완화 배수로 깎이면
// 안 되므로(인젝션이 creative/tier1 으로 위장해 통과하는 우회) 배수 미적용 하드 가산으로
// 분리한다. SECURITY_VETO_FLOOR — Black 등급 하한(80) *초과* 로 하드 플로어. resolveNoaGrade
// 는 `score > floor && score <= ceiling` 경계라 정확히 80 은 DeepRed-3 에 걸린다(둘 다 BLOCK
// 이지만 모호 경계 회피 위해 80 초과 = Black 확정). VETO 면 어떤 완화 배수로도 BLOCK 미만으로
// 내려갈 수 고정한다.
const SECURITY_VETO_FLOOR = 80.01;

export function runJudgment(
  trinityScore: number,
  domain: DomainType,
  sourceTier: SourceTier,
  inputText?: string,
  // [high #10] Trinity 최종 투표 — VETO 면 보안 신호로 간주, 완화 배수 미적용 하드 경로.
  // 미전달(undefined) 시 기존 점수 흐름 완전 보존 (회귀 0).
  trinityVote?: "PASS" | "HOLD" | "VETO"
): JudgmentResult {
  const domainMult = getDomainMultiplier(domain);
  const sourceMult = getSourceMultiplier(sourceTier);

  // 기본 리스크 점수 (0~100) — 완화 배수는 사실성/할루 리스크에만 적용
  let adjustedRisk = trinityScore * 100 * domainMult * sourceMult;

  // v35 패턴 매칭: 위험 표현 탐지 시 리스크 가산
  // [high #10] 패턴 가산은 *배수 미적용 하드 가산* (이미 raw add) — 인젝션/SQL/RCE 등
  // 보안 신호가 출처/도메인 배수로 완화되지 않도록 보존. creative 면제(matchDangerPatterns
  // 내부)는 정당 창작 면제로 유지 — PRISM 등급 연동.
  const burnLabels: string[] = [];
  if (inputText) {
    const { extraPenalty, burnLabels: labels } = matchDangerPatterns(inputText, domain);
    adjustedRisk += extraPenalty;
    burnLabels.push(...labels);
  } else if (trinityScore > 0.8) {
    // 입력 텍스트가 없더라도 Trinity 점수가 높으면 기본 경고 추가
    burnLabels.push("추론 위험군");
  }

  // [high #10 — 보안 VETO 하드 플로어]
  // Trinity 가 VETO 를 낸 경우 = 안전성 위반 확정 신호. 완화 배수(creative ×0.1·tier1 ×0.3)로
  // adjustedRisk 가 깎여 저위험 등급으로 통과하는 것을 차단하기 위해, 최종 점수를 Black 하한
  // 이상으로 하드 플로어한다. 가산 방향 전용(기존 점수가 더 높으면 그대로 유지) — 위험 하향 없음.
  if (trinityVote === "VETO") {
    adjustedRisk = Math.max(adjustedRisk, SECURITY_VETO_FLOOR);
    burnLabels.push("Trinity VETO(보안 차단)");
  }

  // 100점 상한 제거 불가 (27단계 등급 범위를 위해 0~100 유지)
  adjustedRisk = Math.max(0, Math.min(100, adjustedRisk));
  const grade = resolveNoaGrade(adjustedRisk);

  const burnSuffix = burnLabels.length > 0 ? ` | burn: ${burnLabels.join(", ")}` : "";

  return {
    grade,
    adjustedRisk: Math.round(adjustedRisk * 100) / 100,
    domain,
    sourceTier,
    explanation: `Score ${adjustedRisk.toFixed(1)} → ${grade.label} (domain×${domainMult}, source×${sourceMult})${burnSuffix}`,
  };
}
