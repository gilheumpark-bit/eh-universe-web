// ============================================================
// step-engine.ts — Step Over / Into / Out 엔진.
//
// 정의:
//   - Step Over: 다음 화의 첫 paragraph 로 이동
//   - Step Into: 다음 paragraph 로 이동 (같은 화 안)
//   - Step Out: 현재 화의 마지막 paragraph 로 이동
//
// [C] 끝 도달 시 null 반환 / [G] paragraph 분할 캐시는 호출자 책임 / [K] pure
// ============================================================

import type { EpisodeManuscript } from '@/lib/studio-types';
import type { BreakpointLocation, StepKind, StoryFrame, WatchEntry, CharacterVariableState } from './types';
import { buildCharacterStateAt } from './state-snapshot';
import { evaluateWatches } from './watch-engine';
import type { Character } from '@/lib/studio-types';

// ============================================================
// PART 1 — Position math
// ============================================================

interface ResolvedEpisode {
  episodeId: number;
  paragraphCount: number;
  paragraphs: string[];
}

function resolveEpisode(ep: EpisodeManuscript): ResolvedEpisode {
  const paragraphs = (ep.content ?? '').split(/\n+/).filter((p) => p.length > 0);
  return { episodeId: ep.episode, paragraphCount: paragraphs.length, paragraphs };
}

// ============================================================
// PART 2 — Public API: nextLocation
// ============================================================

export function nextLocation(
  current: BreakpointLocation,
  step: StepKind,
  episodes: EpisodeManuscript[],
): BreakpointLocation | null {
  const sorted = [...episodes].sort((a, b) => a.episode - b.episode);
  const idx = sorted.findIndex((e) => e.episode === current.episodeId);
  if (idx < 0) return null;
  const cur = resolveEpisode(sorted[idx]);

  if (step === 'into') {
    if (current.paragraphIdx + 1 < cur.paragraphCount) {
      return { episodeId: current.episodeId, paragraphIdx: current.paragraphIdx + 1 };
    }
    // paragraph 끝 — 다음 화 첫 paragraph
    return idx + 1 < sorted.length
      ? { episodeId: sorted[idx + 1].episode, paragraphIdx: 0 }
      : null;
  }

  if (step === 'over') {
    return idx + 1 < sorted.length
      ? { episodeId: sorted[idx + 1].episode, paragraphIdx: 0 }
      : null;
  }

  if (step === 'out') {
    return cur.paragraphCount > 0
      ? { episodeId: current.episodeId, paragraphIdx: cur.paragraphCount - 1 }
      : null;
  }

  return null;
}

// ============================================================
// PART 3 — Build StoryFrame at a location
// ============================================================

export function buildFrameAt(
  loc: BreakpointLocation,
  characters: Character[] | undefined,
  episodes: EpisodeManuscript[],
  watches: WatchEntry[] = [],
): StoryFrame {
  const characterStates = buildCharacterStateAt(characters, episodes, loc.episodeId, loc.paragraphIdx);
  const watchResults = evaluateWatches(watches, episodes, loc.episodeId, characterStates);

  const watchValues: Record<string, string | null> = {};
  for (const r of watchResults) {
    if (r.matchedAt.length === 0) {
      watchValues[r.watchId] = null;
    } else {
      const last = r.matchedAt[r.matchedAt.length - 1];
      watchValues[r.watchId] = `EP${last.episodeId}@${last.charOffset} : ${last.surface}`;
    }
  }

  // 떡밥 누적 (해당 시점까지 등장한 setup ID list)
  const foreshadowSeen: string[] = [];
  for (const ep of episodes) {
    if (ep.episode > loc.episodeId) break;
    if (!ep.content) continue;
    const matches = ep.content.matchAll(/\[(?:떡밥|복선|foreshadow|setup)-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/gi);
    for (const m of matches) {
      if (!foreshadowSeen.includes(m[1])) foreshadowSeen.push(m[1]);
    }
  }

  const ep = episodes.find((e) => e.episode === loc.episodeId);
  const paragraphs = ep ? (ep.content ?? '').split(/\n+/).filter((p) => p.length > 0) : [];
  const paragraphText = paragraphs[loc.paragraphIdx];

  return {
    episodeId: loc.episodeId,
    paragraphIdx: loc.paragraphIdx,
    characters: characterStates,
    foreshadowSeen,
    watchValues,
    ...(paragraphText ? { paragraphText } : {}),
  };
}
