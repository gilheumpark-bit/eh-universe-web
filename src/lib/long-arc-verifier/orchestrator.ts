// ============================================================
// PART 1 — Module Header
// ============================================================
//
// orchestrator.ts — Long-Arc Verifier 5축 통합 실행기.
//
// 입력: StoryConfig + EpisodeManuscript[]
// 출력: VerifierReport (5축 결과 + 종합 점수 + 우선순위 list)
//
// 5축 가중:
//   plotDrift     30%
//   characterArc  20%
//   worldRule     15%
//   foreshadow    20%
//   tension       15%
//
// [C] config null → 빈 report
// [G] 5축 병렬 — Promise.all (현재 모두 동기 함수지만 future-proof)
// [K] 점수 산출 로직만 — Renderer 별도 모듈
// ============================================================

import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import type { AxisResult, VerifierReport, Violation } from './types';
import { runPlotDriftAxis } from './plot-drift';
import { runCharacterArcAxis } from './character-arc-tracker';
import { runWorldViolationAxis } from './worldbook-violation';
import { runForeshadowAxis } from './foreshadow-tracker';
import { runSubplotAxis } from './subplot-tracker';
import { runTensionAxis } from './tension-trajectory';

// ============================================================
// PART 2 — Weights & helpers
// ============================================================

const AXIS_WEIGHTS = {
  plotDrift: 0.3,
  characterArc: 0.2,
  worldViolation: 0.15,
  foreshadow: 0.2,
  tension: 0.15,
} as const;

function severityRank(s: Violation['severity']): number {
  if (s === 'error') return 3;
  if (s === 'warning') return 2;
  return 1;
}

/** 위반 우선순위 정렬 — severity desc → episodeId asc */
function prioritize(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) => {
    const sevDiff = severityRank(b.severity) - severityRank(a.severity);
    if (sevDiff !== 0) return sevDiff;
    const ea = a.episodeId ?? Number.MAX_SAFE_INTEGER;
    const eb = b.episodeId ?? Number.MAX_SAFE_INTEGER;
    return ea - eb;
  });
}

function quickHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// ============================================================
// PART 3 — Public API
// ============================================================

export interface VerifierOptions {
  projectId: string;
  /** 5축 중 일부만 실행 (성능 / 점진 적용) — 기본 모두 */
  enabledAxes?: Array<'plotDrift' | 'characterArc' | 'worldViolation' | 'foreshadow' | 'tension'>;
}

/**
 * 5축 통합 검증.
 */
export async function runLongArcVerification(
  config: StoryConfig | null | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
  options: VerifierOptions,
): Promise<VerifierReport> {
  const enabled = new Set(
    options.enabledAxes ?? ['plotDrift', 'characterArc', 'worldViolation', 'foreshadow', 'tension'],
  );

  // [C] empty input → 빈 report
  if (!config) {
    const empty = makeEmptyAxis('plot-drift');
    return {
      projectId: options.projectId,
      generatedAt: new Date().toISOString(),
      axes: {
        plotDrift: empty,
        characterArc: makeEmptyAxis('character-arc'),
        worldViolation: makeEmptyAxis('world'),
        foreshadow: makeEmptyAxis('foreshadow'),
        tension: makeEmptyAxis('tension'),
      },
      overallScore: 100,
      prioritized: [],
      totalViolations: 0,
      manuscriptHash: 'empty',
    };
  }

  // 5축 병렬
  const [plotDrift, characterArc, worldViolation, foreshadow1, foreshadow2, tension] =
    await Promise.all([
      enabled.has('plotDrift')
        ? Promise.resolve(runPlotDriftAxis(config.synopsis, episodes))
        : Promise.resolve(makeEmptyAxis('plot-drift')),
      enabled.has('characterArc')
        ? Promise.resolve(runCharacterArcAxis(config.characters, episodes))
        : Promise.resolve(makeEmptyAxis('character-arc')),
      enabled.has('worldViolation')
        ? Promise.resolve(runWorldViolationAxis(config, episodes))
        : Promise.resolve(makeEmptyAxis('world')),
      enabled.has('foreshadow')
        ? Promise.resolve(runForeshadowAxis(episodes))
        : Promise.resolve(makeEmptyAxis('foreshadow')),
      enabled.has('foreshadow')
        ? Promise.resolve(runSubplotAxis(episodes))
        : Promise.resolve(makeEmptyAxis('foreshadow')),
      enabled.has('tension')
        ? Promise.resolve(runTensionAxis(episodes))
        : Promise.resolve(makeEmptyAxis('tension')),
    ]);

  // foreshadow + subplot 합산 (같은 axis 슬롯)
  const mergedForeshadow: AxisResult = {
    axis: 'foreshadow',
    score: Math.round((foreshadow1.score + foreshadow2.score) / 2),
    violations: [...foreshadow1.violations, ...foreshadow2.violations],
    durationMs: foreshadow1.durationMs + foreshadow2.durationMs,
  };

  const allViolations: Violation[] = [
    ...plotDrift.violations,
    ...characterArc.violations,
    ...worldViolation.violations,
    ...mergedForeshadow.violations,
    ...tension.violations,
  ];

  const overallScore = Math.round(
    plotDrift.score * AXIS_WEIGHTS.plotDrift +
      characterArc.score * AXIS_WEIGHTS.characterArc +
      worldViolation.score * AXIS_WEIGHTS.worldViolation +
      mergedForeshadow.score * AXIS_WEIGHTS.foreshadow +
      tension.score * AXIS_WEIGHTS.tension,
  );

  const manuscriptText = (episodes ?? []).map((e) => `${e.episode}:${e.charCount}`).join('|');

  return {
    projectId: options.projectId,
    generatedAt: new Date().toISOString(),
    axes: {
      plotDrift,
      characterArc,
      worldViolation,
      foreshadow: mergedForeshadow,
      tension,
    },
    overallScore,
    prioritized: prioritize(allViolations),
    totalViolations: allViolations.length,
    manuscriptHash: quickHash(manuscriptText),
  };
}

// ============================================================
// PART 4 — Helpers
// ============================================================

function makeEmptyAxis(axis: AxisResult['axis']): AxisResult {
  return { axis, score: 100, violations: [], durationMs: 0 };
}
