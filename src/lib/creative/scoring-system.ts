// ============================================================
// scoring-system — 창작 지침 08_검증측정 (세계관/분량/장르 점수제 chg_167/168)
// 세 축의 점수를 산정하는 순수 함수 집합.
// React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의.
// 모든 입력은 clamp·방어(NaN/Infinity/null/음수/빈값/0분모) 처리.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (분량 포맷 · 결과 구조)
// ============================================================

/** 분량 포맷. 단편(<15k) · 중편(15~50k) · 장편(50k+) */
export type LengthFormat = 'short' | 'mid' | 'long';

/** scoreWorld 입력: 세계관 3요소 점수(각 0~100). 누락/이상값은 0 흡수. */
export interface WorldParts {
  /** 세계 법칙(설정 규칙)의 완성도 */
  laws: number;
  /** 등장인물 설계의 완성도 */
  characters: number;
  /** 설정 간 정합성(모순 없음) */
  consistency: number;
}

/** scoreLength 결과 구조. */
export interface LengthScoreResult {
  /** 분량 적합 점수 (0~100, 정수) */
  score: number;
  /** 선택 포맷의 권장 범위 내 여부 */
  withinRange: boolean;
  /** 한국어 안내 문구 (부족/적정/초과) */
  note: string;
}

// ============================================================
// PART 2 — 상수 (분량 경계 · 가중치 · 라벨)
// ============================================================

/** 분량 경계(자). 단편/중편 상한. 장편은 중편 상한 초과. */
const SHORT_MAX = 15_000;
const MID_MAX = 50_000;

/**
 * 포맷별 권장 범위(자). [하한, 상한].
 * - short: 1 ~ 15,000 (단편)
 * - mid:   15,000 ~ 50,000 (중편)
 * - long:  50,000 ~ 무한 (장편)
 */
const FORMAT_RANGE: Readonly<Record<LengthFormat, readonly [number, number]>> =
  Object.freeze({
    short: [1, SHORT_MAX],
    mid: [SHORT_MAX, MID_MAX],
    long: [MID_MAX, Number.POSITIVE_INFINITY],
  });

/** 유효 포맷 화이트리스트 (비정상 문자열 방어). */
const VALID_FORMATS: ReadonlySet<string> = new Set<LengthFormat>([
  'short',
  'mid',
  'long',
]);

/**
 * 세계관 3요소 가중치. 합 = 1.0.
 * 정합성(모순 없음)을 가장 높게, 법칙·인물 균등 배분.
 */
const WORLD_WEIGHTS: Readonly<Record<keyof WorldParts, number>> = Object.freeze({
  laws: 0.3,
  characters: 0.3,
  consistency: 0.4,
});

/** 산정 순서 고정 (object 순회 의존 제거 · 결정론적). */
const WORLD_KEYS: ReadonlyArray<keyof WorldParts> = [
  'laws',
  'characters',
  'consistency',
];

/**
 * 알려진 장르 ID → 기본 적합 기준점(0~100).
 * 미등록 장르는 BASE_UNKNOWN_GENRE 사용 (방어).
 */
const GENRE_BASELINE: Readonly<Record<string, number>> = Object.freeze({
  fantasy: 70,
  romance: 70,
  hunter: 72,
  regression: 72,
  martial: 68,
  sf: 66,
  mystery: 66,
  horror: 64,
  thriller: 66,
  'romance-fantasy': 70,
  'modern-romance': 70,
  daily: 60,
});

/** 미등록 장르 기준점 (중립). */
const BASE_UNKNOWN_GENRE = 55;

/** 장르 적합에서 템포 일치가 차지하는 비중(0~1). */
const TEMPO_WEIGHT = 0.45;

// ============================================================
// PART 3 — 방어 유틸 (clamp · 정규화 · 반올림)
// ============================================================

/**
 * 점수를 0~100 범위로 보정.
 * NaN/Infinity/null/undefined/비숫자/음수는 0, 100 초과는 100.
 */
function clampScore(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/**
 * 0~1 비율을 보정. 비숫자/음수는 0, 1 초과는 1.
 * (tempoMatch 등 0~1 가정 입력 방어)
 */
function clampRatio(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * 글자수 보정. 비숫자/NaN/음수/Infinity는 0으로.
 * (분량은 음수가 될 수 없음 · 상한은 두지 않되 유한값만 허용)
 */
function clampChars(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v) || v < 0) {
    return 0;
  }
  return Math.floor(v);
}

/** 정수 반올림 후 0~100 재clamp (부동소수 잔차 정리). */
function roundScore(v: number): number {
  return clampScore(Math.round(v));
}

// ============================================================
// PART 4 — scoreWorld (세계관 가중 합산)
// ============================================================

/**
 * 세계관 3요소(법칙·인물·정합성) → 0~100 통합 점수.
 *
 * 절차:
 *  1) 각 요소 clamp(0~100) — 누락/이상값 0 흡수
 *  2) WORLD_WEIGHTS 가중 합산
 *  3) 정수 반올림 후 0~100 보정
 *
 * @param parts 세계관 3요소 점수. null/undefined/비객체는 전 축 0 처리.
 * @returns 0~100 정수
 */
export function scoreWorld(parts: WorldParts): number {
  // 빈 입력/비객체 가드 — 누락 키는 clampScore가 0으로 흡수
  const src: Partial<WorldParts> =
    parts && typeof parts === 'object' ? parts : {};

  let sum = 0;
  for (const key of WORLD_KEYS) {
    sum += clampScore(src[key] as number) * WORLD_WEIGHTS[key];
  }
  return roundScore(sum);
}

// ============================================================
// PART 5 — scoreLength (분량 범위 판정 · 적합 점수)
// ============================================================

/**
 * 선택 포맷의 권장 범위 대비 실제 글자수의 적합도를 산정.
 *
 * 점수 산식:
 *  - 범위 내: 100점
 *  - 범위 밖: 가장 가까운 경계로부터의 이탈 비율에 따라 감점
 *    (이탈이 경계 폭의 100%면 0점, 선형 감점)
 *
 * @param chars  실제 글자수. 비숫자/음수/Infinity는 0 처리.
 * @param format 'short' | 'mid' | 'long'. 비정상 문자열은 'short' 폴백.
 */
export function scoreLength(
  chars: number,
  format: LengthFormat,
): LengthScoreResult {
  const safeChars = clampChars(chars);
  // 포맷 화이트리스트 방어 — 비정상 입력은 단편 기준 폴백
  const safeFormat: LengthFormat = VALID_FORMATS.has(format) ? format : 'short';
  const [lo, hi] = FORMAT_RANGE[safeFormat];

  const withinRange = safeChars >= lo && safeChars <= hi;

  if (withinRange) {
    return {
      score: 100,
      withinRange: true,
      note: `${labelFormat(safeFormat)} 권장 분량에 적합합니다.`,
    };
  }

  // 범위 밖: 이탈 폭 / 기준 폭으로 선형 감점
  let deviation: number;
  let note: string;
  if (safeChars < lo) {
    // 부족: 하한 미달. 기준 폭은 하한(0 분모 방어).
    const denom = lo > 0 ? lo : 1;
    deviation = (lo - safeChars) / denom;
    note = `${labelFormat(safeFormat)} 권장 분량보다 부족합니다.`;
  } else {
    // 초과: 상한 초과. long(상한 무한)은 이 분기 진입 불가.
    // 기준 폭은 상한(0/Infinity 분모 방어).
    const denom = Number.isFinite(hi) && hi > 0 ? hi : 1;
    deviation = (safeChars - hi) / denom;
    note = `${labelFormat(safeFormat)} 권장 분량을 초과합니다.`;
  }

  // 이탈 비율 0~1 클램프 후 선형 감점 (100 → 0)
  const ratio = deviation < 0 ? 0 : deviation > 1 ? 1 : deviation;
  const score = roundScore(100 * (1 - ratio));

  return { score, withinRange: false, note };
}

/** 포맷 → 한국어 라벨 (note 조립용). */
function labelFormat(format: LengthFormat): string {
  if (format === 'short') return '단편';
  if (format === 'mid') return '중편';
  return '장편';
}

// ============================================================
// PART 6 — scoreGenreFit (장르 기준점 + 템포 일치 가중)
// ============================================================

/**
 * 장르 적합도 → 0~100 점수.
 *
 * 산식:
 *  - 장르 기준점(GENRE_BASELINE, 미등록 시 중립 55)을 base로
 *  - 템포 일치도(tempoMatch 0~1)를 TEMPO_WEIGHT 비중으로 가산
 *  - 최종 = base * (1 - TEMPO_WEIGHT) + 100 * tempoMatch * TEMPO_WEIGHT
 *
 * @param genreId   장르 식별자. 빈/비문자열/미등록은 중립 기준점 사용.
 * @param tempoMatch 전개 템포 일치도(0~1). 범위 밖은 clamp.
 * @returns 0~100 정수
 */
export function scoreGenreFit(genreId: string, tempoMatch: number): number {
  // 비문자열/빈 문자열 방어 — 정규화 후 baseline 조회
  const key =
    typeof genreId === 'string' ? genreId.trim().toLowerCase() : '';
  const base =
    key && key in GENRE_BASELINE ? GENRE_BASELINE[key] : BASE_UNKNOWN_GENRE;

  const tempo = clampRatio(tempoMatch);

  // 기준점 비중 + 템포 비중 가중 합
  const fit = base * (1 - TEMPO_WEIGHT) + 100 * tempo * TEMPO_WEIGHT;
  return roundScore(fit);
}
