'use client';

// ============================================================
// usePrimaryWriter — M1.5.5 Primary Writer 스왑 훅
// ============================================================
//
// Flag === 'on' 일 때만 Journal 엔진을 Primary 로 사용하고, legacy 경로는
// Mirror 로 background 쓰기를 이어간다. Flag === 'shadow' 또는 'off' 면
// legacy 를 그대로 Primary 로 유지 — 이 훅은 단순 패스스루로 작동한다.
//
// [원칙 1] Primary 스왑은 flag === 'on' 에서만.
//   off    → legacy Primary (기존 100% 동일)
//   shadow → legacy Primary + 관찰자 (useShadowProjectWriter 가 담당)
//   on     → journal Primary + legacy Mirror (이번 Phase)
//
// [원칙 2] Journal 실패 = 즉시 legacy 복귀.
//   journal appendEntry throw → legacy 동기 호출 → noa:journal-error 이벤트 →
//   useJournalEngineMode.downgradeNow() 가 'shadow' 로 전환.
//
// [원칙 3] Mirror 는 실패해도 Primary 성공 유지.
//   background 쓰기 — setTimeout(0) 으로 이벤트 루프 뒤로. throw 는 로그만.
//
// [원칙 4] 사용자 데이터 손실 0 — 어떤 실패 순서에서도 보존.
//
// [C] SSR 가드 + Journal/legacy 동시 실패 시에도 결과 반환 + try/catch 2중.
// [G] 모드 조회는 호출 시점 1회 — localStorage 연속 읽기 회피.
// [K] 단일 API: write(payload) → WriteResult. 공개 5 심볼만.
//
// @module hooks/usePrimaryWriter

// ============================================================
// PART 1 — Imports & types
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { isJournalEngineOn, getJournalEngineMode } from '@/lib/feature-flags';
import { appendEntry } from '@/lib/save-engine/journal';
import { canonicalJson, sha256, utf8Encode } from '@/lib/save-engine/hash';
import { compressToBytes } from '@/lib/save-engine/compression';
import { CURRENT_SCHEMA_VERSION, type SnapshotPayload } from '@/lib/save-engine/types';
import type { Project } from '@/lib/studio-types';
import { logger } from '@/lib/logger';
import { JOURNAL_ERROR_EVENT, type JournalErrorEventDetail } from '@/hooks/useShadowProjectWriter';
import type { ShadowOperation } from '@/lib/save-engine/shadow-logger';

/** Primary Writer 현재 모드. */
export type PrimaryMode = 'legacy' | 'journal' | 'degraded';

/**
 * Primary 저장 호출 결과.
 *
 * - `mode`: 쓰기가 실제 사용한 경로. flag='on' + journal 성공 = 'journal',
 *           flag='on' + journal 실패 후 legacy 복귀 = 'degraded', 그 외 = 'legacy'.
 * - `primarySuccess`: 사용자 관점에서 "저장 성공" 여부 — degraded 포함 legacy 로 복구되면 true.
 * - `mirrorSuccess`: Mirror 쓰기가 성공했는지. legacy 단일 경로에서는 의미 없음 (true).
 * - `journalEntryId`: journal appendEntry 성공 시 entry id.
 * - `durationMs`: Primary 경로 wall-clock.
 */
export interface WriteResult {
  mode: PrimaryMode;
  primarySuccess: boolean;
  mirrorSuccess: boolean;
  journalEntryId?: string;
  durationMs: number;
}

export interface UsePrimaryWriterOptions {
  /**
   * 기존 Primary 경로 — useProjectManager 에서 사용하는 saveProjects 와 등가.
   * 동기 함수. boolean 반환으로 성공 여부 판정 (기존 계약 유지).
   */
  legacySaveFn: (projects: Project[]) => boolean;
  /**
   * Journal 실패 → 다운그레이드 필요 시 호출되는 훅.
   * useJournalEngineMode.downgradeNow 에 연결.
   * 실패해도 Primary 쓰기 경로에는 영향 없음 (비동기 실행).
   */
  onDowngradeNeeded?: (reason: string) => void;
}

export interface PrimaryWriterAPI {
  /**
   * Primary 저장. 내부적으로 현재 mode 를 1회 읽고 분기:
   *   - legacy: legacySaveFn 즉시 호출.
   *   - journal: journal appendEntry + background legacy mirror.
   *              journal 실패 시 legacy fallback → degraded + downgrade trigger.
   */
  write: (projects: Project[]) => Promise<WriteResult>;
  /** 현재 Primary 모드 (호출 시점 snapshot). */
  getCurrentMode: () => PrimaryMode;
}

// ============================================================
// PART 2 — Hook
// ============================================================

/**
 * Primary Writer 추상화.
 *
 * 기본 (flag 'off' / 'shadow'):
 * ```ts
 * const { write } = usePrimaryWriter({ legacySaveFn: saveProjects });
 * await write(projects); // legacy 즉시 — 기존 동작과 동일
 * ```
 *
 * Flag 'on' 으로 스왑:
 * ```ts
 * const { write } = usePrimaryWriter({
 *   legacySaveFn: saveProjects,
 *   onDowngradeNeeded: (reason) => downgradeNow(reason),
 * });
 * // journal primary + legacy mirror, 실패 시 legacy fallback + downgrade 트리거
 * ```
 */
export function usePrimaryWriter(options: UsePrimaryWriterOptions): PrimaryWriterAPI {
  const legacySaveFnRef = useRef(options.legacySaveFn);
  const onDowngradeNeededRef = useRef(options.onDowngradeNeeded);

  // 렌더 중 ref mutation 금지 — useEffect 로 최신 유지.
  useEffect(() => {
    legacySaveFnRef.current = options.legacySaveFn;
  }, [options.legacySaveFn]);
  useEffect(() => {
    onDowngradeNeededRef.current = options.onDowngradeNeeded;
  }, [options.onDowngradeNeeded]);

  const getCurrentMode = useCallback((): PrimaryMode => {
    if (typeof window === 'undefined') return 'legacy';
    try {
      return isJournalEngineOn() ? 'journal' : 'legacy';
    } catch {
      return 'legacy';
    }
  }, []);

  const write = useCallback(
    async (projects: Project[]): Promise<WriteResult> => {
      const t0 = nowMs();
      const mode = getCurrentMode();

      // --------------------------------------------------------
      // [Path 1] legacy — flag off 또는 shadow.
      // --------------------------------------------------------
      if (mode === 'legacy') {
        const ok = safeLegacySave(legacySaveFnRef.current, projects);
        return {
          mode: 'legacy',
          primarySuccess: ok,
          mirrorSuccess: true, // legacy 단일 — mirror 개념 없음, 중립 true.
          durationMs: Math.max(0, nowMs() - t0),
        };
      }

      // --------------------------------------------------------
      // [Path 2] journal — flag on.
      //   Primary: journal appendEntry (snapshot)
      //   Mirror:  background legacy save (실패 허용)
      // --------------------------------------------------------
      try {
        const entryId = await appendSnapshotEntry(projects);
        const durationMs = Math.max(0, nowMs() - t0);

        // Mirror — 이벤트 루프 뒤로 분리. 실패해도 Primary 결과 유지.
        const mirrorPromise = scheduleLegacyMirror(legacySaveFnRef.current, projects);

        return {
          mode: 'journal',
          primarySuccess: true,
          mirrorSuccess: await mirrorPromise,
          journalEntryId: entryId,
          durationMs,
        };
      } catch (err) {
        // --------------------------------------------------------
        // [Path 3] degraded — journal 실패 → legacy 즉시 복귀.
        //   사용자 데이터 손실 0 계약.
        // --------------------------------------------------------
        const reason = err instanceof Error ? err.message : String(err);
        const legacyOk = safeLegacySave(legacySaveFnRef.current, projects);
        const durationMs = Math.max(0, nowMs() - t0);

        // noa:journal-error 이벤트 방송 — useJournalEngineMode 가 구독.
        // 개별 downgrade 콜백은 app 레벨 handler (직접 주입) 병렬 호출.
        dispatchJournalFailure(reason);
        try {
          onDowngradeNeededRef.current?.(`journal-primary-failed: ${reason}`);
        } catch (cbErr) {
          logger.warn('usePrimaryWriter', 'onDowngradeNeeded threw (isolated)', cbErr);
        }

        return {
          mode: 'degraded',
          // legacy 복귀 성공이면 사용자 관점 primary 성공. 실패면 false.
          primarySuccess: legacyOk,
          mirrorSuccess: legacyOk, // legacy 가 Primary 역할 대체
          durationMs,
        };
      }
    },
    [getCurrentMode],
  );

  return { write, getCurrentMode };
}

// ============================================================
// PART 3 — Helpers (legacy + mirror)
// ============================================================

/** performance.now fallback — 테스트 환경에서도 안전. */
function nowMs(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch {
    /* fallthrough */
  }
  return Date.now();
}

/**
 * legacy 경로 호출 — 동기, throw 흡수.
 * 계약: legacySaveFn throw 나 false 반환 → false, 정상 true → true.
 */
function safeLegacySave(
  fn: (projects: Project[]) => boolean,
  projects: Project[],
): boolean {
  try {
    return fn(projects) === true;
  } catch (err) {
    logger.warn('usePrimaryWriter', 'legacySaveFn threw (isolated)', err);
    return false;
  }
}

/**
 * Mirror 쓰기 — Primary(journal) 성공 후 background 로 legacy 반영.
 * 이벤트 루프 뒤로 분리하여 UI blocking 방지.
 * 실패해도 Primary 결과는 바뀌지 않음.
 */
function scheduleLegacyMirror(
  fn: (projects: Project[]) => boolean,
  projects: Project[],
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    // setTimeout(..., 0) — 현재 tick 종료 후 실행.
    // 테스트 fake timer 환경에서도 microtask 경합 없음.
    const timerId = setTimeout(() => {
      try {
        const ok = fn(projects) === true;
        resolve(ok);
      } catch (err) {
        logger.warn('usePrimaryWriter', 'mirror (legacy) failed (isolated)', err);
        resolve(false);
      }
    }, 0);
    // node/edge 환경에서 setTimeout 반환값 타입 차이 — void 캐스트.
    void timerId;
  });
}

// ============================================================
// PART 4 — Journal snapshot append
// ============================================================

/**
 * Journal 엔진에 Project[] 전체 snapshot 으로 append.
 *
 * - schemaVersion 은 CURRENT_SCHEMA_VERSION (save-engine/types) 고정.
 * - compression 은 compressToBytes 가 결정 (gzip 가능 시 적용).
 * - coversUpToEntryId 는 빈 값 — Primary 경로 엔트리는 delta chain 무관.
 *
 * throw 시 상위(write) 에서 catch → legacy fallback + downgrade 트리거.
 */
async function appendSnapshotEntry(projects: Project[]): Promise<string> {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const json = canonicalJson(safeProjects);
  const raw = utf8Encode(json);
  const rawHash = await sha256(raw);
  const { bytes, compression } = await compressToBytes(raw);

  const snapshotPayload: SnapshotPayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectsCompressed: bytes,
    rawHash,
    compression,
    coversUpToEntryId: '',
  };

  const result = await appendEntry({
    entryType: 'snapshot',
    payload: snapshotPayload,
    createdBy: 'auto',
    projectId: null,
  });

  if (!result.ok || !result.entry) {
    const reason = result.error instanceof Error ? result.error.message : 'append-not-ok';
    throw new Error(reason);
  }
  return result.entry.id;
}

// ============================================================
// PART 5 — Failure event dispatch
// ============================================================

/**
 * Journal Primary 실패 이벤트 방송.
 *
 * useJournalEngineMode 는 이 이벤트를 구독하여 auto-downgrade 트리거로 사용.
 * operation='save-project' 고정 — Primary 스왑 시 전체 projects[] 단위.
 * mode='on' 고정 — journal 경로 실행은 mode='on' 일 때만.
 *
 * 이벤트 시스템 차단 환경 (SSR / private mode) 에서는 조용히 무시.
 */
function dispatchJournalFailure(reason: string): void {
  try {
    if (typeof window === 'undefined') return;
    const mode = getJournalEngineMode();
    // Primary 실패 방송은 'on' 일 때만 의미 — 다른 mode 라면 경로 자체가 legacy.
    if (mode !== 'on') return;
    const operation: ShadowOperation = 'save-project';
    const detail: JournalErrorEventDetail = {
      operation,
      reason,
      correlationId: `primary-write-${Date.now()}`,
      mode,
      ts: Date.now(),
    };
    window.dispatchEvent(new CustomEvent(JOURNAL_ERROR_EVENT, { detail }));
  } catch {
    /* 이벤트 시스템 차단 — 조용히 무시 */
  }
}

// IDENTITY_SEAL: PART-1..5 | role=primary-writer-hook | inputs=projects | outputs=WriteResult+mode
