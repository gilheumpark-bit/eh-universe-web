// ============================================================
// PART 1 — Module overview (M1.3 Spec §3 Tab Sync)
// ============================================================
//
// BroadcastChannel 기반 크로스 탭 이벤트 디스패치. Leader/Follower 공통 사용.
// 3가지 이벤트:
//   - save-committed (Leader → All): 새 엔트리 저장됨 (id/contentHash/clock 포함).
//   - state-changed  (Leader → All): 최신 snapshot 해시 갱신 (rawHash).
//   - user-action    (Any  → All): 특정 탭에서 UI 편집 중 힌트(optional).
//
// Follower는 save-committed 수신 시 로컬 state 재로드 트리거를 받고, state-changed
// 수신 시 snapshot hash를 비교해 drift를 감지한다. 실제 재로드 로직은 이 파일이
// 아니라 상위 훅/Studio가 담당한다. 여기서는 메시지 버스만 제공.
//
// Graceful degradation: BroadcastChannel 없으면 storage event 폴백. 둘 다 없으면
// noop (단일 탭 경로이므로 동기화 불필요).
//
// [C] dispatcher listener map 메모리 leak 방어 — dispose 필수
// [G] payload 최소화 (id + hash 위주)
// [K] 외부 의존 없음, pure EventEmitter 패턴

import { logger } from '@/lib/logger';
import type { HLC } from './types';
import { getNodeId } from './hlc';

// ============================================================
// PART 2 — Event schema
// ============================================================

export type TabSyncEventType = 'save-committed' | 'state-changed' | 'user-action';

export interface SaveCommittedPayload {
  /** 저장된 JournalEntry id. */
  entryId: string;
  /** 엔트리 contentHash. */
  contentHash: string;
  /** 엔트리 parentHash (체인 연속성 검증용). */
  parentHash: string;
  /** HLC 전체 — concurrent 감지에 사용. */
  clock: HLC;
  /** projectId (delta면 반드시, 그 외 null). */
  projectId: string | null;
  /** entryType (delta/snapshot/init 등). */
  entryType: string;
}

export interface StateChangedPayload {
  /** 현재 state의 rawHash (snapshot 또는 계산된 해시). */
  rawHash: string;
  /** 기준 시각 (HLC physical ms). */
  timestampMs: number;
  /** Leader tabId. */
  leaderTabId: string;
}

export interface UserActionPayload {
  /** 사용자 행동 종류 (free-form). 예: "editing-scene", "cursor-at:scene-id". */
  kind: string;
  /** 관련 projectId. */
  projectId: string | null;
  /** detail meta (옵션). */
  detail?: Record<string, unknown>;
}

export interface TabSyncEvent<T extends TabSyncEventType = TabSyncEventType> {
  /** 이벤트 종류. */
  type: T;
  /** 송신 탭 id. */
  from: string;
  /** 송신 시각 ms. */
  ts: number;
  /** payload. */
  payload: T extends 'save-committed'
    ? SaveCommittedPayload
    : T extends 'state-changed'
    ? StateChangedPayload
    : UserActionPayload;
}

// ============================================================
// PART 3 — Channel + storage fallback
// ============================================================

interface BCastLike {
  postMessage(msg: unknown): void;
  close(): void;
  onmessage: ((ev: MessageEvent) => void) | null;
}

function openChannel(name: string): BCastLike | null {
  const g = globalThis as unknown as { BroadcastChannel?: new (n: string) => BCastLike };
  if (typeof g.BroadcastChannel !== 'function') return null;
  try { return new g.BroadcastChannel(name); } catch { return null; }
}

const CHANNEL_NAME = 'noa-journal-sync';
const LS_PREFIX = 'noa_tabsync_evt_';

// ============================================================
// PART 4 — TabSyncBus
// ============================================================

type Listener<T extends TabSyncEventType> = (event: TabSyncEvent<T>) => void;

export class TabSyncBus {
  private channel: BCastLike | null;
  private listeners = new Map<TabSyncEventType, Set<Listener<TabSyncEventType>>>();
  private readonly tabId: string;
  private disposed = false;
  private storageHandler: ((ev: StorageEvent) => void) | null = null;

  constructor(tabId: string = getNodeId()) {
    this.tabId = tabId;
    this.channel = openChannel(CHANNEL_NAME);
    if (this.channel) {
      this.channel.onmessage = (ev) => this.dispatch(ev.data as TabSyncEvent);
    } else {
      this.setupStorageFallback();
    }
  }

  /** 이벤트 구독. 반환 함수 호출 시 해제. */
  on<T extends TabSyncEventType>(type: T, cb: Listener<T>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(cb as Listener<TabSyncEventType>);
    return () => { set?.delete(cb as Listener<TabSyncEventType>); };
  }

  /** save-committed 이벤트 송신 — Leader만 호출 권장. */
  emitSaveCommitted(payload: SaveCommittedPayload): void {
    this.post({ type: 'save-committed', from: this.tabId, ts: Date.now(), payload });
  }

  /** state-changed 이벤트 송신 — Leader만 호출 권장. */
  emitStateChanged(payload: StateChangedPayload): void {
    this.post({ type: 'state-changed', from: this.tabId, ts: Date.now(), payload });
  }

  /** user-action 이벤트 송신 — Any tab. */
  emitUserAction(payload: UserActionPayload): void {
    this.post({ type: 'user-action', from: this.tabId, ts: Date.now(), payload });
  }

  private post(event: TabSyncEvent): void {
    if (this.disposed) return;
    if (this.channel) {
      try { this.channel.postMessage(event); }
      catch (err) { logger.debug('save-engine:tab-sync', 'post failed', err); }
    } else {
      this.postViaStorage(event);
    }
  }

  private postViaStorage(event: TabSyncEvent): void {
    try {
      if (typeof localStorage === 'undefined') return;
      // 이벤트마다 독립 키 + 즉시 삭제 — 동일 type 연속 송신도 storage event를 발생시킴.
      const key = LS_PREFIX + event.type + '_' + event.from + '_' + event.ts;
      localStorage.setItem(key, JSON.stringify(event));
      localStorage.removeItem(key);
    } catch (err) {
      logger.debug('save-engine:tab-sync', 'storage post failed', err);
    }
  }

  private setupStorageFallback(): void {
    if (typeof globalThis.addEventListener !== 'function') return;
    this.storageHandler = (ev: StorageEvent) => {
      if (!ev.key || !ev.key.startsWith(LS_PREFIX) || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue) as TabSyncEvent;
        this.dispatch(parsed);
      } catch { /* 잘못된 payload — 무시 */ }
    };
    globalThis.addEventListener('storage', this.storageHandler);
  }

  private dispatch(event: TabSyncEvent): void {
    if (!event || typeof event.type !== 'string') return;
    if (event.from === this.tabId) return; // 자기 자신 echo 무시
    const set = this.listeners.get(event.type);
    if (!set) return;
    for (const cb of set) {
      try { cb(event); }
      catch (err) { logger.warn('save-engine:tab-sync', 'listener threw', err); }
    }
  }

  /** 자신의 탭 id 조회. */
  getTabId(): string { return this.tabId; }

  /** 채널 전송 가능 여부. */
  isActive(): boolean { return !this.disposed; }

  /** 사용된 transport. */
  getTransport(): 'broadcast' | 'storage' | 'none' {
    if (this.disposed) return 'none';
    if (this.channel) return 'broadcast';
    if (this.storageHandler) return 'storage';
    return 'none';
  }

  /** 모든 리스너 해제 + 채널 close. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    try { this.channel?.close(); } catch { /* noop */ }
    if (this.storageHandler && typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('storage', this.storageHandler);
    }
  }
}

// ============================================================
// PART 5 — Default singleton
// ============================================================

let defaultBus: TabSyncBus | null = null;

export function getDefaultTabSyncBus(): TabSyncBus {
  if (!defaultBus || !defaultBus.isActive()) {
    defaultBus = new TabSyncBus();
  }
  return defaultBus;
}

export function resetDefaultTabSyncBusForTests(): void {
  defaultBus?.dispose();
  defaultBus = null;
}
