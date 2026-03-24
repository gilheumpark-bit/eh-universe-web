import type { User } from "firebase/auth";
import {
  collection,
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
import { db } from "@/lib/firebase";
import {
  type BoardType,
  type CommentRecord,
  type CreatePlanetWithFirstLogInput,
  type CreatePostInput,
  type CreateSettlementInput,
  type PlanetRecord,
  type PlanetStatus,
  type PostRecord,
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
} as const;

function requireDb() {
  if (!db) {
    throw new Error("Firestore is not available in this environment.");
  }
  return db;
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
    coreRules: normalizeStringArray(input.planet.coreRules, 3),
    featuredFaction: normalizeOptionalText(input.planet.featuredFaction),
    featuredCharacter: normalizeOptionalText(input.planet.featuredCharacter),
    transcendenceCost: normalizeOptionalText(input.planet.transcendenceCost),
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
    query(collection(database, COLLECTIONS.planets), orderBy("updatedAt", "desc"), limit(limitCount)),
  );
  return snapshot.docs.map((document) => document.data() as PlanetRecord);
}

export async function listLatestPosts(limitCount = 8, boardType?: BoardType) {
  const database = requireDb();

  if (!boardType) {
    const snapshot = await getDocs(
      query(collection(database, COLLECTIONS.posts), orderBy("createdAt", "desc"), limit(limitCount)),
    );
    return snapshot.docs.map((document) => document.data() as PostRecord);
  }

  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.posts), where("boardType", "==", boardType), limit(limitCount * 3)),
  );

  return sortByCreatedDesc(snapshot.docs.map((document) => document.data() as PostRecord)).slice(0, limitCount);
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
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.posts), where("planetId", "==", planetId), limit(120)),
  );

  const records = snapshot.docs.map((document) => document.data() as PostRecord);
  const filtered = boardType ? records.filter((record) => record.boardType === boardType) : records;
  return sortByCreatedDesc(filtered);
}

export async function listPlanetSettlements(planetId: string) {
  const database = requireDb();
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.settlements), where("planetId", "==", planetId), limit(120)),
  );

  return sortByCreatedDesc(snapshot.docs.map((document) => document.data() as SettlementRecord));
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
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.comments), where("postId", "==", postId), limit(100)),
  );

  return sortByCreatedDesc(snapshot.docs.map((document) => document.data() as CommentRecord));
}

// IDENTITY_SEAL: PART-4 | role=read queries | inputs=ids and filters | outputs=typed records and maps
