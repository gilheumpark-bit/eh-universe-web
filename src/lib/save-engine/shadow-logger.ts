// ============================================================
// PART 1 — Overview (M1.5.0 Shadow Mode Logger)
// ============================================================
//
// 저널 엔진 쓰기와 기존 경로 쓰기를 correlation-id로 pair 매칭.
// hash/bytes를 비교해 일치율(diff)을 측정. Shadow 모드 검증 전용.
//
// [원칙 1] Shadow는 관찰자 — 로거 실패가 primary 저장을 절대 막지 않음.
// [원칙 2] 완전 격리 — 별도 DB 'noa_shadow_v1' 사용, 기존 noa_journal_v1 무영향.
// [원칙 3] Ring buffer — 최근 1,000 엔트리만 유지 (IndexedDB quota 보호).
// [원칙 4] 모든 외부 쓰기는 try/catch — throw 주입해도 내부에서 흡수.
//
// API (start → record(legacy|journal) → complete):
//   startShadowWrite(operation, legacyPayload): correlationId
//   recordLegacyComplete(correlationId, legacyHash, durationMs)
//   completeShadowWrite(correlationId, journalHash, journalDurationMs)
//   getShadowLog(filter): ShadowLogEntry[]
//   getMatchRate(windowMs): number
//   clearShadowLog(): Promise<void>
//
// [C] None 가드 / Storage 차단 폴백 / 모든 public API try 래핑
// [G] In-memory pending map + IndexedDB는 최종 쓰기만 (N+1 제거)
// [K] 로직은 3 섹션 — pending 관리 / 영속 / 조회

import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Types
// ============================================================

// [M1.5.3] operation 태그 세분화 — 탭별 Shadow 쓰기 분리.
// - save-project: 전체 projects[] 스냅샷 (backward compat, M1.5.2 기본)
// - save-manuscript: Writing 탭 (episode manuscripts[])
// - save-scene-direction: Rulebook/SceneSheet (sceneDirection + episodeSceneSheets)
// - save-character: Character (characters[] + charRelations)
// - save-world-sim: World/Planning (worldSimData + simulatorRef + world fields)
// - save-style: Style (styleProfile)
// - save-config: 일반 config 변경 (유지)
// - save-session: 세션 레벨 메타 변경 (유지)
// - delete-project / other: 기타
export type ShadowOperation =
  | 'save-project'
  | 'save-manuscript'
  | 'save-scene-direction'
  | 'save-character'
  | 'save-world-sim'
  | 'save-style'
  | 'save-config'
  | 'save-session'
  | 'delete-project'
  | 'other';

export interface ShadowLogEntry {
  /** 자동 생성된 ID (단조 증가 시퀀스 + 타임스탬프). */
  id: string;
  /** 동일 논리 쓰기를 짝짓는 correlationId. start 시 생성. */
  correlationId: string;
  /** 기록 완료 시각 (Date.now). */
  ts: number;
  /** 어떤 논리 쓰기인가. */
  operation: ShadowOperation;
  /** 기존(legacy) 경로가 실제로 쓴 payload의 hash. */
  legacyHash: string;
  /** 저널 엔진이 쓴 payload의 hash. */
  journalHash: string;
  /** hash 일치 여부. */
  matched: boolean;
  /** 불일치 시 상위 10 필드 diff 요약. */
  diffSummary?: string;
  /** 기존 경로 소요시간 (ms). */
  durationMs: number;
  /** 저널 경로 소요시간 (ms). */
  journalDurationMs: number;
}

/** 조회 필터 (모두 선택) */
export interface ShadowLogFilter {
  operation?: ShadowOperation;
  matched?: boolean;
  sinceTs?: number;
  untilTs?: number;
  limit?: number;
}

// ============================================================
// PART 3 — Pending pair tracker (in-memory)
// ============================================================

interface PendingPair {
  correlationId: string;
  operation: ShadowOperation;
  createdAt: number;
  legacy?: { hash: string; durationMs: number; payloadPreview?: unknown };
  journal?: { hash: string; durationMs: number; payloadPreview?: unknown };
}

const PENDING_TTL_MS = 30_000; // 30초 내 쌍이 맞춰지지 않으면 폐기
const MAX_PENDING = 200;

const pending = new Map<string, PendingPair>();

/** TTL 초과 pending 정리 (호출 시마다 가볍게 sweep). */
function sweepExpired(now: number): void {
  if (pending.size === 0) return;
  const expiredIds: string[] = [];
  for (const [id, p] of pending.entries()) {
    if (now - p.createdAt > PENDING_TTL_MS) {
      expiredIds.push(id);
    }
  }
  for (const id of expiredIds) pending.delete(id);
  // 하드 캡 초과 시 가장 오래된 것부터 제거
  if (pending.size > MAX_PENDING) {
    const sorted = Array.from(pending.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    const excess = sorted.length - MAX_PENDING;
    for (let i = 0; i < excess; i++) {
      pending.delete(sorted[i][0]);
    }
  }
}

// ============================================================
// PART 4 — IndexedDB (isolated — noa_shadow_v1)
// ============================================================
//
// 단일 key 'log_bundle' 아래 ShadowLogEntry[] 배열을 JSON으로 저장한다.
// 이유: (1) 테스트용 Fake IDB의 cursor cascade가 5ms 내에 반복 실행되지 않아
//      cursor 기반 readAll이 동작 보장되지 않음, (2) 최대 1,000 엔트리 규모라
//      단일 bundle put이 10~200KB 수준 — IndexedDB 성능에 무영향, (3) read/write
//      모두 단일 get/put으로 끝나 N+1 제거.

const DB_NAME = 'noa_shadow_v1';
const DB_VERSION = 1;
const STORE = 'shadow_log';
const BUNDLE_KEY = 'log_bundle';
const MAX_ENTRIES = 1000;

interface BundleRecord {
  id: typeof BUNDLE_KEY;
  entries: ShadowLogEntry[];
}

let cachedDb: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase | null> | null = null;

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openShadowDB(): Promise<IDBDatabase | null> {
  if (cachedDb) return Promise.resolve(cachedDb);
  if (openPromise) return openPromise;
  if (!isIndexedDBAvailable()) return Promise.resolve(null);

  openPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        cachedDb = req.result;
        cachedDb.onversionchange = () => {
          try { cachedDb?.close(); } catch { /* noop */ }
          cachedDb = null;
        };
        resolve(cachedDb);
      };
      req.onerror = () => {
        logger.warn('shadow-logger', 'DB open failed — shadow disabled', req.error);
        resolve(null);
      };
      req.onblocked = () => {
        logger.warn('shadow-logger', 'DB blocked — other tab holds old version');
      };
    } catch (err) {
      logger.warn('shadow-logger', 'DB open threw', err);
      resolve(null);
    }
  });
  return openPromise;
}

/** Bundle record 읽기 (없으면 빈 entries). */
async function readBundle(): Promise<ShadowLogEntry[]> {
  const db = await openShadowDB();
  if (!db) return [];
  return new Promise<ShadowLogEntry[]>((resolve) => {
    let settled = false;
    const done = (arr: ShadowLogEntry[]) => {
      if (settled) return;
      settled = true;
      resolve(arr);
    };
    try {
      const tx = db.transaction([STORE], 'readonly');
      const os = tx.objectStore(STORE);
      const req = os.get(BUNDLE_KEY);
      req.onsuccess = () => {
        const result = req.result as BundleRecord | undefined;
        done(result?.entries ?? []);
      };
      req.onerror = () => done([]);
      tx.onerror = () => done([]);
      tx.onabort = () => done([]);
    } catch (err) {
      logger.warn('shadow-logger', 'readBundle threw', err);
      done([]);
    }
  });
}

/** Bundle record 쓰기 (ring buffer 적용). */
async function writeBundle(entries: ShadowLogEntry[]): Promise<void> {
  const db = await openShadowDB();
  if (!db) return;
  // Ring buffer — 최신 MAX_ENTRIES만 유지
  const trimmed = entries.length <= MAX_ENTRIES
    ? entries
    : [...entries].sort((a, b) => b.ts - a.ts).slice(0, MAX_ENTRIES);

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      const tx = db.transaction([STORE], 'readwrite');
      const os = tx.objectStore(STORE);
      const record: BundleRecord = { id: BUNDLE_KEY, entries: trimmed };
      const putReq = os.put(record);
      putReq.onsuccess = () => done();
      putReq.onerror = () => {
        logger.warn('shadow-logger', 'writeBundle req.onerror', putReq.error);
        done();
      };
      tx.oncomplete = () => done();
      tx.onerror = () => {
        logger.warn('shadow-logger', 'writeBundle tx.onerror', tx.error);
        done();
      };
      tx.onabort = () => {
        logger.warn('shadow-logger', 'writeBundle tx.onabort', tx.error);
        done();
      };
    } catch (err) {
      logger.warn('shadow-logger', 'writeBundle threw', err);
      done();
    }
  });
}

// Write 직렬화 — 동시 putEntry 시 read-modify-write race 방지.
let writeChain: Promise<void> = Promise.resolve();

/** 새 엔트리 하나 추가 (직렬). */
async function putEntry(entry: ShadowLogEntry): Promise<void> {
  const prev = writeChain;
  let resolveMine: () => void = () => { /* placeholder, overwritten synchronously below */ };
  writeChain = new Promise<void>((r) => { resolveMine = r; });

  await prev.catch(() => { /* 이전 실패는 무시, 내 write는 진행 */ });

  try {
    const existing = await readBundle();
    existing.push(entry);
    await writeBundle(existing);
  } catch (err) {
    logger.warn('shadow-logger', 'putEntry serial slot failed', err);
  } finally {
    resolveMine();
  }
}

/** 필터 + 정렬 적용한 조회. */
async function readAll(filter?: ShadowLogFilter): Promise<ShadowLogEntry[]> {
  const all = await readBundle();
  const filtered = filter ? all.filter((e) => matchesFilter(e, filter)) : all.slice();
  // ts 내림차순 (최신 먼저)
  filtered.sort((a, b) => b.ts - a.ts);
  const limited = filter?.limit && filter.limit > 0 ? filtered.slice(0, filter.limit) : filtered;
  return limited;
}

function matchesFilter(e: ShadowLogEntry, f?: ShadowLogFilter): boolean {
  if (!f) return true;
  if (f.operation && e.operation !== f.operation) return false;
  if (typeof f.matched === 'boolean' && e.matched !== f.matched) return false;
  if (typeof f.sinceTs === 'number' && e.ts < f.sinceTs) return false;
  if (typeof f.untilTs === 'number' && e.ts > f.untilTs) return false;
  return true;
}

// Ring buffer는 writeBundle이 트림까지 수행 — 별도 trim 함수 불필요.

// ============================================================
// PART 5 — Public API
// ============================================================

let seq = 0;

function generateId(): string {
  seq = (seq + 1) % 1_000_000_000;
  // 시퀀스 + 타임스탬프 + 랜덤 — 같은 tick 내 다수 발행 시에도 유일성 보장
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36);
  return `${Date.now().toString(36)}-${seq.toString(36)}-${rand}`;
}

function generateCorrelationId(): string {
  return `cor-${generateId()}`;
}

/**
 * Shadow 쓰기 시작. pending에 등록하고 correlationId 반환.
 * 실패해도 throw 안 함 — 임시 id 반환하여 caller 동작 유지.
 */
export function startShadowWrite(
  operation: ShadowOperation,
  legacyPayload?: unknown,
): string {
  const correlationId = generateCorrelationId();
  try {
    sweepExpired(Date.now());
    pending.set(correlationId, {
      correlationId,
      operation,
      createdAt: Date.now(),
      legacy: legacyPayload !== undefined ? { hash: '', durationMs: 0, payloadPreview: summarizePreview(legacyPayload) } : undefined,
    });
  } catch (err) {
    logger.warn('shadow-logger', 'startShadowWrite threw (isolated)', err);
  }
  return correlationId;
}

/** 기존 경로 쓰기 완료 기록. */
export function recordLegacyComplete(
  correlationId: string,
  legacyHash: string,
  durationMs: number,
): void {
  try {
    const p = pending.get(correlationId);
    if (!p) return;
    p.legacy = { ...(p.legacy ?? { payloadPreview: undefined }), hash: legacyHash, durationMs };
    maybeFlush(correlationId).catch((err) => {
      logger.warn('shadow-logger', 'flush (legacy) threw', err);
    });
  } catch (err) {
    logger.warn('shadow-logger', 'recordLegacyComplete threw (isolated)', err);
  }
}

/** 저널 경로 쓰기 완료 기록. */
export function completeShadowWrite(
  correlationId: string,
  journalHash: string,
  journalDurationMs: number,
  journalPayload?: unknown,
): void {
  try {
    const p = pending.get(correlationId);
    if (!p) return;
    p.journal = {
      hash: journalHash,
      durationMs: journalDurationMs,
      payloadPreview: journalPayload !== undefined ? summarizePreview(journalPayload) : undefined,
    };
    maybeFlush(correlationId).catch((err) => {
      logger.warn('shadow-logger', 'flush (journal) threw', err);
    });
  } catch (err) {
    logger.warn('shadow-logger', 'completeShadowWrite threw (isolated)', err);
  }
}

/** pending 쌍이 완성되면 ShadowLogEntry로 승격 → IndexedDB 저장. */
async function maybeFlush(correlationId: string): Promise<void> {
  const p = pending.get(correlationId);
  if (!p) return;
  if (!p.legacy || !p.journal) return;
  if (!p.legacy.hash || !p.journal.hash) return; // hash 채워질 때까지 대기

  pending.delete(correlationId);

  const matched = p.legacy.hash === p.journal.hash;
  const entry: ShadowLogEntry = {
    id: generateId(),
    correlationId: p.correlationId,
    ts: Date.now(),
    operation: p.operation,
    legacyHash: p.legacy.hash,
    journalHash: p.journal.hash,
    matched,
    diffSummary: matched ? undefined : summarizeDiff(p.legacy.payloadPreview, p.journal.payloadPreview),
    durationMs: p.legacy.durationMs,
    journalDurationMs: p.journal.durationMs,
  };

  try {
    await putEntry(entry);
  } catch (err) {
    logger.warn('shadow-logger', 'putEntry failed (isolated)', err);
  }
}

/** Shadow log 조회. 기본 최신 1,000개. */
export async function getShadowLog(filter?: ShadowLogFilter): Promise<ShadowLogEntry[]> {
  try {
    return await readAll(filter);
  } catch (err) {
    logger.warn('shadow-logger', 'getShadowLog threw (isolated)', err);
    return [];
  }
}

/**
 * 최근 windowMs ms 동안의 일치율 (0 ~ 100). 엔트리 0이면 100 반환.
 * windowMs=0 or 미지정 → 전체 집계.
 */
export async function getMatchRate(windowMs?: number): Promise<number> {
  try {
    const now = Date.now();
    const sinceTs = windowMs && windowMs > 0 ? now - windowMs : undefined;
    const entries = await readAll({ sinceTs });
    if (entries.length === 0) return 100;
    const matched = entries.filter((e) => e.matched).length;
    return (matched / entries.length) * 100;
  } catch (err) {
    logger.warn('shadow-logger', 'getMatchRate threw (isolated)', err);
    return 0;
  }
}

/** Shadow log 전체 삭제. Dashboard "초기화" 버튼. */
export async function clearShadowLog(): Promise<void> {
  try {
    await writeBundle([]);
    pending.clear();
  } catch (err) {
    logger.warn('shadow-logger', 'clearShadowLog threw (isolated)', err);
  }
}

// ============================================================
// PART 6 — Helpers
// ============================================================

/** 안전한 미리보기 (상위 30 필드만, 값 clip). */
function summarizePreview(payload: unknown): unknown {
  try {
    if (payload === null || payload === undefined) return null;
    if (typeof payload !== 'object') return payload;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(payload as Record<string, unknown>).slice(0, 30);
    for (const k of keys) {
      const v = (payload as Record<string, unknown>)[k];
      if (v === null || v === undefined) out[k] = v;
      else if (typeof v === 'string') out[k] = v.length > 100 ? v.slice(0, 100) + '…' : v;
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
      else if (Array.isArray(v)) out[k] = `[array:${v.length}]`;
      else out[k] = '[object]';
    }
    return out;
  } catch {
    return null;
  }
}

/** diff 상위 10 필드 요약 (legacy vs journal). */
function summarizeDiff(legacy: unknown, journal: unknown): string {
  try {
    const l = (legacy ?? {}) as Record<string, unknown>;
    const j = (journal ?? {}) as Record<string, unknown>;
    const keys = new Set<string>([...Object.keys(l), ...Object.keys(j)]);
    const diffs: string[] = [];
    for (const k of keys) {
      if (diffs.length >= 10) break;
      const lv = l[k];
      const jv = j[k];
      if (JSON.stringify(lv) !== JSON.stringify(jv)) {
        diffs.push(`${k}:${shortRepr(lv)}≠${shortRepr(jv)}`);
      }
    }
    if (diffs.length === 0) return 'hash-only';
    return diffs.join(' | ');
  } catch {
    return 'diff-unknown';
  }
}

function shortRepr(v: unknown): string {
  try {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return v.length > 20 ? `"${v.slice(0, 20)}…"` : `"${v}"`;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return `[${v.length}]`;
    return '{…}';
  } catch {
    return '?';
  }
}

// ============================================================
// PART 7 — Test helpers (production 코드에서 호출 금지)
// ============================================================

/** 테스트에서 in-memory pending 초기화. */
export function __resetShadowLoggerForTests(): void {
  pending.clear();
  cachedDb = null;
  openPromise = null;
  writeChain = Promise.resolve();
  seq = 0;
}

/** 테스트에서 pending 사이즈 확인. */
export function __getPendingCountForTests(): number {
  return pending.size;
}

// IDENTITY_SEAL: PART-1..7 | role=shadow-logger | inputs=operation+hashes | outputs=ShadowLogEntry[]
