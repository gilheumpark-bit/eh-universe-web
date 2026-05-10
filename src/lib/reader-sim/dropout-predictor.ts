// ============================================================
// dropout-predictor.ts — 화별 페르소나 engagement + 이탈 예측.
//
// 입력: 텐션 (Long-Arc 텐션 추정 재활용 가능) + 본문 길이 + 페르소나
// 출력: engagement 0~100 + dropout boolean
//
// 휴리스틱:
//   engagement = baseTension * persona.attentionSpan
//              + genreBonus(persona.genreAffinity)
//              - criticalityPenalty(monotony, length)
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { ReaderPersona, PersonaId, EngagementPoint, DropoutPrediction } from './types';
import { PERSONAS, PERSONA_IDS } from './personas';

const STRONG_VERBS = ['외쳤', '죽었', '폭발', '달려갔', '비명', '쾅', '쿵'];
const GENRE_HOOKS = ['검을', '마법', '공격', '방어', '전투', '회귀', '치트', '시스템'];

function baseTension(content: string): number {
  if (!content) return 0;
  const lenScore = Math.min(50, (content.length / 1000) * 50);
  const exclaim = (content.match(/[!?]/g) ?? []).length;
  let verbCount = 0;
  for (const v of STRONG_VERBS) {
    verbCount += (content.match(new RegExp(v, 'g')) ?? []).length;
  }
  return Math.min(100, Math.round(lenScore + Math.min(30, exclaim * 1.5) + Math.min(20, verbCount * 2)));
}

function genreHookCount(content: string): number {
  let count = 0;
  for (const k of GENRE_HOOKS) {
    count += (content.match(new RegExp(k, 'g')) ?? []).length;
  }
  return count;
}

function computeEngagement(content: string, persona: ReaderPersona): number {
  if (!content) return 0;
  const tension = baseTension(content);
  const genre = Math.min(20, genreHookCount(content)) * persona.genreAffinity;

  // 길이 페널티 (너무 길거나 너무 짧으면 비판적 독자가 -)
  let lenPenalty = 0;
  if (content.length < 500) lenPenalty = 10 * persona.criticality;
  else if (content.length > 8000) lenPenalty = 5 * persona.criticality;

  const e = Math.max(0, Math.min(100, tension * persona.attentionSpan + genre - lenPenalty));
  return Math.round(e);
}

// ============================================================
// Public API
// ============================================================

export interface PredictionResult {
  points: EngagementPoint[];
  predictions: DropoutPrediction[];
}

export function predictReaderEngagement(
  episodes: EpisodeManuscript[] | null | undefined,
): PredictionResult {
  if (!episodes || episodes.length === 0) return { points: [], predictions: [] };

  const sorted = [...episodes].sort((a, b) => a.episode - b.episode);
  const points: EngagementPoint[] = [];
  const predictions: DropoutPrediction[] = [];

  // 누적 이탈 페르소나 (한번 이탈하면 이후 이탈 상태 유지)
  const droppedOut: Record<PersonaId, boolean> = {
    'genre-fan': false,
    general: false,
    critical: false,
    casual: false,
    expert: false,
  };

  for (const ep of sorted) {
    const perPersona: Record<PersonaId, number> = {} as Record<PersonaId, number>;
    let sum = 0;
    for (const pid of PERSONA_IDS) {
      const persona = PERSONAS[pid];
      const eng = computeEngagement(ep.content ?? '', persona);
      perPersona[pid] = eng;
      sum += eng;

      // 이탈 판정 (누적, 한번 이탈하면 유지)
      if (!droppedOut[pid] && eng < persona.dropoutThreshold) {
        droppedOut[pid] = true;
      }
    }
    const avg = sum / PERSONA_IDS.length;
    points.push({ episodeId: ep.episode, perPersona, average: Math.round(avg) });

    const droppedCount = Object.values(droppedOut).filter(Boolean).length;
    predictions.push({
      episodeId: ep.episode,
      perPersona: { ...droppedOut },
      dropoutRate: droppedCount / PERSONA_IDS.length,
    });
  }

  return { points, predictions };
}
