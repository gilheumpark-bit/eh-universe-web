// ============================================================
// PART 1 — Imports & types
// ============================================================
//
// Hybrid Logical Clock (Spec Part 2.2.2).
// physical = max(local last, remote?, wall-clock now)
// logical  = 같은 physical 반복 시 증가, 달라지면 0.
// Kulkarni et al. — https://cse.buffalo.edu/tech-reports/2014-04.pdf

import type { HLC } from './types';

// ============================================================
// PART 2 — ULID (Crockford base32, Spec 2.2.1)
// ============================================================

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * ULID 26자 (Crockford base32). 10자 = 48-bit ms 타임스탬프, 16자 = 80-bit 랜덤.
 * crypto.getRandomValues 없이는 Math.random 폴백.
 * Spec 2.2.1 구현 스케치와 동일.
 */
export function ulid(now: number = Date.now()): string {
  const timeChars: string[] = [];
  let ms = Math.max(0, Math.floor(now));
  for (let i = 0; i < 10; i++) {
    timeChars.unshift(B32[ms % 32]);
    ms = Math.floor(ms / 32);
  }

  const rand = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(rand);
  } else {
    // 브라우저 이외 환경 폴백 (테스트/Node 초기)
    for (let i = 0; i < 16; i++) rand[i] = Math.floor(Math.random() * 256);
  }

  const randChars: string[] = [];
  for (let i = 0; i < 16; i++) randChars.push(B32[rand[i] & 0x1f]);
  return timeChars.join('') + randChars.join('');
}

// ============================================================
// PART 3 — Node ID helper (Spec 2.2.5)
// ============================================================

const NODE_ID_KEY = 'noa_tab_id';

/**
 * tab 단위 고유 id. sessionStorage가 없으면 메모리 id 사용.
 * 같은 탭 안에서는 재호출 시 동일 id 반환(캐시).
 */
let cachedNodeId: string | null = null;
export function getNodeId(): string {
  if (cachedNodeId) return cachedNodeId;
  try {
    if (typeof globalThis.sessionStorage !== 'undefined') {
      const existing = globalThis.sessionStorage.getItem(NODE_ID_KEY);
      if (existing) {
        cachedNodeId = existing;
        return existing;
      }
      const fresh = ulid();
      globalThis.sessionStorage.setItem(NODE_ID_KEY, fresh);
      cachedNodeId = fresh;
      return fresh;
    }
  } catch {
    // storage 차단 (private mode 등) — 메모리로 폴백
  }
  cachedNodeId = ulid();
  return cachedNodeId;
}

// ============================================================
// PART 4 — Local tick & recv merge (Spec 2.2.2 알고리즘)
// ============================================================

/** 첫 호출 전 HLC 시드. 모든 필드 0. */
export function zeroHLC(nodeId: string = getNodeId()): HLC {
  return { physical: 0, logical: 0, nodeId };
}

/**
 * 로컬 tick — 새 엔트리를 만들 때 호출.
 * physical = max(last.physical, now). 같은 physical이면 logical++ 아니면 0.
 */
export function tickLocal(last: HLC, now: number = Date.now()): HLC {
  const physical = Math.max(last.physical, now);
  const logical = physical === last.physical ? last.logical + 1 : 0;
  return { physical, logical, nodeId: last.nodeId };
}

/**
 * 원격 수신 시 머지 — Firestore onSnapshot 등에서 remote HLC 적용.
 * physical = max(local, remote, now). logical 규칙은 Spec 2.2.2 알고리즘 그대로.
 */
export function recvRemote(local: HLC, remote: HLC, now: number = Date.now()): HLC {
  const physical = Math.max(local.physical, remote.physical, now);
  let logical: number;
  if (physical === local.physical && physical === remote.physical) {
    logical = Math.max(local.logical, remote.logical) + 1;
  } else if (physical === local.physical) {
    logical = local.logical + 1;
  } else if (physical === remote.physical) {
    logical = remote.logical + 1;
  } else {
    logical = 0;
  }
  return { physical, logical, nodeId: local.nodeId };
}

// ============================================================
// PART 5 — Ordering & concurrency predicates
// ============================================================

/**
 * (a.physical, a.logical) 튜플 사전순, 동률이면 nodeId tiebreaker.
 * 반환: a<b → -1, a=b → 0, a>b → 1.
 */
export function compareHLC(a: HLC, b: HLC): -1 | 0 | 1 {
  if (a.physical !== b.physical) return a.physical < b.physical ? -1 : 1;
  if (a.logical !== b.logical) return a.logical < b.logical ? -1 : 1;
  if (a.nodeId === b.nodeId) return 0;
  return a.nodeId < b.nodeId ? -1 : 1;
}

/**
 * Concurrent: 두 HLC가 서로 causally independent (다른 nodeId + 인과 미상).
 * 엄밀 인과 비교는 vector clock이 필요 — HLC만으로는 "동일 물리/논리/다른 nodeId" 케이스를
 * concurrent로 간주.
 */
export function isConcurrent(a: HLC, b: HLC): boolean {
  return a.physical === b.physical && a.logical === b.logical && a.nodeId !== b.nodeId;
}
