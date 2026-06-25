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
//   - Phase 1: 50,000건 이상 장기 보존 정책 미정 (Phase 2)
// ============================================================

import type { CreativeEvent } from './types';
import { getStore, promisifyRequest, promisifyTransaction, STORE_EVENTS } from './idb-store';
// [s81-hash-chain] save-engine 의 canonical JSON + SHA-256 재사용 (중복 구현 X)
import { canonicalJson, sha256 } from '../save-engine/hash';

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
// PART 3.5 — [s81-hash-chain] 이벤트 해시 + per-project 직렬화 큐
// ============================================================
//
// eventHash = SHA-256(canonicalJson(event − eventHash)) — parentEventHash 포함.
// parentEventHash = 같은 projectId 의 직전 이벤트의 eventHash (legacy 무해시 → null).
//
// 동시성: 두 rapid 이벤트가 같은 parent 를 읽으면 체인 fork → projectId 별
// promise 체이닝으로 append 직렬화 (저빈도 쓰기 — 단순 큐로 충분).

/**
 * 이벤트 해시 계산 — eventHash 필드만 제외, parentEventHash 포함.
 * chain-verify.ts 의 재계산과 동일 함수 사용 (정의 1곳).
 */
export async function computeEventHash(event: CreativeEvent): Promise<string> {
  const { eventHash: _omit, ...rest } = event;
  void _omit;
  return sha256(canonicalJson(rest));
}

/** projectId → 마지막 append promise (직렬화 큐) */
const _projectChainQueues = new Map<string, Promise<unknown>>();

function enqueuePerProject<T>(projectId: string, task: () => Promise<T>): Promise<T> {
  const prev = _projectChainQueues.get(projectId) ?? Promise.resolve();
  // 이전 작업 실패해도 다음 작업은 진행 (catch 후 체인 계속)
  const next = prev.catch(() => undefined).then(task);
  _projectChainQueues.set(projectId, next);
  return next;
}

/**
 * 같은 projectId 의 마지막 이벤트의 eventHash 조회 (체인 parent).
 * ULID(id) 정렬 — 같은 ms 내에서도 monotonic (PART 1 참조).
 * 마지막 이벤트가 legacy (eventHash 없음) → null (체인 genesis 재시작 — 문서화 동작).
 *
 * [s82 loop2 — perf 검토 후 보류] 메모리 tip 캐시 (O(n)→O(1)/write) 시도했으나
 * 백업 복원·테스트 seed 등 recordCreativeEvent 외부 경로의 직접 store.add 가
 * 캐시를 우회 → stale parent = 체인 무결성 깨짐 (chain-verify 4 테스트 red 확인).
 * full scan 은 IDB 인덱스 getAll — 수천 건 규모까지 실측 병목 아님. 캐시 도입 시
 * 모든 외부 쓰기 경로의 invalidation 계약이 선행 조건.
 */
async function getChainParentHash(projectId: string): Promise<string | null> {
  const store = await getStore(STORE_EVENTS, 'readonly');
  const idx = store.index('by_projectId');
  const events = (await promisifyRequest(idx.getAll(projectId))) as CreativeEvent[];
  if (events.length === 0) return null;
  events.sort((a, b) => a.id.localeCompare(b.id));
  return events[events.length - 1].eventHash ?? null;
}

// ============================================================
// PART 3.6 — [D2-github-mirror] 체인 append 시 GitHub 미러 스케줄 (옵트인)
// ============================================================
//
// 옵트인 사전 게이트: localStorage 'noa-github-config' (useGitHubSync.ts
// STORAGE_KEY_CONFIG) 존재 시에만 mirror 모듈 dynamic import — Octokit 무게가
// 미설정 사용자 번들 실행 경로에 0 영향. 정식 게이트 (GITHUB_SYNC 플래그 +
// config 유효성) 는 github-mirror.ts isCpMirrorEnabled 가 재검증.

let _mirrorImportAlertAt = 0;

function scheduleGitHubMirror(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!localStorage.getItem('noa-github-config')) return;
  } catch {
    return; // storage 차단 — 옵트인 확인 불가 = 미러 안 함
  }
  void import('./github-mirror')
    .then(async (m) => {
      // [D1-pat-security] isCpMirrorEnabled 는 vault 토큰 복호화 포함 — async (await 필수)
      if (await m.isCpMirrorEnabled()) m.scheduleEventMirror(projectId);
    })
    .catch((err) => {
      // 실패 비침묵 1회/60s — 미러는 부가 기능, 로컬 기록 흐름은 비차단
      const now = Date.now();
      if (now - _mirrorImportAlertAt < 60_000) return;
      _mirrorImportAlertAt = now;
      try {
        window.dispatchEvent(new CustomEvent('noa:alert', {
          detail: {
            variant: 'warning',
            title: 'GitHub 미러 모듈 로드 실패',
            message: `이벤트는 로컬에 기록됨 — 미러만 보류: ${err instanceof Error ? err.message : String(err)}`,
          },
        }));
      } catch { /* noop */ }
    });
}

/** 해시 실패 비침묵 보고 — 기존 noa:alert 패턴 (firebase-quota-tracker.ts:115) */
function alertHashFailure(err: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('noa:alert', {
      detail: {
        variant: 'warning',
        title: '창작 이벤트 해시 계산 실패',
        message: `이벤트는 기록되었으나 해시 체인에서 제외되었습니다: ${err instanceof Error ? err.message : String(err)}`,
      },
    }));
  } catch { /* noop */ }
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
  input: Omit<CreativeEvent, 'id' | 'createdAt' | 'appVersion' | 'parentEventHash' | 'eventHash'>,
): Promise<string> {
  // [s81-hash-chain] projectId 별 직렬화 — 두 rapid 호출이 같은 parent 를
  // 읽어 체인이 fork 하는 것 차단. 호출자는 여전히 fire-and-forget 가능
  // (본 함수가 async — caller 의 메인 흐름은 await 하지 않으면 비차단).
  return enqueuePerProject(input.projectId, async () => {
    const event: CreativeEvent = {
      ...input,
      id: generateUlid(),
      createdAt: new Date().toISOString(),
      appVersion: getAppVersion(),
    };

    // [s81-hash-chain] parent 조회 + 해시 계산. 실패해도 이벤트 기록 자체는
    // 보존 (로깅은 부가 — 해시만 빠진 legacy-형 이벤트로 기록 + noa:alert).
    try {
      event.parentEventHash = await getChainParentHash(event.projectId);
      event.eventHash = await computeEventHash(event);
    } catch (err) {
      delete event.parentEventHash;
      delete event.eventHash;
      alertHashFailure(err);
    }

    const store = await getStore(STORE_EVENTS, 'readwrite');
    await promisifyRequest(store.add(event));
    await promisifyTransaction(store.transaction);

    dispatchCaptured({
      id: event.id,
      eventType: event.eventType,
      targetType: event.targetType,
    });

    // [D2-github-mirror] 체인 append → GitHub per-event 미러 스케줄
    // (옵트인 'noa-github-config' + GITHUB_SYNC 플래그 시에만 · 30s 디바운스 배치)
    scheduleGitHubMirror(event.projectId);

    return event.id;
  });
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
