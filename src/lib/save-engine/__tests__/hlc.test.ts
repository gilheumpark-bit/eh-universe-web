// ============================================================
// PART 1 — ULID tests (Spec 2.2.1)
// ============================================================

import {
  ulid,
  tickLocal,
  recvRemote,
  compareHLC,
  isConcurrent,
  zeroHLC,
  getNodeId,
  sortEntriesByHLC,
  isAfterByHLC,
} from '@/lib/save-engine/hlc';
import type { HLC } from '@/lib/save-engine/types';

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

// ============================================================
// PART 6 — sortEntriesByHLC / isAfterByHLC (critical #3 정렬 수정)
// ============================================================

interface ClockedEntry {
  id: string;
  clock: HLC;
}

function mk(id: string, physical: number, logical: number, nodeId = 'A'): ClockedEntry {
  return { id, clock: { physical, logical, nodeId } };
}

describe('sortEntriesByHLC', () => {
  test('같은 physical ms 안에서 id 사전순이 HLC 역순이어도 인과 순서로 정렬', () => {
    // 부모(logical 0) → 자식(logical 1) → 손주(logical 2). 같은 physical.
    // id는 일부러 역순(zzz > mmm > aaa)으로 부여 — ULID 랜덤 suffix 역전 재현.
    const parent = mk('zzz', 1000, 0);
    const child = mk('mmm', 1000, 1);
    const grandchild = mk('aaa', 1000, 2);
    // 스토리지가 id 사전순으로 돌려준 상태(= 인과 역순)
    const idSorted = [grandchild, child, parent]; // aaa < mmm < zzz
    const causal = sortEntriesByHLC(idSorted);
    expect(causal.map((e) => e.clock.logical)).toEqual([0, 1, 2]);
    expect(causal).toEqual([parent, child, grandchild]);
  });

  test('physical이 다르면 physical 우선', () => {
    const a = mk('x', 1000, 5);
    const b = mk('y', 2000, 0);
    const c = mk('z', 1500, 9);
    expect(sortEntriesByHLC([b, c, a])).toEqual([a, c, b]);
  });

  test('완전 동일 clock(tie)은 id 사전순으로 결정적 정렬', () => {
    const a = mk('id-a', 1000, 0, 'A');
    const b = mk('id-b', 1000, 0, 'A');
    // nodeId도 동일 → compareHLC tie → id 사전순(id-a < id-b)
    expect(sortEntriesByHLC([b, a])).toEqual([a, b]);
  });

  test('원본 배열을 변형하지 않음(순수)', () => {
    const a = mk('a', 1000, 1);
    const b = mk('b', 1000, 0);
    const input = [a, b];
    const snapshot = [...input];
    sortEntriesByHLC(input);
    expect(input).toEqual(snapshot);
  });

  test('빈 배열·단일 요소 안전', () => {
    expect(sortEntriesByHLC([])).toEqual([]);
    const one = mk('a', 1, 0);
    expect(sortEntriesByHLC([one])).toEqual([one]);
  });
});

describe('isAfterByHLC', () => {
  test('같은 ms에서 logical이 더 크면 after=true (id 사전순 역전과 무관)', () => {
    const pivot = mk('zzz', 1000, 0); // id는 더 크지만 logical은 더 작음
    const later = mk('aaa', 1000, 1); // id는 더 작지만 logical은 더 큼
    // id 비교(e.id > pivot.id)라면 'aaa' > 'zzz' = false (오분류).
    // HLC 비교라면 logical 1 > 0 → true (정답).
    expect(isAfterByHLC(later, pivot)).toBe(true);
    expect(isAfterByHLC(pivot, later)).toBe(false);
  });

  test('physical이 더 크면 after=true', () => {
    const pivot = mk('m', 1000, 9);
    const later = mk('a', 2000, 0);
    expect(isAfterByHLC(later, pivot)).toBe(true);
  });

  test('완전 동일 clock(tie)은 id 사전순으로 분리', () => {
    const pivot = mk('id-a', 1000, 0, 'A');
    const same = mk('id-b', 1000, 0, 'A');
    expect(isAfterByHLC(same, pivot)).toBe(true); // id-b > id-a
    expect(isAfterByHLC(pivot, same)).toBe(false);
  });

  test('자기 자신은 after=false', () => {
    const e = mk('id-a', 1000, 0, 'A');
    expect(isAfterByHLC(e, e)).toBe(false);
  });
});
