// ============================================================
// PART 1 — Module Header
// ============================================================
//
// semantic-diff/types.ts — 의미 단위 diff (텍스트 라인 diff 와 별도).
//
// 비교 차원:
//   - tone:     문체 톤 (격식/캐주얼/긴장/평온)
//   - tension:  텐션 점수 차이
//   - emotion:  주요 감정 키워드 변화
//   - character: 등장 캐릭터 차이
//   - foreshadow: 떡밥 마커 차이
//
// 평행우주(BranchDiffView 보강) 또는 버전 히스토리에서 사용.
//
// [C] 모든 metric optional / [G] 단일 책임 / [K] 5 차원만
// ============================================================

export type SemanticAxis = 'tone' | 'tension' | 'emotion' | 'character' | 'foreshadow';

export interface SemanticAxisDiff {
  axis: SemanticAxis;
  /** 변화 강도 (0~100) — 0 이면 동일 */
  changeIntensity: number;
  /** 4언어 요약 메시지 */
  summary: { ko: string; en: string; ja?: string; zh?: string };
  /** 보조 데이터 */
  before?: string | number;
  after?: string | number;
}

export interface SemanticDiffResult {
  /** 5축 각각 diff */
  axes: SemanticAxisDiff[];
  /** 전체 변화 강도 (5축 평균) */
  overallChange: number;
  /** 가장 큰 변화 축 */
  primaryAxis?: SemanticAxis;
  /** 빌드 시간 ms */
  durationMs: number;
}
