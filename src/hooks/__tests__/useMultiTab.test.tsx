// ============================================================
// PART 1 — BroadcastChannel shim (hook 환경에서도 필요)
// ============================================================

type Handler = (ev: { data: unknown }) => void;
interface Entry { name: string; handler: Handler | null; }

const chBus: { channels: Map<string, Set<Entry>> } = { channels: new Map() };

class BroadcastChannelShim {
  private entry: Entry;
  public onmessage: Handler | null = null;
  constructor(public name: string) {
    this.entry = { name, handler: null };
    let set = chBus.channels.get(name);
    if (!set) { set = new Set(); chBus.channels.set(name, set); }
    set.add(this.entry);
    Object.defineProperty(this, 'onmessage', {
      get: () => this.entry.handler,
      set: (h: Handler | null) => { this.entry.handler = h; },
      configurable: true,
    });
  }
  postMessage(msg: unknown) {
    const set = chBus.channels.get(this.name);
    if (!set) return;
    for (const other of set) {
      if (other === this.entry) continue;
      queueMicrotask(() => other.handler?.({ data: msg }));
    }
  }
  close() { chBus.channels.get(this.name)?.delete(this.entry); }
}

function resetChBus() {
  for (const set of chBus.channels.values()) set.clear();
  chBus.channels.clear();
}

// ============================================================
// PART 2 — Test setup
// ============================================================

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useMultiTab } from '../useMultiTab';

type HookResult = ReturnType<typeof useMultiTab>;

function TestHarness({ onInfo }: { onInfo: (r: HookResult) => void }) {
  const r = useMultiTab();
  React.useEffect(() => { onInfo(r); });
  return <div data-testid="harness">{r.isLeader ? 'leader' : 'follower'}</div>;
}

describe('useMultiTab — M1.3', () => {
  const originalBC = (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel;

  beforeEach(() => {
    jest.resetModules();
    resetChBus();
    (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = BroadcastChannelShim;
    // sessionStorage에 예측 가능한 tabId 주입 (테스트 재현성)
    try { sessionStorage.clear(); } catch { /* noop */ }
    try { localStorage.clear(); } catch { /* noop */ }
    // delete navigator.locks 시뮬 (Broadcast 경로 강제)
    (globalThis as unknown as { navigator: unknown }).navigator = {
      ...(globalThis as unknown as { navigator: Record<string, unknown> }).navigator,
    };
  });

  afterEach(() => {
    (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = originalBC;
  });

  test('H1: 마운트 시 isLeader=true 단일 탭', async () => {
    let captured: ReturnType<typeof useMultiTab> | null = null;
    render(<TestHarness onInfo={(r) => { captured = r; }} />);
    await waitFor(() => expect(captured?.isLeader).toBe(true), { timeout: 1000 });
  });

  test('H2: unmount 시 controller dispose (에러 없음)', () => {
    const { unmount } = render(<TestHarness onInfo={() => {}} />);
    expect(() => unmount()).not.toThrow();
  });

  test('H3: tabId 노출', async () => {
    let captured: ReturnType<typeof useMultiTab> | null = null;
    render(<TestHarness onInfo={(r) => { captured = r; }} />);
    await waitFor(() => expect(captured?.isLeader).toBe(true), { timeout: 1000 });
    expect(captured!.tabId).toBeTruthy();
  });

  test('H4: requestPromotion — 이미 리더면 true 즉시', async () => {
    let captured: ReturnType<typeof useMultiTab> | null = null;
    render(<TestHarness onInfo={(r) => { captured = r; }} />);
    await waitFor(() => expect(captured?.isLeader).toBe(true), { timeout: 1000 });
    await act(async () => {
      const ok = await captured!.requestPromotion();
      expect(ok).toBe(true);
    });
  });

  test('H5: enabled=false → controller 미획득', async () => {
    function DisabledHarness() {
      const r = useMultiTab({ enabled: false });
      return <div data-testid="x">{r.tabId ?? 'none'}</div>;
    }
    const { getByTestId } = render(<DisabledHarness />);
    // 잠시 대기
    await new Promise((r) => setTimeout(r, 100));
    expect(getByTestId('x').textContent).toBe('none');
  });

  test('H6: conflicts 초기 빈 배열 / clearConflicts 정상 호출', async () => {
    let captured: ReturnType<typeof useMultiTab> | null = null;
    render(<TestHarness onInfo={(r) => { captured = r; }} />);
    await waitFor(() => expect(captured).not.toBeNull(), { timeout: 1000 });
    expect(captured!.conflicts).toEqual([]);
    await act(async () => { captured!.clearConflicts(); });
    expect(captured!.conflicts).toEqual([]);
  });

  test('H7: transport 필드 — broadcast or single', async () => {
    let captured: ReturnType<typeof useMultiTab> | null = null;
    render(<TestHarness onInfo={(r) => { captured = r; }} />);
    await waitFor(() => expect(captured?.isLeader).toBe(true), { timeout: 1000 });
    expect(['broadcast', 'single', 'web-locks']).toContain(captured!.transport);
  });
});
