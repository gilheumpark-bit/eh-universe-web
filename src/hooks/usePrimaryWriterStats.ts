'use client';

// ============================================================
// usePrimaryWriterStats — M1.7 Primary Writer 통계 구독 훅
// ============================================================
//
// primary-write-logger 의 링 버퍼를 읽어 집계한 통계를 React 상태로 노출한다.
// Observatory Dashboard 가 사용하며, 10초 폴링 + 저장 이벤트 감지로 갱신.
//
// [원칙 1] 읽기 전용. 이 훅은 writer 경로에 간섭하지 않음.
// [원칙 2] 폴링 + 이벤트 — 10초 기본, 저장 이벤트 발생 시 즉시 refresh.
// [원칙 3] 관측 실패 흡수. getPrimaryWriteLog throw → 빈 통계 유지.
//
// [C] SSR 가드 / unmount cleanup / 모든 호출 try
// [G] 집계 한 번 — useMemo 로 통계 계산, 로그 배열 재설정 시에만 재계산
// [K] 5 return 필드 — totalWrites / 경로별 count / recentWrites / last24h / refresh

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import {
  getPrimaryWriteLog,
  type PrimaryWriteLogEntry,
} from '@/lib/save-engine/primary-write-logger';
import type { PrimaryMode } from '@/hooks/usePrimaryWriter';

// ============================================================
// PART 1 — Types
// ============================================================

export interface PrimaryWriterRecentEntry {
  ts: number;
  mode: PrimaryMode;
  outcome: 'success' | 'failure' | 'degraded';
  durationMs: number;
}

export interface PrimaryWriterStats {
  /** 집계 표본 크기. */
  totalWrites: number;
  /** mode='journal' (journal Primary 성공) 건수. */
  journalPrimary: number;
  /** mode='legacy' 건수. */
  legacyDirect: number;
  /** mode='degraded' (journal 실패 → legacy fallback) 건수. */
  degradedFallback: number;
  /** 최근 N건 (기본 20). 최신 먼저. */
  recentWrites: PrimaryWriterRecentEntry[];
  /** 최근 24시간 경로별 비율 (%). 합계가 100 근사. */
  last24hBreakdown: {
    journalPct: number;
    legacyPct: number;
    degradedPct: number;
  };
  /** 수동 refresh — async, 실패해도 throw 없음. */
  refresh: () => Promise<void>;
  /** 마지막 갱신 시각 (ms). */
  lastRefreshedAt: number | null;
}

export interface UsePrimaryWriterStatsOptions {
  /** 폴링 주기 ms. 기본 10_000. 0 이면 수동 refresh 만. */
  pollIntervalMs?: number;
  /** 최근 N 건. 기본 20. */
  recentLimit?: number;
}

// ============================================================
// PART 2 — Hook
// ============================================================

const DEFAULT_POLL_MS = 10_000;
const DEFAULT_RECENT_LIMIT = 20;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Primary Writer 통계 훅.
 *
 * 사용:
 * ```tsx
 * const stats = usePrimaryWriterStats();
 * <div>{stats.totalWrites} writes — {stats.last24hBreakdown.journalPct}% journal</div>
 * ```
 *
 * 자동 10초 폴링 + `noa:primary-write-logged` 커스텀 이벤트 구독으로 즉시 갱신.
 */
export function usePrimaryWriterStats(
  options: UsePrimaryWriterStatsOptions = {},
): PrimaryWriterStats {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_MS;
  const recentLimit = Math.max(1, Math.min(options.recentLimit ?? DEFAULT_RECENT_LIMIT, 100));

  const [entries, setEntries] = useState<PrimaryWriteLogEntry[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const latest = await getPrimaryWriteLog({ limit: 1000 });
      if (!mountedRef.current) return;
      setEntries(Array.isArray(latest) ? latest : []);
      setLastRefreshedAt(Date.now());
    } catch (err) {
      logger.warn('usePrimaryWriterStats', 'refresh failed (isolated)', err);
    }
  }, []);

  // 마운트 시 즉시 + interval 폴링.
  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined') return;

    // 초기 refresh 는 microtask 로 defer — setState 가 effect body 동기 경로에서
    // 일어나지 않도록 하여 cascading render 경고 회피.
    // refresh 는 async 이므로 setState 는 이미 await 이후 실행되지만, lint 안정
    // 차원에서 명시적 defer.
    queueMicrotask(() => {
      if (!mountedRef.current) return;
      void refresh();
    });

    if (pollIntervalMs <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }

    const id = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [refresh, pollIntervalMs]);

  // noa:primary-write-logged 이벤트 구독 — 즉시 refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { void refresh(); };
    window.addEventListener(PRIMARY_WRITE_LOGGED_EVENT, handler);
    return () => window.removeEventListener(PRIMARY_WRITE_LOGGED_EVENT, handler);
  }, [refresh]);

  // 집계 — useMemo 로 entries 변경 시만 재계산.
  const aggregate = useMemo(() => computeAggregate(entries, recentLimit), [entries, recentLimit]);

  return {
    totalWrites: aggregate.totalWrites,
    journalPrimary: aggregate.journalPrimary,
    legacyDirect: aggregate.legacyDirect,
    degradedFallback: aggregate.degradedFallback,
    recentWrites: aggregate.recentWrites,
    last24hBreakdown: aggregate.last24hBreakdown,
    refresh,
    lastRefreshedAt,
  };
}

// ============================================================
// PART 3 — Aggregation
// ============================================================

interface Aggregate {
  totalWrites: number;
  journalPrimary: number;
  legacyDirect: number;
  degradedFallback: number;
  recentWrites: PrimaryWriterRecentEntry[];
  last24hBreakdown: {
    journalPct: number;
    legacyPct: number;
    degradedPct: number;
  };
}

function computeAggregate(entries: PrimaryWriteLogEntry[], recentLimit: number): Aggregate {
  let journalPrimary = 0;
  let legacyDirect = 0;
  let degradedFallback = 0;
  let j24 = 0;
  let l24 = 0;
  let d24 = 0;
  let total24 = 0;
  const now = Date.now();
  const cutoff = now - ONE_DAY_MS;

  for (const e of entries) {
    if (e.mode === 'journal') journalPrimary++;
    else if (e.mode === 'degraded') degradedFallback++;
    else legacyDirect++;

    if (e.ts >= cutoff) {
      total24++;
      if (e.mode === 'journal') j24++;
      else if (e.mode === 'degraded') d24++;
      else l24++;
    }
  }

  const recentWrites: PrimaryWriterRecentEntry[] = entries
    .slice(0, recentLimit)
    .map((e) => ({
      ts: e.ts,
      mode: e.mode,
      outcome: e.primarySuccess
        ? (e.mode === 'degraded' ? 'degraded' : 'success')
        : 'failure',
      durationMs: e.durationMs,
    }));

  const pctOf = (count: number): number => {
    if (total24 === 0) return 0;
    return Math.round((count / total24) * 10000) / 100; // 2 decimal places
  };

  return {
    totalWrites: entries.length,
    journalPrimary,
    legacyDirect,
    degradedFallback,
    recentWrites,
    last24hBreakdown: {
      journalPct: pctOf(j24),
      legacyPct: pctOf(l24),
      degradedPct: pctOf(d24),
    },
  };
}

// ============================================================
// PART 4 — Event name re-export
// ============================================================

/**
 * primary-write-logger 가 새 엔트리 저장 시 dispatch 하는 이벤트 이름.
 * usePrimaryWriter 가 recordPrimaryWrite 호출 후 방송.
 */
export const PRIMARY_WRITE_LOGGED_EVENT = 'noa:primary-write-logged' as const;

// IDENTITY_SEAL: PART-1..4 | role=primary-writer-stats-hook | inputs=idb log | outputs=PrimaryWriterStats
