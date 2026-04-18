"use client";

// ============================================================
// PART 1 — Types & Storage
// ============================================================
//
// SparkHealth 모니터 훅.
// DGX Spark(로컬 추론 게이트웨이) 가용 상태를 주기적으로 확인하고
// 다운 감지 시 BYOK 자동 전환을 가능하게 한다.
//
// - 연속 실패 3회 → 'down'
// - 1회 성공 → 'ok' 복귀
// - 상태 변화 시 window CustomEvent `noa:spark-status` 발행
// - SSR 안전(typeof window/navigator 가드)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkSparkHealth, SPARK_SERVER_URL } from '@/services/sparkService';
import { logger } from '@/lib/logger';

export type SparkHealthStatus = 'ok' | 'degraded' | 'down' | 'unknown';

export interface SparkHealthState {
  status: SparkHealthStatus;
  lastCheck: number;
  consecutiveFailures: number;
  message?: string;
}

export interface UseSparkHealthOptions {
  /** 주기 체크 간격(ms). 기본 60_000(1분). 0이면 주기 체크 비활성 */
  checkIntervalMs?: number;
  /** 초기 체크 활성화. 기본 true */
  runOnMount?: boolean;
  /** 연속 실패 임계치. 기본 3 */
  downThreshold?: number;
}

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_DOWN_THRESHOLD = 3;

/** BYOK 슬롯/키 존재 여부 감지 (localStorage 기반). SSR 안전 */
export function detectBYOKProvider(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1) UnifiedSettings 슬롯 검사 (우선)
    const rawSlots = localStorage.getItem('eh-api-key-slots');
    if (rawSlots) {
      try {
        const slots = JSON.parse(rawSlots) as Array<{ provider: string; apiKey: string; enabled: boolean }>;
        const active = slots.find((s) => s && s.enabled && typeof s.apiKey === 'string' && s.apiKey.trim().length > 0);
        if (active?.provider) return active.provider;
      } catch { /* corrupted slot JSON — fall through */ }
    }

    // 2) 레거시 개별 키 검사 (활성 provider 우선)
    const activeProvider = localStorage.getItem('noa_active_provider');
    const providerStorageMap: Record<string, string> = {
      gemini: 'noa_api_key',
      openai: 'noa_openai_key',
      claude: 'noa_claude_key',
      groq: 'noa_groq_key',
      mistral: 'noa_mistral_key',
    };

    if (activeProvider && providerStorageMap[activeProvider]) {
      const val = localStorage.getItem(providerStorageMap[activeProvider]) || '';
      if (val.trim().length > 0) return activeProvider;
    }

    // 3) 사용 가능한 첫 번째 키
    for (const [pid, key] of Object.entries(providerStorageMap)) {
      const val = localStorage.getItem(key) || '';
      if (val.trim().length > 0) return pid;
    }
  } catch (err) {
    logger.warn('SparkHealth', 'detectBYOKProvider failed', err);
  }
  return null;
}

/** Fallback 선호 토글 (Settings에서 조정) — 기본 true(권장) */
export function getFallbackPreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem('noa_byok_fallback_enabled');
    // null이면 기본 true
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

/** Fallback 선호 토글 저장 */
export function setFallbackPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('noa_byok_fallback_enabled', enabled ? '1' : '0');
    window.dispatchEvent(new CustomEvent('noa:byok-fallback-changed', { detail: { enabled } }));
  } catch (err) {
    logger.warn('SparkHealth', 'setFallbackPreference failed', err);
  }
}

// ============================================================
// PART 2 — Hook 본체
// ============================================================

/**
 * useSparkHealth — DGX Spark 게이트웨이 헬스 모니터.
 *
 * @returns state, canFallback(BYOK 키 존재 여부), activeEngine('dgx'|'byok'|'none')
 */
export function useSparkHealth(options?: UseSparkHealthOptions): {
  state: SparkHealthState;
  canFallback: boolean;
  activeEngine: 'dgx' | 'byok' | 'none';
  /** 수동 재검사 트리거 */
  refresh: () => Promise<void>;
} {
  const intervalMs = options?.checkIntervalMs ?? DEFAULT_INTERVAL_MS;
  const downThreshold = options?.downThreshold ?? DEFAULT_DOWN_THRESHOLD;
  const runOnMount = options?.runOnMount ?? true;

  const [state, setState] = useState<SparkHealthState>(() => ({
    status: 'unknown',
    lastCheck: 0,
    consecutiveFailures: 0,
  }));
  const [byokAvailable, setByokAvailable] = useState<boolean>(() => !!detectBYOKProvider());

  // [G] 이전 상태를 ref로 추적 — setState stale 회피 + 불필요 리렌더 방지
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // 연속 실패 카운터도 ref로 병행 관리 (interval closure stale 방지)
  const failureCountRef = useRef(0);

  // DGX URL이 환경변수로 설정됐는지 (가드)
  const sparkConfigured = Boolean(
    SPARK_SERVER_URL ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SPARK_GATEWAY_URL)
  );

  const performCheck = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!sparkConfigured) {
      // Spark 미설정 — down도 ok도 아닌 'unknown' 유지
      return;
    }
    try {
      const health = await checkSparkHealth();
      const prevStatus = stateRef.current.status;

      if (health.ok) {
        failureCountRef.current = 0;
        const next: SparkHealthState = {
          status: 'ok',
          lastCheck: Date.now(),
          consecutiveFailures: 0,
          message: health.lmStudio ? `DGX OK (engine: ${health.lmStudio})` : 'DGX OK',
        };
        setState(next);
        if (prevStatus !== 'ok') {
          window.dispatchEvent(new CustomEvent('noa:spark-status', { detail: next }));
        }
      } else {
        failureCountRef.current += 1;
        const cf = failureCountRef.current;
        const status: SparkHealthStatus = cf >= downThreshold ? 'down' : 'degraded';
        const next: SparkHealthState = {
          status,
          lastCheck: Date.now(),
          consecutiveFailures: cf,
          message: status === 'down'
            ? `DGX unresponsive (${cf} consecutive failures)`
            : `DGX degraded (${cf}/${downThreshold})`,
        };
        setState(next);
        if (prevStatus !== status) {
          window.dispatchEvent(new CustomEvent('noa:spark-status', { detail: next }));
        }
      }
    } catch (err) {
      // 네트워크/타입 에러 → 실패로 집계
      failureCountRef.current += 1;
      const cf = failureCountRef.current;
      const status: SparkHealthStatus = cf >= downThreshold ? 'down' : 'degraded';
      const prevStatus = stateRef.current.status;
      const next: SparkHealthState = {
        status,
        lastCheck: Date.now(),
        consecutiveFailures: cf,
        message: err instanceof Error ? err.message : 'check failed',
      };
      setState(next);
      if (prevStatus !== status) {
        window.dispatchEvent(new CustomEvent('noa:spark-status', { detail: next }));
      }
    }
  }, [downThreshold, sparkConfigured]);

  // 주기 체크 + 초기 실행
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sparkConfigured) return; // [C] 미설정 시 폴링 비활성

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await performCheck();
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
  }, [performCheck, intervalMs, runOnMount, sparkConfigured]);

  // BYOK 키 변경 이벤트 구독 — 사용자가 키 추가/제거 시 canFallback 갱신
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      setByokAvailable(!!detectBYOKProvider());
    };
    window.addEventListener('noa-keys-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('noa-keys-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // activeEngine 결정: Spark 미설정/다운 & BYOK 있으면 byok, Spark ok/degraded면 dgx
  let activeEngine: 'dgx' | 'byok' | 'none';
  if (!sparkConfigured) {
    activeEngine = byokAvailable ? 'byok' : 'none';
  } else if (state.status === 'down') {
    activeEngine = byokAvailable && getFallbackPreference() ? 'byok' : 'none';
  } else {
    // ok / degraded / unknown — 일단 dgx 시도
    activeEngine = 'dgx';
  }

  return {
    state,
    canFallback: byokAvailable,
    activeEngine,
    refresh: performCheck,
  };
}
