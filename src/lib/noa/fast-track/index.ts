// ============================================================
// NOA Fast Track — Aux Scout + Guard
// Source: NOA v42.6 Final (2-Level Fast Classification)
// ============================================================

import type { FastTrackResult } from "../types";
import {
  SAFE_GREETINGS,
  HARD_BLOCK_KEYWORDS,
  SOFT_WATCH_KEYWORDS,
} from "./keywords";

/**
 * 입력을 0ms 내에 3가지로 분류한다:
 * - PASS: 안전한 인사말 → 파이프라인 건너뜀
 * - BLOCK: 즉시 차단 키워드 → 거부
 * - ESCALATE: 애매함 → Trinity 검사로 승격
 *
 * @param sanitizedText - 정규화된 입력 텍스트
 * @returns Fast Track 판정 결과
 *
 * Phase 2: v42.6 전체 로직 포팅 (키워드 빈도 분석, 문맥 검사) 완료
 */
export function runFastTrack(sanitizedText: string): FastTrackResult {
  const start = performance.now();
  const text = sanitizedText.toLowerCase();

  // Aux Guard: 즉시 차단 키워드
  for (const kw of HARD_BLOCK_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        verdict: "BLOCK",
        reason: "AUX_GUARD_HARD_BLOCK",
        matchedKeyword: kw,
        durationMs: Math.round(performance.now() - start),
      };
    }
  }

  // Aux Scout: 안전 인사말 (정확히 일치, 40자 이하)
  const trimmed = sanitizedText.trim();
  if (trimmed.length <= 40 && SAFE_GREETINGS.includes(trimmed)) {
    return {
      verdict: "PASS",
      reason: "AUX_SCOUT_SAFE_GREETING",
      durationMs: Math.round(performance.now() - start),
    };
  }

  // ── Phase 2: 키워드 빈도 분석 (v42.6) ──
  // 단일 키워드 존재가 아닌 빈도 누적으로 위험도 측정
  // [K] hardFreq / topHardKw 는 현재 분기에서 미사용 — 첫 번째 loop의 BLOCK이
  // 이미 처리하므로, soft 집계만 필요.
  let softFreq = 0;
  let topSoftKw: string | undefined;

  for (const kw of SOFT_WATCH_KEYWORDS) {
    const count = countOccurrences(text, kw);
    if (count > 0 && !topSoftKw) topSoftKw = kw;
    softFreq += count;
  }

  // 고빈도 감시 키워드 (3+개 서로 다른 soft keywords) → 즉시 BLOCK
  if (softFreq >= 3 && countDistinctMatches(text, SOFT_WATCH_KEYWORDS) >= 3) {
    return {
      verdict: "BLOCK",
      reason: "AUX_GUARD_MULTI_KEYWORD_CLUSTER",
      matchedKeyword: topSoftKw,
      durationMs: Math.round(performance.now() - start),
    };
  }

  // ── Phase 2: 문맥 기반 검사 (v42.6) ──
  // 질문 문맥 ("~하는 방법", "어떻게 ~") + 위험 키워드 조합 감지
  const contextPatterns: readonly RegExp[] = [
    /(?:방법|하는\s*법|어떻게|how\s+to)\s*.{0,20}/i,
    /(?:알려|가르쳐|설명|teach|explain|tell)\s*.{0,20}/i,
  ];

  if (softFreq > 0) {
    for (const ctxPat of contextPatterns) {
      const ctxMatch = text.match(ctxPat);
      if (ctxMatch) {
        // 문맥 내에 위험 키워드가 있으면 ESCALATE with higher priority
        const ctxText = ctxMatch[0];
        for (const kw of SOFT_WATCH_KEYWORDS) {
          if (ctxText.includes(kw)) {
            return {
              verdict: "ESCALATE",
              reason: "AUX_SCOUT_CONTEXT_RISK",
              matchedKeyword: kw,
              durationMs: Math.round(performance.now() - start),
            };
          }
        }
      }
    }
  }

  // Aux Scout: 감시 키워드 → ESCALATE
  if (topSoftKw) {
    return {
      verdict: "ESCALATE",
      reason: "AUX_SCOUT_SOFT_WATCH",
      matchedKeyword: topSoftKw,
      durationMs: Math.round(performance.now() - start),
    };
  }

  // 기본: ESCALATE (Trinity가 판단)
  return {
    verdict: "ESCALATE",
    reason: "AUX_SCOUT_DEFAULT_ESCALATE",
    durationMs: Math.round(performance.now() - start),
  };
}

// ── Phase 2 helpers ──

function countOccurrences(text: string, keyword: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(keyword, idx)) !== -1) {
    count++;
    idx += keyword.length;
  }
  return count;
}

function countDistinctMatches(text: string, keywords: readonly string[]): number {
  let distinct = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) distinct++;
  }
  return distinct;
}
