/**
 * Compliance Orchestrator (2026-04-23 신설).
 *
 * 7축 채점 통합 실행기. AI 초안 생성 후 이 함수 1회 호출로 전 축 결과와
 * 재생성 지시문을 얻는다.
 *
 * 파이프라인 위치:
 *   [AI 생성] → scoreAllAxes(ctx) → [불합격 시 applyDirectiveToPrompt + 재생성]
 */

import { scoreAxis1Worldbook } from './axes/axis-1-worldbook';
import { scoreAxis2Character } from './axes/axis-2-character';
import { scoreAxis3Direction } from './axes/axis-3-direction';
import { scoreAxis4Genre } from './axes/axis-4-genre';
import { scoreAxis5SceneSheet } from './axes/axis-5-scene-sheet';
import { scoreAxis6Continuity } from './axes/axis-6-continuity';
import { scoreAxis7IP } from './axes/axis-7-ip';

import type { AxisContext, AxisResult, ComplianceReport } from './types';
import { DEFAULT_PASS_THRESHOLD } from './types';

// ============================================================
// PART 1 — 오케스트레이션
// ============================================================

export interface ScoreAllOptions {
  /** 총점 합격 임계 (기본 80) */
  readonly totalPassThreshold?: number;
  /** critical 1건이라도 있으면 무조건 불합격 (기본 true) */
  readonly strictCritical?: boolean;
  /** 실행할 축 제한 — 부분 채점 (기본 1~7 전부) */
  readonly axesToRun?: readonly AxisResult['axis'][];
}

/**
 * 7축 채점 통합 실행.
 *
 * 각 축은 독립 순수 함수라 예외 처리는 간단 try/catch — 한 축 실패 시
 * 해당 축만 score 0으로 기록하고 나머지 계속 실행.
 */
export function scoreAllAxes(ctx: AxisContext, options: ScoreAllOptions = {}): ComplianceReport {
  const totalThreshold = options.totalPassThreshold ?? DEFAULT_PASS_THRESHOLD;
  const strict = options.strictCritical ?? true;
  const allowed = options.axesToRun;

  const runAxis = (axisId: AxisResult['axis'], fn: (ctx: AxisContext) => AxisResult): AxisResult | null => {
    if (allowed && !allowed.includes(axisId)) return null;
    try {
      return fn(ctx);
    } catch (err) {
      return {
        axis: axisId,
        name: `axis-${axisId} error`,
        score: 0,
        weight: 0,
        passed: false,
        issues: [{ severity: 'critical', message: `축 ${axisId} 실행 실패: ${(err as Error).message}` }],
        recommendations: [`축 ${axisId} 내부 예외 — 컨텍스트 점검 필요.`],
      };
    }
  };

  const axes = [
    runAxis(1, scoreAxis1Worldbook),
    runAxis(2, scoreAxis2Character),
    runAxis(3, scoreAxis3Direction),
    runAxis(4, scoreAxis4Genre),
    runAxis(5, scoreAxis5SceneSheet),
    runAxis(6, scoreAxis6Continuity),
    runAxis(7, scoreAxis7IP),
  ].filter((a): a is AxisResult => a !== null);

  // 가중 평균. 가중치 합이 0이면(전부 스킵) 100 처리.
  const weightSum = axes.reduce((s, a) => s + a.weight, 0);
  const totalScore = weightSum === 0
    ? 100
    : Math.round(axes.reduce((s, a) => s + a.score * a.weight, 0) / weightSum);

  const criticalCount = axes.reduce(
    (s, a) => s + a.issues.filter(i => i.severity === 'critical').length,
    0,
  );

  const allPassed =
    totalScore >= totalThreshold &&
    axes.every(a => a.passed) &&
    (!strict || criticalCount === 0);

  const regenerationDirective = buildRegenerationDirective(axes, {
    totalScore,
    criticalCount,
  });

  return {
    totalScore,
    allPassed,
    criticalCount,
    axes,
    regenerationDirective,
  };
}

// ============================================================
// PART 2 — 재생성 지시문 빌더
// ============================================================

function buildRegenerationDirective(
  axes: readonly AxisResult[],
  summary: { totalScore: number; criticalCount: number },
): string {
  const failing = axes.filter(a => !a.passed);
  if (failing.length === 0) return '';

  const lines: string[] = [
    '[재생성 지시 — 준수 채점 불합격]',
    `총점 ${summary.totalScore}/100, critical 이슈 ${summary.criticalCount}건.`,
    '',
    '다음 축이 불합격입니다. 재생성 시 각 지적을 반영하여 재작성하세요:',
  ];

  for (const axis of failing) {
    lines.push(`\n[축 ${axis.axis} — ${axis.name}: ${axis.score}/100]`);
    for (const rec of axis.recommendations) {
      if (rec && rec.trim()) lines.push(`  - ${rec}`);
    }
    const criticals = axis.issues.filter(i => i.severity === 'critical');
    for (const c of criticals.slice(0, 3)) {
      lines.push(`  ⚠ ${c.message}`);
    }
  }

  return lines.join('\n');
}

// ============================================================
// PART 3 — 재생성 프롬프트 적용
// ============================================================

/**
 * 원본 사용자 지시 + 재생성 지시문 결합.
 * 호출 측이 재생성 루프에서 그대로 AI에 보내면 된다.
 */
export function applyDirectiveToPrompt(originalPrompt: string, report: ComplianceReport): string {
  if (report.allPassed || !report.regenerationDirective) return originalPrompt;
  return `${originalPrompt}\n\n${report.regenerationDirective}`;
}
