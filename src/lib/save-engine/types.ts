// ============================================================
// PART 1 — Journal entry enums (Spec Part 2.1)
// ============================================================

/** 저널 엔트리 종류 */
export type JournalEntryType =
  | 'init'
  | 'delta'
  | 'snapshot'
  | 'recovery-marker'
  | 'migration'
  | 'anomaly'
  | 'heartbeat';

/** 기록 주체 */
export type JournalAuthor =
  | 'user'
  | 'auto'
  | 'migration'
  | 'recovery'
  | 'system';

// ============================================================
// PART 2 — HLC + Patch primitives (Spec 2.2.2 + 2.1 JsonPatchOp)
// ============================================================

/** Hybrid Logical Clock */
export interface HLC {
  /** Date.now() 기반 (ms) */
  physical: number;
  /** 동일 physical 내 증가 카운터 */
  logical: number;
  /** 탭/디바이스 고유 id */
  nodeId: string;
}

/** RFC 6902 JSON Patch 연산 — fast-json-patch가 반환/수용하는 형태 */
export type JsonPatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; path: string; from: string }
  | { op: 'copy'; path: string; from: string }
  | { op: 'test'; path: string; value: unknown };

// ============================================================
// PART 3 — Payload union (Spec Part 2.1)
// ============================================================

/** 엔트리 페이로드 분기 */
export type JournalPayload =
  | InitPayload
  | DeltaPayload
  | SnapshotPayload
  | RecoveryMarkerPayload
  | MigrationPayload
  | AnomalyPayload
  | HeartbeatPayload;

export interface InitPayload {
  schemaVersion: number;
  projectsEmpty: true;
}

export interface DeltaPayload {
  projectId: string;
  ops: JsonPatchOp[];
  target: 'project' | 'session' | 'manuscript' | 'config' | 'sceneSheet';
  targetId?: string;
  baseContentHash: string;
}

export interface SnapshotPayload {
  schemaVersion: number;
  /** 전체 Project[]의 압축본 (compression 'none' 이면 UTF-8 원본) */
  projectsCompressed: Uint8Array;
  /** 압축 전 JSON의 SHA-256 */
  rawHash: string;
  compression: 'gzip' | 'none';
  /** 이 snapshot이 커버하는 마지막 delta의 entry id */
  coversUpToEntryId: string;
}

export interface RecoveryMarkerPayload {
  phase: 'enter' | 'complete' | 'abort';
  reason: 'crash-detected' | 'chain-corruption' | 'user-initiated';
  lastHeartbeatAt?: number;
}

export interface MigrationPayload {
  fromVersion: number;
  toVersion: number;
  phase: 'begin' | 'commit' | 'rollback';
}

export interface AnomalyPayload {
  kind: 'bulk-delete' | 'length-collapse' | 'hash-mismatch';
  detail: { beforeChars?: number; afterChars?: number; ratio?: number };
  /** 해당 엔트리 직전 snapshot id (복구 제안용) */
  suggestedSnapshotId: string;
}

export interface HeartbeatPayload {
  sessionId: string;
  tabId: string;
  uptimeMs: number;
}

// ============================================================
// PART 4 — Entry envelope (Spec 2.1 JournalEntry)
// ============================================================

/** 저널 엔트리 최종 형태 */
export interface JournalEntry {
  /** ULID 26자 base32 */
  id: string;
  clock: HLC;
  sessionId: string;
  tabId: string;
  /** delta일 경우 payload.projectId와 일치. 그 외 null */
  projectId: string | null;
  entryType: JournalEntryType;
  /** 직전 엔트리의 contentHash (체인) — 최초 init은 'GENESIS' 고정 */
  parentHash: string;
  /** 이 엔트리 payload의 SHA-256 (hex 64자) */
  contentHash: string;
  payload: JournalPayload;
  createdBy: JournalAuthor;
  /** 저널 스키마 버전 */
  journalVersion: number;
}

// ============================================================
// PART 5 — Hook-facing metadata types (Spec Part 8)
// ============================================================

export interface SaveMeta {
  entryId: string;
  clock: HLC;
  tier: 'indexeddb' | 'localstorage' | 'memory';
  /** 바이트 수 (uncompressed) */
  bytes: number;
  /** 걸린 시간 (ms) */
  durationMs: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'quarantined';

export interface ConflictInfo {
  remoteClock: HLC;
  localClock: HLC;
  needsManualMerge: boolean;
  resolve: (choice: 'keep-local' | 'keep-remote' | 'merge') => Promise<void>;
}

// ============================================================
// PART 6 — Internal engine result types
// ============================================================

/** 쓰기 시도 결과 */
export interface AppendResult {
  ok: boolean;
  entry?: JournalEntry;
  tier?: 'indexeddb' | 'localstorage' | 'memory';
  durationMs: number;
  error?: Error;
}

/** 체인 검증 결과 */
export interface VerifyResult {
  ok: boolean;
  breakAt?: string;
  reason?: 'parent-mismatch' | 'content-hash-mismatch' | 'missing-genesis';
  scanned: number;
}

/** 저널 스키마 상수 — 현재 엔진 버전 */
export const CURRENT_JOURNAL_VERSION = 1;
/** 프로젝트 데이터 스키마 버전 — snapshot/init에 박힘 */
export const CURRENT_SCHEMA_VERSION = 1;
/** 제너시스(체인 시작) 상수 */
export const GENESIS = 'GENESIS';
