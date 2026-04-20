// ============================================================
// PART 1 — Leader Election (Spec 7.3)
// ============================================================
//
// Primary: navigator.locks.request('noa-journal-leader', 'exclusive').
// Fallback: BroadcastChannel + heartbeat + id 최소값 리더.
//
// 단일 탭 환경(lock 즉시 획득)에서도 정상 동작하도록 비동기 리더 콜백으로 구성.

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

// ============================================================
// PART 3 — Leader controller
// ============================================================

export type LeaderRole = 'leader' | 'follower' | 'unknown';

export interface LeaderController {
  /** 현재 역할 */
  role: LeaderRole;
  /** 릴리스 (Web Locks의 경우 abort). */
  release(): void;
  /** 테스트/종료 시 리더 해제. */
  dispose(): void;
  /** 리더로 승격되었을 때 이벤트 구독. */
  onBecomeLeader(cb: () => void): () => void;
  /** 팔로워로 격하되었을 때 이벤트 구독. */
  onBecomeFollower(cb: () => void): () => void;
}

const LOCK_NAME = 'noa-journal-leader';

class LockBasedController implements LeaderController {
  public role: LeaderRole = 'unknown';
  private abortCtrl: AbortController | null = null;
  private leaderListeners = new Set<() => void>();
  private followerListeners = new Set<() => void>();
  private releaseResolver: (() => void) | null = null;

  constructor(private readonly locks: LockManagerLike) {
    this.start();
  }

  private start(): void {
    const abort = new AbortController();
    this.abortCtrl = abort;
    this.role = 'follower';
    for (const cb of this.followerListeners) cb();

    this.locks
      .request(LOCK_NAME, { mode: 'exclusive', signal: abort.signal }, async () => {
        this.role = 'leader';
        for (const cb of this.leaderListeners) cb();
        // lock 유지 — release()가 abort를 호출할 때까지
        await new Promise<void>((resolve) => {
          this.releaseResolver = resolve;
          abort.signal.addEventListener('abort', () => resolve(), { once: true });
        });
        this.role = 'follower';
        for (const cb of this.followerListeners) cb();
      })
      .catch((err) => {
        // abort 또는 lock 실패
        logger.debug('save-engine:leader', 'lock released', err);
        this.role = 'unknown';
      });
  }

  release(): void {
    if (this.releaseResolver) { this.releaseResolver(); this.releaseResolver = null; }
    this.abortCtrl?.abort();
  }

  dispose(): void {
    this.release();
    this.leaderListeners.clear();
    this.followerListeners.clear();
  }

  onBecomeLeader(cb: () => void): () => void {
    this.leaderListeners.add(cb);
    return () => this.leaderListeners.delete(cb);
  }
  onBecomeFollower(cb: () => void): () => void {
    this.followerListeners.add(cb);
    return () => this.followerListeners.delete(cb);
  }
}

// ============================================================
// PART 4 — BroadcastChannel fallback
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

class BroadcastController implements LeaderController {
  public role: LeaderRole = 'unknown';
  private channel: BCastLike | null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private peers = new Map<string, number>(); // nodeId → lastSeen ms
  private leaderListeners = new Set<() => void>();
  private followerListeners = new Set<() => void>();
  private disposed = false;

  constructor(private readonly nodeId: string) {
    this.channel = openChannel('noa-journal-broadcast');
    this.start();
  }

  private start(): void {
    if (!this.channel) {
      // 채널도 없음 — 단일 탭으로 간주
      this.role = 'leader';
      setTimeout(() => { for (const cb of this.leaderListeners) cb(); }, 0);
      return;
    }
    this.peers.set(this.nodeId, Date.now());
    this.channel.onmessage = (ev) => {
      const { type, from, ts } = ev.data as { type: string; from: string; ts: number };
      if (type === 'heartbeat') this.peers.set(from, ts);
      if (type === 'goodbye') this.peers.delete(from);
      this.evaluateLeader();
    };
    // initial heartbeat
    this.channel.postMessage({ type: 'heartbeat', from: this.nodeId, ts: Date.now() });
    this.heartbeatTimer = setInterval(() => {
      this.channel?.postMessage({ type: 'heartbeat', from: this.nodeId, ts: Date.now() });
      this.reapStale();
      this.evaluateLeader();
    }, 5000);
    // 한 번 더 즉시 평가
    setTimeout(() => this.evaluateLeader(), 100);
  }

  private reapStale(): void {
    const now = Date.now();
    for (const [id, ts] of this.peers.entries()) {
      if (id === this.nodeId) continue;
      if (now - ts > 15000) this.peers.delete(id);
    }
  }

  private evaluateLeader(): void {
    const ids = Array.from(this.peers.keys()).sort();
    const minId = ids[0];
    const shouldBeLeader = minId === this.nodeId;
    const prev = this.role;
    this.role = shouldBeLeader ? 'leader' : 'follower';
    if (prev !== this.role) {
      if (this.role === 'leader') for (const cb of this.leaderListeners) cb();
      else for (const cb of this.followerListeners) cb();
    }
  }

  release(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    try { this.channel?.postMessage({ type: 'goodbye', from: this.nodeId, ts: Date.now() }); } catch { /* noop */ }
    try { this.channel?.close(); } catch { /* noop */ }
  }
  dispose(): void {
    this.release();
    this.leaderListeners.clear();
    this.followerListeners.clear();
  }
  onBecomeLeader(cb: () => void): () => void { this.leaderListeners.add(cb); return () => this.leaderListeners.delete(cb); }
  onBecomeFollower(cb: () => void): () => void { this.followerListeners.add(cb); return () => this.followerListeners.delete(cb); }
}

// ============================================================
// PART 5 — Factory
// ============================================================

export function acquireLeaderController(): LeaderController {
  const locks = getLocks();
  if (locks) {
    try {
      return new LockBasedController(locks);
    } catch (err) {
      logger.warn('save-engine:leader', 'Lock-based controller 생성 실패, broadcast fallback', err);
    }
  }
  return new BroadcastController(getNodeId());
}
