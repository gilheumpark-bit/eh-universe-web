// ============================================================
// PART 1 — Module Header
// ============================================================
//
// tension-trajectory.ts — 텐션 곡선 검증.
//
// 텐션 추정 (LLM 없이 결정론적):
//   - 본문 길이 / 100자 = 베이스 텐션 (0~50)
//   - 감탄부호 (! ?) 빈도 → +(0~30)
//   - 강한 동사 키워드 (외쳤다 / 죽었다 / 폭발 / 달려갔다) → +(0~20)
//   - 합산 0~100 clamp
//
// 꺾임(inflection) 탐지: 인접 화 ±20 이상 변화.
//
// [C] episode 0개 → score 100
// [G] 단일 패스
// [K] series-direction-dna 호출 X (Phase 2 통합) — 자체 추정만
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { AxisResult, TensionPoint, TensionTrajectory, Violation } from './types';

// ============================================================
// PART 2 — Tension scoring
// ============================================================

const STRONG_VERBS = ['외쳤', '소리쳤', '죽었', '폭발', '달려갔', '쓰러졌', '비명', '쾅', '쿵', '꽝'];

function estimateTension(text: string): number {
  if (!text) return 0;
  // 베이스: 길이 (1000자 → 50점)
  const lenScore = Math.min(50, (text.length / 1000) * 50);
  // 감탄부호 빈도
  const exclaim = (text.match(/[!?]/g) ?? []).length;
  const exclaimScore = Math.min(30, exclaim * 1.5);
  // 강한 동사
  let verbCount = 0;
  for (const v of STRONG_VERBS) {
    const re = new RegExp(v, 'g');
    verbCount += (text.match(re) ?? []).length;
  }
  const verbScore = Math.min(20, verbCount * 2);
  return Math.min(100, Math.round(lenScore + exclaimScore + verbScore));
}

// ============================================================
// PART 3 — Trajectory + Inflection
// ============================================================

export function buildTensionTrajectory(
  episodes: EpisodeManuscript[] | null | undefined,
): TensionTrajectory {
  if (!episodes || episodes.length === 0) {
    return { points: [], inflectionCount: 0, avgDeviation: 0 };
  }
  const sorted = [...episodes].sort((a, b) => a.episode - b.episode);
  const points: TensionPoint[] = sorted.map((ep) => ({
    episodeId: ep.episode,
    tension: estimateTension(ep.content ?? ''),
    isInflection: false,
  }));

  let inflectionCount = 0;
  let devSum = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].tension - points[i - 1].tension);
    devSum += diff;
    if (diff >= 20) {
      points[i].isInflection = true;
      inflectionCount++;
    }
  }
  const avgDeviation = points.length > 1 ? devSum / (points.length - 1) : 0;

  return { points, inflectionCount, avgDeviation };
}

// ============================================================
// PART 4 — Axis runner
// ============================================================

export interface TensionOptions {
  /** 꺾임 임계 (점수 변화 ±이 이상이면 꺾임) — 기본 20 */
  inflectionThreshold?: number;
  /** 평균 편차 임계 (이 미만이면 단조로움 경고) — 기본 5 */
  monotonyThreshold?: number;
}

export function runTensionAxis(
  episodes: EpisodeManuscript[] | null | undefined,
  options: TensionOptions = {},
): AxisResult {
  const start = Date.now();
  const monotonyThreshold = options.monotonyThreshold ?? 5;

  const trajectory = buildTensionTrajectory(episodes);

  const violations: Violation[] = [];

  if (trajectory.points.length === 0) {
    return {
      axis: 'tension',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  // 위반 1: 단조 (avgDeviation 너무 낮음)
  if (trajectory.avgDeviation < monotonyThreshold && trajectory.points.length >= 5) {
    violations.push({
      kind: 'tension-trajectory-deviation',
      severity: 'warning',
      messages: {
        ko: `텐션 곡선 단조 — 평균 편차 ${trajectory.avgDeviation.toFixed(1)}점, 화별 변동 부족`,
        en: `Tension curve monotone — avg deviation ${trajectory.avgDeviation.toFixed(1)}, low episode-to-episode variation`,
        ja: `テンション曲線が単調 — 変動不足`,
        zh: `紧张度曲线单调 — 变动不足`,
      },
      meta: { avgDeviation: trajectory.avgDeviation },
    });
  }

  // 위반 2: 급격한 꺾임 (한 화에서 ±40 이상)
  for (let i = 1; i < trajectory.points.length; i++) {
    const diff = trajectory.points[i].tension - trajectory.points[i - 1].tension;
    if (Math.abs(diff) >= 40) {
      violations.push({
        kind: 'tension-trajectory-deviation',
        severity: 'info',
        episodeId: trajectory.points[i].episodeId,
        messages: {
          ko: `EP${trajectory.points[i].episodeId} 텐션 ${diff > 0 ? '+' : ''}${diff} 급변동 (${trajectory.points[i - 1].tension} → ${trajectory.points[i].tension})`,
          en: `EP${trajectory.points[i].episodeId} tension shift ${diff > 0 ? '+' : ''}${diff}`,
          ja: `EP${trajectory.points[i].episodeId} 急変動`,
          zh: `EP${trajectory.points[i].episodeId} 急剧变动`,
        },
        jumpTarget: { episodeId: trajectory.points[i].episodeId },
        meta: { diff, prev: trajectory.points[i - 1].tension, curr: trajectory.points[i].tension },
      });
    }
  }

  // score: 단조 1건 -15 / 급변동 1건 -3
  const monotonyPenalty = violations.filter((v) => v.severity === 'warning').length * 15;
  const inflectionPenalty = violations.filter((v) => v.severity === 'info').length * 3;
  const score = Math.max(0, 100 - monotonyPenalty - inflectionPenalty);

  return {
    axis: 'tension',
    score,
    violations,
    durationMs: Date.now() - start,
  };
}
