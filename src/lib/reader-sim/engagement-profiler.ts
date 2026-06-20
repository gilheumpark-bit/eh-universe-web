// ============================================================
// engagement-profiler.ts — 시뮬 결과 통합.
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { EngagementProfile, PersonaId } from './types';
import { PERSONA_IDS } from './personas';
import { predictReaderEngagement } from './dropout-predictor';

export function buildEngagementProfile(
  episodes: EpisodeManuscript[] | null | undefined,
): EngagementProfile {
  const start = Date.now();
  const { points, predictions } = predictReaderEngagement(episodes);

  if (points.length === 0) {
    return {
      points: [],
      predictions: [],
      averageEngagement: 0,
      finalDropoutRate: 0,
      dropoutEpisodeByPersona: {
        'genre-fan': undefined,
        general: undefined,
        critical: undefined,
        casual: undefined,
        expert: undefined,
      },
      durationMs: Date.now() - start,
    };
  }

  const averageEngagement = Math.round(
    points.reduce((sum, p) => sum + p.average, 0) / points.length,
  );

  const lastPred = predictions[predictions.length - 1];
  const finalDropoutRate = lastPred.dropoutRate;

  // 페르소나별 첫 이탈 화수 찾기
  const dropoutEpisodeByPersona: Record<PersonaId, number | undefined> = {} as Record<PersonaId, number | undefined>;
  for (const pid of PERSONA_IDS) {
    const firstOut = predictions.find((p) => p.perPersona[pid]);
    dropoutEpisodeByPersona[pid] = firstOut?.episodeId;
  }

  return {
    points,
    predictions,
    averageEngagement,
    finalDropoutRate,
    dropoutEpisodeByPersona,
    durationMs: Date.now() - start,
  };
}
