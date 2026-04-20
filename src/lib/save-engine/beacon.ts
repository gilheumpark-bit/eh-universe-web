// ============================================================
// PART 1 — Beacon (Spec 7.1 Step 2)
// ============================================================
//
// 정상 종료 판정 — localStorage['noa_journal_beacon'] 에 lastHeartbeat ms.
// 60초 이상 간격이면 크래시 추정. 없으면 크래시 또는 최초 부팅.

import { logger } from '@/lib/logger';
import { LS_KEY_BEACON } from './localstorage-adapter';

export const BEACON_CRASH_THRESHOLD_MS = 60_000;
export const BEACON_HEARTBEAT_INTERVAL_MS = 10_000;

interface BeaconPayload {
  lastHeartbeat: number;
  sessionId: string;
  tabId: string;
}

// ============================================================
// PART 2 — Read / write
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
  } catch { /* noop */ }
}

// ============================================================
// PART 3 — Crash estimation (Spec 7.1 Step 2)
// ============================================================

export interface CrashEstimate {
  crashed: boolean;
  reason: 'no-beacon' | 'stale-heartbeat' | 'normal';
  lastHeartbeatAt?: number;
  ageMs?: number;
}

export function estimateCrash(now: number = Date.now()): CrashEstimate {
  const beacon = readBeacon();
  if (!beacon) {
    return { crashed: true, reason: 'no-beacon' };
  }
  const ageMs = now - beacon.lastHeartbeat;
  if (ageMs > BEACON_CRASH_THRESHOLD_MS) {
    return { crashed: true, reason: 'stale-heartbeat', lastHeartbeatAt: beacon.lastHeartbeat, ageMs };
  }
  return { crashed: false, reason: 'normal', lastHeartbeatAt: beacon.lastHeartbeat, ageMs };
}

// ============================================================
// PART 4 — Heartbeat scheduler
// ============================================================

export interface HeartbeatHandle {
  stop(): void;
  flush(): void;
}

/**
 * 10초 간격으로 beacon 갱신. visibilitychange / pagehide 에도 즉시 flush.
 */
export function startHeartbeat(sessionId: string, tabId: string): HeartbeatHandle {
  let stopped = false;
  const write = () => {
    if (stopped) return;
    writeBeacon({ lastHeartbeat: Date.now(), sessionId, tabId });
  };
  write();
  const timer = setInterval(write, BEACON_HEARTBEAT_INTERVAL_MS);

  const visListener = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') write();
  };
  const pagehideListener = () => write();

  try {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visListener);
    if (typeof window !== 'undefined') window.addEventListener('pagehide', pagehideListener);
  } catch { /* noop */ }

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      try { if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visListener); } catch { /* noop */ }
      try { if (typeof window !== 'undefined') window.removeEventListener('pagehide', pagehideListener); } catch { /* noop */ }
    },
    flush: write,
  };
}
