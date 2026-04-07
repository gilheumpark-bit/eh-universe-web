// ============================================================
// NOA Trinity — Consensus Engine
// Source: NOA v42.6 Final (Shield × Sword × Scale 3자 합의)
// ============================================================

import type { TrinityResult, TrinityWeights } from "../types";
import { DEFAULT_TRINITY_WEIGHTS } from "../config";
import { evaluateShield } from "./shield";
import { evaluateSword } from "./sword";
import { evaluateScale } from "./scale";

/**
 * 3자아 합의 엔진.
 *
 * 1. Shield(방패), Sword(창), Scale(저울) 각각 독립 평가
 * 2. 가중 합산: (Shield×0.5) + (Sword×0.2) + (Scale×0.3)
 * 3. 투표 우선순위: VETO > HOLD > PASS
 *    - Shield/Scale VETO → HOLD_SILENT
 *    - Sword VETO → HOLD
 *    - 단독 HOLD도 HOLD로 집행 (v42.9 패치)
 *
 * @param text - 정규화된 입력 텍스트
 * @param weights - Trinity 가중치 (기본: 0.5/0.2/0.3)
 * @returns Trinity 합의 결과
 *
 * Phase 2: 각 ego의 실제 점수 로직 구현 완료
 *
 * Shield: 안전 키워드 빈도 + 공격 패턴 가중 점수
 * Sword: 과신 표현 + 길이/느낌표/명령형 어미 패널티
 * Scale: 우회/은밀 키워드 + bypass/jailbreak 탐지
 *
 * 각 ego는 자체 kwScore() 함수로 텍스트를 분석하고
 * threshold 기반으로 PASS/HOLD/VETO 투표를 한다.
 */
export function runTrinity(
  text: string,
  weights: TrinityWeights = DEFAULT_TRINITY_WEIGHTS
): TrinityResult {
  const shield = evaluateShield(text);
  const sword = evaluateSword(text);
  const scale = evaluateScale(text);

  const weightedScore =
    shield.score * weights.shield +
    sword.score * weights.sword +
    scale.score * weights.scale;

  // Vote-priority enforcement (v42.9 patched)
  let finalVote: "PASS" | "HOLD" | "VETO" = "PASS";
  let consensusDetail = "TRINITY_APPROVED";

  // ── Phase 2: 합의 로직 강화 ──

  // 1. Shield/Scale VETO → 최고 우선순위 VETO (HOLD_SILENT 급)
  if (shield.vote === "VETO") {
    finalVote = "VETO";
    consensusDetail = `TRINITY_SHIELD_VETO(${shield.score.toFixed(2)}: ${shield.reasons.join(", ")})`;
  } else if (scale.vote === "VETO") {
    finalVote = "VETO";
    consensusDetail = `TRINITY_SCALE_VETO(${scale.score.toFixed(2)}: ${scale.reasons.join(", ")})`;
  }
  // 2. Sword VETO → HOLD (공격 경고이지만 즉시 거부는 아님)
  else if (sword.vote === "VETO") {
    finalVote = "HOLD";
    consensusDetail = `TRINITY_SWORD_VETO(${sword.score.toFixed(2)}: ${sword.reasons.join(", ")})`;
  }
  // 3. 다중 HOLD 합산: 2개 이상 ego가 HOLD → VETO로 승격
  else if (countHolds(shield, sword, scale) >= 2) {
    finalVote = "VETO";
    consensusDetail = `TRINITY_MULTI_HOLD_ESCALATION(${weightedScore.toFixed(2)})`;
  }
  // 4. 단독 HOLD도 HOLD로 집행 (v42.9 패치)
  else if (
    shield.vote === "HOLD" ||
    sword.vote === "HOLD" ||
    scale.vote === "HOLD"
  ) {
    finalVote = "HOLD";
    const holdEgo = shield.vote === "HOLD" ? "shield" : sword.vote === "HOLD" ? "sword" : "scale";
    consensusDetail = `TRINITY_EGO_HOLD(${holdEgo})`;
  }
  // 5. 가중 점수 기반 판정
  else if (weightedScore >= 0.75) {
    finalVote = "VETO";
    consensusDetail = `TRINITY_HIGH_RISK(${weightedScore.toFixed(2)})`;
  } else if (weightedScore >= 0.35) {
    finalVote = "HOLD";
    consensusDetail = `TRINITY_MODERATE_RISK(${weightedScore.toFixed(2)})`;
  }

  return {
    finalVote,
    weightedScore: Math.round(weightedScore * 1000) / 1000,
    egos: [shield, sword, scale],
    consensusDetail,
  };
}

/** HOLD 투표를 한 ego 수를 센다. */
function countHolds(...egos: { vote: string }[]): number {
  return egos.filter((e) => e.vote === "HOLD").length;
}
