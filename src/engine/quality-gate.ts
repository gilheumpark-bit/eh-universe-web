// ============================================================
// PART 1 — Quality Gate Loop Engine
// ============================================================
// 생성 → 평가 → 기준 미달 시 자동 재생성 (최대 N회)
// Triple Logic Core 원칙: Hard(차단) → Soft(조언) → Meta(누적)

import { generateEngineReport, calculateGrade } from './scoring';
import { analyzeManuscript, calculateQualityTag } from './director';
import { tensionCurve } from './models';
import type { StoryConfig, QualityThresholds, QualityGateConfig, QualityGateResult, SkillLevel, AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 2 — Default Thresholds by Skill Level
// ============================================================

const LEVEL_THRESHOLDS: Record<SkillLevel, QualityThresholds> = {
  beginner: {
    minGrade: 'C+',
    minDirectorScore: 40,
    minEOS: 20,
    minTensionAlignment: 40,
    maxAITonePercent: 25,
    blockOnRedTag: true,
  },
  intermediate: {
    minGrade: 'B',
    minDirectorScore: 60,
    minEOS: 40,
    minTensionAlignment: 30,
    maxAITonePercent: 15,
    blockOnRedTag: true,
  },
  advanced: {
    minGrade: 'B+',
    minDirectorScore: 70,
    minEOS: 50,
    minTensionAlignment: 25,
    maxAITonePercent: 10,
    blockOnRedTag: false,
  },
};

const STORAGE_KEY = 'eh-quality-gate-overrides';

/** Load user overrides from localStorage. Returns null if none or SSR. */
export function loadQualityGateOverrides(): Partial<QualityThresholds> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Partial<QualityThresholds>;
  } catch {
    return null;
  }
}

/** Persist user overrides to localStorage. Pass empty object to clear overrides. */
export function saveQualityGateOverrides(overrides: Partial<QualityThresholds>): void {
  if (typeof window === 'undefined') return;
  try {
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch {
    // Storage full or blocked — silently ignore
  }
}

export function getDefaultThresholds(level: SkillLevel): QualityThresholds {
  const base = { ...LEVEL_THRESHOLDS[level] };
  const overrides = loadQualityGateOverrides();
  if (!overrides) return base;
  return { ...base, ...overrides };
}

export function getDefaultGateConfig(level: SkillLevel, tierMaxRetries?: number): QualityGateConfig {
  const baseRetries = level === 'advanced' ? 5 : 3;
  return {
    enabled: true,
    maxRetries: tierMaxRetries !== undefined ? Math.min(baseRetries, tierMaxRetries) : baseRetries,
    thresholds: getDefaultThresholds(level),
    autoMode: level === 'beginner' ? 'full_auto' : level === 'intermediate' ? 'confirm' : 'off',
  };
}

// IDENTITY_SEAL: PART-2 | role=default thresholds | inputs=SkillLevel | outputs=QualityGateConfig

// ============================================================
// PART 3 — Grade Numeric Conversion
// ============================================================

const GRADE_NUMERIC: Record<string, number> = {
  'S++': 100, 'S+': 95, 'S': 90, 'A+': 85, 'A': 80,
  'B+': 75, 'B': 70, 'C+': 65, 'C': 60, 'D': 50, 'F': 30,
};

function gradeToNumeric(grade: string): number {
  return GRADE_NUMERIC[grade] ?? 50;
}

// IDENTITY_SEAL: PART-3 | role=grade conversion | inputs=grade string | outputs=number

// ============================================================
// PART 4 — Core Evaluation
// ============================================================

export function evaluateQuality(
  text: string,
  config: StoryConfig,
  thresholds: QualityThresholds,
  language: AppLanguage = 'KO',
  attempt: number = 1,
): QualityGateResult {
  const failReasons: string[] = [];

  // 1. Engine Report — tension/pacing/immersion/EOS
  const report = generateEngineReport(text, config, language);
  const episode = config.episode ?? 1;
  const total = config.totalEpisodes ?? 25;
  const targetTension = tensionCurve(episode, total, config.genre) * 100;
  const avgScore = (report.metrics.tension + report.metrics.pacing + report.metrics.immersion) / 3;
  const grade = calculateGrade(avgScore, targetTension, report.metrics.tension);
  const gradeNum = gradeToNumeric(grade);
  const thresholdNum = gradeToNumeric(thresholds.minGrade);

  // 2. NOD Director — 품질 감시
  const director = analyzeManuscript(text, config.publishPlatform);
  const tag = calculateQualityTag(director, config.narrativeIntensity ?? 'standard');

  // 3. Hard Logic — 차단 판정
  if (gradeNum < thresholdNum) {
    failReasons.push(`grade_below: ${grade} < ${thresholds.minGrade}`);
  }
  if (director.score < thresholds.minDirectorScore) {
    failReasons.push(`director_below: ${director.score} < ${thresholds.minDirectorScore}`);
  }
  if (report.eosScore < thresholds.minEOS) {
    failReasons.push(`eos_below: ${report.eosScore} < ${thresholds.minEOS}`);
  }

  // 4. Tension alignment — 목표 대비 편차
  const tensionDelta = Math.abs(targetTension - report.metrics.tension);
  if (tensionDelta > thresholds.minTensionAlignment) {
    failReasons.push(`tension_misaligned: delta=${Math.round(tensionDelta)} > ${thresholds.minTensionAlignment}`);
  }

  // 5. AI tone check
  const aiToneFindings = director.findings.filter(f => f.kind === 'AI_TONE' || f.kind === 'ESCAPE');
  const aiTonePercent = text.length > 0 ? (aiToneFindings.length / (text.length / 1000)) * 100 : 0;
  if (aiTonePercent > thresholds.maxAITonePercent) {
    failReasons.push(`ai_tone_high: ${Math.round(aiTonePercent)}% > ${thresholds.maxAITonePercent}%`);
  }

  // 6. Red tag block
  if (thresholds.blockOnRedTag && tag.tag === '🔴') {
    failReasons.push('red_tag_blocked');
  }

  return {
    passed: failReasons.length === 0,
    attempt,
    failReasons,
    grade,
    directorScore: director.score,
    eosScore: report.eosScore,
    qualityTag: tag.tag,
  };
}

// IDENTITY_SEAL: PART-4 | role=core evaluation | inputs=text,config,thresholds | outputs=QualityGateResult

// ============================================================
// PART 5 — Retry Prompt Enhancement
// ============================================================

export function buildRetryHint(result: QualityGateResult, attempt: number, isKO: boolean): string {
  const hints: string[] = [];

  for (const reason of result.failReasons) {
    if (reason.startsWith('grade_below')) {
      hints.push(isKO ? '전체 품질을 높여주세요. 감정 묘사와 감각 표현을 강화하세요.' : 'Improve overall quality. Enhance emotional and sensory descriptions.');
    } else if (reason.startsWith('director_below')) {
      hints.push(isKO ? '인과관계를 명확히 하고, AI 요약 문투를 피하세요.' : 'Clarify cause-effect and avoid AI summary tone.');
    } else if (reason.startsWith('eos_below')) {
      hints.push(isKO ? '감정 키워드와 내면 독백을 더 넣어주세요.' : 'Add more emotion keywords and inner monologue.');
    } else if (reason.startsWith('tension_misaligned')) {
      hints.push(isKO ? '긴장감을 목표 수준에 맞춰주세요. 갈등과 위기감을 조절하세요.' : 'Align tension to target level. Adjust conflict and urgency.');
    } else if (reason.startsWith('ai_tone')) {
      hints.push(isKO ? '"요약하자면", "결론적으로" 같은 AI 문투를 제거하세요.' : 'Remove AI-like phrases such as "in summary", "in conclusion".');
    }
  }

  if (attempt >= 3) {
    hints.push(isKO ? '이전 시도의 문제를 반드시 해결한 뒤 작성하세요.' : 'You MUST fix the issues from previous attempts.');
  }

  return hints.length > 0 ? `\n[품질 보정 지시 — 시도 ${attempt}]\n${hints.join('\n')}` : '';
}

// IDENTITY_SEAL: PART-5 | role=retry hint builder | inputs=result,attempt | outputs=prompt suffix
