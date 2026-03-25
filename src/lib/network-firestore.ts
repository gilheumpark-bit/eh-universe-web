import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  type BoardType,
  type BookmarkRecord,
  type CommentRecord,
  type CreatePlanetWithFirstLogInput,
  type CreateBoardPostInput,
  type CreatePostInput,
  type CreateSettlementInput,
  type PlanetRecord,
  type PlanetStatus,
  type PostRecord,
  type ReactionRecord,
  type ReactionType,
  type ReportReason,
  type ReportRecord,
  type SettlementRecord,
  type UserRecord,
  REPORT_TYPE_TO_BOARD_TYPE,
} from "@/lib/network-types";

// ============================================================
// PART 1 - SHARED HELPERS
// ============================================================

const COLLECTIONS = {
  users: "users",
  planets: "planets",
  posts: "posts",
  settlements: "settlements",
  comments: "comments",
  reactions: "reactions",
  reports: "reports",
} as const;

function requireDb() {
  const firestore = getDb();
  if (!firestore) {
    throw new Error("Firestore is not available in this environment.");
  }
  return firestore;
}

function nowIso() {
  return new Date().toISOString();
}

function clampNullable(value: number | null | undefined, min: number, max: number) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string | undefined | null) {
  return (value ?? "").trim();
}

function normalizeOptionalText(value: string | undefined | null) {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(values: string[] | undefined | null, maxLength: number) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  ).slice(0, maxLength);
}

function summarizeContent(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= 180) return compact;
  return `${compact.slice(0, 177)}...`;
}

function buildDefaultUserRecord(userId: string, nickname?: string | null): UserRecord {
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

function sanitizePlanetStatus(status: PlanetStatus | null | undefined, fallback: PlanetStatus): PlanetStatus {
  return status ?? fallback;
}

// IDENTITY_SEAL: PART-1 | role=shared firestore helpers | inputs=raw form values | outputs=sanitized payload values

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

// ============================================================
// PART 3 - PLANET AND POST WRITES
// ============================================================

export async function createPlanetWithFirstLog(input: CreatePlanetWithFirstLogInput) {
  const database = requireDb();
  const timestamp = nowIso();
  const planetsRef = collection(database, COLLECTIONS.planets);
  const postsRef = collection(database, COLLECTIONS.posts);
  const planetRef = doc(planetsRef);
  const postRef = doc(postsRef);
  const userRef = doc(database, COLLECTIONS.users, input.ownerId);

  const planetRecord: PlanetRecord = {
    id: planetRef.id,
    ownerId: input.ownerId,
    name: normalizeText(input.planet.name),
    code: normalizeOptionalText(input.planet.code),
    genre: normalizeText(input.planet.genre),
    civilizationLevel: normalizeText(input.planet.civilizationLevel),
    goal: input.planet.goal,
    status: sanitizePlanetStatus(input.planet.status, input.planet.goal),
    ehRisk: clampNullable(input.planet.ehRisk, 0, 100),
    systemExposure: clampNullable(input.planet.systemExposure, 0, 100),
    summary: normalizeText(input.planet.summary),
    visibility: input.visibility ?? "public",
    representativeTags: normalizeStringArray(input.planet.representativeTags, 6),
    tags: normalizeStringArray(input.planet.tags, 10),
    coreRules: normalizeStringArray(input.planet.coreRules, 3),
    featuredFaction: normalizeOptionalText(input.planet.featuredFaction),
    featuredCharacter: normalizeOptionalText(input.planet.featuredCharacter),
    transcendenceCost: normalizeOptionalText(input.planet.transcendenceCost),
    transcendenceCosts: normalizeStringArray(input.planet.transcendenceCosts, 5),
    stats: {
      logCount: 1,
      settlementCount: 0,
      lastLogAt: timestamp,
      lastSettlementAt: null,
      featuredPostId: postRef.id,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const postRecord: PostRecord = {
    id: postRef.id,
    authorId: input.ownerId,
    planetId: planetRef.id,
    boardType: REPORT_TYPE_TO_BOARD_TYPE[input.firstLog.reportType],
    reportType: input.firstLog.reportType,
    title: normalizeText(input.firstLog.title),
    content: normalizeText(input.firstLog.content),
    summary: summarizeContent(input.firstLog.content),
    eventCategory: normalizeOptionalText(input.firstLog.eventCategory),
    region: normalizeOptionalText(input.firstLog.region),
    intervention: input.firstLog.intervention,
    ehImpact: clampNullable(input.firstLog.ehImpact, -100, 100),
    followupStatus: input.firstLog.followupStatus ?? undefined,
    tags: normalizeStringArray(
      [
        planetRecord.status,
        input.firstLog.reportType,
        ...(planetRecord.representativeTags ?? []),
      ],
      8,
    ),
    officiality: "official",
    visibility: planetRecord.visibility,
    isPinned: false,
    isOfficial: false,
    metrics: {
      viewCount: 0,
      commentCount: 0,
      reactionCount: 0,
    },
    approvedAt: null,
    approvedBy: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const batch = writeBatch(database);
  batch.set(planetRef, planetRecord);
  batch.set(postRef, postRecord);
  batch.set(
    userRef,
    {
      ...buildDefaultUserRecord(input.ownerId),
      planetCount: increment(1),
      updatedAt: timestamp,
    },
    { merge: true },
  );
  await batch.commit();

  return { planet: planetRecord, post: postRecord };
}

export async function createPost(input: CreatePostInput) {
  const database = requireDb();
  const timestamp = nowIso();
  const postsRef = collection(database, COLLECTIONS.posts);
  const postRef = doc(postsRef);
  const planetRef = doc(database, COLLECTIONS.planets, input.planetId);
  const boardType = REPORT_TYPE_TO_BOARD_TYPE[input.reportType];

  const postRecord: PostRecord = {
    id: postRef.id,
    authorId: input.authorId,
    planetId: input.planetId,
    boardType,
    reportType: input.reportType,
    title: normalizeText(input.title),
    content: normalizeText(input.content),
    summary: summarizeContent(input.content),
    eventCategory: normalizeOptionalText(input.eventCategory),
    region: normalizeOptionalText(input.region),
    intervention: input.intervention,
    ehImpact: clampNullable(input.ehImpact, -100, 100),
    followupStatus: input.followupStatus ?? undefined,
    tags: normalizeStringArray(
      [input.reportType, input.followupStatus ?? undefined, ...(input.tags ?? [])].filter(Boolean) as string[],
      8,
    ),
    officiality: "pending",
    visibility: input.visibility ?? "public",
    isPinned: false,
    isOfficial: false,
    metrics: {
      viewCount: 0,
      commentCount: 0,
      reactionCount: 0,
    },
    approvedAt: null,
    approvedBy: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const batch = writeBatch(database);
  batch.set(postRef, postRecord);
  batch.set(
    planetRef,
    {
      stats: {
        logCount: increment(1),
        lastLogAt: timestamp,
      },
      updatedAt: timestamp,
    },
    { merge: true },
  );
  await batch.commit();

  return postRecord;
}

export async function createSettlement(input: CreateSettlementInput) {
  const database = requireDb();
  const timestamp = nowIso();
  const settlementsRef = collection(database, COLLECTIONS.settlements);
  const settlementRef = doc(settlementsRef);
  const planetRef = doc(database, COLLECTIONS.planets, input.planetId);
  const postRef = doc(database, COLLECTIONS.posts, input.postId);

  const settlementRecord: SettlementRecord = {
    id: settlementRef.id,
    planetId: input.planetId,
    postId: input.postId,
    verdict: input.verdict,
    ehValue: clampNullable(input.ehValue, -100, 100),
    risk: clampNullable(input.risk, 0, 100),
    action: normalizeOptionalText(input.action),
    archiveLevel: normalizeOptionalText(input.archiveLevel),
    operatorId: input.operatorId,
    createdAt: timestamp,
  };

  const batch = writeBatch(database);
  batch.set(settlementRef, settlementRecord);
  batch.set(
    planetRef,
    {
      status: input.verdict,
      ehRisk: clampNullable(input.risk, 0, 100),
      stats: {
        settlementCount: increment(1),
        lastSettlementAt: timestamp,
      },
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    postRef,
    {
      followupStatus: input.verdict,
      approvedAt: timestamp,
      approvedBy: input.operatorId,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  await batch.commit();

  return settlementRecord;
}

export async function createBoardPost(input: CreateBoardPostInput) {
  const database = requireDb();
  const timestamp = nowIso();
  const postsRef = collection(database, COLLECTIONS.posts);
  const postRef = doc(postsRef);

  const postRecord: PostRecord = {
    id: postRef.id,
    authorId: input.authorId,
    planetId: input.planetId ?? "",
    boardType: input.boardType,
    reportType: "observation",
    title: normalizeText(input.title),
    content: normalizeText(input.content),
    summary: summarizeContent(input.content),
    tags: normalizeStringArray([input.boardType, ...(input.tags ?? [])], 8),
    officiality: "pending",
    visibility: input.visibility ?? "public",
    isPinned: false,
    isOfficial: false,
    metrics: {
      viewCount: 0,
      commentCount: 0,
      reactionCount: 0,
    },
    approvedAt: null,
    approvedBy: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await setDoc(postRef, postRecord);
  return postRecord;
}

// IDENTITY_SEAL: PART-3 | role=create entities | inputs=planet/log/settlement create payloads | outputs=stored records

// ============================================================
// PART 4 - READ QUERIES
// ============================================================

function sortByCreatedDesc<T extends { createdAt: string }>(records: T[]) {
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
// PART 5 - COMMENT OPERATIONS
// ============================================================

export async function addComment(input: {
  postId: string;
  planetId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
}) {
  const database = requireDb();
  const timestamp = nowIso();
  const commentsRef = collection(database, COLLECTIONS.comments);
  const commentRef = doc(commentsRef);

  const record: CommentRecord = {
    id: commentRef.id,
    postId: input.postId,
    planetId: input.planetId,
    authorId: input.authorId,
    authorName: normalizeText(input.authorName),
    authorPhoto: input.authorPhoto,
    content: normalizeText(input.content),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const postRef = doc(database, COLLECTIONS.posts, input.postId);
  const batch = writeBatch(database);
  batch.set(commentRef, record);
  batch.set(postRef, { metrics: { commentCount: increment(1) }, updatedAt: timestamp }, { merge: true });
  await batch.commit();

  return record;
}

export async function updateComment(commentId: string, content: string) {
  const database = requireDb();
  const ref = doc(database, COLLECTIONS.comments, commentId);
  await updateDoc(ref, { content: normalizeText(content), updatedAt: nowIso() });
}

export async function deleteComment(commentId: string, postId: string) {
  const database = requireDb();
  const timestamp = nowIso();
  const commentRef = doc(database, COLLECTIONS.comments, commentId);
  const postRef = doc(database, COLLECTIONS.posts, postId);

  const batch = writeBatch(database);
  batch.delete(commentRef);
  batch.set(postRef, { metrics: { commentCount: increment(-1) }, updatedAt: timestamp }, { merge: true });
  await batch.commit();
}

export async function listComments(planetId: string, limitCount = 100) {
  const database = requireDb();
  // Composite index: planetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.comments),
      where("planetId", "==", planetId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map((document) => document.data() as CommentRecord);
}

// IDENTITY_SEAL: PART-5 | role=comment CRUD | inputs=comment payloads | outputs=comment records

// ============================================================
// PART 6 - REACTION OPERATIONS
// ============================================================

function reactionDocId(targetId: string, userId: string, reactionType: ReactionType) {
  return `${targetId}_${userId}_${reactionType}`;
}

export async function toggleReaction(input: {
  targetType: "planet" | "post";
  targetId: string;
  userId: string;
  reactionType: ReactionType;
}): Promise<boolean> {
  const database = requireDb();
  const docId = reactionDocId(input.targetId, input.userId, input.reactionType);
  const ref = doc(database, COLLECTIONS.reactions, docId);
  const snapshot = await getDoc(ref);

  const parentCollection = input.targetType === "planet" ? COLLECTIONS.planets : COLLECTIONS.posts;
  const parentRef = doc(database, parentCollection, input.targetId);

  if (snapshot.exists()) {
    await deleteDoc(ref);
    await updateDoc(parentRef, { "metrics.reactionCount": increment(-1) });
    return false;
  }

  const record: ReactionRecord = {
    id: docId,
    targetType: input.targetType,
    targetId: input.targetId,
    userId: input.userId,
    reactionType: input.reactionType,
    createdAt: nowIso(),
  };
  await setDoc(ref, record);
  await updateDoc(parentRef, { "metrics.reactionCount": increment(1) });
  return true;
}

export async function getReactions(targetId: string): Promise<ReactionRecord[]> {
  const database = requireDb();
  // Composite index: targetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.reactions),
      where("targetId", "==", targetId),
      orderBy("createdAt", "desc"),
      limit(500),
    ),
  );
  return snapshot.docs.map((document) => document.data() as ReactionRecord);
}

// IDENTITY_SEAL: PART-6 | role=reaction toggle and fetch | inputs=target and user | outputs=reaction state

// ============================================================
// PART 7 - BOOKMARK OPERATIONS
// ============================================================

function bookmarkRef(database: ReturnType<typeof requireDb>, userId: string, planetId: string) {
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

// ============================================================
// PART 8 - REPORT OPERATIONS
// ============================================================

export async function submitReport(input: {
  reporterId: string;
  targetType: "planet" | "post" | "comment";
  targetId: string;
  reason: ReportReason;
  detail: string;
}) {
  const database = requireDb();
  const reportsRef = collection(database, COLLECTIONS.reports);
  const reportRef = doc(reportsRef);

  const record: ReportRecord = {
    id: reportRef.id,
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    detail: normalizeText(input.detail),
    createdAt: nowIso(),
    status: "pending",
  };

  await setDoc(reportRef, record);
  return record;
}

// IDENTITY_SEAL: PART-8 | role=report submission | inputs=report payload | outputs=report record
