// ============================================================
// PART 1 — ULID tests (Spec 2.2.1)
// ============================================================

import { ulid, tickLocal, recvRemote, compareHLC, isConcurrent, zeroHLC, getNodeId } from '@/lib/save-engine/hlc';

describe('ulid', () => {
  test('26자 고정 길이', () => {
    for (let i = 0; i < 100; i++) {
      expect(ulid()).toHaveLength(26);
    }
  });

  test('Crockford base32 문자만 사용', () => {
    const B32 = /^[0-9A-HJKMNP-TV-Z]+$/;
    for (let i = 0; i < 100; i++) {
      expect(ulid()).toMatch(B32);
    }
  });

  test('시간순 lexicographic 정렬 보장', async () => {
    const a = ulid(1000);
    const b = ulid(2000);
    const c = ulid(3000);
    expect([a, b, c].slice().sort()).toEqual([a, b, c]);
  });

  test('동일 ms 내 16자 randomness로 충돌 극히 낮음', () => {
    const now = Date.now();
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(ulid(now));
    expect(set.size).toBe(1000);
  });
});

// ============================================================
// PART 2 — HLC local tick (Spec 2.2.2)
// ============================================================

describe('tickLocal', () => {
  test('physical 단조 증가 — wall clock이 뒤로 가도 보정', () => {
    const seed = zeroHLC('node-A');
    const t1 = tickLocal(seed, 1000);
    const t2 = tickLocal(t1, 500); // 시계 역전
    expect(t2.physical).toBe(1000); // last.physical 유지
    expect(t2.logical).toBe(t1.logical + 1);
  });

  test('physical 진행 시 logical 리셋', () => {
    const seed = zeroHLC('node-A');
    const t1 = tickLocal(seed, 1000);
    const t2 = tickLocal(t1, 1000); // 같은 physical
    const t3 = tickLocal(t2, 2000); // physical 진행
    expect(t2.logical).toBe(t1.logical + 1);
    expect(t3.physical).toBe(2000);
    expect(t3.logical).toBe(0);
  });

  test('nodeId 유지', () => {
    const seed = zeroHLC('node-X');
    const t1 = tickLocal(seed, 100);
    expect(t1.nodeId).toBe('node-X');
  });
});

// ============================================================
// PART 3 — recvRemote merge (Spec 2.2.2 알고리즘)
// ============================================================

describe('recvRemote', () => {
  test('모두 동일 physical → logical = max(local, remote) + 1', () => {
    const local = { physical: 100, logical: 3, nodeId: 'A' };
    const remote = { physical: 100, logical: 5, nodeId: 'B' };
    const merged = recvRemote(local, remote, 100);
    expect(merged.physical).toBe(100);
    expect(merged.logical).toBe(6);
    expect(merged.nodeId).toBe('A');
  });

  test('local physical 최대 → local.logical + 1', () => {
    const local = { physical: 200, logical: 3, nodeId: 'A' };
    const remote = { physical: 100, logical: 5, nodeId: 'B' };
    const merged = recvRemote(local, remote, 150);
    expect(merged.physical).toBe(200);
    expect(merged.logical).toBe(4);
  });

  test('remote physical 최대 → remote.logical + 1', () => {
    const local = { physical: 100, logical: 3, nodeId: 'A' };
    const remote = { physical: 300, logical: 5, nodeId: 'B' };
    const merged = recvRemote(local, remote, 200);
    expect(merged.physical).toBe(300);
    expect(merged.logical).toBe(6);
  });

  test('now가 최대 → logical = 0', () => {
    const local = { physical: 100, logical: 3, nodeId: 'A' };
    const remote = { physical: 100, logical: 5, nodeId: 'B' };
    const merged = recvRemote(local, remote, 500);
    expect(merged.physical).toBe(500);
    expect(merged.logical).toBe(0);
  });
});

// ============================================================
// PART 4 — Ordering & concurrency
// ============================================================

describe('compareHLC', () => {
  test('physical 우선 비교', () => {
    const a = { physical: 100, logical: 10, nodeId: 'A' };
    const b = { physical: 200, logical: 0, nodeId: 'A' };
    expect(compareHLC(a, b)).toBe(-1);
    expect(compareHLC(b, a)).toBe(1);
  });

  test('같은 physical이면 logical 비교', () => {
    const a = { physical: 100, logical: 3, nodeId: 'A' };
    const b = { physical: 100, logical: 5, nodeId: 'A' };
    expect(compareHLC(a, b)).toBe(-1);
  });

  test('physical+logical 같으면 nodeId tiebreaker', () => {
    const a = { physical: 100, logical: 3, nodeId: 'A' };
    const b = { physical: 100, logical: 3, nodeId: 'B' };
    expect(compareHLC(a, b)).toBe(-1);
    expect(compareHLC(a, a)).toBe(0);
  });
});

describe('isConcurrent', () => {
  test('동일 physical+logical+다른 nodeId → concurrent', () => {
    expect(isConcurrent(
      { physical: 100, logical: 3, nodeId: 'A' },
      { physical: 100, logical: 3, nodeId: 'B' },
    )).toBe(true);
  });

  test('같은 nodeId는 concurrent 불가', () => {
    expect(isConcurrent(
      { physical: 100, logical: 3, nodeId: 'A' },
      { physical: 100, logical: 3, nodeId: 'A' },
    )).toBe(false);
  });

  test('physical 다르면 concurrent 아님', () => {
    expect(isConcurrent(
      { physical: 100, logical: 3, nodeId: 'A' },
      { physical: 200, logical: 3, nodeId: 'B' },
    )).toBe(false);
  });
});

// ============================================================
// PART 5 — getNodeId
// ============================================================

describe('getNodeId', () => {
  test('동일 탭 세션 내 안정', () => {
    const first = getNodeId();
    const second = getNodeId();
    expect(first).toBe(second);
    expect(first).toHaveLength(26);
  });
});
