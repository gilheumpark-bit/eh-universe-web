// ============================================================
// PART 1 — Module overview (Spec 7.3 + M1.3 확장)
// ============================================================
//
// 단일 Writer 보장을 위한 Leader 선출.
// Primary: navigator.locks.request('noa-journal-leader', 'exclusive').
// Fallback: BroadcastChannel + heartbeat + tabId 최소값 리더.
//
// M1.3 확장:
//   - 타이브레이커: 2+ 탭 동시 경쟁 시 tabId(ULID) 사전순 최소값이 승리.
//   - 승격 프로토콜: Leader beforeunload/pagehide → 'leader-closed' 브로드캐스트
//       → Follower 경쟁 재시도 → 승자 'leader-acquired' 브로드캐스트.
//   - Graceful degradation: Web Locks 없음 → BroadcastChannel, BC 없음 → storage event.
//   - LeaderInfo API: isLeader / leaderTabId / lastLeaderChange / followerCount.
//   - onInfoChange(cb): Leader 정보 변화 구독 (React hook bridge용).
//
// [C] abort 시 listener cleanup / storage 차단 환경 방어
// [G] heartbeat 5s — 과한 busy-wait 없음
// [K] 두 컨트롤러(Lock/Broadcast)가 동일 인터페이스 준수

import { logger } from '@/lib/logger';
import { getNodeId } from './hlc';

// ============================================================
// PART 2 — Web Locks availability
// ============================================================

interface LockManagerLike {
  request(
    name: string,
    options: { mode: 'shared' | 'exclusive'; signal?: AbortSignal; ifAvailable?: boolean; steal?: boolean },
    callback: (lock: { name: string } | null) => Promise<unknown>,
  ): Promise<unknown>;
}

function getLocks(): LockManagerLike | null {
  const nav = (globalThis as unknown as { navigator?: { locks?: LockManagerLike } }).navigator;
  return nav?.locks ?? null;
}

export function isWebLocksSupported(): boolean {
  return getLocks() !== null;
}

function hasBroadcastChannel(): boolean {
  const g = globalThis as unknown as { BroadcastChannel?: unknown };
  return typeof g.BroadcastChannel === 'function';
}

// ============================================================
// PART 3 — LeaderInfo + LeaderController 인터페이스
// ============================================================

export type LeaderRole = 'leader' | 'follower' | 'unknown';

/** 현재 Leader 상태 관찰자에게 제공되는 스냅샷. */
export interface LeaderInfo {
  /** 이 탭이 리더인가. */
  isLeader: boolean;
  /** 현재 리더 tabId(알 수 있으면) — 자신이 리더면 자신의 id. */
  leaderTabId: string | null;
  /** 마지막 역할 변경 시각 (Date.now()) — 승격/격하 모두 갱신. */
  lastLeaderChange: number;
  /** Follower 수 (자신 제외). Broadcast 환경에서만 정확. Lock 환경은 -1. */
  followerCount: number;
  /** 채택된 경로: 'web-locks' | 'broadcast' | 'single'. */
  transport: 'web-locks' | 'broadcast' | 'single';
}

export interface LeaderController {
  /** 현재 역할. */
  role: LeaderRole;
  /** LeaderInfo 스냅샷 조회. */
  getInfo(): LeaderInfo;
  /** 수동 승격 요청 — Follower에서 호출 시 기존 Leader에 양도 요청 송신. */
  requestPromotion(): Promise<boolean>;
  /** 릴리스 — Lock abort 또는 BC goodbye. 다음 승격 경쟁의 트리거가 됨. */
  release(): void;
  /** 테스트/종료 시 전체 해제. */
  dispose(): void;
  /** 리더 승격 이벤트. */
  onBecomeLeader(cb: () => void): () => void;
  /** 팔로워 격하 이벤트. */
  onBecomeFollower(cb: () => void): () => void;
  /** LeaderInfo 변경 이벤트 (follower count / lastLeaderChange 갱신 포함). */
  onInfoChange(cb: (info: LeaderInfo) => void): () => void;
}

const LOCK_NAME = 'noa-journal-leader';
const BC_CHANNEL = 'noa-journal-broadcast';

// ============================================================
// PART 4 — LockBasedController (Web Locks 경로)
// ============================================================
//
// Web Locks는 브라우저가 자체적으로 큐잉하므로 타이브레이커/goodbye 송신이
// 필수는 아니지만, Follower 수 추적 + 수동 승격 UX를 위해 BroadcastChannel
// 보조 채널을 함께 운영한다.

class LockBasedController implements LeaderController {
  public role: LeaderRole = 'unknown';
  private abortCtrl: AbortController | null = null;
  private leaderListeners = new Set<() => void>();
  private followerListeners = new Set<() => void>();
  private infoListeners = new Set<(i: LeaderInfo) => void>();
  private releaseResolver: (() => void) | null = null;
  private lastChange = Date.now();
  private peers = new Map<string, number>(); // 보조 채널용
  private aux: BroadcastControllerBase | null = null;
  private leaderTabId: string | null = null;

  constructor(
    private readonly locks: LockManagerLike,
    private readonly tabId: string,
  ) {
    // Web Locks 경로에서도 peer 집계/승격 알림용 BC 보조 채널 운영 (있으면).
    if (hasBroadcastChannel()) {
      this.aux = new BroadcastControllerBase(tabId, {
        onLeaderAcquired: (id) => {
          this.leaderTabId = id;
          this.emitInfo();
        },
        onLeaderClosed: () => {
          // Lock 경로에서는 브라우저가 알아서 다음 대기자에게 할당.
          // UI 업데이트 목적으로만 사용.
          this.emitInfo();
        },
        onPeersChanged: (peers) => {
          this.peers = peers;
          this.emitInfo();
        },
      });
    }
    this.start();
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('pagehide', this.handlePagehide);
      globalThis.addEventListener('beforeunload', this.handlePagehide);
    }
  }

  private handlePagehide = () => {
    if (this.role === 'leader') {
      // 사라진다고 미리 고지 — 다른 탭이 빠르게 승격 경쟁 시작 가능.
      this.aux?.broadcastLeaderClosed();
    }
  };

  private start(): void {
    const abort = new AbortController();
    this.abortCtrl = abort;
    this.role = 'follower';
    this.lastChange = Date.now();
    for (const cb of this.followerListeners) cb();
    this.emitInfo();

    this.locks
      .request(LOCK_NAME, { mode: 'exclusive', signal: abort.signal }, async () => {
        this.role = 'leader';
        this.leaderTabId = this.tabId;
        this.lastChange = Date.now();
        for (const cb of this.leaderListeners) cb();
        this.aux?.broadcastLeaderAcquired();
        this.emitInfo();
        // lock 유지 — release()가 abort를 호출할 때까지
        await new Promise<void>((resolve) => {
          this.releaseResolver = resolve;
          abort.signal.addEventListener('abort', () => resolve(), { once: true });
        });
        this.role = 'follower';
        this.lastChange = Date.now();
        for (const cb of this.followerListeners) cb();
        this.emitInfo();
      })
      .catch((err) => {
        // abort 또는 lock 실패
        logger.debug('save-engine:leader', 'lock released', err);
        this.role = 'unknown';
      });
  }

  private emitInfo(): void {
    const info = this.getInfo();
    for (const cb of this.infoListeners) cb(info);
  }

  getInfo(): LeaderInfo {
    const isLeader = this.role === 'leader';
    // followerCount = 다른 탭 수 (자신 제외). aux 없으면 -1 (알 수 없음).
    const otherCount = Math.max(0, this.peers.size - 1);
    return {
      isLeader,
      leaderTabId: isLeader ? this.tabId : this.leaderTabId,
      lastLeaderChange: this.lastChange,
      followerCount: this.aux ? otherCount : -1,
      transport: 'web-locks',
    };
  }

  async requestPromotion(): Promise<boolean> {
    if (this.role === 'leader') return true;
    // Follower → 기존 Leader 릴리스 요청. Leader가 응답하면 lock 해제 → 경쟁 발생.
    this.aux?.broadcastPromotionRequest(this.tabId);
    return new Promise<boolean>((resolve) => {
      const off = this.onBecomeLeader(() => {
        off();
        resolve(true);
      });
      // 2초 타임아웃 — 경쟁 실패도 가능.
      setTimeout(() => { off(); resolve(this.role === 'leader'); }, 2000);
    });
  }

  release(): void {
    if (this.releaseResolver) { this.releaseResolver(); this.releaseResolver = null; }
    this.abortCtrl?.abort();
  }

  dispose(): void {
    this.release();
    if (typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('pagehide', this.handlePagehide);
      globalThis.removeEventListener('beforeunload', this.handlePagehide);
    }
    this.aux?.dispose();
    this.leaderListeners.clear();
    this.followerListeners.clear();
    this.infoListeners.clear();
  }

  onBecomeLeader(cb: () => void): () => void {
    this.leaderListeners.add(cb);
    return () => { this.leaderListeners.delete(cb); };
  }
  onBecomeFollower(cb: () => void): () => void {
    this.followerListeners.add(cb);
    return () => { this.followerListeners.delete(cb); };
  }
  onInfoChange(cb: (info: LeaderInfo) => void): () => void {
    this.infoListeners.add(cb);
    return () => { this.infoListeners.delete(cb); };
  }
}

// ============================================================
// PART 5 — BroadcastControllerBase (공용 peer 집계 + 이벤트 송수신)
// ============================================================
//
// Lock 경로의 보조 채널과 Broadcast 경로의 주 컨트롤러에서 공통으로 쓰는 로직.
// 탭 ID 기반 peer 목록을 heartbeat로 유지하고, leader-acquired/leader-closed/
// promotion-request 이벤트를 전달한다.

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

type PeerMap = Map<string, number>;

interface BroadcastCallbacks {
  onLeaderAcquired?: (tabId: string) => void;
  onLeaderClosed?: (tabId: string) => void;
  onPromotionRequest?: (fromTabId: string) => void;
  onPeersChanged?: (peers: PeerMap) => void;
  onEvaluate?: () => void;
}

class BroadcastControllerBase {
  protected channel: BCastLike | null;
  protected peers: PeerMap = new Map();
  protected heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  protected disposed = false;
  /** storage event 폴백용 키 prefix */
  protected readonly LS_PREFIX = 'noa_leader_evt_';
  protected storageHandler: ((ev: StorageEvent) => void) | null = null;

  constructor(
    protected readonly nodeId: string,
    protected readonly callbacks: BroadcastCallbacks,
  ) {
    this.channel = openChannel(BC_CHANNEL);
    if (!this.channel) {
      this.setupStorageFallback();
    }
    this.peers.set(nodeId, Date.now());
    this.start();
  }

  protected setupStorageFallback(): void {
    if (typeof globalThis.addEventListener !== 'function') return;
    this.storageHandler = (ev: StorageEvent) => {
      if (!ev.key || !ev.key.startsWith(this.LS_PREFIX) || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue) as { type: string; from: string; ts: number };
        this.handleMessage(parsed);
      } catch { /* 잘못된 payload — 무시 */ }
    };
    globalThis.addEventListener('storage', this.storageHandler);
  }

  protected postViaStorage(msg: { type: string; from: string; ts: number }): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const key = this.LS_PREFIX + msg.type;
      localStorage.setItem(key, JSON.stringify(msg));
      // storage event는 다른 탭에만 발생 — 자기 참조는 즉시 삭제해 재사용 가능.
      localStorage.removeItem(key);
    } catch { /* quota/private */ }
  }

  protected post(msg: { type: string; from: string; ts: number }): void {
    if (this.channel) {
      try { this.channel.postMessage(msg); } catch { /* ignore */ }
    } else {
      this.postViaStorage(msg);
    }
  }

  protected handleMessage(data: { type: string; from: string; ts: number }): void {
    if (!data || typeof data.type !== 'string' || typeof data.from !== 'string') return;
    if (data.from === this.nodeId) return; // 자기 자신 echo 무시
    switch (data.type) {
      case 'heartbeat': {
        const isNewPeer = !this.peers.has(data.from);
        this.peers.set(data.from, data.ts);
        this.callbacks.onPeersChanged?.(new Map(this.peers));
        // 새 peer가 등장했으면 내 존재도 알려서 양방향 discovery 보장.
        // 타이머(5s)를 기다리지 않고 즉시 handshake.
        if (isNewPeer) {
          this.post({ type: 'heartbeat', from: this.nodeId, ts: Date.now() });
        }
        this.callbacks.onEvaluate?.();
        break;
      }
      case 'goodbye':
        this.peers.delete(data.from);
        this.callbacks.onPeersChanged?.(new Map(this.peers));
        this.callbacks.onEvaluate?.();
        break;
      case 'leader-acquired':
        this.callbacks.onLeaderAcquired?.(data.from);
        break;
      case 'leader-closed':
        this.callbacks.onLeaderClosed?.(data.from);
        this.peers.delete(data.from);
        this.callbacks.onPeersChanged?.(new Map(this.peers));
        this.callbacks.onEvaluate?.();
        break;
      case 'promotion-request':
        this.callbacks.onPromotionRequest?.(data.from);
        break;
    }
  }

  protected start(): void {
    if (this.channel) {
      this.channel.onmessage = (ev) => {
        this.handleMessage(ev.data as { type: string; from: string; ts: number });
      };
    }
    // 초기 hello
    this.post({ type: 'heartbeat', from: this.nodeId, ts: Date.now() });
    this.heartbeatTimer = setInterval(() => {
      this.post({ type: 'heartbeat', from: this.nodeId, ts: Date.now() });
      this.reapStale();
      this.callbacks.onEvaluate?.();
    }, 5000);
  }

  protected reapStale(): void {
    const now = Date.now();
    for (const [id, ts] of this.peers.entries()) {
      if (id === this.nodeId) continue;
      if (now - ts > 15000) this.peers.delete(id);
    }
    this.callbacks.onPeersChanged?.(new Map(this.peers));
  }

  broadcastLeaderAcquired(): void {
    this.post({ type: 'leader-acquired', from: this.nodeId, ts: Date.now() });
  }

  broadcastLeaderClosed(): void {
    this.post({ type: 'leader-closed', from: this.nodeId, ts: Date.now() });
  }

  broadcastPromotionRequest(from: string): void {
    this.post({ type: 'promotion-request', from, ts: Date.now() });
  }

  /** 자발적 휴면 — heartbeat 송신 중단. peer 목록은 유지(다른 탭이 나를 아직 peers에 보관 가능). */
  silence(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getPeers(): PeerMap { return new Map(this.peers); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    try { this.post({ type: 'goodbye', from: this.nodeId, ts: Date.now() }); } catch { /* noop */ }
    try { this.channel?.close(); } catch { /* noop */ }
    if (this.storageHandler && typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('storage', this.storageHandler);
    }
  }
}

// ============================================================
// PART 6 — BroadcastController (Web Locks 미지원 메인 경로)
// ============================================================
//
// tabId 사전순 최소값이 리더. peer heartbeat 15s 이상 끊기면 탈락 처리.
// leader-closed 메시지를 받으면 즉시 재평가 (<200ms 승격 목표).

class BroadcastController implements LeaderController {
  public role: LeaderRole = 'unknown';
  private leaderListeners = new Set<() => void>();
  private followerListeners = new Set<() => void>();
  private infoListeners = new Set<(i: LeaderInfo) => void>();
  private lastChange = Date.now();
  private base: BroadcastControllerBase;
  private leaderTabId: string | null = null;
  private pagehideHandler: (() => void) | null = null;
  /** release()로 자발적 탈퇴 후 재진입하지 않음 — 참여 flag. */
  private participating = true;

  constructor(private readonly nodeId: string) {
    this.base = new BroadcastControllerBase(nodeId, {
      onLeaderAcquired: (id) => {
        // 타이브레이커 재확인: 이 브로드캐스터가 자신보다 tabId가 작으면 수용.
        // 아니면 무시 — 곧 자신의 evaluateLeader가 올바른 결론을 내릴 것.
        if (id === this.nodeId) return;
        if (id < this.nodeId) {
          this.leaderTabId = id;
          if (this.role !== 'follower') {
            this.role = 'follower';
            this.lastChange = Date.now();
            for (const cb of this.followerListeners) cb();
          }
          this.emitInfo();
        } else {
          // 상대가 자신보다 큰 tabId면 자신이 진짜 리더여야 함 — 즉시 재평가.
          setTimeout(() => this.evaluateLeader(), 0);
        }
      },
      onLeaderClosed: (closedId) => {
        if (closedId === this.leaderTabId) {
          this.leaderTabId = null;
          // 즉시 재평가 — 승격 경쟁 시작.
          setTimeout(() => this.evaluateLeader(), 0);
        }
      },
      onPromotionRequest: (from) => {
        // 자신이 리더고 요청자가 다른 탭이면, 양도 여부를 방송 후 release.
        if (this.role === 'leader' && from !== this.nodeId) {
          this.release();
        }
      },
      onPeersChanged: () => this.emitInfo(),
      onEvaluate: () => this.evaluateLeader(),
    });

    if (typeof globalThis.addEventListener === 'function') {
      this.pagehideHandler = () => {
        if (this.role === 'leader') {
          this.base.broadcastLeaderClosed();
        }
      };
      globalThis.addEventListener('pagehide', this.pagehideHandler);
      globalThis.addEventListener('beforeunload', this.pagehideHandler);
    }

    // 초기 평가 (단일 탭이면 즉시 leader)
    setTimeout(() => this.evaluateLeader(), 50);
  }

  private evaluateLeader(): void {
    // release()로 탈퇴했으면 재진입하지 않음. 선거에 참여 금지.
    if (!this.participating) return;
    const peers = this.base.getPeers();
    if (peers.size === 0) {
      // 자기 자신조차 없으면 reseed
      peers.set(this.nodeId, Date.now());
    }
    // 타이브레이커: tabId 사전순 최소값이 리더.
    const ids = Array.from(peers.keys()).sort();
    const minId = ids[0];
    const shouldBeLeader = minId === this.nodeId;
    const prev = this.role;
    this.role = shouldBeLeader ? 'leader' : 'follower';
    if (shouldBeLeader) this.leaderTabId = this.nodeId;
    if (prev !== this.role) {
      this.lastChange = Date.now();
      if (this.role === 'leader') {
        this.base.broadcastLeaderAcquired();
        for (const cb of this.leaderListeners) cb();
      } else {
        for (const cb of this.followerListeners) cb();
      }
      this.emitInfo();
    }
  }

  private emitInfo(): void {
    const info = this.getInfo();
    for (const cb of this.infoListeners) cb(info);
  }

  getInfo(): LeaderInfo {
    const isLeader = this.role === 'leader';
    const peers = this.base.getPeers();
    // followerCount = 다른 탭 수 (자신 제외). leader든 follower든 동일 의미.
    const otherCount = Math.max(0, peers.size - 1);
    return {
      isLeader,
      leaderTabId: isLeader ? this.nodeId : this.leaderTabId,
      lastLeaderChange: this.lastChange,
      followerCount: otherCount,
      transport: this.base['channel'] ? 'broadcast' : 'single',
    };
  }

  async requestPromotion(): Promise<boolean> {
    if (this.role === 'leader') return true;
    // 재참여 — release된 탭이 다시 활성화되는 경로.
    this.participating = true;
    this.base.broadcastPromotionRequest(this.nodeId);
    return new Promise<boolean>((resolve) => {
      const off = this.onBecomeLeader(() => {
        off();
        resolve(true);
      });
      setTimeout(() => { off(); resolve(this.role === 'leader'); }, 2000);
    });
  }

  release(): void {
    if (!this.participating) return;
    if (this.role === 'leader') {
      this.base.broadcastLeaderClosed();
    }
    // 다음 heartbeat 타이머 사이클이 새로 자신을 peers에 추가하지 않도록 즉시 휴면.
    this.base.silence();
    // 선거 참여 종료 — 추후 promotion 요청 시 재가입.
    this.participating = false;
    this.role = 'follower';
    this.lastChange = Date.now();
    for (const cb of this.followerListeners) cb();
    this.emitInfo();
  }

  dispose(): void {
    this.release();
    if (this.pagehideHandler && typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('pagehide', this.pagehideHandler);
      globalThis.removeEventListener('beforeunload', this.pagehideHandler);
    }
    this.base.dispose();
    this.leaderListeners.clear();
    this.followerListeners.clear();
    this.infoListeners.clear();
  }

  onBecomeLeader(cb: () => void): () => void { this.leaderListeners.add(cb); return () => { this.leaderListeners.delete(cb); }; }
  onBecomeFollower(cb: () => void): () => void { this.followerListeners.add(cb); return () => { this.followerListeners.delete(cb); }; }
  onInfoChange(cb: (info: LeaderInfo) => void): () => void { this.infoListeners.add(cb); return () => { this.infoListeners.delete(cb); }; }
}

// ============================================================
// PART 7 — Factory
// ============================================================

export function acquireLeaderController(): LeaderController {
  const tabId = getNodeId();
  const locks = getLocks();
  if (locks) {
    try {
      return new LockBasedController(locks, tabId);
    } catch (err) {
      logger.warn('save-engine:leader', 'Lock-based controller 생성 실패, broadcast fallback', err);
    }
  }
  return new BroadcastController(tabId);
}

// ============================================================
// PART 8 — Test helpers
// ============================================================

/** 테스트 전용: 내부 클래스 노출. 실제 앱 코드는 acquireLeaderController만 사용. */
export const __internalForTests = {
  LockBasedController,
  BroadcastController,
  BroadcastControllerBase,
};
