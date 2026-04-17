// Firebase Firestore — static import for data-layer modules.
// Dynamic alternative: import('firebase/firestore') via lazyFirestore() in firebase.ts
import {
  collection, deleteDoc, doc, documentId, getDoc, getDocs,
  limit, orderBy, query, setDoc, startAfter, where,
  type QueryConstraint,
} from "firebase/firestore";
import {
  type BoardType, type BookmarkRecord, type CommentRecord,
  type PlanetRecord, type PostRecord,
  type SettlementRecord,
} from "@/lib/network-types";
import { requireDb, COLLECTIONS, nowIso } from "./helpers";

// ============================================================
// PART 4 — READ QUERIES
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

/** Soft-delete 된 게시글 제외 (deletedAt 필드 존재 + null 아님). 기존 필드 없으면 통과 */
function excludeSoftDeleted(posts: PostRecord[]): PostRecord[] {
  return posts.filter((p) => !p.deletedAt);
}

export async function listLatestPosts(limitCount = 8, boardType?: BoardType) {
  const database = requireDb();

  if (!boardType) {
    const snapshot = await getDocs(
      query(
        collection(database, COLLECTIONS.posts),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(limitCount * 2), // soft-delete로 제외될 것 고려해 2배 로드
      ),
    );
    return excludeSoftDeleted(snapshot.docs.map((document) => document.data() as PostRecord)).slice(0, limitCount);
  }

  // Composite index: boardType + visibility + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.posts),
      where("boardType", "==", boardType),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(limitCount * 2),
    ),
  );
  return excludeSoftDeleted(snapshot.docs.map((document) => document.data() as PostRecord)).slice(0, limitCount);
}

// Note: no visibility filter — settlements are operational records
export async function listLatestSettlements(limitCount = 6) {
  const database = requireDb();
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.settlements), orderBy("createdAt", "desc"), limit(limitCount)),
  );
  return snapshot.docs.map((document) => document.data() as SettlementRecord);
}

export async function listPlanetPosts(planetId: string, boardType?: BoardType, limitCount = 120) {
  const database = requireDb();

  if (boardType) {
    // Composite index: planetId + boardType + createdAt (firestore.indexes.json)
    const snapshot = await getDocs(
      query(
        collection(database, COLLECTIONS.posts),
        where("planetId", "==", planetId),
        where("boardType", "==", boardType),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      ),
    );
    return excludeSoftDeleted(snapshot.docs.map((document) => document.data() as PostRecord));
  }

  // Composite index: planetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.posts),
      where("planetId", "==", planetId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  return excludeSoftDeleted(snapshot.docs.map((document) => document.data() as PostRecord));
}

export async function listPlanetSettlements(planetId: string, limitCount = 120) {
  const database = requireDb();
  // Composite index: planetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.settlements),
      where("planetId", "==", planetId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map((document) => document.data() as SettlementRecord);
}

export async function listPlanetsByOwner(ownerId: string) {
  const database = requireDb();
  // Server-side ordering eliminates need for client-side sortByCreatedDesc
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.planets),
      where("ownerId", "==", ownerId),
      orderBy("updatedAt", "desc"),
      limit(50),
    ),
  );

  return snapshot.docs.map((document) => document.data() as PlanetRecord);
}

/**
 * Batch-fetch planets by IDs.
 * Uses Firestore `in` queries (max 10 per clause) to eliminate N+1 reads.
 */
export async function getPlanetsByIds(planetIds: string[]) {
  const uniqueIds = Array.from(new Set(planetIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {} as Record<string, PlanetRecord>;

  const database = requireDb();

  // Firestore `in` supports max 10 values per query
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    chunks.push(uniqueIds.slice(i, i + 10));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocs(
        query(
          collection(database, COLLECTIONS.planets),
          where(documentId(), "in", chunk),
        ),
      ),
    ),
  );

  return snapshots.reduce<Record<string, PlanetRecord>>((accumulator, snapshot) => {
    for (const document of snapshot.docs) {
      const planet = document.data() as PlanetRecord;
      accumulator[planet.id] = planet;
    }
    return accumulator;
  }, {});
}

export async function listCommentsForPost(
  postId: string,
  limitCount = 100,
  cursor?: string,
) {
  const database = requireDb();
  // Composite index: postId + createdAt (firestore.indexes.json)
  const constraints: QueryConstraint[] = [
    where("postId", "==", postId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  ];

  if (cursor) {
    const cursorDoc = await getDoc(doc(database, COLLECTIONS.comments, cursor));
    if (cursorDoc.exists()) {
      constraints.push(startAfter(cursorDoc));
    }
  }

  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.comments), ...constraints),
  );
  return snapshot.docs.map((document) => document.data() as CommentRecord);
}

export async function getAllUniqueTags(limitCount = 50): Promise<string[]> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.planets),
      where("visibility", "==", "public"),
      orderBy("updatedAt", "desc"),
      limit(limitCount),
    ),
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

// IDENTITY_SEAL: PART-4 | role=read queries | inputs=ids, filters, cursors | outputs=typed records, maps, tag lists


// ============================================================
// PART 7 — BOOKMARK OPERATIONS
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
    query(
      collection(database, COLLECTIONS.users, userId, "bookmarks"),
      orderBy("createdAt", "desc"),
      limit(200),
    ),
  );
  return snapshot.docs.map((document) => document.data() as BookmarkRecord);
}

export async function isBookmarked(userId: string, planetId: string): Promise<boolean> {
  const database = requireDb();
  const snapshot = await getDoc(bookmarkRef(database, userId, planetId));
  return snapshot.exists();
}

// IDENTITY_SEAL: PART-7 | role=bookmark CRUD | inputs=user and planet ids | outputs=bookmark state
