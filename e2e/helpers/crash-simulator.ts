/**
 * E2E helpers for M1.2 crash recovery simulation.
 *
 * These helpers drive the localStorage tier of the save-engine directly so
 * Playwright can verify boot-time recovery behavior without needing the full
 * Studio wiring (FEATURE_JOURNAL_ENGINE is still off in Phase 1.2).
 *
 * Contract:
 *   - All helpers are called via `page.evaluate` so state is applied to the
 *     browser context.
 *   - `seedCleanBeacon` / `seedStaleBeacon` / `seedNoBeacon` set up the
 *     "last shutdown state" before reload so the recovery logic, when wired,
 *     observes it.
 *   - `corruptLocalStorageJournal` / `deleteIndexedDB` simulate adapter-level
 *     corruption; useful for degraded-mode regression tests in Phase 1.5.
 *
 * Not included: page.close() / OS SIGKILL simulation. Chromium's
 * `browserContext.close()` is the closest, and scenarios that rely on it are
 * marked `fixme('mobile — chromium only')` in the spec.
 */

import type { Page } from '@playwright/test';

// ============================================================
// PART 1 — Keys (mirror localstorage-adapter.ts)
// ============================================================

export const LS_KEY_BEACON = 'noa_journal_beacon';
export const LS_KEY_TIP = 'noa_journal_tip';
export const LS_PREFIX_ENTRY = 'noa_journal_entry_';
export const LS_PREFIX_TMP = 'noa_journal_tmp_';
export const SESSION_PRIOR_KEY = 'noa_studio_session';

// ============================================================
// PART 2 — Beacon seeding
// ============================================================

/**
 * Clean shutdown — cleanShutdownAt 마커가 있는 beacon.
 * 부팅 시 status='clean' → crashed=false.
 */
export async function seedCleanBeacon(page: Page, now = Date.now()): Promise<void> {
  await page.evaluate(
    ({ key, payload, sessionKey }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          lastHeartbeat: payload.lastHeartbeat,
          sessionId: payload.sessionId,
          tabId: payload.tabId,
          cleanShutdownAt: payload.cleanShutdownAt,
        }),
      );
      localStorage.setItem(sessionKey, payload.sessionId);
    },
    {
      key: LS_KEY_BEACON,
      sessionKey: SESSION_PRIOR_KEY,
      payload: {
        lastHeartbeat: now,
        cleanShutdownAt: now,
        sessionId: 'e2e-session',
        tabId: 'e2e-tab',
      },
    },
  );
}

/**
 * Stale beacon — heartbeat만 있고 30초+ 지남. cleanShutdown 없음 → status='crashed'.
 */
export async function seedStaleBeacon(page: Page, ageMs = 60_000): Promise<void> {
  const now = Date.now();
  await page.evaluate(
    ({ key, sessionKey, payload }) => {
      localStorage.setItem(key, JSON.stringify(payload));
      localStorage.setItem(sessionKey, payload.sessionId);
    },
    {
      key: LS_KEY_BEACON,
      sessionKey: SESSION_PRIOR_KEY,
      payload: {
        lastHeartbeat: now - ageMs,
        sessionId: 'e2e-session',
        tabId: 'e2e-tab',
      },
    },
  );
}

/**
 * No beacon + prior session trace → status='unknown' (LS 삭제 추정).
 */
export async function seedLostBeacon(page: Page): Promise<void> {
  await page.evaluate(
    ({ beaconKey, sessionKey }) => {
      localStorage.removeItem(beaconKey);
      localStorage.setItem(sessionKey, 'e2e-prior');
    },
    { beaconKey: LS_KEY_BEACON, sessionKey: SESSION_PRIOR_KEY },
  );
}

/**
 * No beacon + no session trace → status='first-launch'.
 */
export async function clearAllBeaconTraces(page: Page): Promise<void> {
  await page.evaluate(
    ({ beaconKey, sessionKey }) => {
      localStorage.removeItem(beaconKey);
      localStorage.removeItem(sessionKey);
    },
    { beaconKey: LS_KEY_BEACON, sessionKey: SESSION_PRIOR_KEY },
  );
}

// ============================================================
// PART 3 — Journal LS manipulation
// ============================================================

/**
 * Corrupt the journal tip pointer — simulates partial-write crash.
 */
export async function corruptJournalTip(page: Page): Promise<void> {
  await page.evaluate(
    ({ tipKey }) => {
      localStorage.setItem(tipKey, 'corrupted-nonexistent-id');
    },
    { tipKey: LS_KEY_TIP },
  );
}

/**
 * Clear entire localStorage journal surface.
 */
export async function wipeJournalLocalStorage(page: Page): Promise<void> {
  await page.evaluate(
    ({ prefixEntry, prefixTmp, tipKey, beaconKey }) => {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith(prefixEntry) ||
          k.startsWith(prefixTmp) ||
          k === tipKey ||
          k === beaconKey
        ) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) localStorage.removeItem(k);
    },
    {
      prefixEntry: LS_PREFIX_ENTRY,
      prefixTmp: LS_PREFIX_TMP,
      tipKey: LS_KEY_TIP,
      beaconKey: LS_KEY_BEACON,
    },
  );
}

// ============================================================
// PART 4 — IndexedDB deletion
// ============================================================

/**
 * Delete the noa_journal_v1 IndexedDB. Forces LS-tier fallback on next boot.
 */
export async function deleteIndexedDBJournal(page: Page): Promise<void> {
  await page.evaluate(async () => {
    try {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('noa_journal_v1');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    } catch {
      /* noop */
    }
  });
}

// ============================================================
// PART 5 — Readback helpers
// ============================================================

export interface BeaconReadback {
  raw: string | null;
  cleanShutdownAt: number | null;
  lastHeartbeat: number | null;
}

export async function readBeacon(page: Page): Promise<BeaconReadback> {
  return page.evaluate(({ key }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return { raw: null, cleanShutdownAt: null, lastHeartbeat: null };
    try {
      const parsed = JSON.parse(raw) as { cleanShutdownAt?: number; lastHeartbeat?: number };
      return {
        raw,
        cleanShutdownAt: parsed.cleanShutdownAt ?? null,
        lastHeartbeat: parsed.lastHeartbeat ?? null,
      };
    } catch {
      return { raw, cleanShutdownAt: null, lastHeartbeat: null };
    }
  }, { key: LS_KEY_BEACON });
}
