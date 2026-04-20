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
/** 이전 세션 흔적 탐지용 LS 키 (journal.ts:53 SESSION_KEY와 일치). */
const SESSION_PRIOR_KEY = 'noa_studio_session';

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

export function readBeacon(): BeaconPayload | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LS_KEY_BEACON);
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

export function writeBeacon(payload: BeaconPayload): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LS_KEY_BEACON, JSON.stringify(payload));
  } catch (err) {
    logger.warn('save-engine:beacon', 'writeBeacon 실패', err);
  }
}

export function clearBeacon(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(LS_KEY_BEACON);
  } catch {
    /* noop */
  }
}

/**
 * M1.2 — 정상 종료 마커 기록.
 * beforeunload/pagehide 리스너에서 호출. 기존 beacon이 있으면 cleanShutdownAt만
 * 추가, 없으면 최소 페이로드로 신규 기록.
 */
export function markCleanShutdown(now: number = Date.now()): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = readBeacon();
    const next: BeaconPayload = existing
      ? { ...existing, cleanShutdownAt: now, lastHeartbeat: now }
      : { lastHeartbeat: now, sessionId: '', tabId: '', cleanShutdownAt: now };
    writeBeacon(next);
  } catch (err) {
    logger.warn('save-engine:beacon', 'markCleanShutdown 실패', err);
  }
}

// ============================================================
// PART 5 — Status evaluator (M1.2 4-state)
// ============================================================

/**
 * 부팅 시 beacon + 이전 세션 흔적을 보고 4-state 분류.
 * @param now 시뮬레이션용 override. default Date.now().
 */
export function evaluateBeaconStatus(now: number = Date.now()): CrashEstimate {
  const beacon = readBeacon();
  const hadPriorSession = hasPriorSessionTrace();

  // Case 1 — beacon 전무 + 이전 세션 흔적 없음 → 최초 부팅
  if (!beacon && !hadPriorSession) {
    return { crashed: false, status: 'first-launch', reason: 'first-launch' };
  }

  // Case 2 — beacon 전무 + 이전 세션 흔적 있음 → LS 삭제 추정
  if (!beacon && hadPriorSession) {
    return { crashed: true, status: 'unknown', reason: 'lost-beacon' };
  }

  // 이하 beacon 존재 분기
  const b = beacon!;
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

  // Case 4 — heartbeat stale → 크래시 추정
  if (ageMs > BEACON_CRASH_THRESHOLD_MS) {
    return {
      crashed: true,
      status: 'crashed',
      reason: 'stale-heartbeat',
      lastHeartbeatAt: b.lastHeartbeat,
      ageMs,
    };
  }

  // Case 5 — heartbeat fresh + cleanShutdown 없음 → 크래시 추정 (최종 안전망)
  // 단, age가 매우 작으면(< 5초) 이제 막 시작한 탭일 수 있으니 'normal' 처리.
  if (ageMs < 5_000) {
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

  const write = (): void => {
    if (stopped) return;
    writeBeacon({ lastHeartbeat: Date.now(), sessionId, tabId });
  };

  const writeCleanShutdown = (): void => {
    if (typeof localStorage === 'undefined') return;
    try {
      const now = Date.now();
      writeBeacon({
        lastHeartbeat: now,
        sessionId,
        tabId,
        cleanShutdownAt: now,
      });
    } catch (err) {
      logger.warn('save-engine:beacon', 'writeCleanShutdown 실패', err);
    }
  };

  // 초기 1회 기록 + 주기 스케줄
  write();
  const timer = setInterval(write, BEACON_HEARTBEAT_INTERVAL_MS);

  // 정상 종료 포착 리스너들
  const visListener = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      writeCleanShutdown();
    }
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
