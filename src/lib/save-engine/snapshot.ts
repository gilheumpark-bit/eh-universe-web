// ============================================================
// PART 1 — Snapshot creation (Spec Part 4)
// ============================================================
//
// 복합 트리거 (Spec 4.1.2):
//   1. 마지막 snapshot 이후 delta ≥ 100
//   2. 마지막 snapshot 이후 누적 bytes ≥ 512KB
//   3. 마지막 snapshot 이후 ≥ 10분 + delta ≥ 1
//   4. forceSnapshot() 수동
//   5. anomaly 직후 자동

import type { SnapshotPayload, AppendResult, JournalEntry } from './types';
import { CURRENT_SCHEMA_VERSION } from './types';
import { appendEntry, readAllEntries } from './journal';
import { compressToBytes, decompressFromBytes } from './compression';
import { sha256, canonicalJson, utf8Encode } from './hash';
import {
  idbPutSnapshot,
  idbListSnapshots,
  idbDeleteSnapshot,
  type SnapshotRecord,
} from './indexeddb-adapter';

// ============================================================
// PART 2 — Snapshot creation
// ============================================================

export interface CreateSnapshotInput {
  projects: unknown; // 전체 Project[]
  coversUpToEntryId: string;
  protect?: boolean;
}

export interface CreateSnapshotResult {
  entryResult: AppendResult;
  snapshotId: string;
  rawHash: string;
  compression: 'gzip' | 'none';
  uncompressedBytes: number;
}

/**
 * 전체 Project[] → canonical JSON → (gzip?) → snapshot 엔트리 append.
 */
export async function createSnapshot(input: CreateSnapshotInput): Promise<CreateSnapshotResult> {
  const json = canonicalJson(input.projects);
  const raw = utf8Encode(json);
  const rawHash = await sha256(raw);
  const { bytes, compression } = await compressToBytes(raw);

  const payload: SnapshotPayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectsCompressed: bytes,
    rawHash,
    compression,
    coversUpToEntryId: input.coversUpToEntryId,
  };

  const entryResult = await appendEntry({
    entryType: 'snapshot',
    payload,
    createdBy: 'system',
    projectId: null,
  });

  // IDB에도 별도 snapshot 테이블 기록(Spec 12.11 — snapshots store)
  if (entryResult.ok && entryResult.entry) {
    try {
      const record: SnapshotRecord = {
        id: entryResult.entry.id,
        payload,
        meta: { protected: input.protect ?? false, createdAt: Date.now() },
      };
      await idbPutSnapshot(record);
    } catch {
      // IDB 전용 인덱스 실패는 chain에 영향 없음 — entry는 journal에 이미 기록
    }
  }

  return {
    entryResult,
    snapshotId: entryResult.entry?.id ?? '',
    rawHash,
    compression,
    uncompressedBytes: raw.byteLength,
  };
}

// ============================================================
// PART 3 — Snapshot restore (Spec 7.1 Step 4/5)
// ============================================================

export interface RestoreSnapshotResult {
  projects: unknown;
  verified: boolean;
  rawHash: string;
  snapshotId: string;
}

export async function restoreSnapshot(record: SnapshotRecord): Promise<RestoreSnapshotResult> {
  const restored = await decompressFromBytes(record.payload.projectsCompressed, record.payload.compression);
  const recomputed = await sha256(restored);
  const ok = recomputed === record.payload.rawHash;
  const text = new TextDecoder().decode(restored);
  const projects = JSON.parse(text) as unknown;
  return { projects, verified: ok, rawHash: record.payload.rawHash, snapshotId: record.id };
}

// ============================================================
// PART 4 — Maintenance: cleanup (Spec 4.3)
// ============================================================

export const MAX_SNAPSHOTS = 20;

/**
 * 오래된 snapshot 정리. protected 플래그된 것은 제외.
 * Spec 4.3.1 — 최근 20개 유지.
 */
export async function cleanupOldSnapshots(keep: number = MAX_SNAPSHOTS): Promise<{ deleted: number }> {
  const all = await idbListSnapshots();
  // 생성 시각 내림차순으로 정렬 후 keep개수 초과분 중 protected 제외하고 삭제
  const sorted = all.slice().sort((a, b) => b.meta.createdAt - a.meta.createdAt);
  const over = sorted.slice(keep);
  const toDelete = over.filter((s) => !s.meta.protected);
  for (const s of toDelete) {
    await idbDeleteSnapshot(s.id);
  }
  return { deleted: toDelete.length };
}

// ============================================================
// PART 5 — Composite trigger (Spec 4.1.2)
// ============================================================

export interface TriggerDecision {
  shouldSnapshot: boolean;
  reason: 'count' | 'size' | 'time' | 'manual' | 'anomaly' | 'idle';
  deltaCountSinceLast: number;
  bytesSinceLast: number;
  minutesSinceLast: number;
}

export const DEFAULT_COUNT_THRESHOLD = 100;
export const DEFAULT_SIZE_THRESHOLD = 512 * 1024;
export const DEFAULT_TIME_THRESHOLD_MS = 10 * 60 * 1000;

export interface TriggerInputs {
  deltaCountSinceLast: number;
  bytesSinceLast: number;
  lastSnapshotAt: number | null;
  manual?: boolean;
  anomaly?: boolean;
  now?: number;
}

export function evaluateSnapshotTrigger(inputs: TriggerInputs): TriggerDecision {
  const now = inputs.now ?? Date.now();
  const minutesSinceLast = inputs.lastSnapshotAt ? (now - inputs.lastSnapshotAt) / 60000 : Infinity;
  const common = {
    deltaCountSinceLast: inputs.deltaCountSinceLast,
    bytesSinceLast: inputs.bytesSinceLast,
    minutesSinceLast,
  };

  if (inputs.manual) return { ...common, shouldSnapshot: true, reason: 'manual' };
  if (inputs.anomaly) return { ...common, shouldSnapshot: true, reason: 'anomaly' };
  if (inputs.deltaCountSinceLast >= DEFAULT_COUNT_THRESHOLD) return { ...common, shouldSnapshot: true, reason: 'count' };
  if (inputs.bytesSinceLast >= DEFAULT_SIZE_THRESHOLD) return { ...common, shouldSnapshot: true, reason: 'size' };
  if (minutesSinceLast >= DEFAULT_TIME_THRESHOLD_MS / 60000 && inputs.deltaCountSinceLast >= 1) {
    return { ...common, shouldSnapshot: true, reason: 'time' };
  }
  return { ...common, shouldSnapshot: false, reason: 'idle' };
}

// ============================================================
// PART 6 — Lookup helpers
// ============================================================

/**
 * 최신 snapshot 엔트리 조회 (journal 전수 스캔).
 * Phase 1.5에 indexed query로 교체 가능(현재 엔트리 수 < 1K 수준에서 OK).
 */
export async function findLatestSnapshotEntry(): Promise<JournalEntry | null> {
  const all = await readAllEntries();
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].entryType === 'snapshot') return all[i];
  }
  return null;
}
