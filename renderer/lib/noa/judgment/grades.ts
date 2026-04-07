// ============================================================
// NOA Judgment — 27-Step Grade Matrix
// Source: NOA v35 Judgement Core (9 Grades × 3 Steps)
// ============================================================

import type { GradeEntry } from "../types";
import { GRADE_MATRIX } from "../config";

/**
 * 리스크 점수를 27단계 정밀 등급으로 변환한다.
 *
 * @param score - 최종 리스크 점수
 * @returns 매칭되는 GradeEntry (없으면 Black-3)
 */
export function resolveGrade(score: number): GradeEntry {
  for (const entry of GRADE_MATRIX) {
    if (score > entry.riskFloor && score <= entry.riskCeiling) {
      return entry;
    }
  }
  // 범위 밖이면 최고 위험 등급
  return GRADE_MATRIX[GRADE_MATRIX.length - 1];
}

export { GRADE_MATRIX };
