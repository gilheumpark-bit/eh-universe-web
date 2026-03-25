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

/** 신고 목록 조회 (관리자용) */
export async function listReports(statusFilter: "pending" | "reviewed" | "all" = "all", limitCount = 50): Promise<ReportRecord[]> {
  const database = requireDb();
  const reportsRef = collection(database, COLLECTIONS.reports);
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(limitCount)];
  if (statusFilter !== "all") constraints.unshift(where("status", "==", statusFilter));
  const snap = await getDocs(query(reportsRef, ...constraints));
  return snap.docs.map(d => d.data() as ReportRecord);
}

/** 신고 상태 변경 (관리자용) */
export async function updateReportStatus(reportId: string, status: "pending" | "reviewed" | "dismissed") {
  const database = requireDb();
  await setDoc(doc(database, COLLECTIONS.reports, reportId), { status }, { merge: true });
}

// IDENTITY_SEAL: PART-8 | role=report submission+management | inputs=report payload | outputs=report records
