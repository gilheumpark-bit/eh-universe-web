// ============================================================
// NOA Trinity — Sword Ego (Logic/Assertion)
// Source: NOA v42.6 (Sword: 논리/과신 관점 평가)
// Weight: 0.2
// ============================================================

import type { EgoResult, TrinityVote } from "../types";

interface KeywordRule {
  readonly keyword: string;
  readonly weight: number;
  readonly cap: number;
}

const SWORD_RULES: readonly KeywordRule[] = [
  { keyword: "무조건", weight: 0.22, cap: 2 },
  { keyword: "반드시", weight: 0.18, cap: 2 },
  { keyword: "절대", weight: 0.18, cap: 2 },
  { keyword: "즉시", weight: 0.18, cap: 2 },
  { keyword: "확실", weight: 0.15, cap: 2 },
  { keyword: "100%", weight: 0.20, cap: 2 },
  { keyword: "guaranteed", weight: 0.20, cap: 2 },
  { keyword: "always", weight: 0.12, cap: 2 },
  { keyword: "never fails", weight: 0.20, cap: 1 },
] as const;

const TH_VETO = 0.80;
const TH_HOLD = 0.35;

function kwScore(text: string, rules: readonly KeywordRule[]): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const lower = text.toLowerCase();

  for (const { keyword, weight, cap } of rules) {
    let count = 0;
    let idx = 0;
    while ((idx = lower.indexOf(keyword, idx)) !== -1) {
      count++;
      idx += keyword.length;
    }
    if (count > 0) {
      const effective = Math.min(count, cap);
      score += weight * effective;
      reasons.push(`${keyword}(×${effective})`);
    }
  }

  return { score: Math.min(score, 1.0), reasons };
}

/**
 * Sword: 논리적 과신/폭주를 평가한다.
 * 과신 표현 + 과도한 길이 + 느낌표 남발 감지.
 */
export function evaluateSword(text: string): EgoResult {
  const { score: baseScore, reasons } = kwScore(text, SWORD_RULES);
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
