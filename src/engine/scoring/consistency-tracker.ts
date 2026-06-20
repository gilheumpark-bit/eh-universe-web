// ============================================================
// PART 1 — Module Header
// ============================================================
//
// consistency-tracker.ts — 축별 critical failure + 청크간 용어 일관성.
//
// 이전: engine/translation.ts PART 19 (hasCriticalAxisFailure
//        + ChunkConsistencyTracker + create/updateConsistencyTracker).
// 수정: 단일 모듈 — chunk-level 정합 검증 격리 (~70 LOC).
//
// 역할:
//   - hasCriticalAxisFailure — 모드별 임계값 위반 즉시 실패
//   - ChunkConsistencyTracker — 청크간 같은 source 용어가 다르게 번역되면 경고 누적
//
// [C] Map 기반 접근 — null 체크 후 set
// [G] O(N) per chunk (glossary 길이만큼)
// [K] 단일 책임 — chunk 정합만 (length/voice/length-ratio 는 별 모듈)
// ============================================================

import type { TranslationMode } from './bands';
import type { ChunkScoreDetail } from './score-parser';
import { isFidelityScore, isExperienceScore } from './score-parser';

/**
 * GlossaryEntry minimal shape — translation.ts 의 GlossaryEntry 와 호환.
 * 순환 의존성 회피용 (translation.ts 가 본 모듈을 re-export 함).
 */
interface GlossaryEntryShape {
  source: string;
  target: string;
}

// ============================================================
// PART 2 — Critical axis failure
// ============================================================

/**
 * 축별 critical failure 감지.
 * 모드별 핵심 축이 임계값 이하면 무조건 재시도 트리거.
 */
export function hasCriticalAxisFailure(score: ChunkScoreDetail, mode: TranslationMode): boolean {
  if (mode === 'fidelity' && isFidelityScore(score)) {
    // 번역투가 너무 높으면 무조건 실패
    if (score.translationese > 0.60) return true;
    // 충실도가 너무 낮으면 무조건 실패
    if (score.fidelity < 0.40) return true;
    return false;
  }
  if (mode === 'experience' && isExperienceScore(score)) {
    // 무근거 보강이 심하면 무조건 실패
    if (score.groundedness < 0.45) return true;
    // 번역자 투명성이 너무 낮으면 무조건 실패
    if (score.voiceInvisibility < 0.45) return true;
    // 몰입도가 바닥이면 무조건 실패
    if (score.immersion < 0.40) return true;
    return false;
  }
  return false;
}

// ============================================================
// PART 3 — Chunk-level consistency tracker
// ============================================================

/** 청크간 용어 일관성 추적기 */
export interface ChunkConsistencyTracker {
  termUsage: Map<string, string>;  // glossary.source → 실제 사용된 target
  inconsistencies: string[];
}

export function createConsistencyTracker(): ChunkConsistencyTracker {
  return { termUsage: new Map(), inconsistencies: [] };
}

/**
 * 청크 번역 완료 후 용어 일관성 추적 업데이트.
 * 이전 청크에서 쓴 용어와 다르게 번역되면 inconsistencies 누적.
 */
export function updateConsistencyTracker(
  tracker: ChunkConsistencyTracker,
  chunkIndex: number,
  translatedText: string,
  glossary: GlossaryEntryShape[],
): void {
  for (const entry of glossary) {
    if (translatedText.includes(entry.target)) {
      const prev = tracker.termUsage.get(entry.source);
      if (prev && prev !== entry.target) {
        tracker.inconsistencies.push(
          `chunk[${chunkIndex}]: "${entry.source}" → "${entry.target}" (was "${prev}" in earlier chunk)`
        );
      }
      tracker.termUsage.set(entry.source, entry.target);
    }
  }
}
