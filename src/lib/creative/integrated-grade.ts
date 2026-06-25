// ============================================================
// integrated-grade — 창작 지침 08_검증측정 (통합등급 산식 Layer 71 + 4tier)
// 6축 점수(0~100)를 가중 합산해 단일 통합등급으로 환산하는 순수 함수.
// React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의.
//
// 본 모듈의 Grade 타입('평작'|'성공'|'성공상위'|'대성공')은 창작 도메인 전용.
// 호출처는 본 모듈에서 직접 import 만 사용. `as Grade` 류 cross-namespace cast 금지.
// ============================================================

// ============================================================
// PART 1 — 타입 · 상수 (가중치 · 등급 경계 · 라벨)
// ============================================================

/** 통합등급 4-tier. 평작 < 성공 < 성공상위 < 대성공 */
export type Grade = '평작' | '성공' | '성공상위' | '대성공';

/** 6축 입력 점수 (각 0~100). 빈/이상값은 산식 내부에서 clamp. */
export interface AxisScores {
  /** 세계관 */
  world: number;
  /** 캐릭터 */
  character: number;
  /** 씬시트 */
  scene: number;
  /** 연출 */
  direction: number;
  /** 집필 */
  writing: number;
  /** 퇴고 */
  revision: number;
}

/** computeIntegratedGrade 결과. */
export interface IntegratedGradeResult {
  /** 가중 평균 점수 (0~100, 소수 1자리 반올림) */
  weighted: number;
  /** 최종 통합등급 (cap 강등 반영 후) */
  grade: Grade;
  /** 가장 낮은 축의 한국어 라벨 (개선 우선순위 안내용) */
  weakest: string;
}

/**
 * 6축 가중치. 합 = 1.0 강제.
 * 집필·캐릭터 비중을 높게(완성 본문/주인공 흡인력), 퇴고를 보조로 배분.
 */
export const WEIGHTS: Readonly<Record<keyof AxisScores, number>> = Object.freeze({
  world: 0.15,
  character: 0.25,
  scene: 0.1,
  direction: 0.15,
  writing: 0.25,
  revision: 0.1,
});

/** 축 키 → 한국어 라벨 (weakest 출력용). */
const AXIS_LABELS: Readonly<Record<keyof AxisScores, string>> = Object.freeze({
  world: '세계관',
  character: '캐릭터',
  scene: '씬시트',
  direction: '연출',
  writing: '집필',
  revision: '퇴고',
});

/** 산식에서 참조하는 축 키 순서 (object 순회 의존 제거 · 결정론적). */
const AXIS_KEYS: ReadonlyArray<keyof AxisScores> = [
  'world',
  'character',
  'scene',
  'direction',
  'writing',
  'revision',
];

/** cap 강등 임계: 어느 한 축이 이 값 미만이면 등급 한 단계 강등. */
const CAP_THRESHOLD = 40;

/** 강등 순서 (높음 → 낮음). 한 칸 내려감. */
const GRADE_LADDER: ReadonlyArray<Grade> = ['대성공', '성공상위', '성공', '평작'];

// ============================================================
// PART 2 — 방어 유틸 (clamp · 등급 경계 · 강등)
// ============================================================

/**
 * 점수를 0~100 범위로 보정. NaN/Infinity/null/undefined/비숫자는 0 취급.
 * (가변 기본인수 미사용 — 원시값만 다룸)
 */
function clampScore(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/** 가중 평균(0~100) → 기본 등급. 경계: <60 평작 · 60~74 성공 · 75~89 성공상위 · 90+ 대성공 */
function baseGrade(weighted: number): Grade {
  if (weighted >= 90) return '대성공';
  if (weighted >= 75) return '성공상위';
  if (weighted >= 60) return '성공';
  return '평작';
}

/** 등급 한 단계 강등. 이미 최하(평작)면 그대로. */
function demote(grade: Grade): Grade {
  const idx = GRADE_LADDER.indexOf(grade);
  // 미발견(이론상 불가) 또는 이미 최하위면 평작 유지
  if (idx < 0 || idx >= GRADE_LADDER.length - 1) return '평작';
  return GRADE_LADDER[idx + 1];
}

// ============================================================
// PART 3 — 메인 산식 (가중 합산 · 최약축 · cap 강등)
// ============================================================

/**
 * 6축 점수 → 통합등급.
 *
 * 절차:
 *  1) 각 축 clamp(0~100)
 *  2) WEIGHTS 가중 합산 → weighted (소수 1자리)
 *  3) 경계 기준 baseGrade
 *  4) clamp 후 최저 축 < 40 이면 등급 한 단계 강등 (cap 규칙)
 *  5) 최약축 라벨 동봉
 *
 * @param scores 6축 점수 객체. null/undefined 또는 누락 키는 0 처리.
 */
export function computeIntegratedGrade(scores: AxisScores): IntegratedGradeResult {
  // 빈 입력/비객체 가드 — 누락 키는 clampScore가 0으로 흡수
  const src: Partial<AxisScores> =
    scores && typeof scores === 'object' ? scores : {};

  let weightedSum = 0;
  let minScore = Number.POSITIVE_INFINITY;
  let weakestKey: keyof AxisScores = AXIS_KEYS[0];

  for (const key of AXIS_KEYS) {
    const safe = clampScore(src[key] as number);
    weightedSum += safe * WEIGHTS[key];
    if (safe < minScore) {
      minScore = safe;
      weakestKey = key;
    }
  }

  // 소수 1자리 반올림 (부동소수 잔차 정리)
  const weighted = Math.round(weightedSum * 10) / 10;

  let grade = baseGrade(weighted);
  // cap 규칙: 한 축이라도 임계 미만이면 한 단계 강등
  if (minScore < CAP_THRESHOLD) {
    grade = demote(grade);
  }

  return {
    weighted,
    grade,
    weakest: AXIS_LABELS[weakestKey],
  };
}
