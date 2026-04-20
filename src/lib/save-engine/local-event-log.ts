// ============================================================
// PART 1 — Overview (M1.7 Local Storage Event Log)
// ============================================================
//
// 저장/복구/승격/다운그레이드/에러 이벤트를 로컬 링 버퍼에 영속한다.
// 사용자 제보용 JSON export 의 기본 스트림이며, Observatory Dashboard 의
// "저장 실패 최근 이력" 타임라인 소스이기도 하다.
//
// [원칙 1] 해시만 기록. 원문 금지.
//   details 는 원문 필드를 그대로 싣지 않음 — caller 는 errorName / count / ms
//   / hash 같은 메타만 넘긴다. StorageEvent 입력 단계에서 방어적 sanitize.
// [원칙 2] 관측은 간섭 없이.
//   logEvent 는 즉시 반환 — 실제 IDB 쓰기는 queue 로 비동기. 실패 시 warn.
// [원칙 3] Ring buffer 500 — IDB quota + 스마트폰 메모리 보호.
// [원칙 4] `noa_shadow_v1` DB 의 `local_event_log` (v4) store.
// [원칙 5] 재시작 후에도 조회 가능 — 사용자 제보 시 full timeline 복원.
//
// [C] SSR 가드 + IDB 차단 폴백 + 카테고리/아웃컴 화이트리스트
// [G] In-memory mirror 로 동기 조회 가능 — 첫 이벤트 기록 시 IDB hydration.
// [K] 5 public API — logEvent / getEventLog / exportEventLog / clearEventLog / reset

import { logger } from '@/lib/logger';
import type { JournalEngineMode } from '@/lib/feature-flags';

// ============================================================
// PART 2 — Types
// ============================================================

/** 이벤트 범주 — 화이트리스트. */
export type StorageEventCategory =
  | 'save'
  | 'recovery'
  | 'promotion'
  | 'downgrade'
  | 'error';

/** 결과 — 화이트리스트. */
export type StorageEventOutcome = 'success' | 'failure' | 'degraded';

/**
 * 저장 이벤트 레코드. details 는 원문이 아닌 "해시/요약/개수/ms" 만.
 * 예: { errorName: 'QuotaExceededError', durationMs: 42, payloadSha: 'abc…' }.
 */
export interface StorageEvent {
  /** 자동 생성 id. */
  id: string;
  /** Date.now. */
  ts: number;
  /** 범주. */
  category: StorageEventCategory;
  /** 현재 JournalEngineMode — 경로 맥락 추적. */
  mode: JournalEngineMode;
  /** 결과. */
  outcome: StorageEventOutcome;
  /** 해시/요약만 — 프로젝트 원문 금지. */
  details: Record<string, unknown>;
}

export interface EventFilter {
  category?: StorageEventCategory;
  outcome?: StorageEventOutcome;
  mode?: JournalEngineMode;
  sinceTs?: number;
  untilTs?: number;
  limit?: number;
}

// ============================================================
// PART 3 — IndexedDB (noa_shadow_v1 v4)
// ============================================================

const DB_NAME = 'noa_shadow_v1';
const DB_VERSION = 4; // shadow_log(v1) / promotion_audit(v2) / primary_write_log(v3) / local_event_log(v4)
const STORE = 'local_event_log';
const SHADOW_STORE = 'shadow_log';
const AUDIT_STORE = 'promotion_audit';
const PRIMARY_STORE = 'primary_write_log';
const BUNDLE_KEY = 'event_bundle';
const MAX_ENTRIES = 500;

interface BundleRecord {
  id: typeof BUNDLE_KEY;
  entries: StorageEvent[];
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

function openDB(): Promise<IDBDatabase | null> {
  if (cachedDb) return Promise.resolve(cachedDb);
  if (openPromise) return openPromise;
  if (!isIndexedDBAvailable()) return Promise.resolve(null);

  openPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        // 모든 선행 store 안전 보장.
        if (!db.objectStoreNames.contains(SHADOW_STORE)) {
          db.createObjectStore(SHADOW_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(AUDIT_STORE)) {
          db.createObjectStore(AUDIT_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PRIMARY_STORE)) {
          db.createObjectStore(PRIMARY_STORE, { keyPath: 'id' });
        }
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
        logger.warn('local-event-log', 'DB open failed', req.error);
        resolve(null);
      };
      req.onblocked = () => {
        logger.warn('local-event-log', 'DB blocked — other tab holds old version');
      };
    } catch (err) {
      logger.warn('local-event-log', 'DB open threw', err);
      resolve(null);
    }
  });
  return openPromise;
}

async function readBundle(): Promise<StorageEvent[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise<StorageEvent[]>((resolve) => {
    let settled = false;
    const done = (arr: StorageEvent[]) => {
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
      logger.warn('local-event-log', 'readBundle threw', err);
      done([]);
    }
  });
}

async function writeBundle(entries: StorageEvent[]): Promise<void> {
  const db = await openDB();
  if (!db) return;
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
        logger.warn('local-event-log', 'writeBundle req.onerror', putReq.error);
        done();
      };
      tx.oncomplete = () => done();
      tx.onerror = () => {
        logger.warn('local-event-log', 'writeBundle tx.onerror', tx.error);
        done();
      };
      tx.onabort = () => {
        logger.warn('local-event-log', 'writeBundle tx.onabort', tx.error);
        done();
      };
    } catch (err) {
      logger.warn('local-event-log', 'writeBundle threw', err);
      done();
    }
  });
}

// Write 직렬화.
let writeChain: Promise<void> = Promise.resolve();

// In-memory mirror — 빠른 동기 조회용. IDB hydration 완료 전까지는 빈 상태.
let memoryMirror: StorageEvent[] = [];
let hydrated = false;

async function hydrateOnce(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const arr = await readBundle();
    // IDB 에서 읽은 엔트리 + 이미 memoryMirror 에 쌓인 엔트리를 id 로 병합.
    // 재시작 시점엔 memoryMirror 가 비어있어 arr 가 그대로 채워지고,
    // 기동 중 logEvent 가 먼저 일어난 경우엔 중복을 피해 merged 유지.
    const existingIds = new Set(memoryMirror.map((e) => e.id));
    const toAdd = arr.filter((e) => !existingIds.has(e.id));
    memoryMirror = [...memoryMirror, ...toAdd];
    if (memoryMirror.length > MAX_ENTRIES) {
      memoryMirror.sort((a, b) => b.ts - a.ts);
      memoryMirror = memoryMirror.slice(0, MAX_ENTRIES);
    }
  } catch (err) {
    logger.warn('local-event-log', 'hydrate failed', err);
  }
}

// ============================================================
// PART 4 — Public API
// ============================================================

let seq = 0;

function generateId(): string {
  seq = (seq + 1) % 1_000_000_000;
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36);
  return `ev-${Date.now().toString(36)}-${seq.toString(36)}-${rand}`;
}

const CATEGORY_WHITELIST: ReadonlySet<StorageEventCategory> = new Set([
  'save',
  'recovery',
  'promotion',
  'downgrade',
  'error',
]);
const OUTCOME_WHITELIST: ReadonlySet<StorageEventOutcome> = new Set([
  'success',
  'failure',
  'degraded',
]);
const MODE_WHITELIST: ReadonlySet<JournalEngineMode> = new Set([
  'off',
  'shadow',
  'on',
]);

function normalizeCategory(v: unknown): StorageEventCategory {
  return typeof v === 'string' && CATEGORY_WHITELIST.has(v as StorageEventCategory)
    ? (v as StorageEventCategory)
    : 'error';
}

function normalizeOutcome(v: unknown): StorageEventOutcome {
  return typeof v === 'string' && OUTCOME_WHITELIST.has(v as StorageEventOutcome)
    ? (v as StorageEventOutcome)
    : 'failure';
}

function normalizeMode(v: unknown): JournalEngineMode {
  return typeof v === 'string' && MODE_WHITELIST.has(v as JournalEngineMode)
    ? (v as JournalEngineMode)
    : 'off';
}

/**
 * details sanitize — 원문 방어.
 *
 * 허용: string (<=200자 자르기), number, boolean, null.
 * 거부: object 내부 값 중 문자열이 2KB 초과하거나 배열/중첩 객체 → '[redacted]' 로 대체.
 * 이유: 모듈 계약 상 caller 는 해시/요약/개수/ms 만 넘겨야 함. 실수로 원문이
 *       흘러들어와도 여기서 최종 방어.
 */
function sanitizeDetails(d: unknown): Record<string, unknown> {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return {};
  const out: Record<string, unknown> = {};
  const src = d as Record<string, unknown>;
  const keys = Object.keys(src).slice(0, 20); // 최대 20키
  for (const k of keys) {
    const v = src[k];
    if (v === null) {
      out[k] = null;
    } else if (typeof v === 'string') {
      // 2KB 초과 문자열은 해시 없음이라 간주 — [redacted].
      if (v.length > 2000) out[k] = '[redacted:too-long]';
      else out[k] = v.length > 200 ? v.slice(0, 200) + '…' : v;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v;
    } else if (typeof v === 'boolean') {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = `[array:${v.length}]`;
    } else if (typeof v === 'object') {
      out[k] = '[object]';
    } else {
      out[k] = '[other]';
    }
  }
  return out;
}

/**
 * 이벤트 1건 기록. 비동기 IDB 쓰기는 queue 에 올리고 즉시 void 반환.
 * in-memory mirror 는 동기로 갱신 — getEventLog 호출 시 즉시 가시.
 */
export function logEvent(
  event: Omit<StorageEvent, 'id' | 'ts'> & { ts?: number },
): void {
  try {
    const full: StorageEvent = {
      id: generateId(),
      ts: typeof event.ts === 'number' && Number.isFinite(event.ts)
        ? event.ts
        : Date.now(),
      category: normalizeCategory(event.category),
      mode: normalizeMode(event.mode),
      outcome: normalizeOutcome(event.outcome),
      details: sanitizeDetails(event.details),
    };

    // In-memory mirror 갱신 (hydration 이전이어도 append).
    memoryMirror.push(full);
    if (memoryMirror.length > MAX_ENTRIES) {
      // 최신 MAX_ENTRIES 만 유지.
      memoryMirror.sort((a, b) => b.ts - a.ts);
      memoryMirror = memoryMirror.slice(0, MAX_ENTRIES);
    }

    // 비동기 IDB 영속.
    const prev = writeChain;
    const next = prev
      .catch(() => { /* noop */ })
      .then(async () => {
        try {
          await hydrateOnce();
          const existing = await readBundle();
          existing.push(full);
          await writeBundle(existing);
        } catch (err) {
          logger.warn('local-event-log', 'logEvent IDB persist failed', err);
        }
      });
    writeChain = next;
  } catch (err) {
    logger.warn('local-event-log', 'logEvent threw (isolated)', err);
  }
}

/**
 * 최근 이벤트 조회. 비동기 — IDB hydration 포함.
 * memoryMirror 만 보고 싶으면 `{ limit: N, fromMemoryOnly: true }` 대신 getEventLogSync 사용.
 */
export async function getEventLog(filter?: EventFilter): Promise<StorageEvent[]> {
  try {
    await hydrateOnce();
    // memoryMirror 는 IDB 재생 + logEvent 반영을 모두 포함.
    // clearEventLog 후 hydrated 가 false 로 초기화되어 다음 호출에서 다시 올바르게 동기화된다.
    const filtered = filter
      ? memoryMirror.filter((e) => matchesFilter(e, filter))
      : memoryMirror.slice();
    filtered.sort((a, b) => b.ts - a.ts);
    const limited = filter?.limit && filter.limit > 0
      ? filtered.slice(0, filter.limit)
      : filtered;
    return limited;
  } catch (err) {
    logger.warn('local-event-log', 'getEventLog threw (isolated)', err);
    return [];
  }
}

/** 동기 조회 — 현재 메모리 미러만. hydration 전에는 빈 배열일 수 있음. */
export function getEventLogSync(filter?: EventFilter): StorageEvent[] {
  try {
    const filtered = filter
      ? memoryMirror.filter((e) => matchesFilter(e, filter))
      : memoryMirror.slice();
    filtered.sort((a, b) => b.ts - a.ts);
    const limited = filter?.limit && filter.limit > 0
      ? filtered.slice(0, filter.limit)
      : filtered;
    return limited;
  } catch {
    return [];
  }
}

function matchesFilter(e: StorageEvent, f: EventFilter): boolean {
  if (f.category && e.category !== f.category) return false;
  if (f.outcome && e.outcome !== f.outcome) return false;
  if (f.mode && e.mode !== f.mode) return false;
  if (typeof f.sinceTs === 'number' && e.ts < f.sinceTs) return false;
  if (typeof f.untilTs === 'number' && e.ts > f.untilTs) return false;
  return true;
}

/**
 * 이벤트 로그를 JSON 문자열로 export.
 * AuditExportButton 이 단일 번들의 한 streams 로 포함.
 */
export async function exportEventLog(): Promise<string> {
  try {
    const events = await getEventLog();
    return JSON.stringify({
      schemaVersion: 1,
      exportedAt: Date.now(),
      count: events.length,
      events,
    }, null, 2);
  } catch (err) {
    logger.warn('local-event-log', 'exportEventLog threw', err);
    return JSON.stringify({ schemaVersion: 1, exportedAt: Date.now(), count: 0, events: [], error: 'export-failed' });
  }
}

/** 전체 삭제 — Dashboard 개발자 도구 / 테스트용. */
export async function clearEventLog(): Promise<void> {
  try {
    memoryMirror = [];
    // hydrated 를 재설정해 다음 getEventLog 호출에서 IDB 재동기화되도록.
    hydrated = false;
    await writeBundle([]);
  } catch (err) {
    logger.warn('local-event-log', 'clearEventLog threw', err);
  }
}

// ============================================================
// PART 5 — Test helpers (production 코드에서 호출 금지)
// ============================================================

export function __resetLocalEventLogForTests(): void {
  cachedDb = null;
  openPromise = null;
  writeChain = Promise.resolve();
  memoryMirror = [];
  hydrated = false;
  seq = 0;
}

// IDENTITY_SEAL: PART-1..5 | role=local-event-log | inputs=StorageEvent | outputs=StorageEvent[]+JSON
