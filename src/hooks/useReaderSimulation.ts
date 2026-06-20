"use client";
// ============================================================
// useReaderSimulation — 5 페르소나 시뮬 트리거 + 결과.
// 수동 실행 (LLM 미사용 — 비용 가드 X) + Push 전 회귀 옵션.
// ============================================================

import { useCallback, useState } from 'react';
import type { EpisodeManuscript } from '@/lib/studio-types';
import type { EngagementProfile } from '@/lib/reader-sim/types';
import { buildEngagementProfile } from '@/lib/reader-sim/engagement-profiler';
import { runRegressionCheck, type RegressionResult } from '@/lib/reader-sim/regression-runner';

export interface UseReaderSimulationOptions {
  episodes: EpisodeManuscript[] | null | undefined;
}

export interface UseReaderSimulationResult {
  profile: EngagementProfile | null;
  regression: RegressionResult | null;
  loading: boolean;
  refresh: () => void;
  runRegression: () => RegressionResult;
}

export function useReaderSimulation(opts: UseReaderSimulationOptions): UseReaderSimulationResult {
  const { episodes } = opts;
  const [profile, setProfile] = useState<EngagementProfile | null>(null);
  const [regression, setRegression] = useState<RegressionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    // [G] sync 함수 — 비동기 wrap 만 (UI loading 표시)
    requestAnimationFrame(() => {
      const p = buildEngagementProfile(episodes);
      setProfile(p);
      setLoading(false);
    });
  }, [episodes]);

  const runRegression = useCallback((): RegressionResult => {
    const r = runRegressionCheck(episodes);
    setRegression(r);
    return r;
  }, [episodes]);

  return { profile, regression, loading, refresh, runRegression };
}
