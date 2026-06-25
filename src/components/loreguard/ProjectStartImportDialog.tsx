"use client";

import { useRef, type ChangeEvent } from "react";
import CandidateDecisionCard, {
  type CandidateDecisionStatus,
} from "@/components/loreguard/CandidateDecisionCard";
import {
  IMPORT_FILE_REPORT_LABELS_UI,
} from "@/components/loreguard/ProjectStart.shared";
import {
  normalizeImportFileReportDetail,
} from "@/components/loreguard/ProjectStart.draft-helpers";
import { X } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import {
  IMPORT_BUCKET_LABELS,
  PROJECT_START_IMPORT_ACCEPT,
  type ImportCandidate,
} from "@/lib/loreguard/import-classifier";
import type { ImportAlignmentWarning } from "@/lib/loreguard/import-project-alignment";
import type { AppLanguage, ImportFileReportRecord } from "@/lib/studio-types";

interface ProjectStartImportDialogProps {
  open: boolean;
  language: AppLanguage;
  importNotice: string | null;
  visibleImportFileReports: ImportFileReportRecord[];
  importBucketSummary: Record<string, number>;
  importCandidates: ImportCandidate[];
  importAlignmentWarnings: Record<string, ImportAlignmentWarning[]>;
  candidateStatuses: Record<string, CandidateDecisionStatus>;
  acceptedCandidateSet: Set<string>;
  onClose: () => void;
  onImportFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onHoldCandidate: (candidate: ImportCandidate) => void;
  onAcceptCandidate: (candidate: ImportCandidate) => void;
  onDiscardCandidate: (candidate: ImportCandidate) => void;
}

export function ProjectStartImportDialog({
  open,
  language,
  importNotice,
  visibleImportFileReports,
  importBucketSummary,
  importCandidates,
  importAlignmentWarnings,
  candidateStatuses,
  acceptedCandidateSet,
  onClose,
  onImportFiles,
  onHoldCandidate,
  onAcceptCandidate,
  onDiscardCandidate,
}: ProjectStartImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  return (
    <div className="lg-candidate-modal-backdrop ps-import-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        id="project-import"
        className="lg-candidate-modal ps-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-import-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lg-candidate-modal-head">
          <div>
            <div className="lg-candidate-modal-kicker">
              {L4(language, { ko: "파일 가져오기", en: "Import files", ja: "ファイルから読み込み", zh: "从文件导入" })}
            </div>
            <h2 id="ps-import-dialog-title">
              {L4(language, { ko: "읽은 자료 검토", en: "Imported material review", ja: "読み込み資料の確認", zh: "导入资料检查" })}
            </h2>
            <p>{L4(language, {
              ko: "파일은 작품에 바로 섞이지 않습니다. 먼저 읽은 자료로 분류하고, 작가가 고른 항목만 기준표에 들어갑니다.",
              en: "Files are not merged directly. They are classified first, and only accepted items enter the basis board.",
              ja: "ファイルは作品へ直接混ぜません。先に資料として分類し、作者が反映した項目だけ基準板に入ります。",
              zh: "文件不会直接并入作品。系统会先分类为导入资料，只有作者确认的条目会进入基准板。",
            })}</p>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            aria-label={L4(language, { ko: "가져오기 창 닫기", en: "Close import dialog", ja: "読み込み画面を閉じる", zh: "关闭导入窗口" })}
          >
            <X size={16} />
          </button>
        </div>
        <div className="lg-candidate-modal-body">
          <div className="ps-import-dialog-picker">
            <div>
              <strong>{L4(language, { ko: "자료 선택", en: "Choose material", ja: "資料を選択", zh: "选择资料" })}</strong>
              <p>{L4(language, {
                ko: "TXT, MD, JSON, DOCX, HWPX, PDF, EPUB을 지원합니다. HWP는 한글에서 HWPX로 저장한 뒤 불러오세요.",
                en: "TXT, MD, JSON, DOCX, HWPX, PDF, and EPUB are supported. Save legacy HWP as HWPX first.",
                ja: "TXT、MD、JSON、DOCX、HWPX、PDF、EPUBに対応します。旧HWPはHWPXで保存してから読み込んでください。",
                zh: "支持 TXT、MD、JSON、DOCX、HWPX、PDF、EPUB。旧 HWP 请先另存为 HWPX。",
              })}</p>
            </div>
            <button
              type="button"
              className="btn primary ps-import-file-button"
              onClick={() => fileInputRef.current?.click()}
            >
              {L4(language, { ko: "파일 선택", en: "Choose files", ja: "ファイルを選択", zh: "选择文件" })}
            </button>
            <input
              ref={fileInputRef}
              className="ps-import-file-input"
              type="file"
              hidden
              accept={PROJECT_START_IMPORT_ACCEPT}
              multiple
              onChange={onImportFiles}
            />
          </div>
          {importNotice && <div className="ps-import-notice">{importNotice}</div>}
          {visibleImportFileReports.length > 0 && (
            <div className="ps-import-file-reports" aria-label={L4(language, { ko: "파일별 읽기 결과", en: "Import result by file", ja: "ファイル別読み込み結果", zh: "按文件显示导入结果" })}>
              {visibleImportFileReports.map((report) => (
                <div key={report.id} className={`ps-import-file-report ${report.status}`}>
                  <span>{L4(language, IMPORT_FILE_REPORT_LABELS_UI[report.status])}</span>
                  <strong>{report.fileName}</strong>
                  <small>{normalizeImportFileReportDetail(report.detail)}</small>
                </div>
              ))}
            </div>
          )}
          {Object.keys(importBucketSummary).length > 0 && (
            <div className="ps-import-buckets" aria-label={L4(language, { ko: "읽은 자료 분류 요약", en: "Imported material summary", ja: "読み込み資料の分類概要", zh: "导入资料分类摘要" })}>
              {Object.entries(importBucketSummary).map(([label, count]) => (
                <span key={label}>
                  {label} {count}
                </span>
              ))}
            </div>
          )}
          <div className="ps-candidates">
            {importCandidates.length === 0 ? (
              <div className="ps-candidate empty">
                <span>{L4(language, { ko: "자료를 기다리는 중", en: "Waiting for material", ja: "資料待ち", zh: "等待资料" })}</span>
                <p>{L4(language, {
                  ko: "기존 설정집, 원고, 권리 메모 파일을 선택하면 읽은 자료가 여기에 쌓입니다.",
                  en: "Choose bibles, manuscripts, or rights notes and imported material will appear here.",
                  ja: "既存の設定集、原稿、権利メモを選ぶと読み込み資料がここに表示されます。",
                  zh: "选择已有设定集、正文或权利备注后，导入资料会显示在这里。",
                })}</p>
              </div>
            ) : (
              importCandidates.slice(0, 8).map((candidate) => {
                const alignmentWarnings = importAlignmentWarnings[candidate.id] ?? [];
                const hasAlignmentWarnings = alignmentWarnings.length > 0;
                const meta = [
                  candidate.sourceFileName,
                  candidate.detectedFormat.toUpperCase(),
                  `${candidate.charCount.toLocaleString()}자`,
                  `${Math.round(candidate.confidence * 100)}%`,
                  candidate.reason,
                  hasAlignmentWarnings ? `기준 확인 ${alignmentWarnings.length}건` : null,
                ].filter(Boolean).join(" · ");
                const body = candidate.text || candidate.excerpt || "내용 미리보기 없음";
                return (
                  <CandidateDecisionCard
                    key={candidate.id}
                    title={candidate.title}
                    subtitle={`${IMPORT_BUCKET_LABELS[candidate.bucket]}${hasAlignmentWarnings ? " · 기준 확인" : ""}`}
                    meta={meta}
                    notices={alignmentWarnings}
                    body={body}
                    status={candidateStatuses[candidate.id] ?? (acceptedCandidateSet.has(candidate.id) ? "accepted" : hasAlignmentWarnings ? "review" : "candidate")}
                    acceptLabel={hasAlignmentWarnings
                      ? L4(language, { ko: "검토 후 반영", en: "Apply after review", ja: "確認後に反映", zh: "检查后写入" })
                      : L4(language, { ko: "작품 기준에 반영", en: "Apply to work basis", ja: "作品基準に反映", zh: "写入作品基准" })}
                    language={language}
                    onHold={() => onHoldCandidate(candidate)}
                    onAccept={() => onAcceptCandidate(candidate)}
                    onDiscard={() => onDiscardCandidate(candidate)}
                  />
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
