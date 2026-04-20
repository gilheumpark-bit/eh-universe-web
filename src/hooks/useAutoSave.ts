// ============================================================
// PART 1 — useAutoSave (Spec Part 8)
// ============================================================
//
// 공용 훅. value 변경 감지 → debounce → delta 빌드 → appendEntry.
// 내부적으로 feature-flag FEATURE_JOURNAL_ENGINE 확인 — off면 noop(기존 경로 활용).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SaveStatus,
  SaveMeta,
  ConflictInfo,
  DeltaPayload,
  HLC,
} from '@/lib/save-engine/types';
import { GENESIS } from '@/lib/save-engine/types';
import { buildDelta } from '@/lib/save-engine/delta';
import { appendEntry, getCurrentHLC } from '@/lib/save-engine/journal';
import { toSaveMeta } from '@/lib/save-engine/atomic-write';
import { detectAnomaly, countCharacters } from '@/lib/save-engine/anomaly-detector';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Public types
// ============================================================

export interface UseAutoSaveOptions<T> {
  key: string;
  value: T;
  debounceMs?: number;
  onSave?: (value: T, meta: SaveMeta) => void;
  onError?: (error: Error, meta: SaveMeta) => void;
  storageTier?: 'indexeddb-only' | 'indexeddb-then-localstorage' | 'memory-only';
  target: 'project' | 'session' | 'manuscript' | 'config' | 'sceneSheet';
  targetId?: string;
  anomalyDetection?: boolean;
  normalize?: (value: T) => T;
  /** projectId 식별자 — target='project'가 아닐 때 delta payload에 박힘. */
  projectId?: string;
}

export interface UseAutoSaveResult {
  status: SaveStatus;
  lastSavedAt: number | null;
  flush: () => Promise<boolean>;
  conflict: ConflictInfo | null;
  error: Error | null;
  hasQuarantine: boolean;
}

// ============================================================
// PART 3 — Helpers
// ============================================================

const DEFAULT_DEBOUNCE_MS = 500;
const MAX_DEBOUNCE_WARN_MS = 2000;

function zeroMeta(tier: SaveMeta['tier']): SaveMeta {
  return {
    entryId: '',
    clock: { physical: 0, logical: 0, nodeId: '' } as HLC,
    tier,
    bytes: 0,
    durationMs: 0,
  };
}

// ============================================================
// PART 4 — Hook
// ============================================================

export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const {
    value,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onSave,
    onError,
    storageTier,
    target,
    targetId,
    anomalyDetection = true,
    normalize,
    projectId,
  } = options;

  if (target !== 'project' && !targetId) {
    throw new Error(`[useAutoSave] targetId 필수 — target=${target}`);
  }
  if (debounceMs > MAX_DEBOUNCE_WARN_MS) {
    logger.warn('save-engine:hook', `debounceMs > ${MAX_DEBOUNCE_WARN_MS}ms — UX 저하 위험`, { key: options.key });
  }

  const engineEnabled = useFeatureFlagSafe('FEATURE_JOURNAL_ENGINE');

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [conflict] = useState<ConflictInfo | null>(null);
  const [hasQuarantine] = useState<boolean>(false);

  const prevValueRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);

  // ========================================================
  // PART 5 — Flush 로직
  // ========================================================

  const doFlush = useCallback(async (): Promise<boolean> => {
    if (!engineEnabled) return false;

    const prev = prevValueRef.current;
    const nextRaw = value;
    const next = normalize ? normalize(nextRaw) : nextRaw;
    if (prev !== null && Object.is(prev, next)) return true;

    setStatus('saving');
    try {
      const deltaBuild = await buildDelta({
        projectId: projectId ?? (target === 'project' ? 'root' : 'root'),
        prev: prev ?? null,
        next: next ?? null,
        target,
        targetId,
      });
      if (!deltaBuild.payload) {
        // no-op skip
        setStatus('saved');
        prevValueRef.current = next;
        return true;
      }

      // anomaly 감지 (Spec 12.6)
      if (anomalyDetection && target === 'manuscript' && prev != null) {
        const result = detectAnomaly({
          target: 'manuscript',
          prevChars: countCharacters(prev),
          nextChars: countCharacters(next),
        });
        if (result.detected) {
          // anomaly 이벤트 dispatch — UI가 토스트/복구 UX 결정
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('noa:anomaly-detected', { detail: result }));
            }
          } catch { /* noop */ }
        }
      }

      const payload: DeltaPayload = {
        ...deltaBuild.payload,
        baseContentHash: deltaBuild.payload.baseContentHash ?? GENESIS,
      };
      const appendResult = await appendEntry({
        entryType: 'delta',
        payload,
        createdBy: 'user',
        projectId: projectId ?? payload.projectId,
      });

      if (appendResult.ok && appendResult.entry) {
        prevValueRef.current = next;
        const meta = toSaveMeta(appendResult, appendResult.entry);
        setStatus('saved');
        setLastSavedAt(Date.now());
        setError(null);
        onSave?.(next, meta);
        return true;
      }
      const err = appendResult.error ?? new Error('append 실패(원인 불명)');
      setStatus('error');
      setError(err);
      onError?.(err, zeroMeta(storageTier === 'memory-only' ? 'memory' : 'indexeddb'));
      return false;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setStatus('error');
      setError(e);
      onError?.(e, zeroMeta(storageTier === 'memory-only' ? 'memory' : 'indexeddb'));
      return false;
    }
  }, [engineEnabled, value, normalize, projectId, target, targetId, anomalyDetection, onSave, onError, storageTier]);

  const flush = useCallback((): Promise<boolean> => {
    if (inflightRef.current) return inflightRef.current;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const p = doFlush();
    inflightRef.current = p;
    p.finally(() => { inflightRef.current = null; }).catch(() => { /* 이미 처리됨 */ });
    return p;
  }, [doFlush]);

  // ========================================================
  // PART 6 — debounce effect
  // ========================================================

  useEffect(() => {
    if (!engineEnabled) return;
    // 첫 마운트에는 prevValueRef를 세팅만 하고 저장 생략
    if (prevValueRef.current === null) {
      prevValueRef.current = normalize ? normalize(value) : value;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // value 변경마다 debounce 재설정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs, engineEnabled]);

  // 현재 clock 는 외부 관찰용(선택)
  useMemo(() => getCurrentHLC(), []);

  return { status, lastSavedAt, flush, conflict, error, hasQuarantine };
}

// ============================================================
// PART 7 — Feature flag wrapper (isFeatureEnabled + SSR 안전)
// ============================================================

function useFeatureFlagSafe(name: string): boolean {
  try {
    return isFeatureEnabled(name as Parameters<typeof isFeatureEnabled>[0]);
  } catch (err) {
    logger.warn('save-engine:hook', `feature flag ${name} 조회 실패 — 기본 false`, err);
    return false;
  }
}
