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
  BEACON_ALIVE_WINDOW_MS,
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
      lastHeartbeat: now - BEACON_ALIVE_WINDOW_MS - 1,
      sessionId: 's',
      tabId: 't',
    });
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('crashed');
    expect(r.crashed).toBe(true);
    expect(r.reason).toBe('stale-heartbeat');
    expect(r.ageMs).toBeGreaterThan(BEACON_ALIVE_WINDOW_MS);
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

  test('heartbeat 10s 경과 (< 30s stale) + clean 없음 → 살아있는 탭으로 정상 (high #11)', () => {
    // 5s < age < 30s 영역 — 살아있는 탭은 30초마다 heartbeat 를 찍으므로 가장 최신 값이
    // 0~30초 전이다. 과거 5초 하드코딩이 이 영역을 크래시로 오판했으나(high #11 under-deliver),
    // 스펙 규칙(30s+ stale 일 때만 crashed)대로 한 주기 안 heartbeat 는 정상으로 본다.
    const now = 1_000_000;
    writeBeacon({
      lastHeartbeat: now - 10_000,
      sessionId: 's',
      tabId: 't',
    });
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('clean');
    expect(r.crashed).toBe(false);
  });

  test('heartbeat ~20s 경과 + fresh per-tab beacon + clean 없음 → crashed=false (high #11 보장)', () => {
    // 버그 재현: 살아있는 형제 탭의 가장 최신 heartbeat 가 20초 전(5s<=age<=30s)이면
    // 과거 5초 윈도우에서는 isAliveBeacon=false + Case 5(no-beacon)로 crashed=true 오판했다.
    // 한 heartbeat 주기 전체에서 high #11("살아있는 탭이 있으면 크래시 아님")이 성립해야 한다.
    const now = 1_000_000;
    writeBeacon(
      { lastHeartbeat: now - 20_000, sessionId: 's-live', tabId: 'tab-live' },
      `${BEACON_BASE_KEY}:tab-live`,
    );
    const r = evaluateBeaconStatus(now);
    expect(r.crashed).toBe(false);
    expect(r.status).toBe('clean');
  });

  test('cleanShutdownAt < lastHeartbeat (재시작 후 hb만 갱신) → crashed', () => {
    // 이 시나리오는 cleanShutdown 이후 heartbeat가 더 진행된 상태 → 정상
    // (M1.2 규칙: cleanShutdownAt >= lastHeartbeat 일 때만 clean)
    const now = 1_000_000;
    writeBeacon({
      lastHeartbeat: now - (BEACON_ALIVE_WINDOW_MS + 1_000),
      sessionId: 's',
      tabId: 't',
      cleanShutdownAt: now - (BEACON_ALIVE_WINDOW_MS + 2_000), // hb보다 이전
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

// ============================================================
// PART 7 — high #11: 멀티탭 beacon 분리 (per-tab 키)
// ============================================================
//
// 버그: 단일 공유 키(noa_journal_beacon) 때문에 살아있는 탭의 주기 heartbeat가 다른 탭의
// cleanShutdownAt를 지워 크래시/정상을 오판했다. 수정: startHeartbeat가 탭별 키
// (`noa_journal_beacon:<tabId>`)로도 기록하고, evaluateBeaconStatus가 모든 탭을 집계해
// "살아있는 탭이 하나라도 있으면 크래시 아님"으로 판정.

const BEACON_BASE_KEY = 'noa_journal_beacon';

describe('beacon — 멀티탭 분리 (high #11)', () => {
  test('startHeartbeat는 탭별 키에 분리 기록한다', () => {
    const h = startHeartbeat('s-A', 'tab-A');
    const perTab = localStorage.getItem(`${BEACON_BASE_KEY}:tab-A`);
    expect(perTab).not.toBeNull();
    expect(JSON.parse(perTab!).tabId).toBe('tab-A');
    h.stop();
  });

  test('두 탭이 각자 키를 가지며 서로 덮어쓰지 않는다', () => {
    const a = startHeartbeat('s-A', 'tab-A');
    const b = startHeartbeat('s-B', 'tab-B');
    const keyA = localStorage.getItem(`${BEACON_BASE_KEY}:tab-A`);
    const keyB = localStorage.getItem(`${BEACON_BASE_KEY}:tab-B`);
    expect(keyA).not.toBeNull();
    expect(keyB).not.toBeNull();
    expect(JSON.parse(keyA!).tabId).toBe('tab-A');
    expect(JSON.parse(keyB!).tabId).toBe('tab-B');
    a.stop();
    b.stop();
  });

  test('살아있는 탭의 heartbeat가 다른 탭의 cleanShutdownAt를 지우지 않는다', () => {
    const now = 1_000_000;
    const origNow = Date.now;
    Date.now = () => now;
    try {
      // 탭 A: 방금 정상 종료(clean marker) — 자기 키에만 기록.
      writeBeacon(
        { lastHeartbeat: now - 1_000, sessionId: 's-A', tabId: 'tab-A', cleanShutdownAt: now - 1_000 },
        `${BEACON_BASE_KEY}:tab-A`,
      );
      // 탭 B: 살아있음 — 주기 heartbeat가 공유 키를 갱신(클로버링 시도).
      writeBeacon({ lastHeartbeat: now - 500, sessionId: 's-B', tabId: 'tab-B' }, `${BEACON_BASE_KEY}:tab-B`);
      writeBeacon({ lastHeartbeat: now - 500, sessionId: 's-B', tabId: 'tab-B' }, BEACON_BASE_KEY);

      // 탭 A의 clean marker는 자기 per-tab 키에 그대로 보존됨.
      const a = readBeacon(`${BEACON_BASE_KEY}:tab-A`);
      expect(a!.cleanShutdownAt).toBe(now - 1_000);

      // 집계 판정: 살아있는 탭 B가 있으므로 크래시 아님.
      const r = evaluateBeaconStatus(now);
      expect(r.crashed).toBe(false);
    } finally {
      Date.now = origNow;
    }
  });

  test('모든 탭이 stale → crashed 로 집계', () => {
    const now = 1_000_000;
    writeBeacon(
      { lastHeartbeat: now - (BEACON_ALIVE_WINDOW_MS + 5_000), sessionId: 's-A', tabId: 'tab-A' },
      `${BEACON_BASE_KEY}:tab-A`,
    );
    writeBeacon(
      { lastHeartbeat: now - (BEACON_ALIVE_WINDOW_MS + 9_000), sessionId: 's-B', tabId: 'tab-B' },
      `${BEACON_BASE_KEY}:tab-B`,
    );
    const r = evaluateBeaconStatus(now);
    expect(r.crashed).toBe(true);
    expect(r.status).toBe('crashed');
  });

  test('한 탭이라도 살아있으면(다른 탭 stale) 크래시 아님', () => {
    const now = 1_000_000;
    // tab-A: stale(크래시처럼 보임)
    writeBeacon(
      { lastHeartbeat: now - (BEACON_ALIVE_WINDOW_MS + 5_000), sessionId: 's-A', tabId: 'tab-A' },
      `${BEACON_BASE_KEY}:tab-A`,
    );
    // tab-B: fresh(살아있음)
    writeBeacon({ lastHeartbeat: now - 500, sessionId: 's-B', tabId: 'tab-B' }, `${BEACON_BASE_KEY}:tab-B`);
    const r = evaluateBeaconStatus(now);
    expect(r.crashed).toBe(false);
  });

  test('clearBeacon()은 레거시 키 + 모든 per-tab 키를 정리', () => {
    writeBeacon({ lastHeartbeat: 1, sessionId: 's', tabId: 't' }, BEACON_BASE_KEY);
    writeBeacon({ lastHeartbeat: 1, sessionId: 's', tabId: 'tab-A' }, `${BEACON_BASE_KEY}:tab-A`);
    writeBeacon({ lastHeartbeat: 1, sessionId: 's', tabId: 'tab-B' }, `${BEACON_BASE_KEY}:tab-B`);
    clearBeacon();
    expect(localStorage.getItem(BEACON_BASE_KEY)).toBeNull();
    expect(localStorage.getItem(`${BEACON_BASE_KEY}:tab-A`)).toBeNull();
    expect(localStorage.getItem(`${BEACON_BASE_KEY}:tab-B`)).toBeNull();
  });

  test('레거시 단일 키만 있을 때 집계 결과는 단일 분류와 동일(하위호환)', () => {
    const now = 1_000_000;
    // stale 단일 키
    writeBeacon({ lastHeartbeat: now - (BEACON_ALIVE_WINDOW_MS + 1), sessionId: 's', tabId: 't' }, BEACON_BASE_KEY);
    const r = evaluateBeaconStatus(now);
    expect(r.status).toBe('crashed');
    expect(r.reason).toBe('stale-heartbeat');
  });

  // [데드존 수리 회귀가드 2026-06-11] alive 경계(35s)와 crashed 경계가 통일됐는지 — (30s,35s] band.
  // 이전엔 isAlive 윈도우 35s vs Case4 임계 30s 불일치로 30001~35000ms 데드존이 있어, 이 band 의
  // beacon 이 alive 로 라우팅된 뒤 crashed 로 뒤집혀 clean 형제가 있어도 거짓 RecoveryDialog 가 떴다.
  test('데드존 band (30s<age<=35s) — alive ⟺ clean 일관 (거짓 crashed 없음)', () => {
    const now = 1_000_000;
    for (const age of [30_001, 32_000, 34_999, 35_000]) {
      clearBeacon();
      writeBeacon({ lastHeartbeat: now - age, sessionId: 's', tabId: 't' }, BEACON_BASE_KEY);
      const r = evaluateBeaconStatus(now);
      expect(r.crashed).toBe(false); // band 전체에서 alive=clean (거짓 crashed 금지)
    }
    // 경계 직후(35001)는 crashed
    clearBeacon();
    writeBeacon({ lastHeartbeat: now - 35_001, sessionId: 's', tabId: 't' }, BEACON_BASE_KEY);
    expect(evaluateBeaconStatus(now).crashed).toBe(true);
  });

  test('데드존 band 탭이 clean 형제를 가려 거짓 RecoveryDialog 띄우지 않음', () => {
    const now = 1_000_000;
    // tab-A: clean 종료(1s 전), tab-B: band(32s) — band 탭이 clean 을 가로채면 안 됨
    writeBeacon(
      { lastHeartbeat: now - 1_000, cleanShutdownAt: now - 1_000, sessionId: 's-A', tabId: 'tab-A' },
      `${BEACON_BASE_KEY}:tab-A`,
    );
    writeBeacon(
      { lastHeartbeat: now - 32_000, sessionId: 's-B', tabId: 'tab-B' },
      `${BEACON_BASE_KEY}:tab-B`,
    );
    expect(evaluateBeaconStatus(now).crashed).toBe(false);
  });
});
