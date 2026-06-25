// ============================================================
// WorldFact 결정론 검증 (지침 _VALIDATION_RULES.md 룰1·2·4·5 의 결정론 부분)
// LLM 판정(추상단언 의미·Collision 의미·axis 모순)은 제외 — grep-able 결정론만.
// ============================================================

import type { WorldFactEntry } from './types';

/** 룰1 — 핵심 필수 필드 (statement·출처 = ★★★ high, 나머지 = warn). */
export const WORLDFACT_CORE_FIELDS = ['id', 'workId', 'fact', 'category'] as const;
export const WORLDFACT_RECOMMENDED_FIELDS = [
  'arcsStatus',
  'confidence',
  'sourceSentenceIds',
  'conflictsWith',
  'createdAt',
  'updatedAt',
] as const;

export interface WorldFactViolation {
  ruleId: string;
  severity: 'block' | 'high' | 'warn';
  field?: string;
  message: string;
}

export interface WorldFactValidation {
  ok: boolean; // block/high 위반 없으면 true
  violations: WorldFactViolation[];
  /** confidence 게이트: PASS(≥0.7) / HOLD(0.5-0.7) / DISCARD(<0.5) / UNKNOWN(미기재) */
  confidenceGate: 'PASS' | 'HOLD' | 'DISCARD' | 'UNKNOWN';
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

export function validateWorldFact(entry: WorldFactEntry): WorldFactValidation {
  const fm = entry.frontMatter;
  const violations: WorldFactViolation[] = [];

  // 룰1 — 핵심 필드 (fact = ★★★)
  for (const f of WORLDFACT_CORE_FIELDS) {
    if (isEmpty(fm[f])) {
      violations.push({
        ruleId: 'R1-core',
        severity: f === 'fact' ? 'high' : 'warn',
        field: f,
        message: `핵심 필드 누락: ${f}`,
      });
    }
  }

  // 룰1 — 권장 필드 (sourceSentenceIds = ★★★ 출처 추적)
  for (const f of WORLDFACT_RECOMMENDED_FIELDS) {
    const v = fm[f];
    const missing = f === 'sourceSentenceIds' ? (v === undefined || (Array.isArray(v) && v.length === 0)) : v === undefined;
    if (missing) {
      violations.push({
        ruleId: 'R1-recommended',
        severity: f === 'sourceSentenceIds' ? 'high' : 'warn',
        field: f,
        message: `권장 필드 누락: ${f}`,
      });
    }
  }

  // 룰2 — statement 단언 (결정론: 다문장 분리 경고)
  if (typeof fm.fact === 'string' && fm.fact.trim()) {
    const sentences = fm.fact.trim().split(/(?<=[.!?。])\s+/).filter(Boolean);
    if (sentences.length > 1) {
      violations.push({ ruleId: 'R2-statement', severity: 'warn', field: 'fact', message: 'statement 2문장+ 분리 (1문장 단언 권장)' });
    }
  }

  // 룰4 — confidence 임계
  let confidenceGate: WorldFactValidation['confidenceGate'] = 'UNKNOWN';
  if (typeof fm.confidence === 'number') {
    if (fm.confidence >= 0.7) confidenceGate = 'PASS';
    else if (fm.confidence >= 0.5) confidenceGate = 'HOLD';
    else {
      confidenceGate = 'DISCARD';
      violations.push({ ruleId: 'R4-confidence', severity: 'high', field: 'confidence', message: `confidence ${fm.confidence} < 0.5 (폐기 영역)` });
    }
  }

  const ok = violations.every((v) => v.severity === 'warn');
  return { ok, violations, confidenceGate };
}
