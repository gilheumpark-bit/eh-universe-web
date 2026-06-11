// ============================================================
// style-profile — 창작 지침 05_집필 (집필전 문체제작 chg_169 Target/Observed/Delta)
// 집필 전 "목표 문체"(Target)를 선언하고, 본문 실측(Observed)과의
// 차이(Delta)·일치도(MatchScore)를 계측하는 순수 계측 모듈.
// 순수 TS. React/DOM/fetch 0. 절대금지 8파일 import 0. 자체 타입 정의.
// 재사용: '@/lib/desktop/writing-stats' analyzeText (avgLen·dialoguePct 산출).
// ============================================================

import { analyzeText } from '@/lib/desktop/writing-stats';

// ============================================================
// PART 1 — 타입 정의 (자체 정의, 외부 금지 모듈 비의존)
// ============================================================

/**
 * 목표 문체(Target) — 작가가 집필 전 선언하는 4지표.
 * 각 값은 Observed 와 동일 단위·범위를 공유해 직접 비교 가능.
 */
export interface StyleTarget {
  /** 평균 문장 길이(자). 목표치. */
  sentenceLenAvg: number;
  /** 대사 비율(%, 0~100). 따옴표 내부 글자 비중 목표치. */
  dialogueRatio: number;
  /**
   * tell 허용도(%, 0~100). "설명형(telling)" 표현을 얼마나 허용하는지.
   * 낮을수록 showing 지향(설명 최소). 높을수록 설명 허용.
   */
  tellTolerance: number;
  /**
   * 리듬 다양성(%, 0~100). 문장 길이 변동성 목표치.
   * 0이면 균일한 호흡, 높을수록 장단 교차가 큰 리듬.
   */
  rhythmVariety: number;
}

/**
 * 실측 문체(Observed) — 본문에서 측정한 동일 4지표.
 * 구조는 StyleTarget 과 동일(목표 대 실측 직접 대조 목적).
 */
export type StyleObserved = StyleTarget;

/** styleDelta 한 항목 — 지표별 (목표 - 실측) 차이와 판정. */
export interface StyleDeltaItem {
  /** 지표 이름(StyleTarget 키). */
  field: keyof StyleTarget;
  /** 목표 - 실측. 양수면 "실측이 목표에 미달", 음수면 "초과". */
  delta: number;
  /** 사람이 읽는 판정: 'on-target' | 'under' | 'over'. */
  verdict: 'on-target' | 'under' | 'over';
}

// ============================================================
// PART 2 — 내부 유틸 (수치 방어 · tell · 리듬 계측)
// ============================================================

// 비문자열/null/undefined 가 흘러와도 빈 문자열로 정규화.
function safeText(text: string): string {
  return typeof text === 'string' ? text : '';
}

// 0~100 범위로 클램프 + 정수 반올림. NaN/음수/초과 방어.
function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// 음수가 아닌 정수로 정규화(길이류 지표). NaN/음수 방어.
function safeNonNeg(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

// 설명형(telling) 신호 어미·표현. 감정/상태를 직접 진술하는 패턴.
// 한국어 웹소설에서 흔한 "직접 서술" 단서 — 존재 비율로 tell 성향 근사.
const TELL_MARKERS = [
  '느꼈다',
  '느껴졌다',
  '생각했다',
  '깨달았다',
  '알았다',
  '슬펐다',
  '기뻤다',
  '두려웠다',
  '화가 났다',
  '행복했다',
  '불안했다',
  '~듯했다',
];

// 문장 분해(종결부호 기준). writing-stats 와 동일 계열 부호.
const SENTENCE_SPLIT = /[.!?。…]+/;

/**
 * 본문의 tell 성향(%). 문장 수 대비 설명형 신호를 포함한 문장 비율.
 * 0분모(문장 0개) 방어 → 0. 결과는 0~100 정수.
 */
function observeTellRatio(text: string): number {
  const sentences = text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const total = sentences.length;
  if (total === 0) return 0;
  let tellHits = 0;
  for (const s of sentences) {
    if (TELL_MARKERS.some((m) => s.includes(m.replace('~', '')))) tellHits += 1;
  }
  return clampPct((tellHits / total) * 100);
}

/**
 * 리듬 다양성(%). 문장 길이 변동계수(CV = 표준편차/평균)를 0~100 척도로.
 * CV 1.0 을 100% 로 매핑(클램프). 0분모(빈/단일 균일) 방어 → 0.
 */
function observeRhythmVariety(text: string): number {
  const lengths = text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.length);
  const n = lengths.length;
  if (n === 0) return 0;
  const mean = lengths.reduce((sum, v) => sum + v, 0) / n;
  if (mean === 0) return 0;
  const variance = lengths.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const cv = Math.sqrt(variance) / mean;
  return clampPct(cv * 100);
}

// ============================================================
// PART 3 — 공개 API (emptyStyleTarget · observeStyle · styleDelta · styleMatchScore)
// ============================================================

/** 빈 목표 문체. 모든 지표 0(미설정 기준점). */
export function emptyStyleTarget(): StyleTarget {
  return {
    sentenceLenAvg: 0,
    dialogueRatio: 0,
    tellTolerance: 0,
    rhythmVariety: 0,
  };
}

/**
 * 본문 → 실측 문체(Observed) 4지표.
 * - sentenceLenAvg / dialogueRatio: writing-stats analyzeText 재사용
 * - tellTolerance: 설명형 신호 비율(observeTellRatio)
 * - rhythmVariety: 문장 길이 변동계수(observeRhythmVariety)
 * 빈/비문자열 입력 안전(모든 지표 0).
 */
export function observeStyle(text: string): StyleObserved {
  const safe = safeText(text);
  const stats = analyzeText(safe);
  return {
    sentenceLenAvg: safeNonNeg(stats.avgLen),
    dialogueRatio: clampPct(stats.dialoguePct),
    tellTolerance: observeTellRatio(safe),
    rhythmVariety: observeRhythmVariety(safe),
  };
}

/**
 * 목표(Target) 대 실측(Observed) 4지표 차이.
 * delta = target - observed (양수면 실측이 목표에 미달).
 * verdict: 차이 절댓값이 임계 이내면 'on-target', 미달이면 'under', 초과면 'over'.
 * 임계: 길이 지표는 5자, 비율 지표(%)는 5%p.
 */
export function styleDelta(
  target: StyleTarget,
  observed: StyleObserved,
): StyleDeltaItem[] {
  const t = target ?? emptyStyleTarget();
  const o = observed ?? emptyStyleTarget();
  const fields: { field: keyof StyleTarget; threshold: number }[] = [
    { field: 'sentenceLenAvg', threshold: 5 },
    { field: 'dialogueRatio', threshold: 5 },
    { field: 'tellTolerance', threshold: 5 },
    { field: 'rhythmVariety', threshold: 5 },
  ];
  return fields.map(({ field, threshold }) => {
    const targetVal = Number.isFinite(t[field]) ? t[field] : 0;
    const observedVal = Number.isFinite(o[field]) ? o[field] : 0;
    const delta = targetVal - observedVal;
    let verdict: StyleDeltaItem['verdict'];
    if (Math.abs(delta) <= threshold) verdict = 'on-target';
    else if (delta > 0) verdict = 'under';
    else verdict = 'over';
    return { field, delta, verdict };
  });
}

/**
 * 목표 대비 일치도 0~100 점수.
 * 각 지표의 정규화 오차(|delta| / 분모)를 1에서 빼 평균 → 100배.
 * 분모: 길이 지표는 max(target, 20)자, 비율 지표는 100%p (포화 척도).
 * 빈 목표(모두 0)·빈 실측 → 100(차이 없음). 결과는 0~100 정수.
 */
export function styleMatchScore(
  target: StyleTarget,
  observed: StyleObserved,
): number {
  const deltas = styleDelta(target, observed);
  const denom: Record<keyof StyleTarget, number> = {
    sentenceLenAvg: Math.max(target?.sentenceLenAvg ?? 0, 20),
    dialogueRatio: 100,
    tellTolerance: 100,
    rhythmVariety: 100,
  };
  let sum = 0;
  for (const { field, delta } of deltas) {
    const d = denom[field] || 1;
    const accuracy = 1 - Math.min(1, Math.abs(delta) / d);
    sum += accuracy;
  }
  return clampPct((sum / deltas.length) * 100);
}
