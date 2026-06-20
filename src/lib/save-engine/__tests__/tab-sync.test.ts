// ============================================================
// PART 1 — BroadcastChannel shim (두 TabSyncBus 인스턴스 간 메시지 교환)
// ============================================================

type Handler = (ev: { data: unknown }) => void;

interface Entry { name: string; handler: Handler | null; }

const bus: { channels: Map<string, Set<Entry>> } = { channels: new Map() };

class BroadcastChannelShim {
  private entry: Entry;
  public onmessage: Handler | null = null;
  constructor(public name: string) {
    this.entry = { name, handler: null };
    let set = bus.channels.get(name);
    if (!set) { set = new Set(); bus.channels.set(name, set); }
    set.add(this.entry);
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
      if (other === this.entry) continue;
      queueMicrotask(() => other.handler?.({ data: msg }));
    }
  }
  close() { bus.channels.get(this.name)?.delete(this.entry); }
}

function resetBus() {
  for (const set of bus.channels.values()) set.clear();
  bus.channels.clear();
}

// ============================================================
// PART 2 — Fixture payloads
// ============================================================

import type { HLC } from '../types';

const CLK_A: HLC = { physical: 1_000_000, logical: 0, nodeId: 'tab-A' };
const CLK_B: HLC = { physical: 1_000_001, logical: 0, nodeId: 'tab-B' };

// ============================================================
// PART 3 — Tests
// ============================================================

describe('TabSyncBus — M1.3', () => {
  const originalBC = (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel;

  beforeEach(() => {
    jest.resetModules();
    resetBus();
    (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = BroadcastChannelShim;
  });

  afterEach(() => {
    (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = originalBC;
  });

  test('S1: save-committed 이벤트 — Leader 송신 → Follower 수신', async () => {
    const { TabSyncBus } = await import('../tab-sync');
    const leader = new TabSyncBus('tab-L');
    const follower = new TabSyncBus('tab-F');
    const received: unknown[] = [];
    follower.on('save-committed', (ev) => received.push(ev));
    leader.emitSaveCommitted({
      entryId: 'ent-1',
      contentHash: 'h1',
      parentHash: 'GENESIS',
      clock: CLK_A,
      projectId: 'p1',
      entryType: 'delta',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(1);
    const ev = received[0] as { from: string; payload: { entryId: string } };
    expect(ev.from).toBe('tab-L');
    expect(ev.payload.entryId).toBe('ent-1');
    leader.dispose();
    follower.dispose();
  });

  test('S2: state-changed 이벤트 — rawHash 전달', async () => {
    const { TabSyncBus } = await import('../tab-sync');
    const a = new TabSyncBus('tab-A');
    const b = new TabSyncBus('tab-B');
    const received: unknown[] = [];
    b.on('state-changed', (ev) => received.push(ev));
    a.emitStateChanged({
      rawHash: 'hash-xyz',
      timestampMs: Date.now(),
      leaderTabId: 'tab-A',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(1);
    const ev = received[0] as { payload: { rawHash: string } };
    expect(ev.payload.rawHash).toBe('hash-xyz');
    a.dispose();
    b.dispose();
  });

  test('S3: user-action 이벤트 — 양방향 송수신', async () => {
    const { TabSyncBus } = await import('../tab-sync');
    const a = new TabSyncBus('tab-A');
    const b = new TabSyncBus('tab-B');
    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];
    a.on('user-action', (ev) => receivedA.push(ev));
    b.on('user-action', (ev) => receivedB.push(ev));
    a.emitUserAction({ kind: 'editing-scene', projectId: 'p1' });
    b.emitUserAction({ kind: 'cursor-at', projectId: 'p1', detail: { line: 3 } });
    await new Promise((r) => setTimeout(r, 10));
    expect(receivedA.length).toBe(1);
    expect(receivedB.length).toBe(1);
    a.dispose();
    b.dispose();
  });

  test('S4: 자기 자신 echo 무시 — from === tabId면 listener 호출 안 됨', async () => {
    const { TabSyncBus } = await import('../tab-sync');
    const a = new TabSyncBus('tab-A');
    const received: unknown[] = [];
    a.on('save-committed', (ev) => received.push(ev));
    a.emitSaveCommitted({
      entryId: 'own',
      contentHash: 'h',
      parentHash: 'GENESIS',
      clock: CLK_A,
      projectId: null,
      entryType: 'init',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(0);
    a.dispose();
  });

  test('S5: off() 반환 함수로 구독 해제', async () => {
    const { TabSyncBus } = await import('../tab-sync');
    const a = new TabSyncBus('tab-A');
    const b = new TabSyncBus('tab-B');
    const received: unknown[] = [];
    const off = b.on('save-committed', (ev) => received.push(ev));
    off();
    a.emitSaveCommitted({
      entryId: 'x',
      contentHash: 'h',
      parentHash: 'GENESIS',
      clock: CLK_B,
      projectId: null,
      entryType: 'delta',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(0);
    a.dispose();
    b.dispose();
  });

  test('S6: dispose 후 이벤트 수신 중단', async () => {
    const { TabSyncBus } = await import('../tab-sync');
    const a = new TabSyncBus('tab-A');
    const b = new TabSyncBus('tab-B');
    const received: unknown[] = [];
    b.on('save-committed', (ev) => received.push(ev));
    b.dispose();
    a.emitSaveCommitted({
      entryId: 'post-dispose',
      contentHash: 'h',
      parentHash: 'GENESIS',
      clock: CLK_A,
      projectId: null,
      entryType: 'delta',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(0);
    a.dispose();
  });

  test('S7: 3개 탭 동시 — 송신 1건 → 나머지 2건 수신', async () => {
    const { TabSyncBus } = await import('../tab-sync');
    const a = new TabSyncBus('tab-A');
    const b = new TabSyncBus('tab-B');
    const c = new TabSyncBus('tab-C');
    const rb: unknown[] = [];
    const rc: unknown[] = [];
    b.on('save-committed', (ev) => rb.push(ev));
    c.on('save-committed', (ev) => rc.push(ev));
    a.emitSaveCommitted({
      entryId: 'broadcast',
      contentHash: 'h',
      parentHash: 'GENESIS',
      clock: CLK_A,
      projectId: null,
      entryType: 'delta',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(rb.length).toBe(1);
    expect(rc.length).toBe(1);
    a.dispose();
    b.dispose();
    c.dispose();
  });

  test('S8: BroadcastChannel 없음 → storage fallback transport', async () => {
    // BroadcastChannel 미지원 환경 시뮬레이션
    (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = undefined;
    const { TabSyncBus } = await import('../tab-sync');
    const a = new TabSyncBus('tab-A-storage');
    expect(a.getTransport()).toBe('storage');
    a.dispose();
    expect(a.getTransport()).toBe('none');
  });

  test('S9: getDefaultTabSyncBus — 싱글톤 반환 (두 번 호출 시 같은 인스턴스)', async () => {
    const { getDefaultTabSyncBus, resetDefaultTabSyncBusForTests } = await import('../tab-sync');
    resetDefaultTabSyncBusForTests();
    const a = getDefaultTabSyncBus();
    const b = getDefaultTabSyncBus();
    expect(a).toBe(b);
    a.dispose();
    resetDefaultTabSyncBusForTests();
  });
});
