import {
  PublishPlatform,
  type AcceptedImportCandidateRecord,
  type ImportFileReportRecord,
  type ImportFileReportReasonCode,
  type ProjectReleasePurpose,
  type ProjectTargetMarket,
  type StoryConfig,
} from "@/lib/studio-types";
import {
  classifyImportedText,
  IMPORT_BUCKET_LABELS,
  isSupportedImportFileName,
  requiresServerImportExtraction,
  type ImportCandidate,
} from "@/lib/loreguard/import-classifier";
import {
  getImportAlignmentWarnings,
  type ImportBasisUpdateSuggestion,
} from "@/lib/loreguard/import-project-alignment";
import { getFirebaseBearerHeaders } from "@/lib/firebase-bearer-headers";
import type { ProjectDraft } from "@/components/loreguard/ProjectStart.shared";

const MAX_DRAFT_IMPORT_CHARS = 1200;
export const MAX_IMPORT_FILE_REPORTS = 80;
export const MAX_ACCEPTED_IMPORT_CANDIDATES = 80;
export const MAX_PENDING_IMPORT_CANDIDATES = 60;

export function targetTypeForImport(bucket: ImportCandidate["bucket"]) {
  if (bucket === "world") return "world" as const;
  if (bucket === "characters") return "character" as const;
  if (bucket === "scenes" || bucket === "direction" || bucket === "mainScenario") return "scene" as const;
  if (bucket === "manuscript") return "manuscript" as const;
  if (bucket === "rightsIp") return "metadata" as const;
  return "other" as const;
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("file read failed"));
    reader.readAsText(file, "UTF-8");
  });
}

interface ImportReadResult {
  text: string;
  reasonCode?: ImportFileReportReasonCode;
  warningDetail?: string;
}

function uploadWarningToImportReason(warnings: string[]): Pick<ImportReadResult, "reasonCode" | "warningDetail"> {
  if (warnings.includes("pdf-running-lines-normalized")) {
    return {
      reasonCode: "pdf-running-lines-normalized",
      warningDetail: "PDF 반복 머리말/꼬리말 정리",
    };
  }
  if (warnings.includes("pdf-page-markers-normalized")) {
    return {
      reasonCode: "pdf-page-markers-normalized",
      warningDetail: "PDF 페이지 표식 정리",
    };
  }
  if (warnings.includes("missing-epub-navigation")) {
    return {
      reasonCode: "missing-epub-navigation",
      warningDetail: "EPUB 목차 정보 없음",
    };
  }
  return {};
}

export async function readImportFileAsClassifiableText(file: File): Promise<ImportReadResult> {
  if (!requiresServerImportExtraction(file.name)) {
    return { text: await readFileAsText(file) };
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", "loreguard-project-start");
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    headers: await getFirebaseBearerHeaders("DOCX/HWPX/PDF/EPUB 파일 가져오기는 로그인 후 사용할 수 있습니다."),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : `${file.name} 문서 파싱 실패`);
  }
  const chapters = Array.isArray(data?.chapters) ? data.chapters : [];
  const warnings = Array.isArray(data?.warnings)
    ? data.warnings.filter((warning: unknown): warning is string => typeof warning === "string")
    : [];
  const text = chapters
    .map((chapter: unknown, index: number) => {
      const item = chapter as { title?: unknown; content?: unknown };
      const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : `문서 조각 ${index + 1}`;
      const content = typeof item.content === "string" ? item.content.trim() : "";
      return content ? `# ${title}\n${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
  if (!text.trim()) {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".pdf")) {
      throw new Error(`${file.name}에서 텍스트 본문을 찾지 못했습니다. 스캔본/이미지 PDF일 수 있습니다. 현재 OCR은 지원하지 않습니다.`);
    }
    if (lowerName.endsWith(".epub")) {
      throw new Error(`${file.name}에서 EPUB 본문을 찾지 못했습니다. DRM 또는 손상된 EPUB일 수 있습니다.`);
    }
    if (lowerName.endsWith(".hwpx")) {
      throw new Error(`${file.name}에서 HWPX 본문을 찾지 못했습니다. 한글에서 HWPX로 다시 저장한 뒤 불러오세요.`);
    }
    throw new Error(`${file.name}에서 가져올 본문을 찾지 못했습니다.`);
  }
  return {
    text,
    ...uploadWarningToImportReason(warnings),
  };
}

export function classifyImportFailureReason(message: string): ImportFileReportReasonCode {
  const normalized = message.toLowerCase();
  if (message.includes("로그인") || normalized.includes("authentication required")) return "requires-login";
  if (message.includes("암호") || normalized.includes("password") || normalized.includes("encrypted")) return "password-protected";
  if (message.includes("스캔본") || message.includes("이미지 PDF") || normalized.includes("image-only")) return "image-only-source";
  if (message.includes("DRM") || message.includes("손상된 EPUB") || normalized.includes("drm") || normalized.includes("corrupt epub")) return "drm-or-corrupt-epub";
  if (message.includes("목차") || normalized.includes("missing-epub-navigation")) return "missing-epub-navigation";
  if (normalized.includes("file content does not match declared type")) return "magic-byte-mismatch";
  if (normalized.includes("file too large")) return "file-too-large";
  if (message.includes("EPUB 검증 실패") || message.includes("HWPX 검증 실패") || normalized.includes("zip-bomb")) return "zip-bomb-risk";
  if (message.includes("가져올 본문을 찾지 못했습니다") || message.includes("본문을 찾지 못했습니다") || message.includes("분류 가능한 텍스트 없음")) return "empty-extraction";
  if (normalized.includes("unsupported") || message.includes("지원하지 않는")) return "unsupported-format";
  return "server-extraction-failed";
}

export function summarizeImportFileNames(fileNames: string[], max = 3): string {
  const visible = fileNames.slice(0, max).join(", ");
  const hidden = fileNames.length - max;
  return hidden > 0 ? `${visible} 외 ${hidden}개` : visible;
}

interface ProjectImportProcessingDraft {
  episodeLength: string;
  publishPlatform: ProjectDraft["publishPlatform"];
  releasePurpose: ProjectDraft["releasePurpose"];
  rightsNote: string;
  targetLanguage: ProjectDraft["targetLanguage"];
  targetMarket: ProjectDraft["targetMarket"];
}

export interface ProjectImportProcessingResult {
  fileReports: ImportFileReportRecord[];
  nextCandidates: ImportCandidate[];
  notice: string;
}

export async function processProjectImportFiles(
  files: File[],
  draft: ProjectImportProcessingDraft,
): Promise<ProjectImportProcessingResult> {
  const supported = files.filter((file) => isSupportedImportFileName(file.name));
  const unsupported = files.filter((file) => !isSupportedImportFileName(file.name));
  const stamp = Date.now();
  const importedAt = new Date(stamp).toISOString();

  if (supported.length === 0) {
    const unsupportedReports = unsupported.slice(0, MAX_IMPORT_FILE_REPORTS).map((file, index) => ({
      id: `${stamp}-unsupported-${index}`,
      fileName: file.name,
      status: "unsupported" as const,
      detail: "지원 형식 아님",
      candidateCount: 0,
      importedAt,
      reasonCode: "unsupported-format" as const,
    }));
    const hiddenUnsupported = Math.max(0, unsupported.length - unsupportedReports.length);
    return {
      nextCandidates: [],
      fileReports: unsupportedReports,
      notice: [
        "지원 형식은 .txt, .md, .json, .docx, .hwpx, .pdf, .epub 입니다.",
        hiddenUnsupported > 0 ? `파일별 결과 ${hiddenUnsupported}개는 보관 한도 때문에 생략했습니다.` : null,
      ].filter(Boolean).join(" "),
    };
  }

  const imported = await Promise.all(
    supported.map(async (file, fileIndex) => {
      try {
        const readResult = await readImportFileAsClassifiableText(file);
        return {
          fileName: file.name,
          reasonCode: readResult.reasonCode,
          warningDetail: readResult.warningDetail,
          candidates: classifyImportedText(file.name, readResult.text).map((candidate) => ({
            ...candidate,
            id: `${stamp}-${fileIndex}-${candidate.id}`,
          })),
        };
      } catch (error) {
        return {
          fileName: file.name,
          candidates: [],
          error: error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
        };
      }
    }),
  );
  const nextCandidates = imported.flatMap((result) => result.candidates);
  const failed = imported.filter((result) => result.error);
  const empty = imported.filter((result) => !result.error && result.candidates.length === 0);
  const allFileReports: ImportFileReportRecord[] = [
    ...imported.map((result, index) => {
      if (result.error) {
        return {
          id: `${stamp}-failed-${index}`,
          fileName: result.fileName,
          status: "failed" as const,
          detail: result.error,
          candidateCount: 0,
          importedAt,
          reasonCode: classifyImportFailureReason(result.error),
        };
      }
      if (result.candidates.length > 0) {
        return {
          id: `${stamp}-success-${index}`,
          fileName: result.fileName,
          status: "success" as const,
          detail: [`${result.candidates.length}건 분류됨`, result.warningDetail].filter(Boolean).join(" · "),
          candidateCount: result.candidates.length,
          importedAt,
          ...(result.reasonCode ? { reasonCode: result.reasonCode } : {}),
        };
      }
      return {
        id: `${stamp}-empty-${index}`,
        fileName: result.fileName,
        status: "empty" as const,
        detail: "분류 가능한 텍스트 없음",
        candidateCount: 0,
        importedAt,
        reasonCode: "empty-extraction" as const,
      };
    }),
    ...unsupported.map((file, index) => ({
      id: `${stamp}-unsupported-${index}`,
      fileName: file.name,
      status: "unsupported" as const,
      detail: "지원 형식 아님",
      candidateCount: 0,
      importedAt,
      reasonCode: "unsupported-format" as const,
    })),
  ];
  const fileReports = allFileReports.slice(0, MAX_IMPORT_FILE_REPORTS);
  const hiddenFileReportCount = Math.max(0, allFileReports.length - fileReports.length);

  const failedNames = failed.map((result) => `${result.fileName}${result.error ? ` (${result.error})` : ""}`);
  if (nextCandidates.length === 0 && failed.length === supported.length && unsupported.length === 0) {
    return {
      nextCandidates,
      fileReports,
      notice: failed.length === 1
        ? failed[0].error ?? "파일을 읽지 못했습니다."
        : `읽기 실패 ${failed.length}개: ${summarizeImportFileNames(failedNames)}`,
    };
  }

  const reviewCount = nextCandidates.filter((candidate) => (
    getImportAlignmentWarnings(candidate, {
      targetLanguage: draft.targetLanguage,
      targetMarket: draft.targetMarket,
      publishPlatform: draft.publishPlatform,
      releasePurpose: draft.releasePurpose,
      targetEpisodeLength: draft.episodeLength,
      rightsNote: draft.rightsNote,
    }).length > 0
  )).length;
  const noticeParts = [
    nextCandidates.length > 0
      ? `${imported.filter((result) => result.candidates.length > 0).length}/${supported.length}개 파일에서 반영할 자료 ${nextCandidates.length}건을 분류했습니다.`
      : "읽은 파일에서 분류 가능한 텍스트를 찾지 못했습니다.",
    reviewCount > 0 ? `기준 확인 ${reviewCount}건은 검토 필요로 표시했습니다.` : null,
    unsupported.length > 0 ? `지원하지 않는 파일 ${unsupported.length}개는 건너뛰었습니다.` : null,
    failed.length > 0 ? `읽기 실패 ${failed.length}개: ${summarizeImportFileNames(failedNames)}` : null,
    empty.length > 0 ? `분류 항목 없음 ${empty.length}개: ${summarizeImportFileNames(empty.map((result) => result.fileName))}` : null,
    hiddenFileReportCount > 0 ? `파일별 결과 ${hiddenFileReportCount}개는 보관 한도 때문에 생략했습니다.` : null,
  ].filter(Boolean);

  return {
    nextCandidates,
    fileReports,
    notice: noticeParts.join(" "),
  };
}

export function appendCandidateToDraftValue(existing: string, candidate: ImportCandidate): string {
  const label = IMPORT_BUCKET_LABELS[candidate.bucket];
  const body = candidate.text.trim().slice(0, MAX_DRAFT_IMPORT_CHARS);
  const next = [`[가져온자료:${label}] ${candidate.title}`, body].filter(Boolean).join("\n");
  return existing.trim() ? `${existing.trim()}\n\n${next}` : next;
}

export function upsertAcceptedImportCandidate(
  existing: AcceptedImportCandidateRecord[] | undefined,
  entry: AcceptedImportCandidateRecord,
): AcceptedImportCandidateRecord[] {
  return [entry, ...(existing ?? []).filter((item) => item.id !== entry.id)].slice(0, MAX_ACCEPTED_IMPORT_CANDIDATES);
}

export function mergeImportFileReports(
  existing: ImportFileReportRecord[] | undefined,
  next: ImportFileReportRecord[],
): ImportFileReportRecord[] {
  const nextIds = new Set(next.map((item) => item.id));
  return [...next, ...(existing ?? []).filter((item) => !nextIds.has(item.id))].slice(0, MAX_IMPORT_FILE_REPORTS);
}

export function isSameImportFileReportList(a: ImportFileReportRecord[], b: ImportFileReportRecord[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const next = b[index];
    return Boolean(next)
      && item.id === next.id
      && item.fileName === next.fileName
      && item.status === next.status
      && item.detail === next.detail
      && item.candidateCount === next.candidateCount
      && item.importedAt === next.importedAt;
  });
}

export function buildAcceptedImportCandidateRecord(
  candidate: ImportCandidate,
  options: {
    appliedBasisSuggestions: boolean;
    alignmentWarnings: ReturnType<typeof getImportAlignmentWarnings>;
    basisSuggestions: ImportBasisUpdateSuggestion[];
  },
): AcceptedImportCandidateRecord {
  return {
    id: candidate.id,
    sourceFileName: candidate.sourceFileName,
    bucket: candidate.bucket,
    targetType: targetTypeForImport(candidate.bucket),
    title: candidate.title,
    text: candidate.text,
    excerpt: candidate.excerpt,
    confidence: candidate.confidence,
    reason: candidate.reason,
    detectedFormat: candidate.detectedFormat,
    sectionIndex: candidate.sectionIndex,
    charCount: candidate.charCount,
    importedAt: candidate.importedAt,
    acceptedAt: new Date().toISOString(),
    appliedBasisSuggestions: options.appliedBasisSuggestions,
    alignmentWarnings: options.alignmentWarnings.map((warning) => ({ ...warning })),
    basisSuggestions: options.basisSuggestions.map((suggestion) => ({ ...suggestion })),
  };
}

export function applyImportBasisSuggestionsToDraft(
  draft: ProjectDraft,
  suggestions: ImportBasisUpdateSuggestion[],
): ProjectDraft {
  return suggestions.reduce<ProjectDraft>((next, suggestion) => {
    if (suggestion.field === "targetLanguage") {
      return { ...next, targetLanguage: suggestion.value as ProjectDraft["targetLanguage"] };
    }
    if (suggestion.field === "targetMarket") {
      return { ...next, targetMarket: suggestion.value as ProjectTargetMarket };
    }
    if (suggestion.field === "publishPlatform") {
      return { ...next, publishPlatform: suggestion.value as PublishPlatform };
    }
    if (suggestion.field === "releasePurpose") {
      return { ...next, releasePurpose: suggestion.value as ProjectReleasePurpose };
    }
    if (suggestion.field === "rightsNote" && !next.rightsNote.trim()) {
      return { ...next, rightsNote: suggestion.value };
    }
    return next;
  }, draft);
}

export function applyImportBasisSuggestionsToConfig(
  config: StoryConfig,
  suggestions: ImportBasisUpdateSuggestion[],
): StoryConfig {
  return suggestions.reduce<StoryConfig>((next, suggestion) => {
    if (suggestion.field === "targetLanguage") {
      return { ...next, projectTargetLanguage: suggestion.value as StoryConfig["projectTargetLanguage"] };
    }
    if (suggestion.field === "targetMarket") {
      return { ...next, targetMarket: suggestion.value as StoryConfig["targetMarket"] };
    }
    if (suggestion.field === "publishPlatform") {
      return { ...next, publishPlatform: suggestion.value as StoryConfig["publishPlatform"] };
    }
    if (suggestion.field === "releasePurpose") {
      return { ...next, releasePurpose: suggestion.value as StoryConfig["releasePurpose"] };
    }
    return next;
  }, config);
}
