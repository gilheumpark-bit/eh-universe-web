import type { SourceRecord } from "@/lib/creative-process";
import { computeSha256Hex } from "@/lib/creative-process";
import type { MediaIpPackRightsLedgerRow } from "@/lib/creative/media-ip-pack-markdown";
import type { ProjectRightsLedgerEntry } from "@/lib/studio-types";
import {
  IMPORT_REPORT_STATUS_LABEL_KO,
  type ImportFileReportRecord,
} from "@/components/loreguard/tabs/TabExport.constants";

export type RightsLedgerDraft = Pick<
  ProjectRightsLedgerEntry,
  | "id"
  | "categoryKo"
  | "ownerKo"
  | "usageScopeKo"
  | "exclusivityKo"
  | "termKo"
  | "regionKo"
  | "mediaKo"
  | "evidenceFileKo"
  | "statusKo"
  | "noteKo"
>;

export function mergeRightsLedgerRows(
  baseRows: readonly MediaIpPackRightsLedgerRow[],
  savedRows: readonly ProjectRightsLedgerEntry[] | null | undefined,
): MediaIpPackRightsLedgerRow[] {
  const savedById = new Map((savedRows ?? []).map((row) => [row.id, row]));

  return baseRows.map((baseRow) => {
    const saved = baseRow.id ? savedById.get(baseRow.id) : undefined;
    return saved ? { ...baseRow, ...saved } : baseRow;
  });
}

export function toRightsLedgerEntry(row: RightsLedgerDraft): ProjectRightsLedgerEntry {
  return {
    id: row.id,
    categoryKo: row.categoryKo.trim() || "미분류",
    ownerKo: row.ownerKo.trim() || "작가 확인 필요",
    usageScopeKo: row.usageScopeKo.trim() || "사용 범위 확인 필요",
    exclusivityKo: row.exclusivityKo?.trim() || "미정",
    termKo: row.termKo?.trim() || "미정",
    regionKo: row.regionKo?.trim() || "미정",
    mediaKo: row.mediaKo?.trim() || "미정",
    evidenceFileKo: row.evidenceFileKo?.trim() || "근거 파일 미기록",
    statusKo: row.statusKo.trim() || "확인 필요",
    noteKo: row.noteKo.trim() || "별도 메모 없음",
    updatedAt: new Date().toISOString(),
    updatedBy: "작가",
  };
}

const RIGHTS_LEDGER_REQUIRED_FIELDS: Array<{ key: keyof RightsLedgerDraft; labelKo: string }> = [
  { key: "categoryKo", labelKo: "항목" },
  { key: "ownerKo", labelKo: "소유 주체" },
  { key: "usageScopeKo", labelKo: "사용 범위" },
  { key: "exclusivityKo", labelKo: "독점 여부" },
  { key: "termKo", labelKo: "기간" },
  { key: "regionKo", labelKo: "지역" },
  { key: "mediaKo", labelKo: "매체" },
  { key: "evidenceFileKo", labelKo: "근거 파일" },
  { key: "statusKo", labelKo: "상태" },
  { key: "noteKo", labelKo: "메모" },
];

const RIGHTS_LEDGER_MISSING_PATTERNS = [
  "미정",
  "확인 필요",
  "미기록",
  "별도 메모 없음",
  "기록 없음",
  "자산화 기준 없음",
  "작품 기준 보강 필요",
  "대기",
  "보강",
  "계약 전",
  "협의 전",
  "출고 전 확인",
  "자료별 조건 확인",
  "매체 제안처별 확인",
];

function isRightsLedgerMissingValue(value: unknown): boolean {
  const text = String(value ?? "").trim();
  if (!text) return true;
  return RIGHTS_LEDGER_MISSING_PATTERNS.some((pattern) => text.includes(pattern));
}

export function getRightsLedgerMissingFieldLabels(
  row: MediaIpPackRightsLedgerRow | ProjectRightsLedgerEntry,
): string[] {
  return RIGHTS_LEDGER_REQUIRED_FIELDS
    .filter(({ key }) => isRightsLedgerMissingValue(row[key]))
    .map(({ labelKo }) => labelKo);
}

export function summarizeSourceOriginKo(source: SourceRecord): string {
  return source.fileName?.trim() || source.url?.trim() || source.provider?.trim() || "원천 미기록";
}

export function shortenHashKo(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return "해시 없음";
  return normalized.length > 12 ? `${normalized.slice(0, 12)}...` : normalized;
}

export function importReportVisibilityKo(report: ImportFileReportRecord): string {
  return report.status === "success" ? "제출용 후보" : "비공개 점검";
}

export function importReportNoteKo(report: ImportFileReportRecord): string {
  const candidateText = report.candidateCount > 0 ? `후보 ${report.candidateCount}건` : "후보 없음";
  return `${IMPORT_REPORT_STATUS_LABEL_KO[report.status]} · ${candidateText} · ${report.detail}`;
}

export async function hashRightsLedgerRow(
  row: ProjectRightsLedgerEntry | MediaIpPackRightsLedgerRow | null | undefined,
): Promise<string | null> {
  if (!row) return null;
  return computeSha256Hex(JSON.stringify({
    categoryKo: row.categoryKo,
    ownerKo: row.ownerKo,
    usageScopeKo: row.usageScopeKo,
    exclusivityKo: row.exclusivityKo,
    termKo: row.termKo,
    regionKo: row.regionKo,
    mediaKo: row.mediaKo,
    evidenceFileKo: row.evidenceFileKo,
    statusKo: row.statusKo,
    noteKo: row.noteKo,
  }));
}
