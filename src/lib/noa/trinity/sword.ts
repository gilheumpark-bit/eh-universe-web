// ============================================================
// NOA Trinity — Sword Ego (Logic/Assertion)
// Source: NOA v42.6 (Sword: 논리/과신 관점 평가)
// Weight: 0.2
// ============================================================

import type { EgoResult, TrinityVote } from "../types";

interface KeywordRule {
  readonly pattern: RegExp;
  readonly weight: number;
  readonly cap: number;
  readonly label: string;
}

const SWORD_RULES: readonly KeywordRule[] = [
  // 논리적 과신
  { pattern: /무조건|반드시|절대|즉시|확실|100%/g, weight: 0.15, cap: 3, label: "OVER_CONFIDENCE" },
  { pattern: /guaranteed|always|never\s*fails/gi, weight: 0.20, cap: 2, label: "EN_ASSERTION" },
  
  // 권한 사칭/탈취 시도
  { pattern: /유지[관리]?\s*모드|관리자\s*권한|시스템\s*재부팅/g, weight: 0.6, cap: 1, label: "SYS_IMPERSONATION" },
  { pattern: /ignore\s*(all\s*)?previous\s*(instructions|directions)/gi, weight: 0.9, cap: 1, label: "PROMPT_INJECTION" },
  { pattern: /you\s*are\s*now\s*a\s*unfiltered/gi, weight: 0.8, cap: 1, label: "ROLE_UNFILTERED" }
] as const;

const TH_VETO = 0.80;
const TH_HOLD = 0.35;

function evaluatePatterns(text: string, rules: readonly KeywordRule[]): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of rules) {
    const matches = text.match(rule.pattern);
    if (matches && matches.length > 0) {
      const effective = Math.min(matches.length, rule.cap);
      score += rule.weight * effective;
      reasons.push(`${rule.label}(×${effective})`);
    }
  }

  return { score: Math.min(score, 1.0), reasons };
}

/**
 * Sword: 논리적 과신/폭주를 평가한다.
 * 과신 표현 + 과도한 길이 + 느낌표 남발 감지.
 */
export function evaluateSword(text: string): EgoResult {
  const { score: baseScore, reasons } = evaluatePatterns(text, SWORD_RULES);
  let score = baseScore;

  // 과도한 길이 패널티 (2000자 이상)
  if (text.length > 2000) {
    score = Math.min(1.0, score + 0.35);
    reasons.push(`과잉길이(${text.length}자)`);
  }

  // 느낌표 남발 패널티 (3개 이상)
  const exclamCount = (text.match(/!/g) || []).length;
  if (exclamCount >= 3) {
    score = Math.min(1.0, score + 0.10);
    reasons.push(`느낌표(×${exclamCount})`);
  }

  // 명령형 어미 패널티
  const trimmed = text.trim();
  if (trimmed.endsWith("해줘") || trimmed.endsWith("해라") || trimmed.endsWith("하세요") || trimmed.endsWith("실행해")) {
    score = Math.min(1.0, score + 0.10);
    reasons.push("명령형어미");
  }

  let vote: TrinityVote = "PASS";
  if (score >= TH_VETO) vote = "VETO";
  else if (score >= TH_HOLD) vote = "HOLD";

  return { name: "sword", vote, score, reasons };
}
