// ============================================================
// PART 1 — Module overview (Spec 7.1 Step 2 + M1.2 extension)
// ============================================================
//
// Beacon = "정상 종료 마커". localStorage에 주기 heartbeat를 찍어
// 부팅 시 크래시 여부를 판정한다. M1.2에서 4상태 분류 + clean shutdown
// 마커를 추가해 "정상 종료 vs 크래시 vs 신규 부팅" 구분을 정확화했다.
//
// 판정 규칙 (M1.2 v2):
//   beacon.cleanShutdownAt 이 존재하고 heartbeat 이후 → 'clean'
//   beacon 없음 + 이전 sessionId 흔적 없음 → 'first-launch'
//   beacon 없음 + 이전 sessionId 흔적 있음 → 'unknown' (LS 삭제 추정)
//   beacon 있지만 stale (heartbeat 30s+) + cleanShutdown 없음 → 'crashed'
//   beacon 있고 fresh → 'crashed'도 'clean'도 아님 (정상 → 'clean'로 간주)
//
// 이전 sessionId 흔적은 `noa_studio_session` 키 존재로 판단 (journal/session.ts 규칙).

import { logger } from '@/lib/logger';
import { LS_KEY_BEACON } from './localstorage-adapter';

// ============================================================
// PART 2 — Thresholds & keys (M1.2 upgrade)
// ============================================================

/** heartbeat 간격 — 30초 (M1.2). */
export const BEACON_HEARTBEAT_INTERVAL_MS = 30_000;
/** heartbeat staleness 기준 — 30초 초과시 크래시 추정. */
export const BEACON_CRASH_THRESHOLD_MS = 30_000;
/**
 * 살아있는 탭 판정 유예(grace) — heartbeat 직후 setInterval 지터·tab throttling·
 * 직렬화 지연을 흡수하기 위한 여유. high #11 보장("살아있는 탭이 있으면 크래시 아님")이
 * heartbeat 직후 5초가 아니라 *한 heartbeat 주기 전체* 동안 성립하도록, alive/fresh
 * 윈도우를 BEACON_HEARTBEAT_INTERVAL_MS 기준으로 도출한다.
 */
export const BEACON_ALIVE_GRACE_MS = 5_000;
/**
 * 살아있는/fresh 탭 윈도우 — 한 heartbeat 주기 + grace.
 * 진짜 살아있는 탭의 가장 최신 heartbeat 는 0~30초 전이므로(30초마다 갱신),
 * 5초 하드코딩으로는 주기의 ~83%(5s<=age<=30s) 동안 살아있는 탭을 크래시로 오판했다(high #11).
 * 이 윈도우를 interval+grace 로 도출해 주기 전체에서 보장이 성립하게 한다.
 */
export const BEACON_ALIVE_WINDOW_MS = BEACON_HEARTBEAT_INTERVAL_MS + BEACON_ALIVE_GRACE_MS;
/** 이전 세션 흔적 탐지용 LS 키 (journal.ts:53 SESSION_KEY와 일치). */
const SESSION_PRIOR_KEY = 'noa_studio_session';

/**
 * 멀티탭 분리용 per-tab beacon 키 구분자.
 * 실제 탭별 키 = `${LS_KEY_BEACON}:${tabId}`. 살아있는 탭이 각자의 키에 heartbeat를
 * 찍으므로, 한 탭의 주기 write가 다른 탭의 cleanShutdownAt를 지우는 클로버링이 사라진다
 * (high #11). 레거시 단일 키 `LS_KEY_BEACON`도 호환 위해 계속 읽고 쓴다.
 */
const BEACON_TAB_KEY_SEP = ':';

/** 특정 탭의 beacon LS 키. */
function beaconKeyForTab(tabId: string): string {
  return `${LS_KEY_BEACON}${BEACON_TAB_KEY_SEP}${tabId}`;
}

// ============================================================
// PART 3 — Types (M1.2 4-state)
// ============================================================

/**
 * BeaconStatus — 부팅 시점에 판정되는 세션 종료 상태.
 *   clean         : 정상 종료 (beforeunload/pagehide 캡처 성공)
 *   crashed       : 비정상 종료 추정 (heartbeat stale OR clean marker 없음)
 *   unknown       : 판정 불가 (LS 삭제 + journal 상태 있음 등)
 *   first-launch  : 최초 부팅 (이전 흔적 없음)
 */
export type BeaconStatus = 'clean' | 'crashed' | 'unknown' | 'first-launch';

export interface BeaconPayload {
  /** 마지막 heartbeat 시각 (ms). */
  lastHeartbeat: number;
  /** 현재 탭의 논리 session id. */
  sessionId: string;
  /** 현재 탭의 nodeId (HLC tabId). */
  tabId: string;
  /**
   * beforeunload/pagehide에서 설정되는 정상 종료 마커 (ms). undefined면
   * 정상 종료 캡처에 실패했다고 간주(= 크래시 추정).
   */
  cleanShutdownAt?: number;
}

/**
 * 부팅 시 산출되는 상세 평가.
 * `crashed` 필드는 legacy 호출자(recovery.ts 기존 경로)와의 호환을 위해 유지.
 */
export interface CrashEstimate {
  /** legacy boolean — status !== 'clean' && status !== 'first-launch' */
  crashed: boolean;
  /** M1.2 신규 — 4-state 분류 */
  status: BeaconStatus;
  /** 사유(로그/UI 표시용) */
  reason:
    | 'no-beacon'
    | 'stale-heartbeat'
    | 'clean-shutdown'
    | 'first-launch'
    | 'lost-beacon'
    | 'normal';
  /** 마지막 heartbeat 시각 (있을 경우) */
  lastHeartbeatAt?: number;
  /** heartbeat 이후 경과 ms (있을 경우) */
  ageMs?: number;
  /** 정상 종료가 찍혀 있으면 그 시각 */
  cleanShutdownAt?: number;
}

// ============================================================
// PART 4 — Read / write / clear
// ============================================================

/**
 * beacon 읽기. key 생략 시 레거시 단일 키(LS_KEY_BEACON).
 * 특정 탭 beacon은 readBeacon(beaconKeyForTab(tabId))로 읽는다.
 */
export function readBeacon(key: string = LS_KEY_BEACON): BeaconPayload | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BeaconPayload>;
    if (typeof parsed.lastHeartbeat !== 'number') return null;
    return {
      lastHeartbeat: parsed.lastHeartbeat,
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : '',
      tabId: typeof parsed.tabId === 'string' ? parsed.tabId : '',
      cleanShutdownAt:
        typeof parsed.cleanShutdownAt === 'number' ? parsed.cleanShutdownAt : undefined,
    };
  } catch (err) {
    logger.warn('save-engine:beacon', 'readBeacon 실패', err);
    return null;
  }
}

/**
 * beacon 쓰기. key 생략 시 레거시 단일 키.
 * 멀티탭에서는 startHeartbeat가 탭별 키로 분리 기록한다.
 */
export function writeBeacon(payload: BeaconPayload, key: string = LS_KEY_BEACON): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    logger.warn('save-engine:beacon', 'writeBeacon 실패', err);
  }
}

/** beacon 제거. key 생략 시 레거시 단일 키 + 모든 per-tab 키까지 정리. */
export function clearBeacon(key?: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (key) {
      localStorage.removeItem(key);
      return;
    }
    // 레거시 키 + 모든 per-tab 키 정리(테스트/리셋 안전성).
    localStorage.removeItem(LS_KEY_BEACON);
    for (const k of listTabBeaconKeys()) {
      try { localStorage.removeItem(k); } catch { /* noop */ }
    }
  } catch {
    /* noop */
  }
}

/** 현재 LS에 존재하는 per-tab beacon 키 전수. */
function listTabBeaconKeys(): string[] {
  const out: string[] = [];
  try {
    if (typeof localStorage === 'undefined') return out;
    const prefix = `${LS_KEY_BEACON}${BEACON_TAB_KEY_SEP}`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
  } catch { /* noop */ }
  return out;
}

/**
 * 레거시 키 + 모든 per-tab 키의 beacon을 전부 수집.
 * 멀티탭 집계 판정에 사용. 중복 tabId는 per-tab 키를 우선(살아있는 탭의 최신 상태).
 */
function readAllBeacons(): BeaconPayload[] {
  const out: BeaconPayload[] = [];
  const legacy = readBeacon(LS_KEY_BEACON);
  if (legacy) out.push(legacy);
  for (const k of listTabBeaconKeys()) {
    const b = readBeacon(k);
    if (b) out.push(b);
  }
  return out;
}

/**
 * M1.2 — 정상 종료 마커 기록.
 * beforeunload/pagehide 리스너에서 호출. 기존 beacon이 있으면 cleanShutdownAt만
 * 추가, 없으면 최소 페이로드로 신규 기록.
 */
export function markCleanShutdown(now: number = Date.now(), key: string = LS_KEY_BEACON): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = readBeacon(key);
    const next: BeaconPayload = existing
      ? { ...existing, cleanShutdownAt: now, lastHeartbeat: now }
      : { lastHeartbeat: now, sessionId: '', tabId: '', cleanShutdownAt: now };
    writeBeacon(next, key);
  } catch (err) {
    logger.warn('save-engine:beacon', 'markCleanShutdown 실패', err);
  }
}

// ============================================================
// PART 5 — Status evaluator (M1.2 4-state)
// ============================================================

/**
 * 단일 beacon 1개를 4-state로 분류. evaluateBeaconStatus의 코어 규칙.
 * (멀티탭 집계는 evaluateBeaconStatus가 이 결과들을 모아 결정.)
 */
function classifySingleBeacon(b: BeaconPayload, now: number): CrashEstimate {
  const ageMs = now - b.lastHeartbeat;

  // Case 3 — 정상 종료 마커 존재 → clean
  if (typeof b.cleanShutdownAt === 'number' && b.cleanShutdownAt >= b.lastHeartbeat) {
    return {
      crashed: false,
      status: 'clean',
      reason: 'clean-shutdown',
      lastHeartbeatAt: b.lastHeartbeat,
      ageMs,
      cleanShutdownAt: b.cleanShutdownAt,
    };
  }

  // Case 4 — heartbeat stale → 크래시 추정.
  // [W2-save 데드존 수리 2026-06-11] 임계를 alive 윈도우(interval+grace=35s)와 *동일*하게 둔다.
  //   isAliveBeacon/Case 5 는 ageMs<=BEACON_ALIVE_WINDOW_MS 를 alive 로 보는데 Case 4 가
  //   30s(BEACON_CRASH_THRESHOLD_MS) 초과를 crashed 로 보면 (30s,35s] 데드존이 생겨, 같은
  //   age 의 beacon 이 isAlive=true 로 라우팅된 뒤 classify 가 crashed 로 뒤집혀 clean 형제가
  //   있어도 거짓 RecoveryDialog 가 뜬다(독립 판독 재현). alive 경계와 crashed 경계를 35s 로 통일.
  if (ageMs > BEACON_ALIVE_WINDOW_MS) {
    return {
      crashed: true,
      status: 'crashed',
      reason: 'stale-heartbeat',
      lastHeartbeatAt: b.lastHeartbeat,
      ageMs,
    };
  }

  // Case 5 — heartbeat 가 한 주기 안(fresh) + cleanShutdown 없음 → 정상(살아있는/막 시작한 탭).
  // 진짜 살아있는 탭은 30초마다 heartbeat 를 찍으므로 가장 최신 값이 0~30초 전이다.
  // 5초 하드코딩이면 주기의 ~83%(5s<=age<=30s) 동안 살아있는 탭을 크래시로 오판했다(high #11).
  // 윈도우를 BEACON_ALIVE_WINDOW_MS(=interval+grace)로 도출해 주기 전체에서 정상으로 본다.
  // (Case 4 에서 30초+ stale 은 이미 crashed 로 걸러졌다.)
  if (ageMs <= BEACON_ALIVE_WINDOW_MS) {
    return {
      crashed: false,
      status: 'clean',
      reason: 'normal',
      lastHeartbeatAt: b.lastHeartbeat,
      ageMs,
    };
  }

  return {
    crashed: true,
    status: 'crashed',
    reason: 'no-beacon',
    lastHeartbeatAt: b.lastHeartbeat,
    ageMs,
  };
}

/**
 * beacon이 "현재 살아있는 탭"으로 보이는지 — fresh heartbeat.
 * 살아있는 탭은 BEACON_HEARTBEAT_INTERVAL_MS(30초)마다 heartbeat 를 찍으므로 가장 최신
 * 값이 0~30초 전이다. 5초 하드코딩이면 주기의 ~83%(5s<=age<=30s) 동안 살아있는 탭을
 * 죽은 것으로 오판해 high #11 보장이 깨졌다. 윈도우를 interval+grace 로 도출한다.
 */
function isAliveBeacon(b: BeaconPayload, now: number): boolean {
  const ageMs = now - b.lastHeartbeat;
  return ageMs >= 0 && ageMs <= BEACON_ALIVE_WINDOW_MS && typeof b.cleanShutdownAt !== 'number';
}

/**
 * 부팅 시 beacon + 이전 세션 흔적을 보고 4-state 분류.
 *
 * 멀티탭 안전(high #11): 레거시 단일 키뿐 아니라 모든 per-tab beacon 키를 집계한다.
 *   - 살아있는 탭(fresh heartbeat)이 하나라도 있으면 → 앱이 동작 중 → 크래시 아님(clean).
 *     (한 탭의 정상 종료 마커가 다른 살아있는 탭을 'clean'으로 오판하거나, 한 탭의
 *      주기 write가 다른 탭의 cleanShutdownAt를 지우는 클로버링이 더 이상 영향을 못 줌.)
 *   - 살아있는 탭이 없으면 가장 유리한(우선순위: clean > 그 외) 단일 분류를 채택.
 *
 * beacon이 레거시 단일 키 하나뿐일 때는 집계가 그 1개 분류와 정확히 동일하다(하위호환).
 *
 * @param now 시뮬레이션용 override. default Date.now().
 */
export function evaluateBeaconStatus(now: number = Date.now()): CrashEstimate {
  const beacons = readAllBeacons();
  const hadPriorSession = hasPriorSessionTrace();

  // Case 1 — beacon 전무 + 이전 세션 흔적 없음 → 최초 부팅
  if (beacons.length === 0 && !hadPriorSession) {
    return { crashed: false, status: 'first-launch', reason: 'first-launch' };
  }

  // Case 2 — beacon 전무 + 이전 세션 흔적 있음 → LS 삭제 추정
  if (beacons.length === 0 && hadPriorSession) {
    return { crashed: true, status: 'unknown', reason: 'lost-beacon' };
  }

  // 살아있는 탭(fresh heartbeat)이 하나라도 있으면 앱은 동작 중 → 크래시 아님.
  // 가장 최근 heartbeat를 가진 살아있는 탭을 대표로 보고한다.
  const alive = beacons
    .filter((b) => isAliveBeacon(b, now))
    .sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
  if (alive.length > 0) {
    return classifySingleBeacon(alive[0], now);
  }

  // 살아있는 탭이 없을 때: 각 beacon을 분류해 가장 유리한 결과를 채택.
  // 우선순위: clean(crashed=false) > crashed. clean이 여럿이면 cleanShutdownAt/heartbeat
  // 최신을, crashed만 있으면 heartbeat 최신을 대표로 쓴다.
  const classified = beacons.map((b) => ({ b, est: classifySingleBeacon(b, now) }));
  const cleanOnes = classified.filter((c) => !c.est.crashed);
  if (cleanOnes.length > 0) {
    cleanOnes.sort((x, y) => (y.b.cleanShutdownAt ?? y.b.lastHeartbeat) - (x.b.cleanShutdownAt ?? x.b.lastHeartbeat));
    return cleanOnes[0].est;
  }
  classified.sort((x, y) => y.b.lastHeartbeat - x.b.lastHeartbeat);
  return classified[0].est;
}

/**
 * @deprecated M1.2 — evaluateBeaconStatus로 대체. 이전 recovery.ts 호환용 shim.
 * 동작은 동일하되 4-state를 boolean으로 축소해 반환.
 */
export function estimateCrash(now: number = Date.now()): CrashEstimate {
  return evaluateBeaconStatus(now);
}

// ============================================================
// PART 6 — Heartbeat scheduler (M1.2 30s + cleanShutdown)
// ============================================================

export interface HeartbeatHandle {
  /** 스케줄 중단 + 리스너 해제. */
  stop(): void;
  /** 즉시 1회 기록. */
  flush(): void;
  /** beforeunload/pagehide에서 호출할 clean shutdown 마커 기록. */
  markCleanShutdown(): void;
}

/**
 * M1.2 — 주기 heartbeat + 정상 종료 포착.
 *   - 30초마다 lastHeartbeat 갱신
 *   - visibilitychange(hidden)/pagehide/beforeunload 에 즉시 clean shutdown 기록
 *   - stop() 호출 시 cleanShutdown 자동 기록(탭이 명시적으로 훅 해제 → 정상 종료)
 */
export function startHeartbeat(sessionId: string, tabId: string): HeartbeatHandle {
  let stopped = false;
  // 멀티탭 분리(high #11): 이 탭 전용 키. 다른 탭의 write가 이 키를 건드리지 않으므로
  // cleanShutdownAt 클로버링이 사라진다. 레거시 단일 키에도 함께 써서 하위호환 유지.
  const tabKey = beaconKeyForTab(tabId);

  const write = (): void => {
    if (stopped) return;
    const payload: BeaconPayload = { lastHeartbeat: Date.now(), sessionId, tabId };
    writeBeacon(payload, tabKey);
    writeBeacon(payload, LS_KEY_BEACON);
  };

  const writeCleanShutdown = (): void => {
    if (typeof localStorage === 'undefined') return;
    try {
      const now = Date.now();
      const payload: BeaconPayload = {
        lastHeartbeat: now,
        sessionId,
        tabId,
        cleanShutdownAt: now,
      };
      // 이 탭 키에만 clean 마커를 찍는다 — 다른 살아있는 탭의 상태는 건드리지 않는다.
      writeBeacon(payload, tabKey);
      writeBeacon(payload, LS_KEY_BEACON);
    } catch (err) {
      logger.warn('save-engine:beacon', 'writeCleanShutdown 실패', err);
    }
  };

  // 초기 1회 기록 + 주기 스케줄
  write();
  const timer = setInterval(write, BEACON_HEARTBEAT_INTERVAL_MS);

  // 정상 종료 포착 리스너들
  // [fix] visibilitychange(hidden)는 탭 전환·최소화·OS 백그라운드 전환에서도 발생하므로
  //   신뢰할 수 있는 "정상 종료" 신호가 아니다. 여기서 cleanShutdown 마커를 찍으면
  //   백그라운드로 들어간 탭이 이후 크래시(OOM kill, OS의 백그라운드 탭 종료)로 죽어도
  //   'clean'으로 오분류된다. 실제 종료 신호인 pagehide/beforeunload 에만 마커를 남긴다.
  const visListener = (): void => {
    /* no-op: hidden 전환은 종료 신호가 아님 (위 주석 참조) */
  };
  const pagehideListener = (): void => writeCleanShutdown();
  const beforeUnloadListener = (): void => writeCleanShutdown();

  try {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visListener);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', pagehideListener);
      window.addEventListener('beforeunload', beforeUnloadListener);
    }
  } catch {
    /* noop */
  }

  return {
    stop(): void {
      stopped = true;
      clearInterval(timer);
      try {
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', visListener);
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener('pagehide', pagehideListener);
          window.removeEventListener('beforeunload', beforeUnloadListener);
        }
      } catch {
        /* noop */
      }
      // [C] 명시적 stop은 "정상 종료"로 분류 — clean marker 기록.
      writeCleanShutdown();
    },
    flush: write,
    markCleanShutdown: writeCleanShutdown,
  };
}

// ============================================================
// PART 7 — Helpers
// ============================================================

function hasPriorSessionTrace(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(SESSION_PRIOR_KEY) !== null;
  } catch {
    return false;
  }
}
