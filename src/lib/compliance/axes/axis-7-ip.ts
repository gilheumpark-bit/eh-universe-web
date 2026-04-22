/**
 * 축 7: IP / 브랜드 위반 (재수출 래퍼).
 *
 * 실제 구현은 `src/lib/ip-guard/compliance-axis-7.ts`의 `scoreIPCompliance`.
 * 이 모듈은 축 1~6과 동일한 `AxisResult` 인터페이스로 감싸서 orchestrator가
 * 균일하게 호출할 수 있도록 한다.
 */

import type { AxisContext, AxisResult, AxisIssue } from '../types';
import { DEFAULT_WEIGHTS } from '../types';
import { scoreIPCompliance } from '@/lib/ip-guard/compliance-axis-7';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[7];

export function scoreAxis7IP(ctx: AxisContext): AxisResult {
  const result = scoreIPCompliance(ctx.draft);

  const issues: AxisIssue[] = [];
  for (const b of result.criticalBrands) {
    issues.push({
      severity: 'critical',
      message: `실존 IP "${b.matched}" (공식명: ${b.entry.canonical}) 본문 등장.`,
      position: b.position,
    });
  }
  for (const w of result.warnings) {
    issues.push({
      severity: 'warning',
      message: w.message,
      position: w.position,
    });
  }

  return {
    axis: 7,
    name: 'IP/브랜드 위반',
    score: result.score,
    weight: AXIS_WEIGHT,
    passed: result.passed,
    issues,
    recommendations: result.passed ? [] : [result.reason],
  };
}
