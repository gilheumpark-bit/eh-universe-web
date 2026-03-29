import {
  collection, doc, getDoc, increment,
  setDoc, writeBatch,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  type CreatePlanetWithFirstLogInput, type CreateBoardPostInput,
  type CreatePostInput, type CreateSettlementInput,
  type PlanetRecord, type PostRecord,
  type SettlementRecord,
  REPORT_TYPE_TO_BOARD_TYPE,
} from "@/lib/network-types";
import { requireDb, normalizeText, COLLECTIONS, nowIso, clampNullable, normalizeOptionalText, normalizeStringArray, summarizeContent, buildDefaultUserRecord, sanitizePlanetStatus, sanitizeTitle, sanitizeContent } from "./helpers";

// ============================================================
// PART 2.5 — WRITE AUTH GUARD
// ============================================================

/**
 * Verify that the current Firebase Auth user matches the claimed owner/author ID.
 * Prevents unauthorized writes where a client supplies someone else's UID.
 */
function assertOwnership(claimedUid: string): void {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Unauthorized: not signed in');
  }
  if (currentUser.uid !== claimedUid) {
    throw new Error('Unauthorized: owner mismatch');
  }
}

// IDENTITY_SEAL: PART-2.5 | role=write auth guard | inputs=claimedUid | outputs=void or throw

// ============================================================
// PART 3 - PLANET AND POST WRITES
// ============================================================

export async function createPlanetWithFirstLog(input: CreatePlanetWithFirstLogInput) {
  assertOwnership(input.ownerId);
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
    title: sanitizeTitle(input.firstLog.title),
    content: sanitizeContent(input.firstLog.content),
    summary: summarizeContent(sanitizeContent(input.firstLog.content)),
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
  assertOwnership(input.authorId);
  const database = requireDb();
  const timestamp = nowIso();
  const postsRef = collection(database, COLLECTIONS.posts);
  const postRef = doc(postsRef);
  const planetRef = doc(database, COLLECTIONS.planets, input.planetId);

  // [C] 행성 존재 확인 — 존재하지 않는 행성에 포스트 쓰기 방지
  const planetSnap = await getDoc(planetRef);
  if (!planetSnap.exists()) {
    throw new Error('Planet not found');
  }

  const boardType = REPORT_TYPE_TO_BOARD_TYPE[input.reportType];

  const postRecord: PostRecord = {
    id: postRef.id,
    authorId: input.authorId,
    planetId: input.planetId,
    boardType,
    reportType: input.reportType,
    title: sanitizeTitle(input.title),
    content: sanitizeContent(input.content),
    summary: summarizeContent(sanitizeContent(input.content)),
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
      updatedBy: input.authorId,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  await batch.commit();

  return postRecord;
}

export async function createSettlement(input: CreateSettlementInput) {
  assertOwnership(input.operatorId);
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
    auditNote: normalizeOptionalText(input.auditNote),
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
      updatedBy: input.operatorId,
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
  assertOwnership(input.authorId);

  // [C] 필수 필드 유효성 검사
  if (!input.title?.trim()) {
    throw new Error('Board post title is required');
  }
  if (!input.content?.trim()) {
    throw new Error('Board post content is required');
  }
  if (!input.boardType) {
    throw new Error('Board post boardType is required');
  }

  const database = requireDb();
  const timestamp = nowIso();
  const postsRef = collection(database, COLLECTIONS.posts);
  const postRef = doc(postsRef);

  // planetId는 PostRecord에서 string 필수 — ""는 standalone(행성 미연결) 게시물을 의미하는 sentinel 값
  const isPlanetPost = Boolean(input.planetId);

  const postRecord: PostRecord = {
    id: postRef.id,
    authorId: input.authorId,
    planetId: input.planetId ?? "", // sentinel: "" = standalone board post (no planet)
    boardType: input.boardType,
    reportType: "observation",
    title: sanitizeTitle(input.title),
    content: sanitizeContent(input.content),
    summary: summarizeContent(sanitizeContent(input.content)),
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

  if (isPlanetPost) {
    // 행성 연결 게시물 — batch로 포스트 저장 + 행성 logCount 증가
    const planetRef = doc(database, COLLECTIONS.planets, input.planetId!);
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
  } else {
    // standalone 게시물 — 단일 write
    await setDoc(postRef, postRecord);
  }

  return { ...postRecord, isPlanetPost };
}

// IDENTITY_SEAL: PART-3 | role=create entities | inputs=planet/log/settlement create payloads | outputs=stored records
