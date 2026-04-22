/**
 * 축 1: 세계관 사실 일치 (Worldbook Consistency).
 *
 * worldbook에 명시된 고유명사(인물·지명·특수 용어)가 초안에서 **정확한 표기**로
 * 나타나는지 검사한다. 작가 Codex의 entities 배열이 직접 주입되는 전제.
 *
 * MVP 한계:
 *   - exact match 기반. 변형·오탈자 허용 안 함.
 *   - semantic consistency(예: "검이 부러졌다" → "검을 휘둘렀다" 같은 state mismatch)는
 *     불가능. 이건 LLM Auditor 필요 — 후속 확장 인터페이스로 설계.
 */

import type { AxisContext, AxisResult, AxisIssue } from '../types';
import { DEFAULT_WEIGHTS } from '../types';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[1];

export function scoreAxis1Worldbook(ctx: AxisContext): AxisResult {
  const entities = ctx.worldbookEntities ?? [];
  const draft = ctx.draft ?? '';

  if (entities.length === 0) {
    // worldbook 엔티티 없으면 채점 대상 아님 — 만점 처리
    return {
      axis: 1,
      name: '세계관 사실 일치',
      score: 100,
      weight: AXIS_WEIGHT,
      passed: true,
      issues: [],
      recommendations: ['worldbook 엔티티 미정의 — 채점 생략 (Codex 세계관 등록 권장).'],
    };
  }

  const issues: AxisIssue[] = [];
  let matched = 0;
  for (const entity of entities) {
    if (!entity || entity.length < 2) continue;
    if (draft.includes(entity)) {
      matched += 1;
    } else {
      issues.push({
        severity: 'warning',
        message: `worldbook 엔티티 "${entity}" 초안에 등장 안 함 — 맥락상 필요하면 추가 고려.`,
      });
    }
  }

  const coverageRatio = entities.length > 0 ? matched / entities.length : 1;
  // coverage가 낮아도 모든 엔티티가 초안에 등장해야 한다는 건 아님 — 점진 감점
  const score = Math.round(60 + coverageRatio * 40);
  const passed = score >= 80 && issues.every(i => i.severity !== 'critical');

  return {
    axis: 1,
    name: '세계관 사실 일치',
    score,
    weight: AXIS_WEIGHT,
    passed,
    issues,
    recommendations: passed ? [] : [
      `worldbook 엔티티 커버리지 ${Math.round(coverageRatio * 100)}% — 주요 고유명사 재확인.`,
    ],
  };
}
