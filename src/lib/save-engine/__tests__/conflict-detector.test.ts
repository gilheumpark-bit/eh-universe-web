// ============================================================
// PART 1 — Fixture HLCs
// ============================================================

import type { HLC } from '../types';
import {
  ConflictDetector,
  getDefaultConflictDetector,
  resetDefaultConflictDetectorForTests,
  dispatchConflictAlert,
} from '../conflict-detector';

const BASE = 1_700_000_000_000;

function makeHLC(physical: number, logical: number, nodeId: string): HLC {
  return { physical, logical, nodeId };
}

// ============================================================
// PART 2 — detectOnSaveCommitted
// ============================================================

describe('ConflictDetector.detectOnSaveCommitted', () => {
  beforeEach(() => resetDefaultConflictDetectorForTests());

  test('C1: 로컬 없음 → null 반환 (판단 skip)', () => {
    const d = new ConflictDetector();
    const out = d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: null,
      remoteClock: makeHLC(BASE, 0, 'tab-B'),
      remoteTabId: 'tab-B',
      remoteEntryId: 'r1',
      remoteParentHash: 'GENESIS',
      projectId: 'p1',
    });
    expect(out).toBeNull();
    expect(d.size()).toBe(0);
  });

  test('C2: HLC concurrent (same physical+logical, different nodeId) → log', () => {
    const d = new ConflictDetector();
    const local = makeHLC(BASE, 0, 'tab-A');
    const remote = makeHLC(BASE, 0, 'tab-B');
    const out = d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: local,
      localLastEntryId: 'l1',
      localLastParentHash: 'PARENT',
      remoteClock: remote,
      remoteTabId: 'tab-B',
      remoteEntryId: 'r1',
      remoteParentHash: 'PARENT',
      projectId: 'p1',
    });
    expect(out).not.toBeNull();
    expect(out?.reason).toBe('hlc-concurrent-save');
    expect(d.size()).toBe(1);
    expect(out?.localEntryId).toBe('l1');
    expect(out?.remoteEntryId).toBe('r1');
  });

  test('C3: parent 분기 (different parentHash) → parent-divergence', () => {
    const d = new ConflictDetector();
    const out = d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: makeHLC(BASE, 0, 'tab-A'),
      localLastEntryId: 'l1',
      localLastParentHash: 'PARENT-A',
      remoteClock: makeHLC(BASE + 1000, 0, 'tab-B'),
      remoteTabId: 'tab-B',
      remoteEntryId: 'r1',
      remoteParentHash: 'PARENT-B', // 분기
      projectId: 'p1',
    });
    expect(out?.reason).toBe('parent-divergence');
  });

  test('C4: 순차 쓰기 (different physical, same parent) → null', () => {
    const d = new ConflictDetector();
    const out = d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: makeHLC(BASE, 0, 'tab-A'),
      localLastEntryId: 'l1',
      localLastParentHash: 'P',
      remoteClock: makeHLC(BASE + 500, 0, 'tab-B'),
      remoteTabId: 'tab-B',
      remoteEntryId: 'r1',
      remoteParentHash: 'P',
      projectId: 'p1',
    });
    expect(out).toBeNull();
    expect(d.size()).toBe(0);
  });

  test('C5: 같은 탭 echo → null (analysis skip)', () => {
    const d = new ConflictDetector();
    const out = d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: makeHLC(BASE, 0, 'tab-A'),
      localLastParentHash: 'P',
      remoteClock: makeHLC(BASE, 0, 'tab-A'),
      remoteTabId: 'tab-A', // 같은 탭
      remoteEntryId: 'r1',
      remoteParentHash: 'P',
      projectId: 'p1',
    });
    expect(out).toBeNull();
  });
});

// ============================================================
// PART 3 — detectOnPromotion
// ============================================================

describe('ConflictDetector.detectOnPromotion', () => {
  test('C6: pending × lastLeader concurrent → promotion-race log', () => {
    const d = new ConflictDetector();
    const out = d.detectOnPromotion({
      detectorTabId: 'tab-B',
      pendingClock: makeHLC(BASE, 0, 'tab-B'),
      lastLeaderClock: makeHLC(BASE, 0, 'tab-A'),
      lastLeaderTabId: 'tab-A',
      lastLeaderEntryId: 'l-prev',
      projectId: 'p1',
    });
    expect(out?.reason).toBe('promotion-race');
    expect(d.size()).toBe(1);
  });

  test('C7: pending 없음 → null', () => {
    const d = new ConflictDetector();
    const out = d.detectOnPromotion({
      detectorTabId: 'tab-B',
      pendingClock: null,
      lastLeaderClock: makeHLC(BASE, 0, 'tab-A'),
      lastLeaderTabId: 'tab-A',
      projectId: 'p1',
    });
    expect(out).toBeNull();
  });

  test('C8: pending과 lastLeader 순차 관계 → null', () => {
    const d = new ConflictDetector();
    const out = d.detectOnPromotion({
      detectorTabId: 'tab-B',
      pendingClock: makeHLC(BASE + 100, 0, 'tab-B'),
      lastLeaderClock: makeHLC(BASE, 0, 'tab-A'),
      lastLeaderTabId: 'tab-A',
      projectId: 'p1',
    });
    expect(out).toBeNull();
  });
});

// ============================================================
// PART 4 — Ring buffer + listener + alert
// ============================================================

describe('ConflictDetector — 부가 기능', () => {
  test('C9: capacity 초과 시 오래된 항목 드롭', () => {
    const d = new ConflictDetector(3);
    for (let i = 0; i < 5; i++) {
      d.detectOnSaveCommitted({
        detectorTabId: 'tab-A',
        localLastClock: makeHLC(BASE, 0, 'tab-A'),
        localLastParentHash: 'P',
        remoteClock: makeHLC(BASE, 0, `tab-R${i}`),
        remoteTabId: `tab-R${i}`,
        remoteEntryId: `r${i}`,
        remoteParentHash: 'P',
        projectId: 'p',
      });
    }
    expect(d.size()).toBe(3);
    const log = d.getLog();
    // 가장 오래된 R0, R1 드롭, R2/R3/R4만 남음
    expect(log.map((l) => l.remoteEntryId)).toEqual(['r2', 'r3', 'r4']);
  });

  test('C10: listener 콜백 호출 + 해제', () => {
    const d = new ConflictDetector();
    const calls: string[] = [];
    const off = d.onConflict((entry) => calls.push(entry.reason));
    d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: makeHLC(BASE, 0, 'tab-A'),
      localLastParentHash: 'P',
      remoteClock: makeHLC(BASE, 0, 'tab-B'),
      remoteTabId: 'tab-B',
      remoteEntryId: 'r1',
      remoteParentHash: 'P',
      projectId: null,
    });
    expect(calls).toEqual(['hlc-concurrent-save']);
    off();
    d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: makeHLC(BASE, 0, 'tab-A'),
      localLastParentHash: 'P',
      remoteClock: makeHLC(BASE, 0, 'tab-C'),
      remoteTabId: 'tab-C',
      remoteEntryId: 'r2',
      remoteParentHash: 'P',
      projectId: null,
    });
    expect(calls.length).toBe(1); // 해제 후 추가 호출 없음
  });

  test('C11: dispatchConflictAlert — CustomEvent noa:alert 발생', () => {
    const d = new ConflictDetector();
    const entry = d.detectOnSaveCommitted({
      detectorTabId: 'tab-A',
      localLastClock: makeHLC(BASE, 0, 'tab-A'),
      localLastParentHash: 'P',
      remoteClock: makeHLC(BASE, 0, 'tab-B'),
      remoteTabId: 'tab-B',
      remoteEntryId: 'r1',
      remoteParentHash: 'P',
      projectId: null,
    });
    expect(entry).not.toBeNull();
    const received: unknown[] = [];
    const handler = (ev: Event) => received.push((ev as CustomEvent).detail);
    globalThis.addEventListener('noa:alert', handler);
    dispatchConflictAlert(entry!, 'ko');
    globalThis.removeEventListener('noa:alert', handler);
    expect(received.length).toBe(1);
    const detail = received[0] as { tone: string; message: string; reason: string };
    expect(detail.tone).toBe('warn');
    expect(detail.reason).toBe('hlc-concurrent-save');
    expect(detail.message).toMatch(/동시 편집/);
  });

  test('C12: getDefaultConflictDetector 싱글톤', () => {
    resetDefaultConflictDetectorForTests();
    const a = getDefaultConflictDetector();
    const b = getDefaultConflictDetector();
    expect(a).toBe(b);
  });
});
