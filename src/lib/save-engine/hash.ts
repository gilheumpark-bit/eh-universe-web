// ============================================================
// PART 1 — SHA-256 helpers (Spec Part 6)
// ============================================================
//
// Web Crypto SubtleCrypto 기반. Node 20+ 도 동일 API(crypto.webcrypto.subtle).
// 1MB 이하 payload는 단일 digest (Spec 12.5).
// Canonical JSON (Spec 6.1) — key 정렬, 숫자 JSON.stringify 표기.

import type { JournalEntry, JournalPayload } from './types';
import { GENESIS } from './types';

// ============================================================
// PART 2 — Canonical JSON (Spec 6.1)
// ============================================================

/**
 * JSON.stringify + key 오름차순 정렬 + 배열 보존.
 * undefined 키는 JSON.stringify가 자동 생략 — Node/브라우저 동일 동작.
 * Uint8Array 같은 TypedArray는 [0,1,2,...] 배열로 직렬화하는 것이 브라우저/Node 공통 안전 표현.
 */
export function canonicalJson(obj: unknown): string {
  return canonicalize(obj);
}

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value ?? null);
  if (typeof value !== 'object') return JSON.stringify(value);

  // Uint8Array / ArrayBuffer / typed arrays — hex로 직렬화해 안정적 canonical 보장
  if (value instanceof Uint8Array) {
    return JSON.stringify(`u8:${bytesToHex(value)}`);
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const buf = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    return JSON.stringify(`view:${bytesToHex(buf)}`);
  }
  if (value instanceof ArrayBuffer) {
    return JSON.stringify(`ab:${bytesToHex(new Uint8Array(value))}`);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined) continue;
    parts.push(`${JSON.stringify(k)}:${canonicalize(v)}`);
  }
  return `{${parts.join(',')}}`;
}

// ============================================================
// PART 3 — Byte/hex helpers
// ============================================================

/** ArrayBuffer/Uint8Array → hex 소문자 문자열. */
export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/** UTF-8 인코딩 — TextEncoder 사용. 브라우저/Node 공통. */
export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// ============================================================
// PART 4 — SHA-256 digest wrappers
// ============================================================

/**
 * Subtle crypto 접근 — 브라우저/Node 공통.
 * 브라우저: globalThis.crypto.subtle (HTTPS/secure context 필수).
 * Node 16+/jsdom 테스트: globalThis.crypto 비어있을 때 node:crypto.webcrypto.subtle 폴백.
 */
let cachedSubtle: SubtleCrypto | null = null;
function getSubtle(): SubtleCrypto {
  if (cachedSubtle) return cachedSubtle;

  const g = globalThis as unknown as { crypto?: Crypto };
  if (g.crypto && g.crypto.subtle) {
    cachedSubtle = g.crypto.subtle;
    return cachedSubtle;
  }

  // Node.js (jest/jsdom) 폴백 — webcrypto.subtle은 node:crypto에서 가져온다.
  // typeof require는 ESM 번들에서 안전하게 guard됨.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('node:crypto') as { webcrypto?: { subtle: SubtleCrypto } };
    if (nodeCrypto.webcrypto && nodeCrypto.webcrypto.subtle) {
      cachedSubtle = nodeCrypto.webcrypto.subtle;
      return cachedSubtle;
    }
  } catch {
    // 브라우저 번들에서 require 미존재 — 무시
  }
  throw new Error('SubtleCrypto unavailable — SHA-256 requires secure context');
}

/**
 * SHA-256 hex digest. 1MB 이하 payload 단일 digest.
 * 1MB 이상은 sha256Chunked 사용 (Spec 12.5 — 현재 구현은 단일 digest로 위임,
 * 청크 해시/merkle root는 Phase 1.5에서 실구현).
 */
export async function sha256(input: Uint8Array | string): Promise<string> {
  const bytes = typeof input === 'string' ? utf8Encode(input) : input;
  const subtle = getSubtle();
  // Web Crypto는 ArrayBuffer/ArrayBufferView 둘 다 수용. SharedArrayBuffer 호환을 위해
  // byteOffset/byteLength로 슬라이스한 ArrayBuffer 전달.
  const view = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await subtle.digest('SHA-256', view);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Canonical JSON + SHA-256. 엔트리 contentHash 계산에 사용.
 */
export async function hashPayload(payload: JournalPayload): Promise<string> {
  return sha256(canonicalJson(payload));
}

// ============================================================
// PART 5 — Chain verification (Spec Part 6.1)
// ============================================================

export interface ChainVerifyOptions {
  /** 'GENESIS' (기본) 또는 특정 contentHash부터 검증 시작 */
  fromParentHash?: string;
}

export interface ChainVerifyResult {
  ok: boolean;
  breakAt?: string;
  reason?: 'parent-mismatch' | 'content-hash-mismatch' | 'missing-genesis';
  scanned: number;
}

/**
 * 엔트리 배열(id 오름차순)을 받아 체인을 검증.
 * 1. parentHash 연결 확인
 * 2. payload 재해시 확인
 *
 * 반환: ok면 scanned만 유효, 아니면 breakAt+reason 설정.
 */
export async function verifyChain(
  entries: JournalEntry[],
  options: ChainVerifyOptions = {}
): Promise<ChainVerifyResult> {
  const expectedFirstParent = options.fromParentHash ?? GENESIS;
  let prevHash = expectedFirstParent;
  let scanned = 0;

  for (const entry of entries) {
    scanned++;
    if (entry.parentHash !== prevHash) {
      return {
        ok: false,
        breakAt: entry.id,
        reason: prevHash === GENESIS && entry.parentHash !== GENESIS ? 'missing-genesis' : 'parent-mismatch',
        scanned,
      };
    }
    const recomputed = await hashPayload(entry.payload);
    if (recomputed !== entry.contentHash) {
      return {
        ok: false,
        breakAt: entry.id,
        reason: 'content-hash-mismatch',
        scanned,
      };
    }
    prevHash = entry.contentHash;
  }
  return { ok: true, scanned };
}
