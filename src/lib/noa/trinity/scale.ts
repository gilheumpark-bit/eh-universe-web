// ============================================================
// NOA Trinity — Scale Ego (Stealth/Bypass)
// Source: NOA v42.6 (Scale: 은밀/우회 관점 평가)
// Weight: 0.3
// ============================================================

import type { EgoResult, TrinityVote } from "../types";

interface KeywordRule {
  readonly keyword: string;
  readonly weight: number;
  readonly cap: number;
}

const SCALE_RULES: readonly KeywordRule[] = [
  { keyword: "몰래", weight: 0.25, cap: 2 },
  { keyword: "비밀", weight: 0.20, cap: 2 },
  { keyword: "우회", weight: 0.25, cap: 2 },
  { keyword: "익명", weight: 0.15, cap: 2 },
  { keyword: "백도어", weight: 0.25, cap: 1 },
  { keyword: "뒷문", weight: 0.20, cap: 1 },
  { keyword: "ignore", weight: 0.20, cap: 2 },
  { keyword: "override", weight: 0.20, cap: 2 },
  { keyword: "jailbreak", weight: 0.30, cap: 1 },
  { keyword: "bypass", weight: 0.25, cap: 2 },
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
 * Scale: 은밀한 우회 시도를 평가한다.
 * 몰래/비밀/우회/백도어 + 영어 bypass/jailbreak 키워드 감지.
 */
export function evaluateScale(text: string): EgoResult {
  const { score, reasons } = kwScore(text, SCALE_RULES);

  let vote: TrinityVote = "PASS";
  if (score >= TH_VETO) vote = "VETO";
  else if (score >= TH_HOLD) vote = "HOLD";

  return { name: "scale", vote, score, reasons };
}
