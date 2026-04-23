"use client";

// ============================================================
// PART 1 — Types & Helpers
// ============================================================
//
// IndexedDB/저장소 quota 모니터 훅.
// 장편 웹소설 누적 시 quota 한계로 인한 "저장 실패" 무증상 이슈를 사전 경고.
//
// - navigator.storage.estimate() 주기 호출 (기본 5분)
// - 70% → warning, 90% → critical
// - critical 진입 시 noa:alert 토스트 이벤트 발행
// - SSR 안전 + 브라우저 호환 가드(storage API 미지원 환경)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

export type QuotaLevel = 'ok' | 'warning' | 'critical' | 'unknown';

export interface QuotaState {
  /** bytes in use */
  usage: number;
  /** bytes allocated */
  quota: number;
  /** 0-100 (null when unknown) */
  percentUsed: number | null;
  level: QuotaLevel;
  /** 마지막 측정 시각 (epoch ms) */
  lastCheck: number;
  /** 환경이 StorageManager를 지원하는가 */
  supported: boolean;
}

export interface UseStorageQuotaOptions {
  /** 측정 주기(ms). 기본 5분. 0이면 주기 비활성 */
  checkIntervalMs?: number;
  /** 초기 체크 활성화. 기본 true */
  runOnMount?: boolean;
  /** warning/critical 경계 커스텀 (0-100) */
  warningThreshold?: number;
  criticalThreshold?: number;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5분
const DEFAULT_WARNING = 70;
const DEFAULT_CRITICAL = 90;

/** StorageManager 지원 여부 — SSR 안전 */
export function isStorageQuotaSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    storage?: { estimate?: () => Promise<StorageEstimate> };
  };
  return typeof nav.storage?.estimate === 'function';
}

function computeLevel(percent: number, warning: number, critical: number): QuotaLevel {
  if (percent >= critical) return 'critical';
  if (percent >= warning) return 'warning';
  return 'ok';
}

// ============================================================
// PART 2 — Hook 본체
// ============================================================

const INITIAL_STATE: QuotaState = {
  usage: 0,
  quota: 0,
  percentUsed: null,
  level: 'unknown',
  lastCheck: 0,
  supported: false,
};

export function useStorageQuota(options?: UseStorageQuotaOptions): {
  state: QuotaState;
  refresh: () => Promise<void>;
} {
  const intervalMs = options?.checkIntervalMs ?? DEFAULT_INTERVAL_MS;
  const runOnMount = options?.runOnMount ?? true;
  const warningThreshold = options?.warningThreshold ?? DEFAULT_WARNING;
  const criticalThreshold = options?.criticalThreshold ?? DEFAULT_CRITICAL;

  const [state, setState] = useState<QuotaState>(INITIAL_STATE);

  // 이전 level 추적 — 같은 level 재진입 시 토스트 중복 방지
  const prevLevelRef = useRef<QuotaLevel>('unknown');

  const measure = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    if (!isStorageQuotaSupported()) {
      setState((prev) => ({ ...prev, supported: false, lastCheck: Date.now(), level: 'unknown' }));
      return;
    }
    try {
      const est = await navigator.storage.estimate();
      const usage = typeof est.usage === 'number' ? est.usage : 0;
      const quota = typeof est.quota === 'number' ? est.quota : 0;
      // [C] quota=0 가드 — 일부 Safari 환경에서 0 반환 시 0-div 회피
      const percentUsed = quota > 0 ? Math.min(100, Math.round((usage / quota) * 10000) / 100) : null;
      const level: QuotaLevel = percentUsed === null
        ? 'unknown'
        : computeLevel(percentUsed, warningThreshold, criticalThreshold);

      const next: QuotaState = {
        usage,
        quota,
        percentUsed,
        level,
        lastCheck: Date.now(),
        supported: true,
      };
      setState(next);

      // 레벨 전이 시에만 토스트
      const prevLevel = prevLevelRef.current;
      if (prevLevel !== level && level !== 'ok' && level !== 'unknown' && typeof window !== 'undefined') {
        const pct = percentUsed ?? 0;
        if (level === 'critical') {
          window.dispatchEvent(new CustomEvent('noa:alert', {
            detail: {
              variant: 'warning',
              title: '저장 공간 거의 참',
              message: `브라우저 저장소 ${pct.toFixed(1)}% 사용 중. Firebase 백업 또는 일부 에피소드 export를 권장합니다.`,
            },
          }));
        } else if (level === 'warning') {
          window.dispatchEvent(new CustomEvent('noa:alert', {
            detail: {
              variant: 'info',
              title: '저장 공간 70% 도달',
              message: `브라우저 저장소 ${pct.toFixed(1)}% 사용. 곧 Firebase 백업을 고려하세요.`,
            },
          }));
        }
        // 범용 storage-quota 이벤트 — 다른 UI가 구독 가능
        window.dispatchEvent(new CustomEvent('noa:storage-quota', { detail: next }));
      }
      prevLevelRef.current = level;
    } catch (err) {
      logger.warn('StorageQuota', 'estimate failed', err);
    }
  }, [warningThreshold, criticalThreshold]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isStorageQuotaSupported()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((prev) => ({ ...prev, supported: false }));
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await measure();
    };

    if (runOnMount) {
      void run();
    }

    if (intervalMs > 0) {
      const id = setInterval(run, intervalMs);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }

    return () => { cancelled = true; };
  }, [measure, intervalMs, runOnMount]);

  return { state, refresh: measure };
}

// ============================================================
// PART 3 — 포맷 유틸
// ============================================================

/** 바이트 → 사람 읽기 용량 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v.toFixed(1)} ${units[u]}`;
}
