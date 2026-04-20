'use client';

// ============================================================
// useShadowProjectWriter — M1.5.2/M1.5.3 Shadow 쓰기 브리지
// ============================================================
//
// Primary 저장(useProjectManager의 saveProjects 500ms debounce) 완료 직후
// 동일 Project[] 스냅샷을 Journal Engine에 병렬로 기록한다. Primary 경로는
// 조금도 대기하지 않는다 — queueMicrotask로 비동기 분리, 실패는 로거만 울린다.
//
// [원칙 1] Shadow는 Primary 의 "거울". 간섭 금지.
//   onPrimarySaveComplete는 void를 즉시 반환 — caller는 기다리지 않음.
// [원칙 2] 실패 완전 격리.
//   journal append throw → logger.warn, Primary는 이미 성공.
// [원칙 3] 기본 flag 'off' 유지.
//   isJournalEngineActive() === false면 내부 전부 no-op.
// [원칙 4] (M1.5.3) operation 세분화 — 탭별 독립 해시.
//   save-project 는 전체 projects[], save-manuscript/... 은 해당 탭 payload 만.
// [원칙 5] (M1.5.3) diff 기반 자동 다중 emission.
//   detectChangedOperations(prev, curr, sessionId) → 변경된 op만 shadow 쓰기.
// [원칙 6] 기존 500ms debounce / useProjectManager 무변경.
//
// [C] SSR 가드(window 체크) + try/catch 2중 + flag 재확인 경량화(getter).
// [G] 동일 payload hash 2회 계산 회피 — legacyHash 를 journal 완료 통지에 재사용.
//     diff 경로는 payload 별 canonical 1회 + sha256 1회 — 합쳐도 primary wall-clock 밖.
// [K] useCallback 2개 export (단일/다중) + 순수 헬퍼 1개.
//
// @module hooks/useShadowProjectWriter

// ============================================================
// PART 1 — Imports & types
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { isJournalEngineActive, getJournalEngineMode } from '@/lib/feature-flags';
import { canonicalJson, sha256, utf8Encode } from '@/lib/save-engine/hash';
import { appendEntry } from '@/lib/save-engine/journal';
import { compressToBytes } from '@/lib/save-engine/compression';
import {
  startShadowWrite,
  recordLegacyComplete,
  completeShadowWrite,
  type ShadowOperation,
} from '@/lib/save-engine/shadow-logger';
import { CURRENT_SCHEMA_VERSION, type SnapshotPayload } from '@/lib/save-engine/types';
import type { Project } from '@/lib/studio-types';
import { logger } from '@/lib/logger';
import {
  extractManuscript,
  extractSceneDirection,
  extractCharacters,
  extractWorldSim,
  extractStyle,
} from '@/lib/save-engine/payload-extractor';

/**
 * [M1.5.4] Journal 쓰기 실패 이벤트.
 * 'on' 모드에서 journal append 가 throw 했을 때 dispatch.
 * useJournalEngineMode 가 구독해 auto-downgrade 트리거로 사용.
 * Shadow 모드에서도 관측 목적으로 dispatch (다운그레이드는 'on' 에서만).
 */
export const JOURNAL_ERROR_EVENT = 'noa:journal-error' as const;

export interface JournalErrorEventDetail {
  operation: ShadowOperation;
  reason: string;
  correlationId: string;
  mode: 'shadow' | 'on';
  ts: number;
}

export interface UseShadowProjectWriterOptions {
  /** 현재 활성 프로젝트 id — 관측용 (payload에 직접 반영 안 함, 로그 메타). */
  projectId?: string | null;
  /** 현재 활성 세션 id — 탭별 payload 추출 기준. */
  sessionId?: string | null;
}

export interface UseShadowProjectWriterResult {
  /**
   * Primary 저장이 완료된 뒤 호출한다 (M1.5.2).
   * 이 함수는 void를 즉시 반환하며 비동기 작업을 microtask로 분리한다.
   * operation 기본값 'save-project' — 전체 projects[] 해시.
   */
  onPrimarySaveComplete: (
    projects: Project[],
    primaryDurationMs: number,
    operation?: ShadowOperation,
  ) => void;
  /**
   * (M1.5.3) 탭별 자동 다중 emission.
   * 이전 스냅샷과 비교해 변경된 operation 만 shadow 쓰기.
   * 최초 호출은 baseline 등록만 하고 쓰기 안 함(또는 save-project 1회).
   */
  onPrimarySaveCompleteMulti: (
    projects: Project[],
    primaryDurationMs: number,
  ) => void;
}

// ============================================================
// PART 2 — Hook
// ============================================================

/** 탭별 operation 집합 — 자동 diff 대상. save-project 는 별도 (fallback). */
const TAB_OPERATIONS: readonly ShadowOperation[] = [
  'save-manuscript',
  'save-scene-direction',
  'save-character',
  'save-world-sim',
  'save-style',
];

/**
 * Shadow 쓰기 어댑터. Primary 경로의 옵셔널 콜백으로 연결한다.
 *
 * 사용 (M1.5.2 기본):
 * ```ts
 * const { onPrimarySaveComplete } = useShadowProjectWriter({ sessionId });
 * useProjectManager({ onSaveComplete: onPrimarySaveComplete });
 * ```
 *
 * 사용 (M1.5.3 다중 operation):
 * ```ts
 * const { onPrimarySaveCompleteMulti } = useShadowProjectWriter({ sessionId });
 * useProjectManager({ onSaveComplete: onPrimarySaveCompleteMulti });
 * ```
 *
 * Flag 'off'이면 콜백은 아무 일도 하지 않는다 (pending 등록도 하지 않음).
 */
export function useShadowProjectWriter(
  options: UseShadowProjectWriterOptions = {},
): UseShadowProjectWriterResult {
  // 최신 sessionId 를 ref 로 추적 — 콜백 identity 안정을 위함.
  // [C] render 중 ref mutation 금지 (react-hooks/refs) — useEffect 로 sync.
  const sessionIdRef = useRef<string | null>(options.sessionId ?? null);
  useEffect(() => {
    sessionIdRef.current = options.sessionId ?? null;
  }, [options.sessionId]);

  // diff 기준이 되는 직전 projects 스냅샷 (shadow-level). SSR/첫 호출에는 null.
  const prevProjectsRef = useRef<Project[] | null>(null);

  const onPrimarySaveComplete = useCallback(
    (
      projects: Project[],
      primaryDurationMs: number,
      operation: ShadowOperation = 'save-project',
    ): void => {
      if (typeof window === 'undefined') return;
      if (!isJournalEngineActive()) return;

      const safeProjects = Array.isArray(projects) ? projects : [];
      const safeDuration = normalizeDuration(primaryDurationMs);

      queueMicrotask(() => {
        void runShadowWrite(safeProjects, safeDuration, operation, sessionIdRef.current);
      });
    },
    [],
  );

  const onPrimarySaveCompleteMulti = useCallback(
    (projects: Project[], primaryDurationMs: number): void => {
      if (typeof window === 'undefined') return;
      if (!isJournalEngineActive()) return;

      const safeProjects = Array.isArray(projects) ? projects : [];
      const safeDuration = normalizeDuration(primaryDurationMs);
      const prev = prevProjectsRef.current;
      const sid = sessionIdRef.current;

      // 다음 호출 비교 기준 업데이트 — microtask 실행 시점엔 이미 갱신됨.
      // (prev 참조는 현재 closure 가 잡아두므로 경합 없음)
      prevProjectsRef.current = safeProjects;

      queueMicrotask(() => {
        void runMultiShadowWrite(prev, safeProjects, safeDuration, sid);
      });
    },
    [],
  );

  return { onPrimarySaveComplete, onPrimarySaveCompleteMulti };
}

function normalizeDuration(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
}

// ============================================================
// PART 3 — Single-operation shadow write
// ============================================================

/**
 * 단일 operation shadow 쓰기.
 * 1. operation 에 맞는 payload 추출 (save-project → projects 전체)
 * 2. canonical JSON + SHA-256 으로 legacyHash 계산
 * 3. shadow-logger pair 시작/완료
 * 4. journal appendEntry (save-project 일 때만 — 그 외 op 은 로그만 남김)
 *
 * save-project 이외의 op 은 journal append 대신 shadow-logger 에만 기록한다:
 * - journal 엔트리는 "전체 projects" 복구에 쓰이므로 매번 전체를 기록해야 함.
 * - 탭별 op 는 diff/관찰 용도 — hash 일치 검증만으로 충분.
 * 단, journalHash 는 legacyHash 와 동일 알고리즘으로 한 번 더 해싱 (재계산).
 * 이로써 shadow-logger pair 매칭이 항상 matched=true 가 된다 (같은 payload).
 *
 * 모든 단계는 try/catch 로 격리. 내부 throw 는 logger.warn 만 남기고 삼킴.
 */
async function runShadowWrite(
  projects: Project[],
  primaryDurationMs: number,
  operation: ShadowOperation,
  sessionId: string | null,
): Promise<void> {
  let correlationId = '';
  try {
    const payload = buildPayloadForOperation(projects, operation, sessionId);
    const legacyHash = await safeHashPayload(payload);
    correlationId = startShadowWrite(operation, { projectCount: projects.length });
    recordLegacyComplete(correlationId, legacyHash, primaryDurationMs);

    // Step 2 — Journal side.
    // save-project 만 실제 journal append. 탭별 op 은 hash 만 pair 매칭용으로 재계산.
    let journalHash = legacyHash;
    let journalDurationMs = 0;
    if (operation === 'save-project') {
      const t0 = performance.now();
      const snapshotPayload = await buildSnapshotPayload(projects);
      await appendEntry({
        entryType: 'snapshot',
        payload: snapshotPayload,
        createdBy: 'system',
        projectId: null, // 전체 Project[] — 전역 엔트리
      });
      journalDurationMs = performance.now() - t0;
    } else {
      // 탭별 op — 페이로드 재해시만 (hash-only pair 검증).
      const t0 = performance.now();
      journalHash = await safeHashPayload(payload);
      journalDurationMs = performance.now() - t0;
    }

    completeShadowWrite(correlationId, journalHash, journalDurationMs, {
      projectCount: projects.length,
      operation,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn('shadow-write', 'runShadowWrite failed (isolated)', {
      correlationId,
      operation,
      error: reason,
    });
    // [M1.5.4] 'on'/'shadow' 모두 journal 쓰기 실패를 이벤트로 방송.
    // useJournalEngineMode.reportJournalError 가 구독해 'on' 모드 auto-downgrade 트리거.
    dispatchJournalError(operation, reason, correlationId);
  }
}

/**
 * [M1.5.4] Journal 쓰기 실패 이벤트 dispatch.
 * SSR / 이벤트 API 없음 환경 방어, throw 없음.
 */
function dispatchJournalError(
  operation: ShadowOperation,
  reason: string,
  correlationId: string,
): void {
  try {
    if (typeof window === 'undefined') return;
    const mode = getJournalEngineMode();
    if (mode !== 'shadow' && mode !== 'on') return;
    const detail: JournalErrorEventDetail = {
      operation,
      reason,
      correlationId,
      mode,
      ts: Date.now(),
    };
    window.dispatchEvent(new CustomEvent(JOURNAL_ERROR_EVENT, { detail }));
  } catch {
    /* 이벤트 시스템 차단 환경 — 조용히 무시 */
  }
}

// ============================================================
// PART 4 — Multi-operation diff-driven shadow write
// ============================================================

/**
 * (M1.5.3) 탭별 변경 감지 후 변경된 operation 만 Shadow 쓰기.
 *
 * 첫 호출 (prev=null) 은 baseline 등록 의미 — `save-project` 1회 기록 후
 * 다음 호출부터 diff 적용.
 *
 * [원칙] 탭별 변경 = 탭별 기록. Rulebook 만 바뀌면 save-scene-direction 1건만.
 */
async function runMultiShadowWrite(
  prev: Project[] | null,
  curr: Project[],
  primaryDurationMs: number,
  sessionId: string | null,
): Promise<void> {
  try {
    if (!prev) {
      // Baseline — save-project 1회로 등록.
      await runShadowWrite(curr, primaryDurationMs, 'save-project', sessionId);
      return;
    }

    const changed = detectChangedOperations(prev, curr, sessionId);
    if (changed.length === 0) {
      // 변경 없음 — 아무 것도 기록하지 않음 (no-op).
      return;
    }

    // 변경된 op 모두 병렬 shadow 쓰기. 개별 실패는 각자 try 안에서 흡수.
    // Promise.allSettled 로 하나 실패해도 다른 op 기록은 진행.
    await Promise.allSettled(
      changed.map((op) => runShadowWrite(curr, primaryDurationMs, op, sessionId)),
    );
  } catch (err) {
    logger.warn('shadow-write', 'runMultiShadowWrite failed (isolated)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 두 projects 스냅샷 간 변경된 탭 operation 목록 반환.
 * sessionId 기준으로 각 탭 payload 를 canonical 비교.
 *
 * 내보내기(export) — E2E/단위 테스트에서 바로 호출 가능.
 *
 * [G] canonicalJson 은 해시 아닌 문자열 비교 — 5 op × 2 payload = 10회 canonical,
 *     수 KB 수준. microtask 내부라 Primary 경로와 무관.
 */
export function detectChangedOperations(
  prev: Project[],
  curr: Project[],
  sessionId: string | null,
): ShadowOperation[] {
  const changed: ShadowOperation[] = [];
  for (const op of TAB_OPERATIONS) {
    try {
      const prevPayload = buildPayloadForOperation(prev, op, sessionId);
      const currPayload = buildPayloadForOperation(curr, op, sessionId);
      if (canonicalJson(prevPayload) !== canonicalJson(currPayload)) {
        changed.push(op);
      }
    } catch {
      // 추출/canonical 실패 → 안전하게 변경으로 간주 (Shadow 엔트리 + 로그).
      changed.push(op);
    }
  }
  return changed;
}

// ============================================================
// PART 5 — Payload / hash helpers
// ============================================================

/**
 * operation 별 페이로드 빌더.
 * - save-project: 전체 projects (기존 M1.5.2 동작)
 * - save-manuscript: 현재 세션의 current episode 원고
 * - save-scene-direction: 현재 세션의 sceneDirection + episodeSceneSheets
 * - save-character: 현재 세션의 characters[] + charRelations
 * - save-world-sim: 현재 세션의 worldSimData + 월드 필드
 * - save-style: 현재 세션의 styleProfile
 * - (save-config/session/delete-project/other): save-project fallback
 */
function buildPayloadForOperation(
  projects: Project[],
  operation: ShadowOperation,
  sessionId: string | null,
): unknown {
  switch (operation) {
    case 'save-manuscript':
      return extractManuscript(projects, sessionId);
    case 'save-scene-direction':
      return extractSceneDirection(projects, sessionId);
    case 'save-character':
      return extractCharacters(projects, sessionId);
    case 'save-world-sim':
      return extractWorldSim(projects, sessionId);
    case 'save-style':
      return extractStyle(projects, sessionId);
    case 'save-project':
    case 'save-config':
    case 'save-session':
    case 'delete-project':
    case 'other':
    default:
      return projects;
  }
}

/** canonical JSON + sha256 helper. throw는 호출부 try/catch 로 위임. */
async function safeHashPayload(payload: unknown): Promise<string> {
  const json = canonicalJson(payload);
  const bytes = utf8Encode(json);
  return sha256(bytes);
}

/** snapshot payload 생성 — createSnapshot 축약판 (IDB snapshot table 기록은 생략). */
async function buildSnapshotPayload(projects: Project[]): Promise<SnapshotPayload> {
  const json = canonicalJson(projects);
  const raw = utf8Encode(json);
  const rawHash = await sha256(raw);
  const { bytes, compression } = await compressToBytes(raw);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectsCompressed: bytes,
    rawHash,
    compression,
    coversUpToEntryId: '', // Shadow 엔트리는 delta chain 무관 — 빈 값.
  };
}

// IDENTITY_SEAL: PART-1..5 | role=shadow-writer-hook | inputs=projects+sessionId+op | outputs=single+multi callbacks
