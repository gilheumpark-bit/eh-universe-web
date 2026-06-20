// ============================================================
// NOA Availability — Pattern Burn/Sanitize
// Source: NOA v33 Sharp-Eye (도메인별 소각 시스템)
// ============================================================

import type { TacticalPath } from "../types";

interface BurnRule {
  readonly pattern: RegExp;
  readonly reason: string;
}

const BURN_RULES: readonly BurnRule[] = [
  { pattern: /원금\s*보장/gi, reason: "불법 수익 보장" },
  { pattern: /확정\s*수익/gi, reason: "사기 징후" },
  { pattern: /부작용\s*(이\s*)?없/gi, reason: "임상 왜곡" },
  { pattern: /100%\s*완치/gi, reason: "비과학적 서술" },
  { pattern: /무조건\s*성공/gi, reason: "허위 광고" },
  { pattern: /리스크\s*(가\s*)?없/gi, reason: "위험 은폐" },
] as const;

/**
 * 위험 표현을 삭제 대신 [소각: 사유]로 대체한다.
 * 차단 대신 '중화'하여 가용성을 유지하는 NOA 고유 전략.
 */
export function burnPatterns(text: string): string {
  let result = text;
  for (const { pattern, reason } of BURN_RULES) {
    result = result.replace(pattern, `[소각: ${reason}]`);
  }
  return result;
}

/**
 * 전술 경로에 따라 응답을 정제한다.
 */
export function sanitizeResponse(text: string, path: TacticalPath): string {
  switch (path) {
    case "BLOCK":
      return "";
    case "HONEYPOT":
      return "[NOA] 보안 확인을 위해 추가 인증이 필요합니다.";
    case "LIMITED":
      return burnPatterns(text);
    case "DELAY":
      return burnPatterns(text);
    case "ALLOW":
    default:
      return text;
  }
}
