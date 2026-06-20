// ============================================================
// NOA Tactical — Token Budget Manager
// Source: NOA v50 (경로별 토큰 예산 제어)
// ============================================================

import type { TacticalPath } from "../types";
import { TACTICAL_PATHS } from "./paths";

/**
 * 전술 경로에 따른 토큰 예산을 반환한다.
 *
 * @param path - 선택된 전술 경로
 * @returns 최대 토큰 수
 */
export function getTokenBudget(path: TacticalPath): number {
  return TACTICAL_PATHS[path].tokenBudget;
}

/**
 * 응답에 토큰 예산을 적용한다.
 * 예산 초과 시 응답을 자르고 경고를 추가.
 *
 * @param response - AI 응답 텍스트
 * @param budget - 토큰 예산
 * @returns 예산 내 응답
 *
 * Phase 2: 정밀 토큰 카운팅 적용 완료 (whitespace + punctuation 분할)
 */

/**
 * 텍스트의 토큰 수를 근사 계산한다.
 * BPE 토크나이저를 흉내내어 공백/구두점으로 분할하고,
 * 한국어 글자는 개당 약 1.5 토큰으로 계산한다.
 *
 * @param text - 토큰 수를 계산할 텍스트
 * @returns 근사 토큰 수
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  let tokens = 0;

  // Split by whitespace first
  const words = text.split(/\s+/).filter(Boolean);

  for (const word of words) {
    // Split word further by punctuation boundaries
    const subTokens = word.split(/([.,!?;:'"()\[\]{}<>\/\\@#$%^&*+=~`|—–\-])/).filter(Boolean);

    for (const sub of subTokens) {
      if (!sub) continue;

      // Count Korean characters (each ~1.5 tokens in typical BPE)
      const koreanChars = (sub.match(/[\uAC00-\uD7AF\u3131-\u3163\u1100-\u11FF]/g) || []).length;
      const nonKoreanChars = sub.length - koreanChars;

      // Korean: ~1.5 tokens per character
      // English/Latin: ~0.25 tokens per character (4 chars ≈ 1 token)
      // Punctuation already split out: counts as 1 token each
      if (koreanChars > 0) {
        tokens += koreanChars * 1.5;
      }
      if (nonKoreanChars > 0) {
        // Pure punctuation token
        if (/^[^\w\s]$/.test(sub)) {
          tokens += 1;
        } else {
          tokens += Math.max(1, Math.ceil(nonKoreanChars / 4));
        }
      }
    }
  }

  return Math.ceil(tokens);
}

export function applyTokenBudget(response: string, budget: number): string {
  if (budget <= 0) return "";

  const totalTokens = estimateTokenCount(response);
  if (totalTokens <= budget) return response;

  // Binary search for the cut point that fits within budget
  let lo = 0;
  let hi = response.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (estimateTokenCount(response.slice(0, mid)) <= budget) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  // Cut at last whitespace boundary to avoid splitting words
  const cutPoint = response.lastIndexOf(" ", lo);
  const safeCut = cutPoint > 0 ? cutPoint : lo;

  return response.slice(0, safeCut) + "\n\n[NOA: 토큰 예산 초과로 응답이 잘렸습니다]";
}
