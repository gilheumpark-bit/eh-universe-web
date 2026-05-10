"use client";
// ============================================================
// useLongArcVerifier — 5축 검증 트리거 + 결과 캐시.
//
// 트리거:
//   - 수동 (refresh 함수 호출)
//   - 자동: 매 10화마다 manuscript hash 변경 감지 시 (debounce 3초)
//
// [C] config null → no-op / [G] debounce 3s / [K] 단일 책임
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import type { VerifierReport } from '@/lib/long-arc-verifier/types';
import { runLongArcVerification } from '@/lib/long-arc-verifier/orchestrator';

export interface UseLongArcVerifierOptions {
  projectId: string;
  config: StoryConfig | null | undefined;
  episodes: EpisodeManuscript[] | null | undefined;
  /** 자동 trigger 활성 (기본 true) — opt-out 가능 */
  autoTrigger?: boolean;
  /** 매 N화마다 자동 재검증 (기본 10) */
  autoEveryNEpisodes?: number;
}

export interface UseLongArcVerifierResult {
  report: VerifierReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLongArcVerifier(opts: UseLongArcVerifierOptions): UseLongArcVerifierResult {
  const { projectId, config, episodes, autoTrigger = true, autoEveryNEpisodes = 10 } = opts;
  const [report, setReport] = useState<VerifierReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggerHashRef = useRef<string>('');

  /** 동기 trigger */
  const refresh = useCallback(() => {
    if (!config) return;
    setLoading(true);
    setError(null);
    runLongArcVerification(config, episodes, { projectId })
      .then((r) => setReport(r))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'unknown';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [projectId, config, episodes]);

  /** 자동 trigger — N화 단위 */
  useEffect(() => {
    if (!autoTrigger || !config || !episodes) return;
    const epCount = episodes.length;
    if (epCount === 0) return;

    // hash 산출 (단순 — episode count + last content hash)
    const last = episodes[episodes.length - 1];
    const hash = `${epCount}:${last.charCount}:${last.lastUpdate}`;

    // 매 N화 단위로만 trigger (10/20/30/...)
    if (epCount % autoEveryNEpisodes !== 0) return;
    if (hash === lastTriggerHashRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastTriggerHashRef.current = hash;
      refresh();
    }, 3000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [autoTrigger, autoEveryNEpisodes, config, episodes, refresh]);

  return { report, loading, error, refresh };
}
