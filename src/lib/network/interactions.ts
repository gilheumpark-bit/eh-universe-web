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

export function reactionDocId(targetId: string, userId: string, reactionType: ReactionType) {
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

