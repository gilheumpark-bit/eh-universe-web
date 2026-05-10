"use client";
// ============================================================
// useStoryDebugger — Story Debugger 상태 + 단축키 통합 훅.
//
// 단축키:
//   F5         start
//   Shift+F5   stop
//   F10        Step Over
//   F11        Step Into
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import type { Character, EpisodeManuscript } from '@/lib/studio-types';
import type {
  Breakpoint,
  BreakpointLocation,
  StoryFrame,
  WatchEntry,
  CallHierarchy,
} from '@/lib/story-debugger/types';
import {
  getAllBreakpoints,
  setBreakpoint,
  removeBreakpoint,
  toggleBreakpoint,
} from '@/lib/story-debugger/breakpoint';
import { nextLocation, buildFrameAt } from '@/lib/story-debugger/step-engine';
import { buildCallHierarchy } from '@/lib/story-debugger/call-hierarchy';
// [후속 A-3 — 2026-05-07] StateSnapshot cache — step 시 재계산 회피.
import { useStateSnapshotCache } from '@/hooks/useStateSnapshotCache';
import { evaluateWatches } from '@/lib/story-debugger/watch-engine';

let watchCounter = 0;
function makeWatchId(): string {
  watchCounter += 1;
  return `w-${Date.now().toString(36)}-${watchCounter}`;
}

export interface UseStoryDebuggerOptions {
  characters: Character[] | undefined;
  episodes: EpisodeManuscript[] | null | undefined;
  /** 단축키 비활성 (모달·텍스트 입력 시) */
  disabled?: boolean;
}

export interface UseStoryDebuggerResult {
  isRunning: boolean;
  currentLocation: BreakpointLocation | null;
  frame: StoryFrame | null;
  breakpoints: Breakpoint[];
  watches: WatchEntry[];
  callHierarchy: CallHierarchy;
  start: (loc?: BreakpointLocation) => void;
  pause: () => void;
  stop: () => void;
  stepOver: () => void;
  stepInto: () => void;
  addBreakpoint: (loc: BreakpointLocation, label?: string) => void;
  removeBp: (id: string) => void;
  toggleBp: (id: string) => void;
  addWatch: (entry: Omit<WatchEntry, 'id'>) => void;
  removeWatch: (id: string) => void;
}

export function useStoryDebugger(opts: UseStoryDebuggerOptions): UseStoryDebuggerResult {
  const { characters, episodes, disabled } = opts;
  const [isRunning, setIsRunning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<BreakpointLocation | null>(null);
  const [frame, setFrame] = useState<StoryFrame | null>(null);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [watches, setWatches] = useState<WatchEntry[]>([]);

  const callHierarchy = buildCallHierarchy(episodes);
  // [후속 A-3 — 2026-05-07] state snapshot cache — buildFrameAt 의 state 부분만 캐시.
  const snapshotCache = useStateSnapshotCache(characters, episodes);

  const refreshBreakpoints = useCallback(() => {
    setBreakpoints(getAllBreakpoints());
  }, []);

  const computeFrame = useCallback(
    (loc: BreakpointLocation) => {
      if (!episodes) return;
      // [G] 캐시된 character state 사용 → buildFrameAt 가 그것을 사용하지는 못해 (별도 호출)
      // — 하지만 cache hit 측정용 + 향후 inspector 가 동기 lookup. 현재는 frame 생성에 직접 사용.
      const characterStates = snapshotCache.getStateAt(loc);
      const watchEvaluations = evaluateWatches(watches, episodes, loc.episodeId, characterStates);
      const watchValues: Record<string, string | null> = {};
      for (const r of watchEvaluations) {
        if (r.matchedAt.length === 0) {
          watchValues[r.watchId] = null;
        } else {
          const last = r.matchedAt[r.matchedAt.length - 1];
          watchValues[r.watchId] = `EP${last.episodeId}@${last.charOffset} : ${last.surface}`;
        }
      }

      // 떡밥 누적 — frame 생성 시 1회 (paragraph 별 X)
      const foreshadowSeen: string[] = [];
      for (const ep of episodes) {
        if (ep.episode > loc.episodeId) break;
        if (!ep.content) continue;
        const matches = ep.content.matchAll(
          /\[(?:떡밥|복선|foreshadow|setup)-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/gi,
        );
        for (const m of matches) {
          if (!foreshadowSeen.includes(m[1])) foreshadowSeen.push(m[1]);
        }
      }

      const ep = episodes.find((e) => e.episode === loc.episodeId);
      const paragraphs = ep ? (ep.content ?? '').split(/\n+/).filter((p) => p.length > 0) : [];
      const paragraphText = paragraphs[loc.paragraphIdx];

      const f: StoryFrame = {
        episodeId: loc.episodeId,
        paragraphIdx: loc.paragraphIdx,
        characters: characterStates,
        foreshadowSeen,
        watchValues,
        ...(paragraphText ? { paragraphText } : {}),
      };
      setFrame(f);
    },
    [characters, episodes, watches, snapshotCache],
  );

  const start = useCallback(
    (loc?: BreakpointLocation) => {
      if (!episodes || episodes.length === 0) return;
      const startLoc = loc ?? { episodeId: episodes[0].episode, paragraphIdx: 0 };
      setCurrentLocation(startLoc);
      computeFrame(startLoc);
      setIsRunning(true);
    },
    [episodes, computeFrame],
  );

  const pause = useCallback(() => setIsRunning(false), []);
  const stop = useCallback(() => {
    setIsRunning(false);
    setCurrentLocation(null);
    setFrame(null);
  }, []);

  const stepOver = useCallback(() => {
    if (!currentLocation || !episodes) return;
    const next = nextLocation(currentLocation, 'over', episodes);
    if (!next) {
      stop();
      return;
    }
    setCurrentLocation(next);
    computeFrame(next);
  }, [currentLocation, episodes, computeFrame, stop]);

  const stepInto = useCallback(() => {
    if (!currentLocation || !episodes) return;
    const next = nextLocation(currentLocation, 'into', episodes);
    if (!next) {
      stop();
      return;
    }
    setCurrentLocation(next);
    computeFrame(next);
  }, [currentLocation, episodes, computeFrame, stop]);

  const addBreakpoint = useCallback(
    (loc: BreakpointLocation, label?: string) => {
      setBreakpoint(loc, label);
      refreshBreakpoints();
    },
    [refreshBreakpoints],
  );

  const removeBp = useCallback(
    (id: string) => {
      removeBreakpoint(id);
      refreshBreakpoints();
    },
    [refreshBreakpoints],
  );

  const toggleBp = useCallback(
    (id: string) => {
      toggleBreakpoint(id);
      refreshBreakpoints();
    },
    [refreshBreakpoints],
  );

  const addWatch = useCallback((entry: Omit<WatchEntry, 'id'>) => {
    setWatches((prev) => [...prev, { id: makeWatchId(), ...entry }]);
  }, []);

  const removeWatch = useCallback((id: string) => {
    setWatches((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // 단축키 등록
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5' && !e.shiftKey) {
        e.preventDefault();
        if (isRunning) pause();
        else start();
      } else if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        stop();
      } else if (e.key === 'F10') {
        e.preventDefault();
        stepOver();
      } else if (e.key === 'F11') {
        e.preventDefault();
        stepInto();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [disabled, isRunning, start, pause, stop, stepOver, stepInto]);

  // watches 변경 시 frame 재계산
  useEffect(() => {
    if (currentLocation) computeFrame(currentLocation);
  }, [watches, currentLocation, computeFrame]);

  return {
    isRunning,
    currentLocation,
    frame,
    breakpoints,
    watches,
    callHierarchy,
    start,
    pause,
    stop,
    stepOver,
    stepInto,
    addBreakpoint,
    removeBp,
    toggleBp,
    addWatch,
    removeWatch,
  };
}
