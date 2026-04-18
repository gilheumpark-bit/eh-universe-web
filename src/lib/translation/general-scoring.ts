// ============================================================
// General Translation — Scoring Schema (Sandboxed)
// ============================================================
// 소설 특화 6축(immersion, emotionResonance...) 대신
// 일반 번역에 맞는 평가 축 사용. 도메인별 추가 축 지원.

import { type GeneralDomain, GENERAL_DOMAIN_PRESETS } from './general-domains';
import { logger } from '@/lib/logger';

// ── Base Scoring Axes (모든 도메인 공통) ──

export interface GeneralScoreAxes {
  /** 원문 의미 정확도 (0-100) */
  accuracy: number;
  /** 자연스러움 — 번역투 없이 타겟 언어답게 (0-100) */
  naturalness: number;
  /** 완결성 — 누락 없이 전부 번역했는지 (0-100) */
  completeness: number;
  /** 형식 보존 — 구조, 번호, 인용 등 (0-100) */
  formatFidelity: number;
  /** 도메인별 추가 축 (동적) */
  [key: string]: number;
}

export interface GeneralScoreResult {
  score: number;
  axes: GeneralScoreAxes;
  passed: boolean;
  domain: GeneralDomain;
}

// ── Scoring Prompt Builder ──

export function buildGeneralScoringPrompt(
  sourceText: string,
  translatedText: string,
  domain: GeneralDomain,
): string {
  const preset = GENERAL_DOMAIN_PRESETS[domain];
  const allAxes = ['accuracy', 'naturalness', 'completeness', 'formatFidelity', ...preset.extraAxes];
  const uniqueAxes = [...new Set(allAxes)];

  return `You are a translation quality evaluator. Score the following translation on each axis (0-100).

Domain: ${preset.label}

<source_text>
${sourceText}
</source_text>

<translated_text>
${translatedText}
</translated_text>

Respond with ONLY a JSON object. Keys: ${uniqueAxes.map(a => `"${a}"`).join(', ')}.
Each value is an integer 0-100. No commentary.`;
}

export function getGeneralScoreSchema(domain: GeneralDomain) {
  const preset = GENERAL_DOMAIN_PRESETS[domain];
  const allAxes = ['accuracy', 'naturalness', 'completeness', 'formatFidelity', ...preset.extraAxes];
  const uniqueAxes = [...new Set(allAxes)];

  const properties: Record<string, { type: 'number' }> = {};
  for (const axis of uniqueAxes) {
    properties[axis] = { type: 'number' as const };
  }

  return {
    type: 'object' as const,
    properties,
    required: uniqueAxes,
  };
}

export function parseGeneralScore(
  raw: string,
  domain: GeneralDomain,
  threshold: number = 70,
): GeneralScoreResult {
  try {
    // JSON 블록 추출
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);

    const axes: GeneralScoreAxes = {
      accuracy: Number(parsed.accuracy) || 0,
      naturalness: Number(parsed.naturalness) || 0,
      completeness: Number(parsed.completeness) || 0,
      formatFidelity: Number(parsed.formatFidelity) || Number(parsed.format_fidelity) || 0,
    };

    // 도메인별 추가 축
    const preset = GENERAL_DOMAIN_PRESETS[domain];
    for (const extra of preset.extraAxes) {
      if (parsed[extra] !== undefined) {
        axes[extra] = Number(parsed[extra]) || 0;
      }
    }

    const values = Object.values(axes).filter((v): v is number => typeof v === 'number' && v > 0);
    const score = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

    return { score, axes, passed: score >= threshold, domain };
  } catch (err) {
    logger.warn('GeneralScoring', 'parseGeneralScore JSON parse failed', err);
    return {
      score: 0,
      axes: { accuracy: 0, naturalness: 0, completeness: 0, formatFidelity: 0 },
      passed: false,
      domain,
    };
  }
}
