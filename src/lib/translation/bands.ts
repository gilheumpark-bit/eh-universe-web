// ============================================================
// Translation Bands — 41-band quality classification
// ============================================================
// README.ko.md "2-모드 × 41-밴드" 약속의 실제 구현 (2026-04-25).
// 이전 상태: 약속 카피만 있고 코드 0 (false promise).
// 이후 상태: 5-mode (S/A/B/C/F) × 8 sub-band + S 추가 1 = 41 bands.
//
// 매핑 정책:
//   F (fail):    bands  1~ 8 (0~19%)
//   C:           bands  9~16 (20~39%)
//   B:           bands 17~24 (40~59%)
//   A:           bands 25~32 (60~79%)
//   S:           bands 33~41 (80~100%)  ← 9 bands, 최상위
//
// 점수 0.0~1.0 (소수) 또는 0~100 (정수) 둘 다 입력 가능.
// 출력: { band: 1~41, mode: 'F'|'C'|'B'|'A'|'S', label: 'A+', percentile: 0~100 }
// ============================================================

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export type BandMode = 'F' | 'C' | 'B' | 'A' | 'S';

export interface BandResult {
  /** 1~41, 1이 최저 */
  band: number;
  /** 5-mode 분류 */
  mode: BandMode;
  /** 사람 친화적 레이블 — "S+", "A0", "C-" 등 */
  label: string;
  /** 0~100 정수 percentile (정렬·표시용) */
  percentile: number;
  /** README/UX 약속 표현 — "23/41" */
  display: string;
}

export const BAND_COUNT = 41;

const MODE_RANGES: Array<{ mode: BandMode; min: number; max: number }> = [
  { mode: 'F', min: 1, max: 8 },   // 0~19%
  { mode: 'C', min: 9, max: 16 },  // 20~39%
  { mode: 'B', min: 17, max: 24 }, // 40~59%
  { mode: 'A', min: 25, max: 32 }, // 60~79%
  { mode: 'S', min: 33, max: 41 }, // 80~100%
];

// 모드별 sub-tier 레이블 (8 또는 9 bands)
const MODE_SUFFIXES_8 = ['-', '-', '0', '0', '0', '0', '+', '+'];
const MODE_SUFFIXES_9 = ['-', '-', '0', '0', '0', '0', '+', '+', '++'];

// ============================================================
// PART 2 — Score → Band 매핑
// ============================================================

/**
 * 점수 → BandResult.
 *
 * @param score  0~1 또는 0~100 (자동 감지)
 * @returns      band 1~41, mode F~S, label, percentile, display
 *
 * [C] NaN/Infinity 입력 방어 — 0으로 폴백
 * [C] clamp 0~1 — out of range 입력은 boundary 로 매핑
 */
export function scoreToBand(score: number): BandResult {
  if (!Number.isFinite(score)) score = 0;
  // 0~100 입력은 0~1 로 정규화
  const normalized = score > 1 ? Math.min(score, 100) / 100 : Math.max(0, Math.min(1, score));
  // 1..41 매핑 — 0% → band 1, 100% → band 41
  const band = Math.max(1, Math.min(BAND_COUNT, Math.round(normalized * (BAND_COUNT - 1)) + 1));
  const range = MODE_RANGES.find((r) => band >= r.min && band <= r.max) ?? MODE_RANGES[0];
  const subIndex = band - range.min;
  const suffixes = range.mode === 'S' ? MODE_SUFFIXES_9 : MODE_SUFFIXES_8;
  const suffix = suffixes[Math.min(subIndex, suffixes.length - 1)];
  const label = `${range.mode}${suffix}`;
  const percentile = Math.round(normalized * 100);
  return {
    band,
    mode: range.mode,
    label,
    percentile,
    display: `${band}/${BAND_COUNT}`,
  };
}

/**
 * Band → 색상 힌트 (UI 사용).
 * F: 빨강 / C: 주황 / B: 노랑 / A: 청록 / S: 보라
 */
export function bandModeColor(mode: BandMode): string {
  switch (mode) {
    case 'F': return '#ef4444'; // accent-red
    case 'C': return '#f59e0b'; // accent-amber
    case 'B': return '#eab308'; // yellow
    case 'A': return '#06b6d4'; // accent-cyan
    case 'S': return '#a855f7'; // accent-purple
  }
}

/**
 * Band → 통과 여부 (alpha 단계 임계 = B 이상 = band 17+).
 * 베타 진입 시 임계 상향 (A+ = band 31+) 가능 — 테스트 기반 조정.
 */
export function bandPassed(result: BandResult): boolean {
  return result.band >= 17;
}

// ============================================================
// PART 3 — 디버그·테스트 헬퍼
// ============================================================

/** 모든 41 밴드 enumerate — UI 게이지 / 도큐먼트 자동생성용 */
export function allBands(): BandResult[] {
  const results: BandResult[] = [];
  for (let b = 1; b <= BAND_COUNT; b++) {
    // band → score 역매핑 (boundary)
    const score = (b - 1) / (BAND_COUNT - 1);
    results.push(scoreToBand(score));
  }
  return results;
}

// IDENTITY_SEAL: bands | role=41-band classifier | inputs=score 0~1 or 0~100 | outputs=BandResult
