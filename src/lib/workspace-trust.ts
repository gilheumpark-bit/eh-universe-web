/**
 * workspace-trust — Whitelist-based trust store for external resources.
 *
 * Novel Studio can import plugins, world JSON, and other artifacts from
 * arbitrary URLs. To reduce supply-chain risk, any external origin must
 * be explicitly trusted by the user before the host will load code or
 * large blobs from it. Default answer is ALWAYS deny.
 *
 * Persistence: `localStorage["noa_workspace_trust"]` → JSON array of
 * {@link TrustedSource}. No server sync — trust is per-device.
 *
 * @module workspace-trust
 * @example
 * import { getTrustLevel, trustSource, listTrustedSources } from '@/lib/workspace-trust';
 *
 * if (getTrustLevel(pluginUrl) !== 'trusted') {
 *   // Prompt user via WorkspaceTrustDialog first.
 *   return;
 * }
 * await loadPlugin(pluginUrl);
 */

import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Public types + constants
// ============================================================

export type TrustLevel = 'trusted' | 'restricted' | 'unknown';

export interface TrustedSource {
  /** Normalized origin, e.g. `https://example.com`. No path, no trailing slash. */
  url: string;
  level: TrustLevel;
  /** Milliseconds since epoch. */
  addedAt: number;
  addedBy: 'user' | 'system';
  /** Optional free-form note shown in the Settings UI. */
  note?: string;
}

const STORAGE_KEY = 'noa_workspace_trust';

/**
 * Built-in origins that are always trusted, even before the user
 * explicitly adds them — covers the app's own servers and the gateway.
 * Kept short on purpose.
 */
const SYSTEM_TRUSTED: readonly string[] = [
  'https://api.ehuniverse.com',
  'https://ehuniverse.com',
];

// IDENTITY_SEAL: PART-1 | role=types+constants | inputs=none | outputs=types

// ============================================================
// PART 2 — normalize + storage (pure + defensive)
// ============================================================

/**
 * Normalize arbitrary user input to a canonical origin string.
 *
 * Accepts full URLs, protocol-relative (`//example.com`), or bare hosts
 * (`example.com`). Paths, query, and hash are stripped. Returns empty
 * string on unparseable input — callers MUST treat empty as invalid.
 *
 * @param input Raw user input or URL.
 * @returns Canonical `<protocol>//<host>[:port]` or empty string.
 */
export function normalizeOrigin(input: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) return '';
  let s = input.trim();
  // Bare host shorthand: prepend https
  if (!/^(?:[a-z]+:)?\/\//i.test(s) && !/^[a-z]+:/i.test(s)) {
    s = 'https://' + s;
  } else if (s.startsWith('//')) {
    s = 'https:' + s;
  }
  try {
    const u = new URL(s);
    // Only http(s) and file are sensible trust scopes — reject others.
    const protocol = u.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return '';
    return `${protocol}//${u.host}`;
  } catch (err) {
    logger.warn('workspace-trust', `normalizeOrigin failed for "${input}"`, err);
    return '';
  }
}

/**
 * Read the persisted trust list. Returns [] on SSR, corrupted JSON,
 * or any storage error — never throws.
 */
function readStore(): TrustedSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: TrustedSource[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.url !== 'string' || typeof e.level !== 'string') continue;
      if (e.level !== 'trusted' && e.level !== 'restricted' && e.level !== 'unknown') continue;
      const addedBy = e.addedBy === 'user' || e.addedBy === 'system' ? e.addedBy : 'user';
      const addedAt = typeof e.addedAt === 'number' && Number.isFinite(e.addedAt) ? e.addedAt : Date.now();
      out.push({
        url: e.url,
        level: e.level,
        addedAt,
        addedBy,
        note: typeof e.note === 'string' ? e.note : undefined,
      });
    }
    return out;
  } catch (err) {
    logger.warn('workspace-trust', 'readStore failed', err);
    return [];
  }
}

function writeStore(entries: TrustedSource[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    logger.warn('workspace-trust', 'writeStore failed', err);
  }
}

// IDENTITY_SEAL: PART-2 | role=normalize+storage | inputs=string | outputs=origin|store

// ============================================================
// PART 3 — Public API (query + mutate)
// ============================================================

/**
 * Current trust level for a URL.
 *
 * Precedence: SYSTEM_TRUSTED → user-added `trusted` → user-added
 * `restricted` → `unknown` (default). SSR / bad input returns
 * `'unknown'` — callers must treat as untrusted.
 *
 * @param url Full URL or origin.
 * @returns 'trusted' | 'restricted' | 'unknown'
 */
export function getTrustLevel(url: string): TrustLevel {
  const origin = normalizeOrigin(url);
  if (!origin) return 'unknown';
  if (SYSTEM_TRUSTED.includes(origin)) return 'trusted';
  const entries = readStore();
  const match = entries.find(e => e.url === origin);
  return match?.level ?? 'unknown';
}

/**
 * Mark a URL's origin as trusted.
 *
 * Upserts: an existing entry for the same origin is overwritten with
 * `level=trusted` and a fresh `addedAt`. No-op on unparseable input.
 *
 * @param url URL or origin to trust.
 * @param note Optional user-visible annotation.
 */
export function trustSource(url: string, note?: string): void {
  const origin = normalizeOrigin(url);
  if (!origin) {
    logger.warn('workspace-trust', `trustSource: rejecting invalid url "${url}"`);
    return;
  }
  const entries = readStore().filter(e => e.url !== origin);
  entries.push({
    url: origin,
    level: 'trusted',
    addedAt: Date.now(),
    addedBy: 'user',
    note: note && note.trim().length > 0 ? note.trim() : undefined,
  });
  writeStore(entries);
}

/**
 * Restrict an origin (explicit deny that survives refresh).
 * Useful for "I never want this prompt again" flows.
 */
export function restrictSource(url: string, note?: string): void {
  const origin = normalizeOrigin(url);
  if (!origin) return;
  const entries = readStore().filter(e => e.url !== origin);
  entries.push({
    url: origin,
    level: 'restricted',
    addedAt: Date.now(),
    addedBy: 'user',
    note: note && note.trim().length > 0 ? note.trim() : undefined,
  });
  writeStore(entries);
}

/**
 * Remove any persisted record for a URL. Trust reverts to `'unknown'`
 * (or `'trusted'` if the origin is in SYSTEM_TRUSTED).
 *
 * @param url URL or origin to forget.
 */
export function revokeTrust(url: string): void {
  const origin = normalizeOrigin(url);
  if (!origin) return;
  const entries = readStore().filter(e => e.url !== origin);
  writeStore(entries);
}

/**
 * Snapshot of all persisted trust entries, newest first.
 *
 * The returned list is a copy — mutating it does not affect storage.
 *
 * @returns Sorted trust list. May be empty.
 */
export function listTrustedSources(): TrustedSource[] {
  return readStore().slice().sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * Wipe ALL persisted trust entries. Typically exposed via a Settings
 * "Clear all trust" button. System-trusted origins remain trusted
 * because they are never stored.
 */
export function clearAllTrust(): void {
  writeStore([]);
}

// IDENTITY_SEAL: PART-3 | role=public-api | inputs=url,note | outputs=TrustLevel|void
