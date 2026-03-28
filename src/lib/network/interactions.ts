import {
  collection, doc, getDoc, getDocs, increment,
  limit, orderBy, query, updateDoc, writeBatch, where,
  startAfter,
  type QueryConstraint,
  type DocumentSnapshot,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  type CommentRecord,
  type ReactionRecord, type ReactionType,
} from "@/lib/network-types";
import { requireDb, normalizeText, COLLECTIONS, nowIso } from "./helpers";

// ============================================================
// PART 1 — OWNERSHIP GUARD
// ============================================================

/**
 * Asserts that the claimed UID matches the currently signed-in
 * Firebase Auth user. Throws if not signed in or if UIDs differ.
 */
function assertCurrentUser(claimedUid: string): void {
  const u = auth?.currentUser;
  if (!u) throw new Error("Not signed in");
  if (u.uid !== claimedUid) throw new Error("Owner mismatch");
}

// IDENTITY_SEAL: PART-1 | role=ownership verification | inputs=claimedUid | outputs=void or throw

// ============================================================
// PART 2 — COMMENT OPERATIONS
// ============================================================

export async function addComment(input: {
  postId: string;
  planetId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
}) {
  assertCurrentUser(input.authorId);

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

export async function updateComment(commentId: string, content: string, currentUserId: string) {
  assertCurrentUser(currentUserId);

  const database = requireDb();
  const ref = doc(database, COLLECTIONS.comments, commentId);

  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Comment not found");
  const data = snap.data() as CommentRecord;
  if (data.authorId !== currentUserId) throw new Error("Not the comment author");

  await updateDoc(ref, { content: normalizeText(content), updatedAt: nowIso() });
}

export async function deleteComment(commentId: string, postId: string, currentUserId: string) {
  assertCurrentUser(currentUserId);

  const database = requireDb();
  const commentRef = doc(database, COLLECTIONS.comments, commentId);

  const snap = await getDoc(commentRef);
  if (!snap.exists()) return; // already gone — no counter change

  const data = snap.data() as CommentRecord;
  if (data.authorId !== currentUserId) throw new Error("Not the comment author");

  const timestamp = nowIso();
  const postRef = doc(database, COLLECTIONS.posts, postId);

  const batch = writeBatch(database);
  batch.delete(commentRef);
  batch.set(postRef, { metrics: { commentCount: increment(-1) }, updatedAt: timestamp }, { merge: true });
  await batch.commit();
}

/**
 * List comments for a planet, ordered newest-first.
 *
 * @param startAfterDoc - Pass the last `DocumentSnapshot` from
 *   a previous page to enable cursor-based pagination.
 *   Callers should paginate when result.length === limitCount.
 */
export async function listComments(
  planetId: string,
  limitCount = 100,
  startAfterDoc?: DocumentSnapshot,
) {
  const database = requireDb();

  const constraints: QueryConstraint[] = [
    where("planetId", "==", planetId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  ];
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }

  // Composite index: planetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(collection(database, COLLECTIONS.comments), ...constraints),
  );
  return snapshot.docs.map((document) => document.data() as CommentRecord);
}

// IDENTITY_SEAL: PART-2 | role=comment CRUD with ownership | inputs=comment payloads + currentUserId | outputs=comment records

// ============================================================
// PART 3 — REACTION OPERATIONS
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
  assertCurrentUser(input.userId);

  const database = requireDb();
  const docId = reactionDocId(input.targetId, input.userId, input.reactionType);
  const ref = doc(database, COLLECTIONS.reactions, docId);
  const snapshot = await getDoc(ref);

  const parentCollection = input.targetType === "planet" ? COLLECTIONS.planets : COLLECTIONS.posts;
  const parentRef = doc(database, parentCollection, input.targetId);

  const batch = writeBatch(database);

  if (snapshot.exists()) {
    batch.delete(ref);
    batch.update(parentRef, { "metrics.reactionCount": increment(-1) });
    await batch.commit();
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
  batch.set(ref, record);
  batch.update(parentRef, { "metrics.reactionCount": increment(1) });
  await batch.commit();
  return true;
}

/**
 * Fetch reactions for a target.
 *
 * @param limitCount - Maximum reactions to return (default 500).
 *   For targets with very high reaction counts, callers should
 *   paginate using a cursor strategy similar to listComments.
 */
export async function getReactions(targetId: string, limitCount = 500): Promise<ReactionRecord[]> {
  const database = requireDb();
  // Composite index: targetId + createdAt (firestore.indexes.json)
  const snapshot = await getDocs(
    query(
      collection(database, COLLECTIONS.reactions),
      where("targetId", "==", targetId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map((document) => document.data() as ReactionRecord);
}

// IDENTITY_SEAL: PART-3 | role=reaction toggle and fetch (atomic batch) | inputs=target + user | outputs=reaction state
