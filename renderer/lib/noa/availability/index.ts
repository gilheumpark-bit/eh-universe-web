// ============================================================
// NOA Availability — Risk Budget Manager
// Source: NOA v401 Advisory Sovereignty (일일 리스크 예산)
// ============================================================

import type { RiskBudgetState, AvailabilityResult, RiskBudgetManager } from "../types";
import { DEFAULT_DAILY_RISK_BUDGET } from "../config";
import { burnPatterns, sanitizeResponse } from "./burn";

/**
 * 일일 리스크 예산 관리자를 생성한다.
 * 하루 100점의 위험 예산을 소진하면 긴급 차단.
 * 자정에 자동 리셋.
 *
 * @param dailyBudget - 일일 예산 (기본 100)
 * @returns RiskBudgetManager 인스턴스
 *
 * Phase 2: v401 Advisory Council + 할루 어드바이저 연동 완료
 */

import { checkHallucination } from "./hallucination";

export function createRiskBudgetManager(
  dailyBudget: number = DEFAULT_DAILY_RISK_BUDGET
): RiskBudgetManager {
  let consumed = 0;
  let resetAt = getNextMidnight();

  function getNextMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }

  function checkReset(): void {
    if (Date.now() >= resetAt) {
      consumed = 0;
      resetAt = getNextMidnight();
    }
  }

  return {
    check(riskCost: number): AvailabilityResult {
      checkReset();
      const remaining = dailyBudget - consumed;
      const allowed = riskCost <= remaining;

      return {
        allowed,
        budgetRemaining: Math.max(0, remaining),
        hallucinationFlag: false,
        action: allowed ? "proceed" : "burn",
      };
    },

    /**
     * v401 Advisory Council 통합 검사:
     * 할루시네이션 감지 + 리스크 예산을 합산하여 단일 AvailabilityResult 반환.
     */
    advisoryCheck(
      riskCost: number,
      promptLength: number,
      responseLength: number,
      responseText?: string
    ): AvailabilityResult {
      checkReset();
      const remaining = dailyBudget - consumed;
      const budgetAllowed = riskCost <= remaining;

      // Advisory Council: 할루시네이션 어드바이저
      const halluCheck = checkHallucination(promptLength, responseLength, responseText);

      // 예산 부족 → burn, 할루 의심 → neutralize, 둘 다 정상 → proceed
      let action: AvailabilityResult["action"] = "proceed";
      if (!budgetAllowed) {
        action = "burn";
      } else if (halluCheck.suspicious) {
        action = "neutralize";
      }

      return {
        allowed: budgetAllowed && !halluCheck.suspicious,
        budgetRemaining: Math.max(0, remaining),
        hallucinationFlag: halluCheck.suspicious,
        action,
      };
    },

    /** Apply burn-rate sanitization to a response based on availability. */
    sanitize(text: string, path: Parameters<typeof sanitizeResponse>[1]): string {
      return sanitizeResponse(text, path);
    },

    /** Strip dangerous patterns from text via burn rules. */
    burn(text: string): string {
      return burnPatterns(text);
    },

    consume(cost: number): void {
      checkReset();
      consumed = Math.min(dailyBudget, consumed + cost);
    },

    reset(): void {
      consumed = 0;
      resetAt = getNextMidnight();
    },

    getState(): RiskBudgetState {
      checkReset();
      return {
        dailyBudget,
        consumed,
        remaining: Math.max(0, dailyBudget - consumed),
        resetAt,
      };
    },
  };
}
