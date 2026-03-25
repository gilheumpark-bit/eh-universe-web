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
import { requireDb, normalizeText, COLLECTIONS, nowIso, clampNullable, normalizeOptionalText, normalizeStringArray, summarizeContent, buildDefaultUserRecord, sanitizePlanetStatus } from "./helpers";

// ============================================================
// PART 2 - USER HELPERS
// ============================================================

export async function ensureNetworkUserRecord(user: Pick<User, "uid" | "displayName">) {
  const database = requireDb();
  const ref = doc(database, COLLECTIONS.users, user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    const current = snapshot.data() as UserRecord;
    const nextNickname = normalizeText(user.displayName) || current.nickname;

    if (nextNickname !== current.nickname) {
      await updateDoc(ref, {
        nickname: nextNickname,
        updatedAt: nowIso(),
      });

      return {
        ...current,
        nickname: nextNickname,
        updatedAt: nowIso(),
      };
    }

    return current;
  }

  const record = buildDefaultUserRecord(user.uid, user.displayName);
  await setDoc(ref, record);
  return record;
}

export async function getNetworkUserRecord(userId: string) {
  const database = requireDb();
  const snapshot = await getDoc(doc(database, COLLECTIONS.users, userId));
  return snapshot.exists() ? (snapshot.data() as UserRecord) : null;
}

// IDENTITY_SEAL: PART-2 | role=user record sync | inputs=firebase auth user | outputs=network user record

