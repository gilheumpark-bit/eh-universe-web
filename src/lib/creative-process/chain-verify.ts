// ============================================================
// Chain Verify — [s81-hash-chain] CreativeEvent 해시 체인 무결성 검증
// ============================================================
//
// 상업 핵심 (HCI/체인 무결성): 이벤트 위변조 검출 가능해야 한다.
//   - payload 변조 → 해시 재계산 불일치
//   - 위조 이벤트 삽입 → 다음 이벤트의 parentEventHash 불일치
//
// Legacy 동작 (문서화):
//   - chain 도입 前 이벤트 (eventHash 없음) 는 검증 skip.
//   - 체인은 첫 hashed 이벤트부터 시작. hashed 이벤트의 parent 는
//     "직전 이벤트의 eventHash ?? null" — 직전이 legacy 면 null (genesis 재시작).
//   - event-recorder.ts getChainParentHash 와 동일 규칙 (정의 대칭).
// ============================================================

import type { CreativeEvent } from './types';
import { listCreativeEvents, computeEventHash } from './event-recorder';

export interface ChainVerifyResult {
  /** 전체 체인 무결 여부 (hashed 이벤트 0건도 valid — 빈 체인) */
  valid: boolean;
  /** 첫 깨진 이벤트 (valid=false 일 때만) */
  brokenAt?: {
    /** 깨진 이벤트 id */
    eventId: string;
    /** 정렬된 전체 이벤트 배열에서의 index */
    index: number;
    /** 깨진 사유 */
    reason: 'hash-mismatch' | 'parent-mismatch';
  };
  /** 검증한 hashed 이벤트 수 */
  verifiedCount: number;
  /** skip 한 legacy (무해시) 이벤트 수 */
  legacyCount: number;
  /** 체인 tip (마지막 hashed 이벤트의 eventHash) — hashed 0건이면 null */
  tipHash: string | null;
}

/** ULID(id) 기준 시간순 정렬 — recorder 의 append 순서와 일치 (monotonic ULID) */
export function sortEventsForChain(events: CreativeEvent[]): CreativeEvent[] {
  return [...events].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * projectId 의 이벤트 체인 전체 검증.
 * 순서대로 walk 하며 (1) 각 hashed 이벤트의 해시 재계산 일치,
 * (2) parentEventHash 가 직전 이벤트의 eventHash(?? null) 와 일치 확인.
 */
export async function verifyCreativeChain(projectId: string): Promise<ChainVerifyResult> {
  const events = sortEventsForChain(await listCreativeEvents({ projectId }));
  return verifyEventChain(events);
}

/**
 * 정렬된 이벤트 배열에 대한 순수 검증 (IndexedDB 비의존 — 테스트·export 검증용).
 * 입력은 체인 순서 (ULID asc) 가정 — 미정렬 시 sortEventsForChain 먼저.
 */
export async function verifyEventChain(events: CreativeEvent[]): Promise<ChainVerifyResult> {
  let verifiedCount = 0;
  let legacyCount = 0;
  let tipHash: string | null = null;
  let prevHash: string | null = null; // 직전 이벤트의 eventHash ?? null

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    if (ev.eventHash === undefined) {
      // legacy 이벤트 — 검증 skip, 체인 parent 는 null 로 재시작
      legacyCount++;
      prevHash = null;
      continue;
    }

    // (1) parent 연결 검증 — 위조 삽입·삭제 검출
    const expectedParent = prevHash;
    if ((ev.parentEventHash ?? null) !== expectedParent) {
      return { valid: false, brokenAt: { eventId: ev.id, index: i, reason: 'parent-mismatch' }, verifiedCount, legacyCount, tipHash };
    }

    // (2) 본문 해시 재계산 — payload 변조 검출
    const recomputed = await computeEventHash(ev);
    if (recomputed !== ev.eventHash) {
      return { valid: false, brokenAt: { eventId: ev.id, index: i, reason: 'hash-mismatch' }, verifiedCount, legacyCount, tipHash };
    }

    verifiedCount++;
    tipHash = ev.eventHash;
    prevHash = ev.eventHash;
  }

  return { valid: true, verifiedCount, legacyCount, tipHash };
}

/**
 * 체인 tip 해시 추출 (마지막 hashed 이벤트의 eventHash) — 검증 없이.
 * report-builder 의 ProcessCertificate.chainTipHash anchoring 용.
 */
export function extractChainTipHash(events: CreativeEvent[]): string | undefined {
  const sorted = sortEventsForChain(events);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].eventHash !== undefined) return sorted[i].eventHash;
  }
  return undefined;
}
