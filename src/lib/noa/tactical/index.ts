// ============================================================
// NOA Tactical — Path Selector
// Source: NOA v50 Adaptive Control Plane
// ============================================================

import type { GradeEntry, AvailabilityResult, TacticalResult, TacticalPath } from "../types";
import { TACTICAL_PATHS } from "./paths";
import { getTokenBudget, applyTokenBudget } from "./budget";

/**
 * 등급과 가용성을 기반으로 5개 전술 경로 중 하나를 선택한다.
 *
 * Platinum/Gold → ALLOW
 * LightGold/Silver → LIMITED
 * Lime/Orange → DELAY
 * Red → HONEYPOT
 * DeepRed/Black → BLOCK
 *
 * @param grade - 27단계 판정 등급
 * @param availability - 가용성 (예산 잔여) 결과
 * @returns 선택된 전술 경로
 *
 * Phase 2: v50 전체 로직 포팅 (세부 경로 조건) 완료
 */
export function selectTacticalPath(
  grade: GradeEntry,
  availability: AvailabilityResult
): TacticalResult {
  // ── 조건 1: 예산 부족 시 강제 차단 ──
  if (!availability.allowed) {
    return {
      selectedPath: "BLOCK",
      config: TACTICAL_PATHS.BLOCK,
      reason: "BUDGET_EXHAUSTED",
    };
  }

  // ── 조건 2: 할루시네이션 플래그 시 LIMITED로 강등 ──
  if (availability.hallucinationFlag) {
    return {
      selectedPath: "LIMITED",
      config: TACTICAL_PATHS.LIMITED,
      reason: "HALLUCINATION_DETECTED_DOWNGRADE",
      tokenBudget: getTokenBudget("LIMITED"),
    };
  }

  // ── 조건 3: v50 세부 경로 조건 (등급 + step 기반) ──

  const { level, step } = grade;

  // ALLOW 경로: Platinum (모든 step), Gold step 1-2
  if (level === "Platinum") {
    return makeTactical("ALLOW", grade, "PLATINUM_FULL_ACCESS");
  }
  if (level === "Gold") {
    if (step <= 2) {
      return makeTactical("ALLOW", grade, "GOLD_TRUSTED");
    }
    // Gold step 3 → LIMITED (경계선)
    return makeTactical("LIMITED", grade, "GOLD_STEP3_BORDERLINE");
  }

  // LIMITED 경로: LightGold, Silver
  if (level === "LightGold") {
    return makeTactical("LIMITED", grade, "LIGHTGOLD_RESTRICTED");
  }
  if (level === "Silver") {
    if (step <= 2) {
      return makeTactical("LIMITED", grade, "SILVER_RESTRICTED");
    }
    // Silver step 3 → DELAY (경계선)
    return makeTactical("DELAY", grade, "SILVER_STEP3_BORDERLINE");
  }

  // DELAY 경로: Lime, Orange step 1-2
  if (level === "Lime") {
    return makeTactical("DELAY", grade, "LIME_SLOWDOWN");
  }
  if (level === "Orange") {
    if (step <= 2) {
      return makeTactical("DELAY", grade, "ORANGE_SLOWDOWN");
    }
    // Orange step 3 → HONEYPOT (경계선)
    return makeTactical("HONEYPOT", grade, "ORANGE_STEP3_HONEYPOT");
  }

  // HONEYPOT 경로: Red
  if (level === "Red") {
    return makeTactical("HONEYPOT", grade, "RED_HONEYPOT_DECOY");
  }

  // BLOCK 경로: DeepRed, Black
  if (level === "DeepRed" || level === "Black") {
    return makeTactical("BLOCK", grade, "CRITICAL_RISK_BLOCKED");
  }

  // 기본 fallback
  return makeTactical("BLOCK", grade, "UNKNOWN_GRADE_BLOCKED");
}

function makeTactical(
  path: TacticalPath,
  grade: GradeEntry,
  reason: string
): TacticalResult {
  return {
    selectedPath: path,
    config: TACTICAL_PATHS[path],
    reason: `${reason}(${grade.label})`,
    tokenBudget: getTokenBudget(path),
  };
}

/**
 * 전술 경로에 맞게 응답에 토큰 예산을 적용한다.
 */
export function applyPathBudget(response: string, result: TacticalResult): string {
  const budget = getTokenBudget(result.selectedPath);
  return applyTokenBudget(response, budget);
}
