import { getDb } from "@/lib/firebase";
import {
  type PlanetStatus, type UserRecord,
} from "@/lib/network-types";

// ============================================================
// PART 1 - SHARED HELPERS
// ============================================================

import { collectionName } from '@/lib/firebase';

export const COLLECTIONS = {
  users: collectionName("users"),
  planets: collectionName("planets"),
  posts: collectionName("posts"),
  settlements: collectionName("settlements"),
  comments: collectionName("comments"),
  reactions: collectionName("reactions"),
  reports: collectionName("reports"),
};

export function requireDb() {
  const firestore = getDb();
  if (!firestore) {
    throw new Error("Firestore is not available in this environment.");
  }
  return firestore;
}

export function nowIso() {
  return new Date().toISOString();
}

export function clampNullable(value: number | null | undefined, min: number, max: number) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(min, Math.min(max, value));
}

export function normalizeText(value: string | undefined | null) {
  return (value ?? "").trim();
}

export function normalizeOptionalText(value: string | undefined | null) {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeStringArray(values: string[] | undefined | null, maxLength: number) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  ).slice(0, maxLength);
}

export function summarizeContent(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= 180) return compact;
  return `${compact.slice(0, 177)}...`;
}

export function buildDefaultUserRecord(userId: string, nickname?: string | null): UserRecord {
  const timestamp = nowIso();
  return {
    id: userId,
    nickname: normalizeText(nickname) || `Explorer-${userId.slice(0, 6)}`,
    role: "member",
    badges: [],
    planetCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function sanitizePlanetStatus(status: PlanetStatus | null | undefined, fallback: PlanetStatus): PlanetStatus {
  return status ?? fallback;
}

/**
 * Strip HTML tags from user input to prevent XSS via Firestore stored content.
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize user-provided title: strip HTML, trim, enforce max length.
 */
export function sanitizeTitle(value: string | undefined | null): string {
  const raw = normalizeText(value);
  return stripHtml(raw).slice(0, 200);
}

/**
 * Sanitize user-provided content: strip HTML, trim, enforce max length.
 */
export function sanitizeContent(value: string | undefined | null, maxLength = 50_000): string {
  const raw = normalizeText(value);
  return stripHtml(raw).slice(0, maxLength);
}

/**
 * Sanitize user-provided comment: strip HTML, trim, enforce max length.
 */
export function sanitizeComment(value: string | undefined | null): string {
  const raw = normalizeText(value);
  return stripHtml(raw).slice(0, 5_000);
}

// IDENTITY_SEAL: PART-1 | role=shared firestore helpers | inputs=raw form values | outputs=sanitized payload values

