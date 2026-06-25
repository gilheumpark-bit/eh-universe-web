// ============================================================
// rhythm-analysis — 창작 지침 05_집필 (리듬 다층 chg_190)
// 거시(macro)/미시(micro)/대조(compare) 3렌즈로 문장 리듬을 계측.
// 순수 TS. React/DOM/fetch 0. 절대금지 8파일 import 0. 자체 타입 정의.
// 재사용: '@/lib/desktop/writing-stats' analyzeText (avgLen 산출).
// ============================================================

import { analyzeText } from '@/lib/desktop/writing-stats';

// ============================================================
// PART 1 — 타입 정의 (자체 정의, 외부 금지 모듈 비의존)
// ============================================================

/** 거시 렌즈 — 단락/평균 길이 수준의 큰 흐름 */
export interface MacroRhythm {
  /** 평균 문장 길이(자) */
  avgLen: number;
  /** 단락(빈 줄 기준) 개수 */
  paragraphCount: number;
}

/** 미시 렌즈 — 문장 단위 길이 분포와 변동성 */
export interface MicroRhythm {
  /** 각 문장의 길이(자) 배열 */
  sentenceLengths: number[];
  /** 변동계수(CV = 표준편차/평균). 리듬 다양성 지표. 0이면 균일. */
  burstiness: number;
}

/** analyzeRhythm 반환 — 거시+미시 통합 */
export interface RhythmAnalysis {
  macro: MacroRhythm;
  micro: MicroRhythm;
}

/** compareEpisodes 반환 — 두 회차 대조 결과 */
export interface RhythmComparison {
  /** B avgLen - A avgLen (양수면 B가 더 늘어짐) */
  deltaAvgLen: number;
  /** B burstiness - A burstiness (양수면 B가 더 들쭉날쭉) */
  deltaBurstiness: number;
  /** 사람이 읽는 대조 판정 문구 */
  verdict: string;
}

// ============================================================
// PART 2 — 내부 유틸 (문장 분해 · 통계)
// ============================================================

// 문장 종결 부호 기준 분해. writing-stats 와 동일 계열 부호.
const SENTENCE_SPLIT = /[.!?。…]+/;
// 단락 경계: 1개 이상의 빈 줄(연속 개행).
const PARAGRAPH_SPLIT = /\n\s*\n/;

/**
 * 본문을 문장 단위로 분해해 각 문장 길이(자) 배열을 반환.
 * 종결부호로 나눈 뒤 공백을 제거한 비어있지 않은 조각만 집계.
 * 빈/공백 입력은 빈 배열.
 */
function splitSentenceLengths(text: string): number[] {
  if (!text || !text.trim()) return [];
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.length);
}

/**
 * 단락 개수. 빈 줄(연속 개행)로 분할 후 내용이 있는 조각만 카운트.
 * 내용은 있으나 단락 구분이 없으면 1, 완전 빈 입력은 0.
 */
function countParagraphs(text: string): number {
  if (!text || !text.trim()) return 0;
  const blocks = text
    .split(PARAGRAPH_SPLIT)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  return blocks.length || 1;
}

/**
 * 변동계수(CV) = 표준편차 / 평균. 모집단 표준편차 사용.
 * 0분모(평균 0 또는 빈 배열) 방어 → 0 반환.
 * 소수 4자리 반올림으로 부동소수 잡음 제거.
 */
function coefficientOfVariation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const cv = Math.sqrt(variance) / mean;
  return Math.round(cv * 10000) / 10000;
}

// ============================================================
// PART 3 — 공개 API (analyzeRhythm · compareEpisodes)
// ============================================================

/**
 * 단일 본문의 리듬을 거시/미시 두 렌즈로 계측.
 * - macro.avgLen: writing-stats analyzeText 재사용
 * - micro: 문장 길이 분포 + burstiness(변동계수)
 * 빈 입력 안전(모든 수치 0, 배열 빈).
 */
export function analyzeRhythm(text: string): RhythmAnalysis {
  const safe = typeof text === 'string' ? text : '';
  const stats = analyzeText(safe);
  const sentenceLengths = splitSentenceLengths(safe);
  return {
    macro: {
      avgLen: stats.avgLen,
      paragraphCount: countParagraphs(safe),
    },
    micro: {
      sentenceLengths,
      burstiness: coefficientOfVariation(sentenceLengths),
    },
  };
}

/**
 * 두 회차(textA, textB)의 리듬을 대조하는 렌즈.
 * delta 는 모두 B - A 기준. verdict 는 변동계수 변화에 초점.
 * 빈 입력 안전(0 대비 0 → delta 0, '동일' 판정).
 */
export function compareEpisodes(textA: string, textB: string): RhythmComparison {
  const a = analyzeRhythm(textA);
  const b = analyzeRhythm(textB);
  const deltaAvgLen = b.macro.avgLen - a.macro.avgLen;
  const deltaBurstiness =
    Math.round((b.micro.burstiness - a.micro.burstiness) * 10000) / 10000;
  return {
    deltaAvgLen,
    deltaBurstiness,
    verdict: buildVerdict(deltaAvgLen, deltaBurstiness),
  };
}

/**
 * 대조 판정 문구 생성. 변동계수 변화를 우선 신호로,
 * 평균 길이 변화를 보조 신호로 한국어 판정.
 * 임계치 0.05(CV) / 5자(avgLen) 이내는 '유지'로 본다.
 */
function buildVerdict(deltaAvgLen: number, deltaBurstiness: number): string {
  const rhythmTrend =
    deltaBurstiness > 0.05
      ? '리듬 다양성 증가'
      : deltaBurstiness < -0.05
        ? '리듬 단조화'
        : '리듬 유지';
  const lengthTrend =
    deltaAvgLen > 5
      ? '문장 늘어짐'
      : deltaAvgLen < -5
        ? '문장 압축'
        : '평균 길이 유지';
  return `${rhythmTrend} · ${lengthTrend}`;
}
