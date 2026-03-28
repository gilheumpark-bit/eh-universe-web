// ============================================================
// NOA Trinity — Shield Ego (Safety)
// Source: NOA v42.6 Final (Shield: 안전 관점 평가)
// Weight: 0.5 (가장 높은 영향력)
// ============================================================

import type { EgoResult, TrinityVote } from "../types";

interface KeywordRule {
  readonly keyword: string;
  readonly weight: number;
  readonly cap: number;
}

const SHIELD_RULES: readonly KeywordRule[] = [
  { keyword: "공격", weight: 0.25, cap: 2 },
  { keyword: "해킹", weight: 0.25, cap: 2 },
  { keyword: "침투", weight: 0.20, cap: 2 },
  { keyword: "조작", weight: 0.18, cap: 2 },
  { keyword: "무기", weight: 0.15, cap: 1 },
  { keyword: "exploit", weight: 0.25, cap: 2 },
  { keyword: "injection", weight: 0.20, cap: 2 },
  { keyword: "bypass", weight: 0.20, cap: 2 },
  { keyword: "root", weight: 0.15, cap: 1 },
  { keyword: "admin", weight: 0.15, cap: 1 },
] as const;

const TH_VETO = 0.85;
const TH_HOLD = 0.40;

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
 * Shield: 안전 관점에서 텍스트를 평가한다.
 * 공격/해킹/침투/조작/무기 + 영어 공격 키워드의 빈도를 누적 점수화.
 */
export function evaluateShield(text: string): EgoResult {
  const { score, reasons } = kwScore(text, SHIELD_RULES);

  let vote: TrinityVote = "PASS";
  if (score >= TH_VETO) vote = "VETO";
  else if (score >= TH_HOLD) vote = "HOLD";

  return { name: "shield", vote, score, reasons };
}
