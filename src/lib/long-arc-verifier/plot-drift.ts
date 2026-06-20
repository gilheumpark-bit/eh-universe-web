// ============================================================
// PART 1 — Module Header
// ============================================================
//
// plot-drift.ts — 시놉시스 vs 화별 흐름 cosine similarity.
//
// LLM 임베딩 호출은 외부 의존 — 본 모듈은 fallback 로컬 휴리스틱.
// 1차: 시놉시스 명사 추출 → 화별 명사 등장 빈도 → Jaccard / cosine
// 2차 (Phase 2): DGX embedding API 연동
//
// [C] 빈 시놉시스 / 빈 episodes → score 100 (위반 없음으로 처리)
// [G] 명사 추출 단순 — 한글 2글자+ word boundary
// [K] LLM 호출 0 — Phase 1 결정론적 회귀 가능
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { AxisResult, Violation, DriftScore } from './types';

// ============================================================
// PART 2 — Helpers
// ============================================================

/** 한국어/영어/한자 단어 추출 — 2글자+ */
function extractTokens(text: string): Set<string> {
  if (!text) return new Set();
  const tokens = text.match(/[가-힣]{2,}|[a-zA-Z]{3,}|[一-龥]{2,}/g);
  return new Set(tokens ?? []);
}

/** Jaccard 유사도 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) {
    if (b.has(t)) intersect++;
  }
  return intersect / (a.size + b.size - intersect);
}

// ============================================================
// PART 3 — Axis runner
// ============================================================

export interface PlotDriftOptions {
  /** drift 임계값 (이 미만이면 위반) — 기본 0.10 */
  threshold?: number;
  /** 검사 시작 화수 (기본 1) */
  fromEpisode?: number;
}

/**
 * 시놉시스 vs 화별 흐름 검증.
 *
 * @param synopsis StoryConfig.synopsis
 * @param episodes 본문
 * @param options threshold / fromEpisode
 */
export function runPlotDriftAxis(
  synopsis: string | undefined | null,
  episodes: EpisodeManuscript[] | null | undefined,
  options: PlotDriftOptions = {},
): AxisResult {
  const start = Date.now();
  const threshold = options.threshold ?? 0.1;
  const fromEp = options.fromEpisode ?? 1;

  // [C] 빈 입력 가드
  if (!synopsis || !episodes || episodes.length === 0) {
    return {
      axis: 'plot-drift',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  const synTokens = extractTokens(synopsis);
  if (synTokens.size === 0) {
    return {
      axis: 'plot-drift',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  const violations: Violation[] = [];
  let scoreSum = 0;
  let counted = 0;

  for (const ep of episodes) {
    if (ep.episode < fromEp || !ep.content) continue;
    const epTokens = extractTokens(ep.content);
    const sim = jaccard(synTokens, epTokens);
    scoreSum += sim;
    counted++;

    if (sim < threshold) {
      violations.push({
        kind: 'plot-drift',
        severity: sim < threshold * 0.5 ? 'error' : 'warning',
        episodeId: ep.episode,
        messages: {
          ko: `시놉시스와 EP${ep.episode} 흐름 일치율 ${(sim * 100).toFixed(1)}% — 임계값 ${(threshold * 100).toFixed(0)}% 미만`,
          en: `EP${ep.episode} synopsis-flow similarity ${(sim * 100).toFixed(1)}% — below threshold ${(threshold * 100).toFixed(0)}%`,
          ja: `EP${ep.episode} のあらすじ整合率 ${(sim * 100).toFixed(1)}% — 閾値未満`,
          zh: `EP${ep.episode} 与大纲一致率 ${(sim * 100).toFixed(1)}% — 低于阈值`,
        },
        jumpTarget: { episodeId: ep.episode },
        meta: { similarity: sim, threshold },
      });
    }
  }

  const avgSim = counted > 0 ? scoreSum / counted : 1;
  // [G] 100 score = avg similarity * 100
  const score = Math.round(avgSim * 100);

  return {
    axis: 'plot-drift',
    score,
    violations,
    durationMs: Date.now() - start,
  };
}

// ============================================================
// PART 4 — Single-episode score (Hover / Quick check 용)
// ============================================================

export function computePlotDriftScore(
  synopsis: string | undefined | null,
  episodeContent: string | undefined | null,
): DriftScore {
  if (!synopsis || !episodeContent) {
    return { similarity: 1, driftScore: 100, details: 'empty input' };
  }
  const synTokens = extractTokens(synopsis);
  const epTokens = extractTokens(episodeContent);
  const sim = jaccard(synTokens, epTokens);
  return {
    similarity: sim,
    driftScore: Math.round(sim * 100),
    details: `Jaccard tokens(syn=${synTokens.size}, ep=${epTokens.size})`,
  };
}
