import type { User } from "firebase/auth";
import {
  collection, deleteDoc, doc, getDoc, getDocs, increment,
  limit, orderBy, query, setDoc, updateDoc, writeBatch, where,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  type BoardType, type BookmarkRecord, type CommentRecord,
  type CreatePlanetWithFirstLogInput, type CreateBoardPostInput,
  type CreatePostInput, type CreateSettlementInput,
  type PlanetRecord, type PlanetStatus, type PostRecord,
  type ReactionRecord, type ReactionType, type ReportReason,
  type ReportRecord, type SettlementRecord, type UserRecord,
  REPORT_TYPE_TO_BOARD_TYPE,
} from "@/lib/network-types";

// ============================================================
// PART 1 - SHARED HELPERS
// ============================================================

export const COLLECTIONS = {
  users: "users",
  planets: "planets",
  posts: "posts",
  settlements: "settlements",
  comments: "comments",
  reactions: "reactions",
  reports: "reports",
} as const;

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

// IDENTITY_SEAL: PART-1 | role=shared firestore helpers | inputs=raw form values | outputs=sanitized payload values

