// ============================================================
// twentyone-modules/platform-profile-store.ts
// — M18 IDB CRUD wrapper.
//
// Platform profiles are READ-ONLY cache, populated by the commercial-license
// loader at first start. AGPL distribution ships an EMPTY cache — concrete
// 18-platform rule data is granted separately under commercial license.
// ============================================================

import type { PlatformProfile, PlatformMarket } from './types';
import {
  STORE_PLATFORM_PROFILES,
  putRecord,
  getRecord,
  listByIndex,
  listAll,
  deleteRecord,
} from './idb-store';
import { validatePlatformProfile } from './platform-adapter';

/**
 * Cache a platform profile (after validation).
 * Called by the commercial-license rule pack loader.
 */
export async function cachePlatformProfile(profile: PlatformProfile): Promise<PlatformProfile> {
  const validation = validatePlatformProfile(profile);
  if (!validation.ok) {
    const summary = validation.errors.map((e) => `${e.field}: ${e.reason}`).join('; ');
    throw new Error(`Invalid platform profile: ${summary}`);
  }
  return putRecord<PlatformProfile>(STORE_PLATFORM_PROFILES, profile);
}

/** Get a cached platform profile by platform_id (used as keyPath). */
export async function getPlatformProfile(platformId: string): Promise<PlatformProfile | undefined> {
  return getRecord<PlatformProfile>(STORE_PLATFORM_PROFILES, platformId);
}

/** List all cached profiles for a specific market. */
export async function listProfilesByMarket(market: PlatformMarket): Promise<PlatformProfile[]> {
  return listByIndex<PlatformProfile>(STORE_PLATFORM_PROFILES, 'by_market', market);
}

/** List all cached profiles across all markets. */
export async function listAllProfiles(): Promise<PlatformProfile[]> {
  return listAll<PlatformProfile>(STORE_PLATFORM_PROFILES);
}

/** Remove a single cached profile (e.g. on license expiry per platform). */
export async function removePlatformProfile(platformId: string): Promise<void> {
  return deleteRecord(STORE_PLATFORM_PROFILES, platformId);
}

/**
 * Check whether any commercial rule pack is loaded. Used by UI to render
 * "Commercial license required" placeholder when empty.
 */
export async function hasAnyPlatformProfile(): Promise<boolean> {
  const all = await listAllProfiles();
  return all.length > 0;
}
