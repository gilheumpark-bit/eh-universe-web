// ============================================================
// PART 1 — Overview (M1.7 Primary Write Logger)
// ============================================================
//
// usePrimaryWriter 가 Primary 저장을 마친 뒤 호출하는 관측용 기록기.
// WriteResult 의 { mode, primarySuccess, mirrorSuccess, durationMs } 를 IDB
// 링 버퍼(1,000 엔트리)에 영속한다. 재시작 후에도 Dashboard 에서 경로 분포
// (journal / legacy / degraded) 를 볼 수 있도록 한다.
//
// [원칙 1] 관측은 간섭 없이.
//   recordPrimaryWrite 실패해도 usePrimaryWriter 결과 무변경 — 모든 호출은
//   try/catch 로 흡수, logger.warn 만 남기고 삼킴.
// [원칙 2] 해시·요약만 기록. 원문 금지.
//   payload 해시조차 이 모듈에서는 직접 계산하지 않음 — usePrimaryWriter 가
//   이미 알고 있거나 불필요. 본 모듈은 "경로 메타"만 기록.
// [원칙 3] Ring buffer 1,000 — IndexedDB quota 보호.
// [원칙 4] 별도 store — `noa_shadow_v1` DB 의 `primary_write_log` (v3).
//   shadow_log(v1) / promotion_audit(v2) 에 이어 v3 upgrade.
// [원칙 5] 재진입 안전 — writeChain 으로 직렬화. 동시 append race 방지.
//
// [C] SSR 가드 + IDB 차단 폴백 + try 2중 래핑
// [G] 단일 bundle key + get/put — N+1 제거
// [K] 4 public API 만 — record / read / clear / __resetForTests

import { logger } from '@/lib/logger';
import type { PrimaryMode } from '@/hooks/usePrimaryWriter';

// ============================================================
// PART 2 — Types
// ============================================================

/** 저장 결과 요약 — WriteResult 축약 + ts. 민감정보 없음. */
export interface PrimaryWriteLogEntry {
  /** 자동 생성 id (단조 증가 + random). */
  id: string;
  /** 기록 시각 Date.now. */
  ts: number;
  /** 실제 사용된 경로. */
  mode: PrimaryMode;
  /** 사용자 관점 성공 여부 (degraded 포함 legacy 복귀 성공이면 true). */
  primarySuccess: boolean;
  /** Mirror 쓰기 성공 여부. legacy 단일 경로에서는 true (중립). */
  mirrorSuccess: boolean;
  /** Primary 경로 소요 ms. */
  durationMs: number;
  /** journal append entry id (있으면). 실제 데이터가 아닌 식별자만. */
  journalEntryId?: string;
}

export interface PrimaryWriteLogFilter {
  mode?: PrimaryMode;
  sinceTs?: number;
  untilTs?: number;
  limit?: number;
}

// ============================================================
// PART 3 — IndexedDB (noa_shadow_v1 v3 — primary_write_log store)
// ============================================================

const DB_NAME = 'noa_shadow_v1';
const DB_VERSION = 3; // v1: shadow_log / v2: +promotion_audit / v3: +primary_write_log
const SHADOW_STORE = 'shadow_log';
const AUDIT_STORE = 'promotion_audit';
const STORE = 'primary_write_log';
const BUNDLE_KEY = 'primary_bundle';
const MAX_ENTRIES = 1000;

interface BundleRecord {
  id: typeof BUNDLE_KEY;
  entries: PrimaryWriteLogEntry[];
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
        // v1~v3 동시 안전 upgrade — 존재하지 않는 store 만 생성.
        if (!db.objectStoreNames.contains(SHADOW_STORE)) {
          db.createObjectStore(SHADOW_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(AUDIT_STORE)) {
          db.createObjectStore(AUDIT_STORE, { keyPath: 'id' });
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
        logger.warn('primary-write-logger', 'DB open failed', req.error);
        resolve(null);
      };
      req.onblocked = () => {
        logger.warn('primary-write-logger', 'DB blocked — other tab holds old version');
      };
    } catch (err) {
      logger.warn('primary-write-logger', 'DB open threw', err);
      resolve(null);
    }
  });
  return openPromise;
}

async function readBundle(): Promise<PrimaryWriteLogEntry[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise<PrimaryWriteLogEntry[]>((resolve) => {
    let settled = false;
    const done = (arr: PrimaryWriteLogEntry[]) => {
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
      logger.warn('primary-write-logger', 'readBundle threw', err);
      done([]);
    }
  });
}

async function writeBundle(entries: PrimaryWriteLogEntry[]): Promise<void> {
  const db = await openDB();
  if (!db) return;
  // Ring buffer trim — 최신 MAX_ENTRIES 만 유지.
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
        logger.warn('primary-write-logger', 'writeBundle req.onerror', putReq.error);
        done();
      };
      tx.oncomplete = () => done();
      tx.onerror = () => {
        logger.warn('primary-write-logger', 'writeBundle tx.onerror', tx.error);
        done();
      };
      tx.onabort = () => {
        logger.warn('primary-write-logger', 'writeBundle tx.onabort', tx.error);
        done();
      };
    } catch (err) {
      logger.warn('primary-write-logger', 'writeBundle threw', err);
      done();
    }
  });
}

// Write 직렬화 — 동시 record 시 read-modify-write race 방지.
let writeChain: Promise<void> = Promise.resolve();

// ============================================================
// PART 4 — Public API
// ============================================================

let seq = 0;

function generateId(): string {
  seq = (seq + 1) % 1_000_000_000;
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36);
  return `pw-${Date.now().toString(36)}-${seq.toString(36)}-${rand}`;
}

/** mode 화이트리스트 — 비정상 입력 기본값 'legacy'. */
function normalizeMode(v: unknown): PrimaryMode {
  return v === 'journal' || v === 'degraded' ? v : 'legacy';
}

function normalizeBool(v: unknown): boolean {
  return v === true;
}

function normalizeNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
}

/**
 * usePrimaryWriter 결과를 관측 로그에 1건 기록한다.
 *
 * 실패 시 throw 없이 logger.warn 만 남김 — Primary 경로에 역압력 없음.
 * 직렬화(writeChain) 덕에 순서 보존.
 */
export function recordPrimaryWrite(
  partial: Omit<PrimaryWriteLogEntry, 'id' | 'ts'> & { ts?: number },
): Promise<void> {
  const full: PrimaryWriteLogEntry = {
    id: generateId(),
    ts: typeof partial.ts === 'number' && Number.isFinite(partial.ts)
      ? partial.ts
      : Date.now(),
    mode: normalizeMode(partial.mode),
    primarySuccess: normalizeBool(partial.primarySuccess),
    mirrorSuccess: normalizeBool(partial.mirrorSuccess),
    durationMs: normalizeNumber(partial.durationMs),
    journalEntryId: typeof partial.journalEntryId === 'string' && partial.journalEntryId
      ? partial.journalEntryId.slice(0, 100)
      : undefined,
  };

  const prev = writeChain;
  const next = prev
    .catch(() => { /* prev 실패 흡수 */ })
    .then(async () => {
      try {
        const existing = await readBundle();
        existing.push(full);
        await writeBundle(existing);
      } catch (err) {
        logger.warn('primary-write-logger', 'recordPrimaryWrite failed (isolated)', err);
      }
    });
  writeChain = next;
  return next;
}

/**
 * 관측 로그 조회 — 기본 최신 1,000 건, ts 내림차순.
 * filter 로 mode / 시간창 / limit 지정 가능.
 */
export async function getPrimaryWriteLog(
  filter?: PrimaryWriteLogFilter,
): Promise<PrimaryWriteLogEntry[]> {
  try {
    const all = await readBundle();
    const filtered = filter
      ? all.filter((e) => matchesFilter(e, filter))
      : all.slice();
    filtered.sort((a, b) => b.ts - a.ts);
    const limited = filter?.limit && filter.limit > 0
      ? filtered.slice(0, filter.limit)
      : filtered;
    return limited;
  } catch (err) {
    logger.warn('primary-write-logger', 'getPrimaryWriteLog threw (isolated)', err);
    return [];
  }
}

function matchesFilter(e: PrimaryWriteLogEntry, f: PrimaryWriteLogFilter): boolean {
  if (f.mode && e.mode !== f.mode) return false;
  if (typeof f.sinceTs === 'number' && e.ts < f.sinceTs) return false;
  if (typeof f.untilTs === 'number' && e.ts > f.untilTs) return false;
  return true;
}

/** 관측 로그 전체 삭제 — Dashboard 개발자 도구 / 테스트용. */
export async function clearPrimaryWriteLog(): Promise<void> {
  try {
    await writeBundle([]);
  } catch (err) {
    logger.warn('primary-write-logger', 'clearPrimaryWriteLog threw (isolated)', err);
  }
}

// ============================================================
// PART 5 — Test helpers (production 코드에서 호출 금지)
// ============================================================

export function __resetPrimaryWriteLoggerForTests(): void {
  cachedDb = null;
  openPromise = null;
  writeChain = Promise.resolve();
  seq = 0;
}

// IDENTITY_SEAL: PART-1..5 | role=primary-write-logger | inputs=WriteResult meta | outputs=PrimaryWriteLogEntry[]
