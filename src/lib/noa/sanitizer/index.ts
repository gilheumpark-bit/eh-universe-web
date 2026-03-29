// ============================================================
// NOA Sanitizer — Entry Point
// Source: NOA v31~v33 (ZWSP + Jamo + OMNI + NFKC)
// ============================================================

import type { SanitizeResult, SanitizeChange } from "../types";
import { purgeZeroWidth } from "./zero-width";
import { reassembleJamo } from "./jamo-map";
import { detectOmniBypass } from "./omni-regex";

const OMNI_WATCH_KEYWORDS = [
  "해킹", "원금보장", "확정수익", "부작용없음", "도박",
  "살상", "테러", "마약", "폭탄", "자살",
] as const;

/**
 * 입력 텍스트를 4단계로 정규화한다:
 * 1. Zero-Width 문자 제거
 * 2. 한국어 자모 재조립 (ㅎ+ㅐ+킹 → 해킹)
 * 3. NFKC 정규화 (전각→반각, 호환 분해)
 * 4. OMNI 우회 탐지 (원_금_보_장 → 원금보장)
 */
export function sanitizeInput(text: string): SanitizeResult {
  const changes: SanitizeChange[] = [];

  // Step 1: Zero-Width Purge
  const { cleaned: step1, removed } = purgeZeroWidth(text);
  if (removed > 0) {
    changes.push({ type: "zero-width", position: 0, original: `(${removed} chars)`, replacement: "" });
  }

  // Step 2: Jamo Reassembly + NFC
  const step2 = reassembleJamo(step1);
  if (step2 !== step1) {
    changes.push({ type: "jamo", position: 0, original: step1.slice(0, 30), replacement: step2.slice(0, 30) });
  }

  // Step 3: NFKC Normalization
  const step3 = step2.normalize("NFKC");
  if (step3 !== step2) {
    changes.push({ type: "nfkc", position: 0, original: "(normalized)", replacement: "(NFKC)" });
  }

  // Step 4: OMNI Bypass Detection
  const omniHits = detectOmniBypass(step3, OMNI_WATCH_KEYWORDS);
  for (const hit of omniHits) {
    changes.push({ type: "omni", position: 0, original: hit, replacement: `[OMNI:${hit}]` });
  }

  return {
    original: text,
    sanitized: step3,
    changes,
    nfkcApplied: step3 !== step1,
  };
}
