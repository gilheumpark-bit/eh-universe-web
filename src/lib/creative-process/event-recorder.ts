// ============================================================
// Event Recorder — CreativeEvent IndexedDB append + CustomEvent 디스패치
// ============================================================
//
// 사상 정합:
//   - 5차 §2 "장부는 자동 쌓임" — 작가 의식 없이 hook으로 기록
//   - 8차 §7.1 기록 권력 — append-only IndexedDB
//   - 10차 §3 #18 "1화 봤다" 할루 차단 — 모든 행위를 영수증으로
//
// 보존 정책:
//   - delete 이벤트도 store에 추가 (실 데이터 삭제 X)
//   - Phase 1: 50,000건 이상 archive 정책 미정 (Phase 2)
// ============================================================

import type { CreativeEvent } from './types';
import { getStore, promisifyRequest, promisifyTransaction, STORE_EVENTS } from './idb-store';

// ============================================================
// PART 1 — ULID 생성 (32자 Crockford base32)
// ============================================================
//
// 외부 의존성 회피 — ULID 라이브러리 import X.
// 단순 inline 구현 (시간순 정렬 가능 + collision 거의 0).

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// [2026-05-09] 같은 ms 안 호출 시 monotonic 보장 — ULID spec 의 monotonicFactory 패턴.
// 첫 random 자리에 sub-ms counter 를 박아 lexicographic 정렬 = 호출 순서 일치.
// 효과: listCreativeEvents 의 createdAt sort 가 stable 일 때 IndexedDB cursor (ULID 순) 와 일치.
let _ulidSeq = 0;
let _ulidLastMs = 0;

function generateUlid(): string {
  const time = Date.now();
  if (time === _ulidLastMs) {
    _ulidSeq = (_ulidSeq + 1) % 32;
  } else {
    _ulidLastMs = time;
    _ulidSeq = 0;
  }
  let timeStr = '';
  let t = time;
  for (let i = 0; i < 10; i++) {
    timeStr = CROCKFORD[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  // 첫 자리 = sub-ms counter (32 호출/ms 까지 monotonic), 나머지 15 = random
  let randStr = CROCKFORD[_ulidSeq];
  for (let i = 0; i < 15; i++) {
    randStr += CROCKFORD[Math.floor(Math.random() * 32)];
  }
  return timeStr + randStr;
}

// ============================================================
// PART 2 — 앱 버전 헬퍼
// ============================================================

function getAppVersion(): string {
  // [C] SSR + 환경 변수 미설정 가드
  try {
    const env = (typeof process !== 'undefined' && process.env) as Record<string, string | undefined> | undefined;
    return env?.NEXT_PUBLIC_APP_VERSION || 'dev';
  } catch {
    return 'dev';
  }
}

// ============================================================
// PART 3 — CustomEvent 디스패치
// ============================================================

/** CreativeEvent 기록 후 디스패치되는 이벤트 타입 */
export const CREATIVE_EVENT_CAPTURED = 'noa:creative-event-captured' as const;

interface CapturedEventDetail {
  id: string;
  eventType: CreativeEvent['eventType'];
  targetType: CreativeEvent['targetType'];
}

function dispatchCaptured(detail: CapturedEventDetail): void {
  // [C] SSR 가드 — 기존 useAutoVersionSnapshot.ts:110-115 패턴 차용
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(CREATIVE_EVENT_CAPTURED, { detail }),
    );
  } catch {
    /* noop */
  }
}

// ============================================================
// PART 4 — 메인 export — recordCreativeEvent
// ============================================================

/**
 * CreativeEvent 1건 IndexedDB 기록.
 *
 * @param input id/createdAt/appVersion 제외 모든 필드
 * @returns 생성된 ULID
 *
 * [G] append-only — 동일 targetId 두 번 호출해도 2건 모두 store에 존재
 * [C] IndexedDB 실패 시 throw (호출자가 try/catch)
 */
export async function recordCreativeEvent(
  input: Omit<CreativeEvent, 'id' | 'createdAt' | 'appVersion'>,
): Promise<string> {
  const event: CreativeEvent = {
    ...input,
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    appVersion: getAppVersion(),
  };

  const store = await getStore(STORE_EVENTS, 'readwrite');
  await promisifyRequest(store.add(event));
  await promisifyTransaction(store.transaction);

  dispatchCaptured({
    id: event.id,
    eventType: event.eventType,
    targetType: event.targetType,
  });

  return event.id;
}

// ============================================================
// PART 5 — 조회 헬퍼
// ============================================================

export interface ListEventsFilter {
  projectId?: string;
  episodeId?: number;
  /** ISO 8601 (이 시각 이후만) */
  sinceCreatedAt?: string;
  /** 최대 반환 수 */
  limit?: number;
}

/**
 * 필터 기반 CreativeEvent 조회.
 *
 * [G] projectId 인덱스 우선 사용. 미지정 시 전체 스캔.
 */
export async function listCreativeEvents(
  filter: ListEventsFilter = {},
): Promise<CreativeEvent[]> {
  const store = await getStore(STORE_EVENTS, 'readonly');

  let events: CreativeEvent[] = [];
  if (filter.projectId) {
    const idx = store.index('by_projectId');
    events = (await promisifyRequest(idx.getAll(filter.projectId))) as CreativeEvent[];
  } else {
    events = (await promisifyRequest(store.getAll())) as CreativeEvent[];
  }

  // 추가 필터
  if (filter.episodeId !== undefined) {
    events = events.filter((e) => e.episodeId === filter.episodeId);
  }
  if (filter.sinceCreatedAt) {
    events = events.filter((e) => e.createdAt >= filter.sinceCreatedAt!);
  }

  // [G] 시간순 정렬 (asc)
  events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (filter.limit && filter.limit > 0) {
    events = events.slice(0, filter.limit);
  }

  return events;
}

/**
 * 카운트 헬퍼 (CreativeProcessSection 누적 통계용).
 */
export async function countCreativeEvents(projectId: string): Promise<number> {
  const store = await getStore(STORE_EVENTS, 'readonly');
  const idx = store.index('by_projectId');
  return promisifyRequest(idx.count(projectId));
}
