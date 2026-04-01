// ============================================================
// NOA Trinity — Shield Ego (Safety)
// Source: NOA v42.6 Final (Shield: 안전 관점 평가)
// Weight: 0.5 (가장 높은 영향력)
// ============================================================

import type { EgoResult, TrinityVote } from "../types";

interface KeywordRule {
  readonly pattern: RegExp;
  readonly weight: number;
  readonly cap: number;
  readonly label: string;
}

const SHIELD_RULES: readonly KeywordRule[] = [
  // P0: Code/System Injection
  { pattern: /<script.*?>.*?<\/script>/gi, weight: 0.8, cap: 1, label: "XSS_INJECTION" },
  { pattern: /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, weight: 0.9, label: "SQL_INJECTION", cap: 1 },
  { pattern: /(eval|system|exec|spawn)\s*\(.*?\)/gi, weight: 0.7, label: "RCE_PATTERN", cap: 1 },
  { pattern: /javascript:/gi, weight: 0.5, label: "JS_PROTOCOL", cap: 2 },
  
  // P1: Direct Attack Keywords
  { pattern: /해킹|침투|탈취|공격|무기/g, weight: 0.25, cap: 2, label: "ATTACK_KW" },
  { pattern: /exploit|injection|bypass|root|admin/gi, weight: 0.25, cap: 2, label: "EXPL_KW" },
  
  // P2: Data Leak Patterns
  { pattern: /\d{3}-\d{3,4}-\d{4}/g, weight: 0.6, label: "PII_PHONE", cap: 1 },
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, weight: 0.5, label: "PII_EMAIL", cap: 1 }
] as const;

const TH_VETO = 0.85;
const TH_HOLD = 0.40;

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
 * Shield: 안전 관점에서 텍스트를 평가한다.
 * 공격/해킹/패턴 인젝션 및 개인정보 유출 시도를 정밀 탐지한다.
 */
export function evaluateShield(text: string): EgoResult {
  const { score, reasons } = evaluatePatterns(text, SHIELD_RULES);

  let vote: TrinityVote = "PASS";
  if (score >= TH_VETO) vote = "VETO";
  else if (score >= TH_HOLD) vote = "HOLD";

  return { name: "shield", vote, score, reasons };
}
