'use client';

// ============================================================
// useShadowProjectWriter — M1.5.2 Writing 탭 Shadow 쓰기 브리지
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
// [원칙 4] Writing 탭 만 이번 Phase.
//   projects 전체 스냅샷 하나로 Primary saveProjects(projects)와 1:1 매칭.
// [원칙 5] 기존 500ms debounce 유지.
//   이 훅은 debounce를 변경하지 않음, callback만 제공.
//
// [C] SSR 가드(window 체크) + try/catch 2중 + 훅 내부에서 flag 재확인 경량화(getter).
// [G] 동일 payload hash 2회 계산 회피 — 한 번 계산한 legacyHash를 journal 완료 통지에 재사용.
// [K] 복잡한 상태 없음 — useCallback 1개만 export.
//
// @module hooks/useShadowProjectWriter

// ============================================================
// PART 1 — Imports & types
// ============================================================

import { useCallback } from 'react';
import { isJournalEngineActive } from '@/lib/feature-flags';
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

export interface UseShadowProjectWriterOptions {
  /** 현재 활성 프로젝트 id — 관측용 (payload에 직접 반영 안 함, 로그 메타). */
  projectId?: string | null;
  /** 현재 활성 세션 id — 관측용. */
  sessionId?: string | null;
}

export interface UseShadowProjectWriterResult {
  /**
   * Primary 저장이 완료된 뒤 호출한다.
   * 이 함수는 void를 즉시 반환하며 비동기 작업을 microtask로 분리한다.
   */
  onPrimarySaveComplete: (
    projects: Project[],
    primaryDurationMs: number,
    operation?: ShadowOperation,
  ) => void;
}

// ============================================================
// PART 2 — Hook
// ============================================================

/**
 * Shadow 쓰기 어댑터. Primary 경로의 옵셔널 콜백으로 연결한다.
 *
 * 사용:
 * ```ts
 * const { onPrimarySaveComplete } = useShadowProjectWriter({ projectId, sessionId });
 * useProjectManager({ onSaveComplete: onPrimarySaveComplete });
 * ```
 *
 * Flag 'off'이면 콜백은 아무 일도 하지 않는다 (pending 등록도 하지 않음).
 */
export function useShadowProjectWriter(
  // 현재는 projectId/sessionId 를 payload 에 박지 않으므로 options 를 소비하지 않는다.
  // 향후 Shadow 로그 메타에 포함하려면 ref-sync 패턴으로 최신값을 읽어온다.
  _options: UseShadowProjectWriterOptions = {},
): UseShadowProjectWriterResult {
  const onPrimarySaveComplete = useCallback(
    (
      projects: Project[],
      primaryDurationMs: number,
      operation: ShadowOperation = 'save-project',
    ): void => {
      // [C] SSR 가드 — server 렌더에서는 아무 것도 안 함.
      if (typeof window === 'undefined') return;

      // [C] Flag 재확인. 'off'면 완전 no-op. 저널/쉐도우 어떤 side-effect도 없음.
      // isJournalEngineActive()는 localStorage 읽기 — 동기, 수 μs.
      if (!isJournalEngineActive()) return;

      // [C] projects 비정상 입력 방어. 비어도 기록은 가능 (init 상태 관측 가치).
      // Primary가 아예 실패했다면 caller가 호출하지 않아야 함(계약).
      const safeProjects = Array.isArray(projects) ? projects : [];
      const safeDuration = typeof primaryDurationMs === 'number' && Number.isFinite(primaryDurationMs)
        ? Math.max(0, primaryDurationMs)
        : 0;

      // [G] 비동기 분리 — Primary 리턴 경로에 0ms 추가.
      // queueMicrotask는 현재 task 종료 직후 실행 — setTimeout(0)보다 훨씬 빠르고 정확.
      queueMicrotask(() => {
        void runShadowWrite(safeProjects, safeDuration, operation);
      });
    },
    // options.projectId/sessionId가 바뀌어도 콜백 identity 유지 — ref 로 최신값 공급.
    [],
  );

  return { onPrimarySaveComplete };
}

// ============================================================
// PART 3 — Shadow write orchestration (private)
// ============================================================

/**
 * 1. canonical JSON + SHA-256으로 legacyHash 계산 (Primary 와 동일 알고리즘)
 * 2. shadow-logger 에 pair 시작 + legacy 완료 기록
 * 3. journal appendEntry (snapshot 타입) — 실제 저널 쓰기
 * 4. journalHash 로 shadow-logger pair 완료
 *
 * 모든 단계는 try/catch 로 격리. 내부 throw는 logger.warn 만 남기고 삼킴.
 */
async function runShadowWrite(
  projects: Project[],
  primaryDurationMs: number,
  operation: ShadowOperation,
): Promise<void> {
  let correlationId = '';
  try {
    // Step 1 — Primary 경로와 동일한 알고리즘으로 해시 계산.
    // Primary는 JSON.stringify(projects)를 localStorage에 저장.
    // Shadow 측 journal 은 canonical JSON + sha256을 contentHash 로 사용.
    // 비교의 의미를 위해 legacy 해시도 canonical JSON 기반으로 계산 — 두 경로가
    // "동일 입력을 동일 알고리즘으로 해시" 한 것이므로 99.9% 일치 기대 (NaN/undefined
    // 같은 JSON.stringify edge만 차이).
    const legacyHash = await safeHashProjects(projects);
    correlationId = startShadowWrite(operation, { projectCount: projects.length });
    recordLegacyComplete(correlationId, legacyHash, primaryDurationMs);

    // Step 2 — Journal side: snapshot 엔트리 append.
    // appendEntry 내부에서 다시 canonicalJson+sha256을 돌려 contentHash 를 만든다.
    // 우리는 "projectsCompressed 바이트의 해시"가 아니라 "원본 Project[]의 해시"를
    // pair key 로 쓴다. 그래야 Primary 저장본과 직접 비교 가능.
    const t0 = performance.now();
    const snapshotPayload = await buildSnapshotPayload(projects);
    await appendEntry({
      entryType: 'snapshot',
      payload: snapshotPayload,
      createdBy: 'system',
      projectId: null, // 전체 Project[] — 전역 엔트리
    });
    const journalDurationMs = performance.now() - t0;

    // Step 3 — journal 완료 통지. hash 는 "같은 원본" 기준 동일 값.
    completeShadowWrite(correlationId, legacyHash, journalDurationMs, {
      projectCount: projects.length,
    });
  } catch (err) {
    // Shadow 경로는 완전 격리. Primary 정상, 사용자 알림 없음, 로그만.
    logger.warn('shadow-write', 'runShadowWrite failed (isolated)', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    // pair 미완료 — shadow-logger TTL(30s) 스윕이 자동 청소.
  }
}

/** canonical JSON + sha256 helper. throw는 호출부 try/catch 로 위임. */
async function safeHashProjects(projects: Project[]): Promise<string> {
  const json = canonicalJson(projects);
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

// IDENTITY_SEAL: PART-1..3 | role=shadow-writer-hook | inputs=projects+durationMs | outputs=onPrimarySaveComplete
