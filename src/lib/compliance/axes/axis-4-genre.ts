/**
 * 축 4: 장르 룰 준수 (Genre Rules).
 *
 * 해당 장르의 **금지구문**(forbiddenPhrases)과 **필수 모티프**(requiredMotifs)
 * 매칭을 검사. 실제 25 장르 룰북의 상세 룰은 별도 데이터로 관리 — 이 모듈은
 * 주입받은 룰을 단순 적용.
 *
 * 예시 (회귀물):
 *   forbiddenPhrases: ['원래 세계는', '미래에서 왔다']  // 정체 초장 누설 금지
 *   requiredMotifs: ['회귀', '다시', '두 번째 삶']
 */

import type { AxisContext, AxisResult, AxisIssue } from '../types';
import { DEFAULT_WEIGHTS } from '../types';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[4];

export function scoreAxis4Genre(ctx: AxisContext): AxisResult {
  const rules = ctx.genre;
  const draft = ctx.draft ?? '';

  if (!rules || !rules.genreId) {
    return {
      axis: 4,
      name: '장르 룰 준수',
      score: 100,
      weight: AXIS_WEIGHT,
      passed: true,
      issues: [],
      recommendations: ['장르 미지정 — 채점 생략.'],
    };
  }

  const issues: AxisIssue[] = [];
  let forbiddenHits = 0;
  for (const phrase of rules.forbiddenPhrases ?? []) {
    if (!phrase || phrase.length < 2) continue;
    if (draft.includes(phrase)) {
      forbiddenHits += 1;
      issues.push({
        severity: 'critical',
        message: `장르 "${rules.genreId}" 금지구문 "${phrase}" 등장.`,
      });
    }
  }

  const requiredMotifs = rules.requiredMotifs ?? [];
  let motifsFound = 0;
  for (const motif of requiredMotifs) {
    if (!motif || motif.length < 2) continue;
    if (draft.includes(motif)) motifsFound += 1;
  }

  const motifCoverage = requiredMotifs.length > 0 ? motifsFound / requiredMotifs.length : 1;
  const motifPenalty = requiredMotifs.length > 0 && motifCoverage < 0.3 ? 15 : 0;
  if (motifPenalty > 0) {
    issues.push({
      severity: 'warning',
      message: `필수 모티프 매칭 ${Math.round(motifCoverage * 100)}% — 장르 정체 약함.`,
    });
  }

  const score = Math.max(0, 100 - forbiddenHits * 25 - motifPenalty);
  const passed = score >= 80 && forbiddenHits === 0;

  return {
    axis: 4,
    name: '장르 룰 준수',
    score,
    weight: AXIS_WEIGHT,
    passed,
    issues,
    recommendations: passed ? [] : [
      forbiddenHits > 0 ? `장르 금지구문 ${forbiddenHits}건 — 재생성 시 해당 표현 회피.` : '',
      motifPenalty > 0 ? `필수 모티프 "${requiredMotifs.slice(0, 3).join(', ')}" 강조.` : '',
    ].filter(Boolean),
  };
}
