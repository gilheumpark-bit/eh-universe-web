// ============================================================
// PART 1 — Anomaly detection (Spec 12.6)
// ============================================================
//
// 4-AND 조건 (모두 만족 시에만 anomaly):
//   1. target === 'manuscript'
//   2. 이전 길이 대비 현재 길이가 20% 이하로 축소
//   3. 이전 길이 ≥ 500자
//   4. 단일 delta에서 발생 (AI 재생성 등 의도 대체 제외 — 호출자 플래그)

import type { AnomalyPayload } from './types';

// ============================================================
// PART 2 — Input / output
// ============================================================

export interface AnomalyCheckInput {
  target: 'project' | 'session' | 'manuscript' | 'config' | 'sceneSheet';
  /** 원고 글자 수 (전). */
  prevChars: number;
  /** 원고 글자 수 (후). */
  nextChars: number;
  /** 의도된 대체 여부(AI 재생성 등) — true면 감지 제외. */
  intentionalReplace?: boolean;
}

export interface AnomalyCheckOutput {
  detected: boolean;
  reason?: 'target-mismatch' | 'prev-too-small' | 'ratio-safe' | 'intentional';
  ratio?: number;
  payload?: Omit<AnomalyPayload, 'suggestedSnapshotId'>;
}

// Spec 12.6: 20% 이하로 축소 (= nextChars / prevChars ≤ 0.2)
export const ANOMALY_RATIO_THRESHOLD = 0.2;
export const ANOMALY_PREV_MIN = 500;

/**
 * 변화가 anomaly인지 판정. suggestedSnapshotId는 호출자(journal)에서 채움.
 */
export function detectAnomaly(input: AnomalyCheckInput): AnomalyCheckOutput {
  if (input.target !== 'manuscript') {
    return { detected: false, reason: 'target-mismatch' };
  }
  if (input.intentionalReplace) {
    return { detected: false, reason: 'intentional' };
  }
  if (input.prevChars < ANOMALY_PREV_MIN) {
    return { detected: false, reason: 'prev-too-small' };
  }
  const ratio = input.prevChars > 0 ? input.nextChars / input.prevChars : 0;
  if (ratio > ANOMALY_RATIO_THRESHOLD) {
    return { detected: false, reason: 'ratio-safe', ratio };
  }
  return {
    detected: true,
    ratio,
    payload: {
      kind: 'bulk-delete',
      detail: {
        beforeChars: input.prevChars,
        afterChars: input.nextChars,
        ratio,
      },
    },
  };
}

// ============================================================
// PART 3 — helpers
// ============================================================

/**
 * 문자열 또는 객체(문자열 body 포함)에서 글자 수 추정.
 * 호출자가 보통 manuscript.body 문자열을 직접 제공.
 */
export function countCharacters(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'string') return value.length;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.body === 'string') return record.body.length;
    if (typeof record.content === 'string') return record.content.length;
  }
  return 0;
}
