// ============================================================
// PART 1 — Module Header
// ============================================================
//
// bands.ts — 41-band 매핑 + clamp + 4언어 라벨.
//
// 이전: engine/translation.ts PART 2 + PART 10 에 산재
//        (BAND_MIN/MAX/DEFAULT/STEP, clampBand, BAND_LABELS, bandLabel, BAND_META).
// 수정: 단일 scoring 모듈 — 41-band 시스템 격리 (~80 LOC).
//
// [K] 단일 책임 — band 클램핑 + 라벨링만
// [G] 정적 매핑 — O(1) 룩업
// [C] 입력 클램핑 — NaN/범위 외 안전 처리
//
// translation.ts 는 본 모듈에서 re-export — 외부 import path 무영향.
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 2 — Types & Constants
// ============================================================

/**
 * 번역 모드: 두 가지 접근
 * MODE1 — 원문 보존형: 원문 구조와 형식을 최대한 유지
 * MODE2 — 독자 경험형: 타겟 독자가 같은 감정을 느끼도록 재창조
 */
export type TranslationMode = 'fidelity' | 'experience';

/** Band 상수 (양쪽 모드 공통) */
export const BAND_MIN = 0.480;
export const BAND_MAX = 0.520;
export const BAND_DEFAULT = 0.500;
export const BAND_STEP = 0.001;

/** Band 메타데이터 — 41-step 시스템 */
export const BAND_META = {
  min: BAND_MIN,
  max: BAND_MAX,
  default: BAND_DEFAULT,
  step: BAND_STEP,
  steps: Math.round((BAND_MAX - BAND_MIN) / BAND_STEP) + 1, // 41
} as const;

// ============================================================
// PART 3 — Clamp
// ============================================================

/**
 * Band 값을 유효 범위로 클램핑 (0.480 ~ 0.520, 0.001 step).
 * NaN/Infinity 입력 시 BAND_DEFAULT 로 폴백.
 */
export function clampBand(value: number): number {
  if (!Number.isFinite(value)) return BAND_DEFAULT;
  const clamped = Math.max(BAND_MIN, Math.min(BAND_MAX, value));
  return Math.round(clamped * 1000) / 1000;
}

// ============================================================
// PART 4 — 4언어 라벨
// ============================================================

/** Band 밴드 라벨 — 4개 언어 네이티브 (모드별 5단계) */
const BAND_LABELS: Record<AppLanguage, { fidelity: string[]; experience: string[] }> = {
  KO: {
    fidelity: ['자연스러움 허용', '약간의 보정', '원문 유지 (기본)', '원문 고수', '직역'],
    experience: ['적극 재창조', '능동 적응', '균형 재현 (기본)', '보수적 재현', '최소 재현'],
  },
  EN: {
    fidelity: ['Naturalization allowed', 'Slight adjustment', 'Source-faithful (default)', 'Source-strict', 'Near-literal'],
    experience: ['Full recreation', 'Active adaptation', 'Balanced recreation (default)', 'Conservative recreation', 'Minimal recreation'],
  },
  JP: {
    fidelity: ['自然さを許容', 'わずかな補正', '原文維持 (基本)', '原文厳守', '直訳'],
    experience: ['積極的再創造', '能動的適応', 'バランス再現 (基本)', '保守的再現', '最小限再現'],
  },
  CN: {
    fidelity: ['允许自然化', '轻微调整', '忠于原文 (基本)', '严守原文', '直译'],
    experience: ['全面再创作', '主动适应', '平衡再现 (基本)', '保守再现', '最小再现'],
  },
};

/**
 * Band 값 → 사용자 레이블 (모드별, 4개 언어).
 * delta = band - BAND_DEFAULT 기준 5구간 매핑.
 */
export function bandLabel(band: number, mode: TranslationMode, language: AppLanguage): string {
  const b = clampBand(band);
  const delta = b - BAND_DEFAULT;
  const L = BAND_LABELS[language] ?? BAND_LABELS.EN;
  const labels = mode === 'fidelity' ? L.fidelity : L.experience;

  // delta 범위 → 인덱스 매핑 (−0.012 미만 ~ 0.012 초과)
  let idx = 2; // 기본(중간)
  if (delta <= -0.012) idx = 0;
  else if (delta <= -0.004) idx = 1;
  else if (delta <= 0.004) idx = 2;
  else if (delta <= 0.012) idx = 3;
  else idx = 4;
  return labels[idx];
}
