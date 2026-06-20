// ============================================================
// watch-engine.ts — Watch 변수 추적.
//
// 종류:
//   - character: 캐릭터 이름 (CharacterVariableState 의 emotion/inventory)
//   - foreshadow: 떡밥 ID — 본문에서 [떡밥-{id}] 등장 화수
//   - expression: 임의 정규식
//
// [C] 빈 watches → empty / [G] 단일 패스 / [K] 단일 책임
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { WatchEntry, CharacterVariableState } from './types';

export interface WatchEvaluationResult {
  watchId: string;
  matchedAt: { episodeId: number; charOffset: number; surface: string }[];
  /** 캐릭터 추적인 경우 현재 상태 */
  characterState?: CharacterVariableState;
}

/**
 * 모든 Watch entry 를 evaluate.
 */
export function evaluateWatches(
  watches: WatchEntry[],
  episodes: EpisodeManuscript[] | null | undefined,
  upToEpisodeId: number,
  characterStates: CharacterVariableState[] = [],
): WatchEvaluationResult[] {
  if (!episodes || watches.length === 0) {
    return watches.map((w) => ({ watchId: w.id, matchedAt: [] }));
  }

  return watches.map((w) => evaluateOne(w, episodes, upToEpisodeId, characterStates));
}

function evaluateOne(
  w: WatchEntry,
  episodes: EpisodeManuscript[],
  upToEpisodeId: number,
  characterStates: CharacterVariableState[],
): WatchEvaluationResult {
  const result: WatchEvaluationResult = { watchId: w.id, matchedAt: [] };

  if (w.kind === 'character') {
    const cs = characterStates.find((s) => s.characterName === w.target);
    if (cs) result.characterState = cs;
  }

  // 본문 스캔 (foreshadow / expression / character 모두 본문 매칭 보강)
  let pat: RegExp | null = null;
  if (w.kind === 'foreshadow') {
    const escaped = w.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pat = new RegExp(`\\[(?:떡밥|복선|회수|foreshadow|payoff)-${escaped}\\]`, 'g');
  } else if (w.kind === 'expression') {
    try {
      pat = new RegExp(w.target, 'g');
    } catch {
      // [C] 정규식 invalid — fallback literal
      const escaped = w.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pat = new RegExp(escaped, 'g');
    }
  } else {
    const escaped = w.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pat = new RegExp(escaped, 'g');
  }

  for (const ep of episodes) {
    if (ep.episode > upToEpisodeId) break;
    if (!ep.content || !pat) continue;
    pat.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(ep.content)) !== null) {
      result.matchedAt.push({
        episodeId: ep.episode,
        charOffset: m.index,
        surface: m[0],
      });
    }
  }

  return result;
}
