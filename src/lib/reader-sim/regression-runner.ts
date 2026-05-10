// ============================================================
// regression-runner.ts — Push 전 자동 회귀 시뮬.
// 모든 페르소나 × 모든 화 임계 통과 여부.
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { PersonaId } from './types';
import { PERSONAS, PERSONA_IDS } from './personas';
import { buildEngagementProfile } from './engagement-profiler';

export interface RegressionResult {
  passed: boolean;
  /** 페르소나별 첫 이탈 화수 (있으면 임계 위반) */
  failedPersonas: Array<{ pid: PersonaId; firstDropoutEpisode: number; threshold: number }>;
  averageEngagement: number;
  finalDropoutRate: number;
  /** Push 차단 권장 여부 (3+ 페르소나 이탈) */
  blockPush: boolean;
}

export function runRegressionCheck(
  episodes: EpisodeManuscript[] | null | undefined,
): RegressionResult {
  const profile = buildEngagementProfile(episodes);
  const failed: RegressionResult['failedPersonas'] = [];

  for (const pid of PERSONA_IDS) {
    const firstOut = profile.dropoutEpisodeByPersona[pid];
    if (firstOut !== undefined) {
      failed.push({ pid, firstDropoutEpisode: firstOut, threshold: PERSONAS[pid].dropoutThreshold });
    }
  }

  return {
    passed: failed.length === 0,
    failedPersonas: failed,
    averageEngagement: profile.averageEngagement,
    finalDropoutRate: profile.finalDropoutRate,
    blockPush: failed.length >= 3,
  };
}
