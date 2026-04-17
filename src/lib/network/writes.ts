// Firebase Firestore — static import for data-layer modules.
// Dynamic alternative: import('firebase/firestore') via lazyFirestore() in firebase.ts
import {
  collection, doc, getDoc, increment,
  setDoc, writeBatch,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  type CreatePlanetWithFirstLogInput, type CreateBoardPostInput,
  type CreatePostInput, type CreateSettlementInput, type UpdatePostInput,
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

/**
 * 행성 수정 — owner만 가능. 부분 필드 업데이트.
 * stats/createdAt/id/ownerId는 불변. updatedAt은 자동 갱신.
 */
export async function updatePlanet(input: {
  planetId: string;
  ownerId: string;
  updates: Partial<Omit<PlanetRecord, 'id' | 'ownerId' | 'stats' | 'createdAt'>>;
}) {
  assertOwnership(input.ownerId);
  const database = requireDb();
  const planetRef = doc(database, COLLECTIONS.planets, input.planetId);
  const snap = await getDoc(planetRef);
  if (!snap.exists()) throw new Error('Planet not found');
  const current = snap.data() as PlanetRecord;
  if (current.ownerId !== input.ownerId) {
    throw new Error('Unauthorized: not planet owner');
  }
  const timestamp = nowIso();
  // 허용 필드만 sanitize 후 merge
  const patch: Partial<PlanetRecord> = { updatedAt: timestamp };
  const u = input.updates;
  if (u.name !== undefined) patch.name = normalizeText(u.name);
  if (u.summary !== undefined) patch.summary = normalizeText(u.summary);
  if (u.genre !== undefined) patch.genre = normalizeText(u.genre);
  if (u.civilizationLevel !== undefined) patch.civilizationLevel = normalizeText(u.civilizationLevel);
  if (u.goal !== undefined) patch.goal = u.goal;
  if (u.visibility !== undefined) patch.visibility = u.visibility;
  if (u.representativeTags !== undefined) patch.representativeTags = normalizeStringArray(u.representativeTags, 6);
  if (u.tags !== undefined) patch.tags = normalizeStringArray(u.tags, 10);
  if (u.coreRules !== undefined) patch.coreRules = normalizeStringArray(u.coreRules, 3);
  if (u.featuredFaction !== undefined) patch.featuredFaction = normalizeOptionalText(u.featuredFaction);
  if (u.featuredCharacter !== undefined) patch.featuredCharacter = normalizeOptionalText(u.featuredCharacter);
  if (u.transcendenceCost !== undefined) patch.transcendenceCost = normalizeOptionalText(u.transcendenceCost);
  if (u.transcendenceCosts !== undefined) patch.transcendenceCosts = normalizeStringArray(u.transcendenceCosts, 5);
  if (u.status !== undefined) patch.status = sanitizePlanetStatus(u.status, current.goal);
  if (u.ehRisk !== undefined) patch.ehRisk = clampNullable(u.ehRisk, 0, 100);
  if (u.systemExposure !== undefined) patch.systemExposure = clampNullable(u.systemExposure, 0, 100);

  await setDoc(planetRef, patch, { merge: true });
  return { ...current, ...patch };
}

/**
 * 게시글 soft-delete — 작성자 또는 관리자만. 목록에서 자동 제외되되 복구 가능.
 * hard-delete는 관리자 전용 별도 로직.
 */
export async function softDeletePost(input: {
  postId: string;
  actorId: string;
  reason?: string;
}) {
  assertOwnership(input.actorId);
  const database = requireDb();
  const postRef = doc(database, COLLECTIONS.posts, input.postId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) throw new Error('Post not found');
  const current = snap.data() as PostRecord;
  if (current.authorId !== input.actorId) {
    // TODO: admin override 체크는 후속 단계 (isAdmin userRecord)
    throw new Error('Unauthorized: only author can soft-delete');
  }
  const timestamp = nowIso();
  await setDoc(postRef, {
    deletedAt: timestamp,
    deletedBy: input.actorId,
    deleteReason: input.reason ?? null,
    updatedAt: timestamp,
  }, { merge: true });
  return { ...current, deletedAt: timestamp, deletedBy: input.actorId };
}

/** Soft-delete 복구 (작성자만). */
export async function restorePost(input: { postId: string; actorId: string }) {
  assertOwnership(input.actorId);
  const database = requireDb();
  const postRef = doc(database, COLLECTIONS.posts, input.postId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) throw new Error('Post not found');
  const current = snap.data() as PostRecord;
  if (current.authorId !== input.actorId) {
    throw new Error('Unauthorized: only author can restore');
  }
  await setDoc(postRef, {
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    updatedAt: nowIso(),
  }, { merge: true });
  return { ...current, deletedAt: null };
}

export async function updatePost(input: UpdatePostInput) {
  const database = requireDb();
  const timestamp = nowIso();
  const postRef = doc(database, COLLECTIONS.posts, input.postId);

  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }
  const postData = postSnap.data() as PostRecord;

  const currentUser = auth?.currentUser;
  // 게시물 작성자만 수정 가능 (향후 관리자 확대 가능)
  if (!currentUser || currentUser.uid !== input.updaterId || postData.authorId !== input.updaterId) {
    throw new Error('Unauthorized: only author can edit');
  }

  const updates: Partial<PostRecord> = {
    updatedAt: timestamp,
  };

  if (input.title !== undefined) updates.title = sanitizeTitle(input.title);
  if (input.content !== undefined) {
    updates.content = sanitizeContent(input.content);
    updates.summary = summarizeContent(updates.content);
  }
  if (input.reportType !== undefined) {
    updates.reportType = input.reportType;
    updates.boardType = REPORT_TYPE_TO_BOARD_TYPE[input.reportType];
  }
  if (input.eventCategory !== undefined) updates.eventCategory = normalizeOptionalText(input.eventCategory);
  if (input.region !== undefined) updates.region = normalizeOptionalText(input.region);
  if (input.intervention !== undefined) updates.intervention = input.intervention;
  if (input.ehImpact !== undefined) updates.ehImpact = clampNullable(input.ehImpact, -100, 100);
  if (input.followupStatus !== undefined) updates.followupStatus = input.followupStatus ?? undefined;
  if (input.visibility !== undefined) updates.visibility = input.visibility;

  const baseReportType = updates.reportType ?? postData.reportType;
  const baseFollowupStatus = updates.followupStatus ?? postData.followupStatus;
  const baseTags = input.tags ?? postData.tags ?? [];
  const tagsSource = [baseReportType, baseFollowupStatus, ...baseTags].filter(Boolean) as string[];
  updates.tags = normalizeStringArray(tagsSource, 8);

  await setDoc(postRef, updates, { merge: true });

  return { ...postData, ...updates };
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
