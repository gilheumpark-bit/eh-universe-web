"use client";

// ============================================================
// PART 1 — Overview (M1.5.0 Shadow Diff Hook)
// ============================================================
//
// ShadowDiffDashboard를 위한 훅.
//   1) 최신 일치율(%) 구독
//   2) 분석 리포트 (DiffAnalysisReport) 제공
//   3) clear / refresh 액션
//
// [C] SSR 가드 + unmount 시 cleanup / 모든 async를 try/catch로 래핑
// [G] 수동 refresh + 주기 갱신 (기본 10초) — 사용자 개입 없이도 최신 상태
// [K] 파생 값은 useMemo 최소 사용

import { useCallback, useEffect, useState } from 'react';
import {
  getShadowLog,
  clearShadowLog,
} from '@/lib/save-engine/shadow-logger';
import type { ShadowLogEntry } from '@/lib/save-engine/shadow-logger';
import {
  analyzeShadowLog,
  isReadyForOnPromotion,
} from '@/lib/save-engine/diff-analyzer';
import type {
  DiffAnalysisReport,
  ReadinessCheck,
} from '@/lib/save-engine/diff-analyzer';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Types
// ============================================================

export interface UseShadowDiffOptions {
  /** 자동 갱신 주기(ms). 0이면 수동만. 기본 10000. */
  refreshIntervalMs?: number;
  /** 수집 대상 엔트리 수 제한. 기본 1000. */
  sampleLimit?: number;
}

export interface UseShadowDiffReturn {
  /** 최신 분석 리포트 (null = 로딩 중 / 실패). */
  report: DiffAnalysisReport | null;
  /** On 승격 준비도. */
  readiness: ReadinessCheck | null;
  /** 수동 재조회. */
  refresh: () => Promise<void>;
  /** Shadow log 전체 초기화. */
  clear: () => Promise<void>;
  /** 진행 중인 비동기가 있는가. */
  loading: boolean;
  /** 마지막 갱신 시각 (ms). null = 미실행. */
  lastRefreshedAt: number | null;
}

// ============================================================
// PART 3 — Hook
// ============================================================

const DEFAULT_REFRESH_MS = 10_000;
const DEFAULT_SAMPLE_LIMIT = 1000;

export function useShadowDiff(options: UseShadowDiffOptions = {}): UseShadowDiffReturn {
  const {
    refreshIntervalMs = DEFAULT_REFRESH_MS,
    sampleLimit = DEFAULT_SAMPLE_LIMIT,
  } = options;

  const [report, setReport] = useState<DiffAnalysisReport | null>(null);
  const [readiness, setReadiness] = useState<ReadinessCheck | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  // ========================================================
  // PART 4 — fetch + analyze
  // ========================================================

  const refresh = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    setLoading(true);
    try {
      const entries: ShadowLogEntry[] = await getShadowLog({ limit: sampleLimit });
      const rep = analyzeShadowLog(entries);
      const rdy = isReadyForOnPromotion(rep);
      setReport(rep);
      setReadiness(rdy);
      setLastRefreshedAt(Date.now());
    } catch (err) {
      logger.warn('useShadowDiff', 'refresh failed (isolated)', err);
    } finally {
      setLoading(false);
    }
  }, [sampleLimit]);

  const clear = useCallback(async (): Promise<void> => {
    try {
      await clearShadowLog();
      await refresh();
    } catch (err) {
      logger.warn('useShadowDiff', 'clear failed (isolated)', err);
    }
  }, [refresh]);

  // ========================================================
  // PART 5 — Mount + interval
  // ========================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    // 초기 로드
    (async () => {
      await refresh();
      if (cancelled) return;
    })().catch((err) => {
      logger.warn('useShadowDiff', 'initial load failed', err);
    });

    // 주기 갱신
    let timer: ReturnType<typeof setInterval> | null = null;
    if (refreshIntervalMs > 0) {
      timer = setInterval(() => {
        void refresh();
      }, refreshIntervalMs);
    }

    return () => {
      cancelled = true;
      if (timer !== null) clearInterval(timer);
    };
  }, [refresh, refreshIntervalMs]);

  return {
    report,
    readiness,
    refresh,
    clear,
    loading,
    lastRefreshedAt,
  };
}

// IDENTITY_SEAL: PART-1..5 | role=useShadowDiff | inputs=options | outputs=report+actions
