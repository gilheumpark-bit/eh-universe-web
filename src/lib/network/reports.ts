import type { User } from "firebase/auth";
import {
  collection, deleteDoc, doc, getDoc, getDocs, increment,
  limit, orderBy, query, setDoc, updateDoc, writeBatch, where,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, getDb } from "@/lib/firebase";
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
// PART 8 — REPORT OPERATIONS
// ============================================================

/**
 * Assert that the current Firebase Auth user matches the expected userId.
 * Prevents spoofed reporterId from being submitted.
 */
function assertCurrentUser(expectedUserId: string): void {
  const currentUser = auth?.currentUser;
  if (!currentUser || currentUser.uid !== expectedUserId) {
    throw new Error("Auth mismatch: reporterId does not match the current user");
  }
}

export async function submitReport(input: {
  reporterId: string;
  targetType: "planet" | "post" | "comment";
  targetId: string;
  reason: ReportReason;
  detail: string;
}) {
  // Auth guard: caller must be the reporter
  assertCurrentUser(input.reporterId);

  // Validate detail is not empty
  const normalizedDetail = normalizeText(input.detail);
  if (normalizedDetail.length === 0) {
    throw new Error("Report detail must not be empty");
  }

  const database = requireDb();

  // Duplicate prevention: check for existing pending report by same user on same target
  const duplicateSnap = await getDocs(
    query(
      collection(database, COLLECTIONS.reports),
      where("reporterId", "==", input.reporterId),
      where("targetId", "==", input.targetId),
      where("targetType", "==", input.targetType),
      where("status", "==", "pending"),
      limit(1),
    ),
  );
  if (!duplicateSnap.empty) {
    throw new Error("Duplicate report: you already reported this item");
  }

  const reportsRef = collection(database, COLLECTIONS.reports);
  const reportRef = doc(reportsRef);

  const record: ReportRecord = {
    id: reportRef.id,
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    detail: normalizedDetail,
    createdAt: nowIso(),
    status: "pending",
  };

  await setDoc(reportRef, record);
  return record;
}

/** 신고 목록 조회 (관리자용) */
export async function listReports(
  statusFilter: "pending" | "reviewed" | "all" = "all",
  limitCount = 50,
  targetType?: "planet" | "post" | "comment",
): Promise<ReportRecord[]> {
  const database = requireDb();
  const reportsRef = collection(database, COLLECTIONS.reports);
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(limitCount)];
  if (statusFilter !== "all") constraints.unshift(where("status", "==", statusFilter));
  if (targetType) constraints.unshift(where("targetType", "==", targetType));
  const snap = await getDocs(query(reportsRef, ...constraints));
  return snap.docs.map(d => d.data() as ReportRecord);
}

/** 신고 상태 변경 (관리자용) — includes audit trail */
export async function updateReportStatus(
  reportId: string,
  status: "pending" | "reviewed" | "dismissed",
  reviewerId: string,
) {
  const database = requireDb();
  await setDoc(
    doc(database, COLLECTIONS.reports, reportId),
    { status, reviewedBy: reviewerId, reviewedAt: nowIso() },
    { merge: true },
  );
}

// IDENTITY_SEAL: PART-8 | role=report submission+management | inputs=report payload, reviewer id | outputs=report records
