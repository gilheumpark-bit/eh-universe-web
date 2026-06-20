// ============================================================
// PART 1 — LS keyspace & availability (Spec 5.1.3)
// ============================================================
//
// write-then-swap 패턴. 기존 tip은 새 entry가 완전히 쓰여야만 교체.
// 중단 시나리오별 영수증(Spec 5.2 매트릭스):
//   Step 2 후 crash → tmp key만 존재, 다음 부팅 청소
//   Step 4 후 Step 5 전 → entry key 고아, tip 미갱신
//   Step 5 후 Step 6 전 → tip 갱신 완료, tmp 잔존
// 모든 지점에서 기존 tip 무사.

import { logger } from '@/lib/logger';
import type { JournalEntry } from './types';
import { ulid } from './hlc';

export const LS_PREFIX_ENTRY = 'noa_journal_entry_';
export const LS_PREFIX_TMP = 'noa_journal_tmp_';
export const LS_KEY_TIP = 'noa_journal_tip';
export const LS_KEY_BEACON = 'noa_journal_beacon';

export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__noa_journal_ls_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 2 — Safe (de)serialize (Uint8Array 보존)
// ============================================================
//
// localStorage는 string만 저장. snapshot의 Uint8Array는 base64 래핑으로 round-trip.
// JSON.stringify 는 Uint8Array를 [0,1,2,...] 숫자 배열로 직렬화 — 복원 시 Array 이므로
// Uint8Array 여부 감지 플래그로 래핑.

interface WireEntry {
  __kind: 'journal-entry-v1';
  entry: unknown;
}

function bytesToBase64(bytes: Uint8Array): string {
  // btoa는 브라우저 전역, Node에서는 Buffer 사용.
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(binary);
  // Node 폴백
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Buffer } = require('node:buffer') as { Buffer: { from(b: string, enc: string): { toString(enc: string): string } } };
  return Buffer.from(binary, 'binary').toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  let binary: string;
  if (typeof atob === 'function') binary = atob(b64);
  else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Buffer } = require('node:buffer') as { Buffer: { from(b: string, enc: string): { toString(enc: string): string } } };
    binary = Buffer.from(b64, 'base64').toString('binary');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function serializeEntry(entry: JournalEntry): string {
  const wire: WireEntry = {
    __kind: 'journal-entry-v1',
    entry: JSON.parse(JSON.stringify(entry, (_k, v) => {
      if (v instanceof Uint8Array) {
        return { __u8: bytesToBase64(v) };
      }
      return v;
    })),
  };
  return JSON.stringify(wire);
}

function deserializeEntry(text: string): JournalEntry | null {
  try {
    const wire = JSON.parse(text) as WireEntry;
    if (wire.__kind !== 'journal-entry-v1') return null;
    return revive(wire.entry) as JournalEntry;
  } catch (err) {
    logger.warn('save-engine:ls', 'deserializeEntry 실패', err);
    return null;
  }
}

function revive(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(revive);
  const obj = value as Record<string, unknown>;
  if (typeof obj.__u8 === 'string') return base64ToBytes(obj.__u8);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) out[k] = revive(obj[k]);
  return out;
}

// ============================================================
// PART 3 — write-then-swap append (Spec 5.1.3)
// ============================================================

/**
 * 1. tmpKey 에 entry 기록
 * 2. final entry key에 동일 내용 복사 (tmp → entry key 이동)
 * 3. tip 갱신 (set LS_KEY_TIP)
 * 4. tmp 삭제
 *
 * 실패 시:
 *   - 2 실패: tmp만 있음 (cleanup에서 제거)
 *   - 3 실패: entry key 고아, tip 미갱신 (기존 tip 무사)
 *   - 4 실패: tmp 잔존 (cleanup에서 제거) — 새 tip은 적용됨
 */
export async function lsAppendEntry(entry: JournalEntry): Promise<void> {
  if (!isLocalStorageAvailable()) throw new Error('localStorage unavailable');
  const serialized = serializeEntry(entry);

  const tmpKey = LS_PREFIX_TMP + ulid();
  try {
    localStorage.setItem(tmpKey, serialized);
  } catch (err) {
    throw wrapQuotaError(err);
  }

  const entryKey = LS_PREFIX_ENTRY + entry.id;
  try {
    localStorage.setItem(entryKey, serialized);
  } catch (err) {
    // entry key 쓰기 실패 → tmp 복구 후 에러 전파
    try { localStorage.removeItem(tmpKey); } catch { /* noop */ }
    throw wrapQuotaError(err);
  }

  try {
    localStorage.setItem(LS_KEY_TIP, entry.id);
  } catch (err) {
    // tip 갱신 실패 → 기존 tip은 무사, entry key 고아 복구
    try { localStorage.removeItem(entryKey); } catch { /* noop */ }
    try { localStorage.removeItem(tmpKey); } catch { /* noop */ }
    throw wrapQuotaError(err);
  }

  try { localStorage.removeItem(tmpKey); } catch { /* tmp 잔존 — cleanup이 처리 */ }
}

function wrapQuotaError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === 'QuotaExceededError' || /quota/i.test(err.message)) {
      return new Error('localStorage quota exceeded');
    }
    return err;
  }
  return new Error(String(err));
}

// ============================================================
// PART 4 — read helpers
// ============================================================

export function lsGetTip(): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(LS_KEY_TIP);
  } catch {
    return null;
  }
}

export function lsGetEntry(id: string): JournalEntry | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX_ENTRY + id);
    if (!raw) return null;
    return deserializeEntry(raw);
  } catch {
    return null;
  }
}

/** 저장된 엔트리 id 전수 (정렬). */
export function lsListEntryIds(): string[] {
  if (!isLocalStorageAvailable()) return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX_ENTRY)) {
        out.push(k.slice(LS_PREFIX_ENTRY.length));
      }
    }
  } catch { /* noop */ }
  return out.sort();
}

/** 엔트리 id 오름차순 전수 조회. */
export function lsGetEntriesRange(): JournalEntry[] {
  const ids = lsListEntryIds();
  const out: JournalEntry[] = [];
  for (const id of ids) {
    const e = lsGetEntry(id);
    if (e) out.push(e);
  }
  return out;
}

// ============================================================
// PART 5 — Cleanup (중단 시나리오 처리)
// ============================================================

/**
 * tmp 키 전부 제거 + tip 이 가리키지 않는 entry 키는 유지(삭제 금지 — 포렌식용).
 * 부팅 시 한 번 호출.
 */
export function lsCleanupStaleTmp(): number {
  if (!isLocalStorageAvailable()) return 0;
  let removed = 0;
  const toRemove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX_TMP)) toRemove.push(k);
    }
    for (const k of toRemove) {
      try { localStorage.removeItem(k); removed++; } catch { /* noop */ }
    }
  } catch { /* noop */ }
  return removed;
}
