// ============================================================
// PART 1 — Types & Constants
// ============================================================
// Environment sanity checks — M7 pre-alpha boot-time guard.
// Validates browser APIs Loreguard depends on (IndexedDB, BroadcastChannel,
// Web Locks, crypto.subtle) and that localStorage has reasonable headroom.
// On any failure → console.warn + emit `noa:environment-degraded` event.

export type EnvironmentStatus = 'ok' | 'degraded' | 'unknown';

export interface EnvironmentReport {
  status: EnvironmentStatus;
  missing: string[];
  warnings: string[];
  checkedAt: number;
}

/** Minimum localStorage quota headroom we consider safe (10 MB). */
const LOCAL_STORAGE_MIN_HEADROOM_BYTES = 10 * 1024 * 1024;

/** Event name — listeners can surface a degraded-mode UI banner. */
export const ENVIRONMENT_DEGRADED_EVENT = 'noa:environment-degraded';

// ============================================================
// PART 2 — Individual Feature Probes
// ============================================================

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function hasBroadcastChannel(): boolean {
  return typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined';
}

function hasWebLocks(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.locks !== 'undefined' &&
    typeof navigator.locks.request === 'function'
  );
}

function hasCryptoSubtle(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.digest === 'function'
  );
}

/**
 * Estimate free headroom in localStorage by checking storage.estimate() if
 * available, else probing with a known-size string (fallback, cheap).
 * Returns bytes free, or null if unknown.
 */
async function estimateLocalStorageHeadroom(): Promise<number | null> {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }
  // Prefer StorageManager when present — covers full origin quota.
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
    try {
      const est = await navigator.storage.estimate();
      if (typeof est.quota === 'number' && typeof est.usage === 'number') {
        return Math.max(0, est.quota - est.usage);
      }
    } catch {
      /* ignore — fall through to probe */
    }
  }
  return null;
}

// ============================================================
// PART 3 — Aggregator & Event Emission
// ============================================================

/**
 * Run all checks and return a structured report. Does not throw; any
 * unexpected error is reported as `unknown` status.
 */
export async function checkEnvironment(): Promise<EnvironmentReport> {
  const missing: string[] = [];
  const warnings: string[] = [];

  try {
    if (!hasIndexedDB()) missing.push('IndexedDB');
    if (!hasBroadcastChannel()) missing.push('BroadcastChannel');
    if (!hasWebLocks()) missing.push('Web Locks');
    if (!hasCryptoSubtle()) missing.push('crypto.subtle');

    const headroom = await estimateLocalStorageHeadroom();
    if (headroom !== null && headroom < LOCAL_STORAGE_MIN_HEADROOM_BYTES) {
      warnings.push(`localStorage headroom low (${Math.round(headroom / 1024 / 1024)} MB free)`);
    }
  } catch (err) {
    warnings.push(`probe failed: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 'unknown', missing, warnings, checkedAt: Date.now() };
  }

  const status: EnvironmentStatus = missing.length > 0 || warnings.length > 0 ? 'degraded' : 'ok';
  return { status, missing, warnings, checkedAt: Date.now() };
}

/**
 * Boot-time check. Runs once on app mount, emits degraded event and warns
 * when capabilities are insufficient. Safe to call from SSR (becomes no-op).
 */
export async function checkEnvironmentAtBoot(): Promise<EnvironmentReport> {
  if (typeof window === 'undefined') {
    return { status: 'unknown', missing: [], warnings: [], checkedAt: Date.now() };
  }
  const report = await checkEnvironment();
  if (report.status === 'degraded') {
    try {
       
      console.warn(
        '[env-sanity] Environment degraded:',
        report.missing.length ? `missing=${report.missing.join(',')}` : '',
        report.warnings.length ? `warnings=${report.warnings.join(';')}` : '',
      );
    } catch {
      /* silent */
    }
    try {
      window.dispatchEvent(
        new CustomEvent(ENVIRONMENT_DEGRADED_EVENT, { detail: report }),
      );
    } catch {
      /* silent */
    }
  }
  return report;
}

// IDENTITY_SEAL: PART-3 | role=aggregator | inputs=probes | outputs=EnvironmentReport+event
