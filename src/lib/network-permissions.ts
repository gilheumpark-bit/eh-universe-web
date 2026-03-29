import type { PlanetRecord, UserRecord, Visibility } from "@/lib/network-types";

// ============================================================
// PART 1 - NETWORK PERMISSION HELPERS
// ============================================================

export function isAdmin(userRecord: UserRecord | null) {
  return userRecord?.role === "admin";
}

export function isPlanetOwner(userId: string | null | undefined, planet: PlanetRecord | null) {
  return Boolean(userId && planet && planet.ownerId === userId);
}

export function canManagePlanet(userId: string | null | undefined, userRecord: UserRecord | null, planet: PlanetRecord | null) {
  return isPlanetOwner(userId, planet) || isAdmin(userRecord);
}

export function canWritePlanetLog(userId: string | null | undefined, userRecord: UserRecord | null, planet: PlanetRecord | null) {
  return canManagePlanet(userId, userRecord, planet);
}

export function canCreateSettlement(userRecord: UserRecord | null) {
  return isAdmin(userRecord);
}

export function canViewVisibility(
  visibility: Visibility,
  options: { isAuthenticated: boolean; isOwner: boolean; isAdmin: boolean },
) {
  if (visibility === "public") return true;
  if (visibility === "members") return options.isAuthenticated || options.isOwner || options.isAdmin;
  return options.isOwner || options.isAdmin;
}

// IDENTITY_SEAL: PART-1 | role=permission helpers | inputs=user record and entity visibility | outputs=booleans
