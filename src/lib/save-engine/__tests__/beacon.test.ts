// ============================================================
// PART 1 — Setup
// ============================================================
//
// M1.2 beacon 확장 — 4-state (clean/crashed/unknown/first-launch) 분류,
// clean shutdown 마커, 30s heartbeat interval 검증.
//
// jsdom에는 IndexedDB가 없지만 beacon은 localStorage만 쓴다. 따라서
// fake-idb 설치 없이 LS mock만 사용.

import {
  readBeacon,
  writeBeacon,
  clearBeacon,
  markCleanShutdown,
  evaluateBeaconStatus,
  estimateCrash,
  startHeartbeat,
  BEACON_CRASH_THRESHOLD_MS,
  BEACON_HEARTBEAT_INTERVAL_MS,
} from '@/lib/save-engine/beacon';

const SESSION_PRIOR_KEY = 'noa_studio_session';

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
  clearBeacon();
});

// ============================================================
// PART 2 — Basic read/write round-trip
// ============================================================

describe('beacon — read/write', () => {
  test('writeBeacon → readBeacon 값 round-trip', () => {
    writeBeacon({ lastHeartbeat: 100, sessionId: 's1', tabId: 't1' });
    const got = readBeacon();
    expect(got).not.toBeNull();
    expect(got!.lastHeartbeat).toBe(100);
    expect(got!.sessionId).toBe('s1');
    expect(got!.tabId).toBe('t1');
    expect(got!.cleanShutdownAt).toBeUndefined();
  });

  test('readBeacon이 없으면 null', () => {
    expect(readBeacon()).toBeNull();
  });

  test('clearBeacon 후 readBeacon은 null', () => {
    writeBeacon({ lastHeartbeat: 1, sessionId: 'a', tabId: 'b' });
    clearBeacon();
    expect(readBeacon()).toBeNull();
  });

  test('cleanShutdownAt 필드 유지', () => {
    writeBeacon({
      lastHeartbeat: 10,
      sessionId: 's',
      tabId: 't',
      cleanShutdownAt: 15,
    });
    expect(readBeacon()!.cleanShutdownAt).toBe(15);
  });
});

// ============================================================
// PART 3 — markCleanShutdown
// ============================================================

describe('beacon — markCleanShutdown', () => {
  test('기존 beacon 위에 cleanShutdownAt 덧씀', () => {
    writeBeacon({ lastHeartbeat: 100, sessionId: 's1', tabId: 't1' });
    markCleanShutdown(999);
    const b = readBeacon()!;
    expect(b.cleanShutdownAt).toBe(999);
    expect(b.sessionId).toBe('s1');
    expect(b.tabId).toBe('t1');
  });

  test('beacon이 없을 때도 최소 페이로드로 clean marker 기록', () => {
    markCleanShutdown(42);
    const b = readBeacon()!;
    expect(b.cleanShutdownAt).toBe(42);
    expect(b.lastHeartbeat).toBe(42);
  });
});

// ============================================================
// PART 4 — evaluateBeaconStatus 4-state 분류
// ============================================================

describe('evaluateBeaconStatus — 4-state 분류', () => {
  test('beacon 없음 + 이전 세션 흔적 없음 → first-launch', () => {
    // LS는 이미 clear — 이전 세션 흔적 없음
    const r = evaluateBeaconStatus();
    expect(r.status).toBe('first-launch');
    expect(r.crashed).toBe(false);
    expect(r.reason).toBe('first-launch');
  });

  test('beacon 없음 + 이전 세션 흔적 있음 → unknown (LS 삭제 추정)', () => {
    localStorage.setItem(SESSION_PRIOR_KEY, 'prior-session');
    const r = evaluateBeaconStatus();
    expect(r.status).toBe('unknown');
    expect(r.crashed).toBe(true);
    expect(r.reason).toBe('lost-beacon');
  });

  test('cleanShutdownAt 있음 → clean', () => {
    const now = 10_000;
    writeBeacon({
      lastHeartbeat: 9_000,
      sessionId: 's',
      tabId: 't',
      cleanShutdownAt: 9_500,
    });
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('clean');
    expect(r.crashed).toBe(false);
    expect(r.reason).toBe('clean-shutdown');
    expect(r.cleanShutdownAt).toBe(9_500);
  });

  test('heartbeat stale (30s 초과) + clean 없음 → crashed', () => {
    const now = 1_000_000;
    writeBeacon({
      lastHeartbeat: now - BEACON_CRASH_THRESHOLD_MS - 1,
      sessionId: 's',
      tabId: 't',
    });
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('crashed');
    expect(r.crashed).toBe(true);
    expect(r.reason).toBe('stale-heartbeat');
    expect(r.ageMs).toBeGreaterThan(BEACON_CRASH_THRESHOLD_MS);
  });

  test('heartbeat fresh (< 5s) + clean 없음 → clean (막 시작한 탭)', () => {
    const now = 1_000_000;
    writeBeacon({
      lastHeartbeat: now - 1_000,
      sessionId: 's',
      tabId: 't',
    });
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('clean');
    expect(r.crashed).toBe(false);
  });

  test('heartbeat 10s 경과 (< 30s stale, > 5s fresh) + clean 없음 → crashed', () => {
    // 5s < age < 30s 영역 — 스펙상 "방금 시작한 탭" 아님 → crashed 처리.
    const now = 1_000_000;
    writeBeacon({
      lastHeartbeat: now - 10_000,
      sessionId: 's',
      tabId: 't',
    });
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('crashed');
  });

  test('cleanShutdownAt < lastHeartbeat (재시작 후 hb만 갱신) → crashed', () => {
    // 이 시나리오는 cleanShutdown 이후 heartbeat가 더 진행된 상태 → 정상
    // (M1.2 규칙: cleanShutdownAt >= lastHeartbeat 일 때만 clean)
    const now = 1_000_000;
    writeBeacon({
      lastHeartbeat: now - (BEACON_CRASH_THRESHOLD_MS + 1_000),
      sessionId: 's',
      tabId: 't',
      cleanShutdownAt: now - (BEACON_CRASH_THRESHOLD_MS + 2_000), // hb보다 이전
    });
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('crashed');
    expect(r.crashed).toBe(true);
  });
});

// ============================================================
// PART 5 — Legacy estimateCrash shim
// ============================================================

describe('estimateCrash (legacy shim)', () => {
  test('evaluateBeaconStatus와 동일 결과 반환', () => {
    localStorage.setItem(SESSION_PRIOR_KEY, 'x');
    const a = estimateCrash();
    const b = evaluateBeaconStatus();
    expect(a.crashed).toBe(b.crashed);
    expect(a.status).toBe(b.status);
    expect(a.reason).toBe(b.reason);
  });
});

// ============================================================
// PART 6 — Heartbeat scheduler
// ============================================================

describe('startHeartbeat — scheduler', () => {
  test('호출 즉시 1회 기록', () => {
    const h = startHeartbeat('s1', 't1');
    const b = readBeacon();
    expect(b).not.toBeNull();
    expect(b!.sessionId).toBe('s1');
    expect(b!.tabId).toBe('t1');
    h.stop();
  });

  test('flush() 호출 시 lastHeartbeat 갱신', () => {
    const h = startHeartbeat('s1', 't1');
    const before = readBeacon()!.lastHeartbeat;
    // 1ms 대기 후 flush
    const now = before + 100;
    const origNow = Date.now;
    Date.now = () => now;
    try {
      h.flush();
      expect(readBeacon()!.lastHeartbeat).toBe(now);
    } finally {
      Date.now = origNow;
      h.stop();
    }
  });

  test('markCleanShutdown() 호출 시 cleanShutdownAt 기록', () => {
    const h = startHeartbeat('s1', 't1');
    h.markCleanShutdown();
    const b = readBeacon()!;
    expect(b.cleanShutdownAt).toBeDefined();
    h.stop();
  });

  test('stop() 호출 시 자동으로 clean shutdown 마커 기록', () => {
    const h = startHeartbeat('s1', 't1');
    h.stop();
    const b = readBeacon();
    expect(b!.cleanShutdownAt).toBeDefined();
  });

  test('heartbeat interval 상수는 30초', () => {
    expect(BEACON_HEARTBEAT_INTERVAL_MS).toBe(30_000);
  });
});
