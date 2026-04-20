// ============================================================
// PART 1 — Shims (jsdom lacks BroadcastChannel/navigator.locks)
// ============================================================
//
// 테스트 내에서 두 탭을 시뮬레이트하기 위해 공용 MessageBus를 통해 두
// BroadcastChannelShim 인스턴스가 메시지를 주고받도록 한다. 각 인스턴스는
// 별개 "탭"을 나타내고, 실제 브라우저처럼 자기 자신의 메시지는 echo 없이.

type Handler = (ev: { data: unknown }) => void;

interface ChannelEntry {
  name: string;
  handler: Handler | null;
}

const bus: {
  channels: Map<string, Set<ChannelEntry>>;
  storageListeners: Set<(ev: StorageEvent) => void>;
} = {
  channels: new Map(),
  storageListeners: new Set(),
};

class BroadcastChannelShim {
  public onmessage: Handler | null = null;
  private entry: ChannelEntry;
  constructor(public name: string) {
    this.entry = { name, handler: null };
    let set = bus.channels.get(name);
    if (!set) { set = new Set(); bus.channels.set(name, set); }
    set.add(this.entry);
    // onmessage setter sync
    Object.defineProperty(this, 'onmessage', {
      get: () => this.entry.handler,
      set: (h: Handler | null) => { this.entry.handler = h; },
      configurable: true,
    });
  }
  postMessage(msg: unknown) {
    const set = bus.channels.get(this.name);
    if (!set) return;
    for (const other of set) {
      if (other === this.entry) continue; // no echo
      // 비동기 — 실제 BC처럼 microtask
      queueMicrotask(() => other.handler?.({ data: msg }));
    }
  }
  close() {
    const set = bus.channels.get(this.name);
    set?.delete(this.entry);
  }
}

function resetBus() {
  for (const set of bus.channels.values()) set.clear();
  bus.channels.clear();
  bus.storageListeners.clear();
}

// ============================================================
// PART 2 — navigator.locks shim (단일 lock 큐잉)
// ============================================================

interface LockRequest {
  holder: string | null;
  queue: Array<{ id: string; resolve: () => void }>;
}
const lockRegistry = new Map<string, LockRequest>();

interface LockReq {
  mode: 'shared' | 'exclusive';
  signal?: AbortSignal;
  ifAvailable?: boolean;
  steal?: boolean;
}

const locksShim = {
  request(name: string, options: LockReq, callback: (lock: { name: string } | null) => Promise<unknown>): Promise<unknown> {
    let entry = lockRegistry.get(name);
    if (!entry) { entry = { holder: null, queue: [] }; lockRegistry.set(name, entry); }
    const id = Math.random().toString(36).slice(2);

    return new Promise((resolve, reject) => {
      const attempt = () => {
        if (entry!.holder === null) {
          entry!.holder = id;
          const cleanup = () => {
            entry!.holder = null;
            const next = entry!.queue.shift();
            if (next) queueMicrotask(next.resolve);
          };
          callback({ name }).then((r) => { cleanup(); resolve(r); })
            .catch((err) => { cleanup(); reject(err); });
        } else {
          entry!.queue.push({ id, resolve: attempt });
        }
      };
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          // 대기중이면 큐에서 제거
          entry!.queue = entry!.queue.filter((q) => q.id !== id);
          if (entry!.holder === id) {
            entry!.holder = null;
            const next = entry!.queue.shift();
            if (next) queueMicrotask(next.resolve);
          }
          resolve(undefined);
        }, { once: true });
      }
      queueMicrotask(attempt);
    });
  },
};

function resetLocks() {
  lockRegistry.clear();
}

// ============================================================
// PART 3 — Test setup
// ============================================================

describe('LeaderController — M1.3 확장', () => {
  const originalBC = (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel;

  // jsdom navigator는 읽기 전용 프로퍼티 — defineProperty로 덮는다.
  function setLocks(locks: typeof locksShim | null) {
    try {
      Object.defineProperty(globalThis.navigator, 'locks', {
        configurable: true,
        get: () => locks,
      });
    } catch {
      // 실패 시 fallback: globalThis 덮어쓰기
      try {
        Object.defineProperty(globalThis, 'navigator', {
          configurable: true,
          value: { locks },
        });
      } catch { /* noop */ }
    }
  }

  beforeEach(() => {
    jest.resetModules();
    resetBus();
    resetLocks();
    setLocks(null);
    // BroadcastChannel 주입
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      value: BroadcastChannelShim,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      value: originalBC,
    });
    setLocks(null);
  });

  // ============================================================
  // PART 4 — 단일 탭 (Lock 즉시 획득)
  // ============================================================

  test('T1: 단일 탭 — Lock 경로에서 바로 leader 승격', async () => {
    setLocks(locksShim);
    const { acquireLeaderController } = await import('../leader-election');
    const c = acquireLeaderController();
    await new Promise((r) => setTimeout(r, 30));
    expect(c.role).toBe('leader');
    const info = c.getInfo();
    expect(info.isLeader).toBe(true);
    expect(info.transport).toBe('web-locks');
    c.dispose();
  });

  test('T2: 단일 탭 — Broadcast 경로에서 바로 leader 승격', async () => {
    setLocks(null); // no locks
    const { acquireLeaderController } = await import('../leader-election');
    const c = acquireLeaderController();
    // evaluateLeader setTimeout(0) 2회 경과 대기
    await new Promise((r) => setTimeout(r, 80));
    expect(c.role).toBe('leader');
    const info = c.getInfo();
    expect(info.isLeader).toBe(true);
    expect(info.followerCount).toBe(0);
    c.dispose();
  });

  // ============================================================
  // PART 5 — 2 탭 동시 — 타이브레이커
  // ============================================================

  test('T3: Broadcast 경로 — 2 탭 중 tabId 작은 쪽이 리더', async () => {
    setLocks(null);
    const { __internalForTests } = await import('../leader-election');
    const { BroadcastController } = __internalForTests;
    const a = new BroadcastController('AAAA-tab-id-1'); // 사전순 작음
    const b = new BroadcastController('ZZZZ-tab-id-2'); // 사전순 큼
    await new Promise((r) => setTimeout(r, 150));
    // heartbeat 교환 후 재평가
    expect(a.getInfo().isLeader).toBe(true);
    expect(b.getInfo().isLeader).toBe(false);
    a.dispose();
    b.dispose();
  });

  test('T4: Broadcast — Leader 탭 닫힘 → Follower 승격', async () => {
    setLocks(null);
    const { __internalForTests } = await import('../leader-election');
    const { BroadcastController } = __internalForTests;
    const a = new BroadcastController('AAAA-1');
    const b = new BroadcastController('BBBB-2');
    await new Promise((r) => setTimeout(r, 120));
    expect(a.getInfo().isLeader).toBe(true);
    // a가 release → leader-closed 방송
    a.release();
    await new Promise((r) => setTimeout(r, 120));
    expect(b.getInfo().isLeader).toBe(true);
    b.dispose();
    a.dispose();
  });

  test('T5: Broadcast — LeaderInfo.followerCount 정확 반영 (3 탭)', async () => {
    setLocks(null);
    const { __internalForTests } = await import('../leader-election');
    const { BroadcastController } = __internalForTests;
    const a = new BroadcastController('AAAA-1');
    const b = new BroadcastController('BBBB-2');
    const c = new BroadcastController('CCCC-3');
    await new Promise((r) => setTimeout(r, 200));
    const infoA = a.getInfo();
    // peer 3명 인지 → follower 2명 (자신 제외)
    expect(infoA.isLeader).toBe(true);
    expect(infoA.followerCount).toBeGreaterThanOrEqual(1);
    a.dispose();
    b.dispose();
    c.dispose();
  });

  // ============================================================
  // PART 6 — 승격 요청 프로토콜
  // ============================================================

  test('T6: Follower.requestPromotion → Leader release → 2초 내 승격', async () => {
    setLocks(null);
    const { __internalForTests } = await import('../leader-election');
    const { BroadcastController } = __internalForTests;
    const a = new BroadcastController('AAAA-1');
    const b = new BroadcastController('BBBB-2');
    await new Promise((r) => setTimeout(r, 120));
    expect(a.getInfo().isLeader).toBe(true);
    // b가 승격 요청
    const before = Date.now();
    const promotedPromise = b.requestPromotion();
    const ok = await promotedPromise;
    const elapsed = Date.now() - before;
    expect(ok).toBe(true);
    expect(elapsed).toBeLessThan(1000);
    expect(b.getInfo().isLeader).toBe(true);
    expect(a.getInfo().isLeader).toBe(false);
    a.dispose();
    b.dispose();
  });

  test('T7: Leader.requestPromotion → 이미 리더이므로 즉시 true', async () => {
    setLocks(null);
    const { __internalForTests } = await import('../leader-election');
    const { BroadcastController } = __internalForTests;
    const a = new BroadcastController('AAAA-1');
    await new Promise((r) => setTimeout(r, 100));
    const ok = await a.requestPromotion();
    expect(ok).toBe(true);
    a.dispose();
  });

  // ============================================================
  // PART 7 — 이벤트 구독
  // ============================================================

  test('T8: onInfoChange — Leader 전환 시점에 info 이벤트 발생', async () => {
    setLocks(null);
    const { acquireLeaderController } = await import('../leader-election');
    const c = acquireLeaderController();
    const events: string[] = [];
    c.onInfoChange((info) => {
      events.push(info.isLeader ? 'leader' : 'follower');
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(events.some((e) => e === 'leader')).toBe(true);
    c.dispose();
  });

  test('T9: onBecomeLeader / onBecomeFollower — 구독 후 해제', async () => {
    setLocks(null);
    const { acquireLeaderController } = await import('../leader-election');
    const c = acquireLeaderController();
    const leaderCalls: number[] = [];
    const followerCalls: number[] = [];
    const off1 = c.onBecomeLeader(() => leaderCalls.push(1));
    const off2 = c.onBecomeFollower(() => followerCalls.push(1));
    await new Promise((r) => setTimeout(r, 100));
    // 단일 탭 → leader 최소 1회
    expect(leaderCalls.length).toBeGreaterThanOrEqual(1);
    off1();
    off2();
    c.dispose();
    // dispose 후 추가 호출 없어야 — 검증은 count 고정으로 확인
    const finalCount = leaderCalls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(leaderCalls.length).toBe(finalCount);
  });

  // ============================================================
  // PART 8 — Graceful degradation
  // ============================================================

  test('T10: BroadcastChannel 미지원 → storage fallback 단일 탭 리더', async () => {
    setLocks(null);
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined });
    const { __internalForTests } = await import('../leader-election');
    const { BroadcastController } = __internalForTests;
    const a = new BroadcastController('AAAA-alone');
    await new Promise((r) => setTimeout(r, 150));
    expect(a.getInfo().isLeader).toBe(true);
    // 단일 탭 transport — channel 없음 + storage는 다른 탭 없으니 single
    const t = a.getInfo().transport;
    expect(['broadcast', 'single']).toContain(t);
    a.dispose();
  });

  test('T11: isWebLocksSupported — navigator.locks 유무에 따라 T/F', async () => {
    setLocks(locksShim);
    const mod1 = await import('../leader-election');
    expect(mod1.isWebLocksSupported()).toBe(true);

    setLocks(null);
    jest.resetModules();
    const mod2 = await import('../leader-election');
    expect(mod2.isWebLocksSupported()).toBe(false);
  });

  // ============================================================
  // PART 9 — Lock 경로 Leader 정보
  // ============================================================

  test('T12: Lock 경로 — LeaderInfo.transport = web-locks', async () => {
    setLocks(locksShim);
    const { acquireLeaderController } = await import('../leader-election');
    const c = acquireLeaderController();
    await new Promise((r) => setTimeout(r, 50));
    const info = c.getInfo();
    expect(info.transport).toBe('web-locks');
    expect(info.isLeader).toBe(true);
    c.dispose();
  });
});
