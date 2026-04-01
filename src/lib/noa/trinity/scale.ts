// ============================================================
// NOA Trinity — Scale Ego (Stealth/Bypass)
// Source: NOA v42.6 (Scale: 은밀/우회 관점 평가)
// Weight: 0.3
// ============================================================

import type { EgoResult, TrinityVote } from "../types";

interface KeywordRule {
  readonly pattern: RegExp;
  readonly weight: number;
  readonly cap: number;
  readonly label: string;
}

const SCALE_RULES: readonly KeywordRule[] = [
  // 은밀/우회
  { pattern: /몰래|비밀|우회|백도어|뒷문/g, weight: 0.25, cap: 2, label: "STEALTH_KW" },
  { pattern: /ignore\s*(all\s*)?rules/gi, weight: 0.9, cap: 1, label: "RULE_IGNORE" },
  { pattern: /override\s*safety/gi, weight: 0.8, cap: 1, label: "SAFETY_OVERRIDE" },
  { pattern: /jailbreak|bypass|escaped/gi, weight: 0.7, cap: 2, label: "BYPASS_EN" },
  
  // 특수 기호 활용 우회 (예: ⓐⓓⓜⓘⓝ)
  { pattern: /[ⓐ-ⓩⓀ-Ⓩ]/g, weight: 0.5, cap: 1, label: "DECO_OBFUSCATION" },
  { pattern: /([a-zA-Z\s])\1{3,}/g, weight: 0.3, cap: 1, label: "REPETITION_OBFUSCATION" }
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
 * Scale: 은밀한 우회 시도를 평가한다.
 * 몰래/비밀/우회/백도어 + 영어 bypass/jailbreak 키워드 감지.
 */
export function evaluateScale(text: string): EgoResult {
  const { score, reasons } = evaluatePatterns(text, SCALE_RULES);

  let vote: TrinityVote = "PASS";
  if (score >= TH_VETO) vote = "VETO";
  else if (score >= TH_HOLD) vote = "HOLD";

  return { name: "scale", vote, score, reasons };
}
