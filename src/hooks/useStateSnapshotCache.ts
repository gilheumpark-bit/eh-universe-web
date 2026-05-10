"use client";
// ============================================================
// useStateSnapshotCache — 화별 캐릭터 상태 스냅샷 캐시.
// hash 변경 시 무효화. IndexedDB 저장은 옵션.
// ============================================================

import { useEffect, useMemo, useRef } from 'react';
import type { Character, EpisodeManuscript } from '@/lib/studio-types';
import type { CharacterVariableState, BreakpointLocation } from '@/lib/story-debugger/types';
import { buildCharacterStateAt } from '@/lib/story-debugger/state-snapshot';

function manuscriptHash(episodes: EpisodeManuscript[] | undefined): string {
  if (!episodes || episodes.length === 0) return 'empty';
  return episodes.map((e) => `${e.episode}:${e.charCount}`).join('|');
}

export interface UseStateSnapshotCacheResult {
  getStateAt: (loc: BreakpointLocation) => CharacterVariableState[];
  invalidate: () => void;
}

export function useStateSnapshotCache(
  characters: Character[] | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
): UseStateSnapshotCacheResult {
  const cacheRef = useRef<Map<string, CharacterVariableState[]>>(new Map());
  const hashRef = useRef<string>('empty');

  // hash 변경 시 cache invalidate
  const currentHash = useMemo(() => manuscriptHash(episodes ?? undefined), [episodes]);
  // [P0 fix — 2026-05-10] React 19 'refs-during-render' 위반 → useEffect 로 이동.
  // hash 변경 시 다음 commit 에 cache 클리어 — 1 render 지연 발생하나 stale read 회피.
  useEffect(() => {
    if (currentHash !== hashRef.current) {
      cacheRef.current.clear();
      hashRef.current = currentHash;
    }
  }, [currentHash]);

  const getStateAt = (loc: BreakpointLocation): CharacterVariableState[] => {
    const key = `${loc.episodeId}:${loc.paragraphIdx}`;
    const cached = cacheRef.current.get(key);
    if (cached) return cached;
    const states = buildCharacterStateAt(characters, episodes, loc.episodeId, loc.paragraphIdx);
    cacheRef.current.set(key, states);
    return states;
  };

  const invalidate = () => {
    cacheRef.current.clear();
  };

  return { getStateAt, invalidate };
}
