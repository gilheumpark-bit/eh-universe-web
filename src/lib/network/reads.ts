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
import { requireDb, COLLECTIONS, nowIso, clampNullable, normalizeOptionalText, normalizeStringArray, summarizeContent, buildDefaultUserRecord, sanitizePlanetStatus } from "./helpers";

// ============================================================
// PART 4 - READ QUERIES
// ============================================================

export function sortByCreatedDesc<T extends { createdAt: string }>(records: T[]) {
  return [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getPlanetById(planetId: string) {
  const database = requireDb();
  const snapshot = await getDoc(doc(database, COLLECTIONS.planets, planetId));
  return snapshot.exists() ? (snapshot.data() as PlanetRecord) : null;
}

export async function getPostById(postId: string) {
  const database = requireDb();
  const snapshot = await getDoc(doc(database, COLLECTIONS.posts, postId));
  return snapshot.exists() ? (snapshot.data() as PostRecord) : null;
}

export async function listLatestPlanets(limitCount = 6) {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.planets),
      where("visibility", "==", "public"),
      orderBy("updatedAt", "desc"),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map((document) => document.data() as PlanetRecord);
}

export async function listLatestPosts(limitCount = 8, boardType?: BoardType) {
  const database = requireDb();

  if (!boardType) {
    const snapshot = await getDocs(
      query(
        collection(database, COLLECTIONS.posts),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      ),
    );
    return snapshot.docs.map((document) => document.data() as PostRecord);
  }

  // Composite index: boardType + visibility + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.posts),
      where("boardType", "==", boardType),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map((document) => document.data() as PostRecord);
}

export async function listLatestSettlements(limitCount = 6) {
  const database = requireDb();
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.settlements), orderBy("createdAt", "desc"), limit(limitCount)),
  );
  return snapshot.docs.map((document) => document.data() as SettlementRecord);
}

export async function listPlanetPosts(planetId: string, boardType?: BoardType) {
  const database = requireDb();

  if (boardType) {
    // Composite index: planetId + boardType + createdAt (firestore.indexes.json)
    const snapshot = await getDocs(
      query(
        collection(database, COLLECTIONS.posts),
        where("planetId", "==", planetId),
        where("boardType", "==", boardType),
        orderBy("createdAt", "desc"),
        limit(120),
      ),
    );
    return snapshot.docs.map((document) => document.data() as PostRecord);
  }

  // Composite index: planetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.posts),
      where("planetId", "==", planetId),
      orderBy("createdAt", "desc"),
      limit(120),
    ),
  );
  return snapshot.docs.map((document) => document.data() as PostRecord);
}

export async function listPlanetSettlements(planetId: string) {
  const database = requireDb();
  // Composite index: planetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.settlements),
      where("planetId", "==", planetId),
      orderBy("createdAt", "desc"),
      limit(120),
    ),
  );
  return snapshot.docs.map((document) => document.data() as SettlementRecord);
}

export async function listPlanetsByOwner(ownerId: string) {
  const database = requireDb();
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.planets), where("ownerId", "==", ownerId), limit(50)),
  );

  return sortByCreatedDesc(snapshot.docs.map((document) => document.data() as PlanetRecord));
}

export async function getPlanetsByIds(planetIds: string[]) {
  const uniqueIds = Array.from(new Set(planetIds.filter(Boolean)));
  const planets = await Promise.all(uniqueIds.map((planetId) => getPlanetById(planetId)));

  return planets.reduce<Record<string, PlanetRecord>>((accumulator, planet) => {
    if (planet) {
      accumulator[planet.id] = planet;
    }
    return accumulator;
  }, {});
}

export async function listCommentsForPost(postId: string) {
  const database = requireDb();
  // Composite index: postId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.comments),
      where("postId", "==", postId),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
  );
  return snapshot.docs.map((document) => document.data() as CommentRecord);
}

export async function getAllUniqueTags(limitCount = 50): Promise<string[]> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.planets), orderBy("updatedAt", "desc"), limit(limitCount)),
  );

  const tagSet = new Set<string>();
  for (const document of snapshot.docs) {
    const planet = document.data() as PlanetRecord;
    for (const tag of planet.representativeTags ?? []) {
      tagSet.add(tag);
    }
    for (const tag of planet.tags ?? []) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

// IDENTITY_SEAL: PART-4 | role=read queries | inputs=ids and filters | outputs=typed records and maps


// ============================================================
// PART 7 - BOOKMARK OPERATIONS
// ============================================================

export function bookmarkRef(database: ReturnType<typeof requireDb>, userId: string, planetId: string) {
  return doc(database, COLLECTIONS.users, userId, "bookmarks", planetId);
}

export async function addBookmark(userId: string, planetId: string) {
  const database = requireDb();
  const record: BookmarkRecord = { planetId, createdAt: nowIso() };
  await setDoc(bookmarkRef(database, userId, planetId), record);
  return record;
}

export async function removeBookmark(userId: string, planetId: string) {
  const database = requireDb();
  await deleteDoc(bookmarkRef(database, userId, planetId));
}

export async function listBookmarks(userId: string): Promise<BookmarkRecord[]> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.users, userId, "bookmarks"), limit(200)),
  );
  return snapshot.docs.map((document) => document.data() as BookmarkRecord);
}

export async function isBookmarked(userId: string, planetId: string): Promise<boolean> {
  const database = requireDb();
  const snapshot = await getDoc(bookmarkRef(database, userId, planetId));
  return snapshot.exists();
}

// IDENTITY_SEAL: PART-7 | role=bookmark CRUD | inputs=user and planet ids | outputs=bookmark state

