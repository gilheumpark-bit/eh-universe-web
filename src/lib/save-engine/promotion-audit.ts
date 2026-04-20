// ============================================================
// PART 1 — Overview (M1.5.4 Promotion Audit Trail)
// ============================================================
//
// 저널 엔진 모드 전환 이벤트(off ↔ shadow ↔ on) 를 영속 기록한다.
// 목적:
//   - 자동/수동 승격 추적
//   - 다운그레이드 사유 추적
//   - 재시작 이후에도 조회 가능 (IndexedDB)
//
// 저장소: shadow-logger 와 같은 DB(noa_shadow_v1) 에 별도 store 추가.
//   - DB: 'noa_shadow_v1', version 2 (기존 1 에서 upgrade)
//   - Store: 'promotion_audit', keyPath 'id'
//   - Ring buffer: 최근 200 엔트리만 유지 (IndexedDB quota 보호).
//
// [원칙 1] Audit 실패가 모드 전환 자체를 막지 않음.
//   recordPromotion 이 throw 해도 logger.warn 만 남기고 흡수.
// [원칙 2] 단일 bundle key — shadow-logger 와 동일 패턴.
// [원칙 3] 읽기 전용 조회(getPromotionHistory) 는 최신 먼저 반환.
//
// [C] None 가드 / Storage 차단 폴백 / try 래핑
// [G] 단일 get/put — N+1 제거
// [K] 3 섹션: 타입 / IndexedDB / Public API

import { logger } from '@/lib/logger';
import type { JournalEngineMode } from '@/lib/feature-flags';
import type { PromotionMetrics } from './promotion-controller';

// ============================================================
// PART 2 — Types
// ============================================================

export type PromotionTrigger = 'auto' | 'manual' | 'downgrade' | 'init';

export interface PromotionEvent {
  /** 고유 id (단조 증가 + 랜덤). */
  id: string;
  /** 기록 시각 (Date.now). */
  ts: number;
  /** 이전 모드. 'init' trigger 일 때는 현재 모드 = from = to 표기 가능. */
  from: JournalEngineMode;
  /** 전환 후 모드. */
  to: JournalEngineMode;
  /** 트리거 유형. */
  trigger: PromotionTrigger;
  /** 사유 요약 (UI 표시용). */
  reason: string;
  /** 승격 시점의 측정 지표 (선택 — 다운그레이드 이벤트에는 없을 수 있음). */
  metrics?: PromotionMetrics;
}

export interface PromotionHistoryFilter {
  trigger?: PromotionTrigger;
  to?: JournalEngineMode;
  from?: JournalEngineMode;
  sinceTs?: number;
  untilTs?: number;
  limit?: number;
}

// ============================================================
// PART 3 — IndexedDB (noa_shadow_v1 v2 — 'promotion_audit' store)
// ============================================================

const DB_NAME = 'noa_shadow_v1';
const DB_VERSION = 2; // shadow_log(v1) → shadow_log+promotion_audit(v2)
const SHADOW_STORE = 'shadow_log';
const AUDIT_STORE = 'promotion_audit';
const BUNDLE_KEY = 'audit_bundle';
const MAX_ENTRIES = 200;

interface BundleRecord {
  id: typeof BUNDLE_KEY;
  entries: PromotionEvent[];
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

function openAuditDB(): Promise<IDBDatabase | null> {
  if (cachedDb) return Promise.resolve(cachedDb);
  if (openPromise) return openPromise;
  if (!isIndexedDBAvailable()) return Promise.resolve(null);

  openPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        // v1 → v2: shadow_log 유지 + promotion_audit 신규
        if (!db.objectStoreNames.contains(SHADOW_STORE)) {
          db.createObjectStore(SHADOW_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(AUDIT_STORE)) {
          db.createObjectStore(AUDIT_STORE, { keyPath: 'id' });
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
        logger.warn('promotion-audit', 'DB open failed — audit disabled', req.error);
        resolve(null);
      };
      req.onblocked = () => {
        logger.warn('promotion-audit', 'DB blocked — other tab holds old version');
      };
    } catch (err) {
      logger.warn('promotion-audit', 'DB open threw', err);
      resolve(null);
    }
  });
  return openPromise;
}

async function readBundle(): Promise<PromotionEvent[]> {
  const db = await openAuditDB();
  if (!db) return [];
  return new Promise<PromotionEvent[]>((resolve) => {
    let settled = false;
    const done = (arr: PromotionEvent[]) => {
      if (settled) return;
      settled = true;
      resolve(arr);
    };
    try {
      const tx = db.transaction([AUDIT_STORE], 'readonly');
      const os = tx.objectStore(AUDIT_STORE);
      const req = os.get(BUNDLE_KEY);
      req.onsuccess = () => {
        const result = req.result as BundleRecord | undefined;
        done(result?.entries ?? []);
      };
      req.onerror = () => done([]);
      tx.onerror = () => done([]);
      tx.onabort = () => done([]);
    } catch (err) {
      logger.warn('promotion-audit', 'readBundle threw', err);
      done([]);
    }
  });
}

async function writeBundle(entries: PromotionEvent[]): Promise<void> {
  const db = await openAuditDB();
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
      const tx = db.transaction([AUDIT_STORE], 'readwrite');
      const os = tx.objectStore(AUDIT_STORE);
      const record: BundleRecord = { id: BUNDLE_KEY, entries: trimmed };
      const putReq = os.put(record);
      putReq.onsuccess = () => done();
      putReq.onerror = () => {
        logger.warn('promotion-audit', 'writeBundle req.onerror', putReq.error);
        done();
      };
      tx.oncomplete = () => done();
      tx.onerror = () => {
        logger.warn('promotion-audit', 'writeBundle tx.onerror', tx.error);
        done();
      };
      tx.onabort = () => {
        logger.warn('promotion-audit', 'writeBundle tx.onabort', tx.error);
        done();
      };
    } catch (err) {
      logger.warn('promotion-audit', 'writeBundle threw', err);
      done();
    }
  });
}

// Write 직렬화 — race 방지
let writeChain: Promise<void> = Promise.resolve();

// ============================================================
// PART 4 — Public API
// ============================================================

let seq = 0;

function generateId(): string {
  seq = (seq + 1) % 1_000_000_000;
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36);
  return `pa-${Date.now().toString(36)}-${seq.toString(36)}-${rand}`;
}

/**
 * 모드 전환 이벤트를 기록한다. 실패해도 throw 없이 흡수.
 *
 * 호출 시점:
 *   - 초기 마운트 — from===to, trigger='init' (optional baseline)
 *   - 수동 승격 — trigger='manual'
 *   - 자동 승격 — trigger='auto'
 *   - 다운그레이드 — trigger='downgrade'
 */
export function recordPromotion(
  event: Omit<PromotionEvent, 'id'>,
): Promise<void> {
  const full: PromotionEvent = {
    id: generateId(),
    ...event,
    ts: typeof event.ts === 'number' && Number.isFinite(event.ts) ? event.ts : Date.now(),
    reason: typeof event.reason === 'string' ? event.reason.slice(0, 500) : '',
  };

  const prev = writeChain;
  const next = prev
    .catch(() => { /* prev 실패는 흡수 */ })
    .then(async () => {
      try {
        const existing = await readBundle();
        existing.push(full);
        await writeBundle(existing);
      } catch (err) {
        logger.warn('promotion-audit', 'recordPromotion failed (isolated)', err);
      }
    });
  writeChain = next;
  return next;
}

/**
 * 이벤트 이력 조회. 기본 최신 200건.
 * 재시작 후에도 IndexedDB 로부터 복원 가능.
 */
export async function getPromotionHistory(
  filter?: PromotionHistoryFilter,
): Promise<PromotionEvent[]> {
  try {
    const all = await readBundle();
    const filtered = filter
      ? all.filter((e) => matchesFilter(e, filter))
      : all.slice();
    filtered.sort((a, b) => b.ts - a.ts); // 최신 먼저
    const limited = filter?.limit && filter.limit > 0
      ? filtered.slice(0, filter.limit)
      : filtered;
    return limited;
  } catch (err) {
    logger.warn('promotion-audit', 'getPromotionHistory threw (isolated)', err);
    return [];
  }
}

function matchesFilter(e: PromotionEvent, f: PromotionHistoryFilter): boolean {
  if (f.trigger && e.trigger !== f.trigger) return false;
  if (f.to && e.to !== f.to) return false;
  if (f.from && e.from !== f.from) return false;
  if (typeof f.sinceTs === 'number' && e.ts < f.sinceTs) return false;
  if (typeof f.untilTs === 'number' && e.ts > f.untilTs) return false;
  return true;
}

/** 감사 이력 전체 삭제 — Dashboard 개발자 도구용. */
export async function clearPromotionHistory(): Promise<void> {
  try {
    await writeBundle([]);
  } catch (err) {
    logger.warn('promotion-audit', 'clearPromotionHistory threw (isolated)', err);
  }
}

// ============================================================
// PART 5 — Test helpers (production 코드에서 호출 금지)
// ============================================================

export function __resetPromotionAuditForTests(): void {
  cachedDb = null;
  openPromise = null;
  writeChain = Promise.resolve();
  seq = 0;
}

// IDENTITY_SEAL: PART-1..5 | role=promotion-audit | inputs=PromotionEvent | outputs=PromotionEvent[]
