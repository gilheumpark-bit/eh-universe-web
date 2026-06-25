import type { Dispatch, SetStateAction } from "react";
import { Check, Flag, Layers, Quote, Scale, Shield, Sync } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, EpisodeManuscript } from "@/lib/studio-types";
import type { PublishAuditReport, AuditSeverity } from "@/lib/translation/publish-audit";
import type { PlatformFit, PlatformSpec } from "@/lib/desktop/export-spec";
import type { IPReadinessParts, IPReadinessResult } from "@/lib/creative/ip-readiness";

type AuditTarget = { label: string; content: string } | null;

export function EpisodeManuscriptsCard({
  language,
  manuscripts,
  currentEpisode,
}: {
  language: AppLanguage;
  manuscripts: ReadonlyArray<EpisodeManuscript>;
  currentEpisode: number;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Layers size={15} />
        {L4(language, { ko: "회차 원고", en: "Episode manuscripts" })}
        <span className="pill gray wr-push">
          {L4(language, { ko: `${manuscripts.length}편`, en: `${manuscripts.length} episodes` })}
        </span>
      </div>
      {manuscripts.length === 0 ? (
        <div className="wr-srow wr-muted-row">
          {L4(language, { ko: "저장된 회차 원고가 없습니다", en: "No saved episode manuscripts" })}
        </div>
      ) : (
        manuscripts.map((manuscript, index) => (
          <div key={`${manuscript.episode}-${index}`} className="wr-srow">
            <span className={"rdot " + (manuscript.episode === currentEpisode ? "green" : "gray")} />
            EP.{manuscript.episode} {manuscript.title || L4(language, { ko: "무제", en: "Untitled" })}
            <b>
              {L4(language, {
                ko: `${(manuscript.charCount ?? manuscript.content.length).toLocaleString()}자`,
                en: `${(manuscript.charCount ?? manuscript.content.length).toLocaleString()} chars`,
              })}
            </b>
          </div>
        ))
      )}
    </div>
  );
}

export function ExportActionsCard({
  language,
  canExportProject,
  canExportSession,
  canExportAll,
  shareSupported,
  canShareCurrent,
  onExportTxt,
  onExportEPUB,
  onExportDOCX,
  onExportHWPX,
  onExportFullBackup,
  onShareCurrent,
}: {
  language: AppLanguage;
  canExportProject: boolean;
  canExportSession: boolean;
  canExportAll: boolean;
  shareSupported: boolean;
  canShareCurrent: boolean;
  onExportTxt: () => void;
  onExportEPUB: () => void;
  onExportDOCX: () => void;
  onExportHWPX: () => void;
  onExportFullBackup: () => void;
  onShareCurrent: () => void;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Quote size={15} />
        {L4(language, { ko: "내보내기", en: "Export" })}
      </div>
      <div className="wr-action-wrap">
        <button type="button" className="mini-btn" disabled={!canExportProject} onClick={onExportTxt}>
          {L4(language, { ko: "TXT (전 회차)", en: "TXT (all episodes)" })}
        </button>
        <button type="button" className="mini-btn" disabled={!canExportSession} onClick={onExportEPUB}>
          EPUB
        </button>
        <button type="button" className="mini-btn" disabled={!canExportSession} onClick={onExportDOCX}>
          DOCX
        </button>
        <button type="button" className="mini-btn" disabled={!canExportSession} onClick={onExportHWPX}>
          HWPX
        </button>
        <button type="button" className="mini-btn" disabled={!canExportAll} onClick={onExportFullBackup}>
          {L4(language, { ko: "전체 백업 파일", en: "Full backup file" })}
        </button>
        {shareSupported && (
          <button
            type="button"
            className="mini-btn"
            disabled={!canShareCurrent}
            aria-label={L4(language, {
              ko: "현재 원고를 OS 공유 시트로 공유",
              en: "Share the current manuscript via the OS share sheet",
            })}
            onClick={onShareCurrent}
          >
            {L4(language, { ko: "공유 (OS)", en: "Share (OS)" })}
          </button>
        )}
      </div>
      <div className="wr-srow wr-muted-row wr-gap-top">
        {L4(language, {
          ko: "전체 백업 파일은 모든 프로젝트를 포함합니다 — 재해 복구용",
          en: "The full backup file includes every project — for disaster recovery",
        })}
      </div>
    </div>
  );
}

function auditSevColor(sev: AuditSeverity): "amber" | "blue" | "gray" {
  if (sev === "high" || sev === "medium") return "amber";
  if (sev === "low") return "blue";
  return "gray";
}

function readinessLabel(language: AppLanguage, score: number): string {
  if (score >= 80) return L4(language, { ko: "제안 준비", en: "Ready to pitch" });
  if (score >= 55) return L4(language, { ko: "보강 권장", en: "Needs polishing" });
  return L4(language, { ko: "필수 보강", en: "Needs essentials" });
}

export function PublishAuditCard({
  language,
  audit,
  auditTarget,
  harnessSummary,
  onRunAudit,
  onRegenerateHarness,
}: {
  language: AppLanguage;
  audit: PublishAuditReport | null;
  auditTarget: AuditTarget;
  harnessSummary: string;
  onRunAudit: () => void;
  onRegenerateHarness: () => void;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Shield size={15} />
        {L4(language, { ko: "출고 검수", en: "Publish audit" })}
        {audit && (
          <span
            className={"pill wr-push " + (audit.findings.length === 0 ? "green" : "amber")}
          >
            {audit.findings.length === 0
              ? L4(language, { ko: "문제 없음", en: "No issues" })
              : L4(language, { ko: `확인 ${audit.findings.length}건`, en: `${audit.findings.length} to review` })}
          </span>
        )}
      </div>
      <div className="wr-srow wr-muted-row">
        <span className="wr-row-body">
          {L4(language, { ko: "검수 기준: ", en: "Review set: " })}
          {harnessSummary}
        </span>
        <button
          type="button"
          className="mini-btn"
          aria-label={L4(language, { ko: "검수 기준 다시 만들기", en: "Regenerate review set" })}
          title={L4(language, {
            ko: "현재 장르·등급·플랫폼 기준으로 검증 셋을 다시 생성",
            en: "Rebuild the check set from current genre, grade, and platform",
          })}
          onClick={onRegenerateHarness}
        >
          <Sync size={12} />
          {L4(language, { ko: "재생성", en: "Rebuild" })}
        </button>
      </div>
      <button
        type="button"
        className="btn wr-full-action"
        disabled={!auditTarget}
        onClick={onRunAudit}
      >
        <Check size={14} />
        {auditTarget
          ? L4(language, { ko: `검수 실행 — ${auditTarget.label}`, en: `Run audit — ${auditTarget.label}` })
          : L4(language, { ko: "검수할 원고가 없습니다", en: "No manuscript to audit" })}
      </button>
      {audit == null ? (
        <div className="wr-srow wr-muted-row wr-gap-top">
          {L4(language, {
            ko: "문장부호·맞춤법·띄어쓰기·문장 길이·미완 표식 검사",
            en: "Checks punctuation, spelling, spacing, sentence length, and unfinished markers",
          })}
        </div>
      ) : audit.findings.length === 0 ? (
        <div className="wr-srow wr-gap-top">
          <span className="rdot green" />
          {L4(language, { ko: "검출된 문제 없음", en: "No issues found" })}
          <b>{L4(language, { ko: "0건", en: "0" })}</b>
        </div>
      ) : (
        audit.findings.map((finding) => (
          <div key={finding.id} className="wr-srow wr-row-top">
            <span className={"rdot wr-dot-top " + auditSevColor(finding.severity)} />
            <span className="wr-row-body">
              {finding.title}
              <span className="wr-row-detail">
                {finding.detail}
                {finding.suggestion ? ` · ${finding.suggestion}` : ""}
              </span>
            </span>
          </div>
        ))
      )}
      {audit && (
        <div className="wr-srow wr-muted-row wr-gap-top">
          {L4(language, {
            ko: `${audit.stats.totalChars.toLocaleString()}자 · 문단 ${audit.stats.totalParagraphs}개 · 대사 ${Math.round(audit.stats.dialogueRatio * 100)}%`,
            en: `${audit.stats.totalChars.toLocaleString()} chars · ${audit.stats.totalParagraphs} paragraphs · dialogue ${Math.round(audit.stats.dialogueRatio * 100)}%`,
          })}
        </div>
      )}
    </div>
  );
}

export function PlatformFitCard({
  language,
  auditTarget,
  platformFits,
}: {
  language: AppLanguage;
  auditTarget: AuditTarget;
  platformFits: ReadonlyArray<{ spec: PlatformSpec; fit: PlatformFit }>;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Scale size={15} />
        {L4(language, { ko: "플랫폼 자수 적합", en: "Platform length fit" })}
      </div>
      {platformFits.length === 0 ? (
        <div className="wr-srow wr-muted-row">
          {L4(language, { ko: "검수할 원고가 없습니다", en: "No manuscript to check" })}
        </div>
      ) : (
        <>
          <div className="wr-srow wr-muted-row">
            {L4(language, {
              ko: `기준: ${auditTarget?.label ?? ""} · ${platformFits[0].fit.chars.toLocaleString()}자 (공백 포함)`,
              en: `Target: ${auditTarget?.label ?? ""} · ${platformFits[0].fit.chars.toLocaleString()} chars (incl. spaces)`,
            })}
          </div>
          {platformFits.map(({ spec, fit }) => (
            <div key={spec.id} className="wr-srow">
              <span className={"rdot " + (fit.withinRange ? "green" : "amber")} />
              <span className="wr-row-body">
                {spec.label} {spec.minChars.toLocaleString()}~{spec.maxChars.toLocaleString()}
                <span className="wr-row-detail">
                  기준일 {fit.checkedAt} · {fit.unitLabelKo} · {spec.sourceSummaryKo}
                </span>
              </span>
              <b>{fit.note}</b>
            </div>
          ))}
          <div className="wr-srow wr-muted-row wr-gap-top">
            {L4(language, {
              ko: "참고용 — 기준 범위를 벗어나도 내보내기는 계속할 수 있습니다",
              en: "Advisory — exporting is never blocked even when out of range",
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function IpReadinessCard({
  language,
  ipParts,
  setIpParts,
  ipResult,
}: {
  language: AppLanguage;
  ipParts: IPReadinessParts;
  setIpParts: Dispatch<SetStateAction<IPReadinessParts>>;
  ipResult: IPReadinessResult;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Flag size={15} />
        {L4(language, { ko: "IP 준비도", en: "IP readiness" })}
        <span className="pill gray wr-push">
          {readinessLabel(language, ipResult.score)}
        </span>
      </div>
      {(
        [
          ["rights", { ko: "권리성", en: "Rights" }],
          ["market", { ko: "시장성", en: "Market" }],
          ["adaptation", { ko: "매체전환성", en: "Adaptation" }],
          ["assetPackage", { ko: "패키지성", en: "Asset package" }],
          ["riskControl", { ko: "리스크관리", en: "Risk control" }],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="wr-srow wr-tight-row">
          <span className="wr-range-label">{L4(language, label)}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={ipParts[key]}
            aria-label={L4(language, {
              ko: `IP 준비도 — ${label.ko} 자가 평가`,
              en: `IP readiness — self-assessed ${label.en}`,
            })}
            onChange={(event) => setIpParts((state) => ({ ...state, [key]: Number(event.target.value) }))}
            className="wr-range-input"
          />
          <b className="wr-range-value">{readinessLabel(language, ipParts[key])}</b>
        </div>
      ))}
      <div className="wr-srow wr-muted-row wr-gap-top">
        {L4(language, {
          ko: "작가 자가 평가를 바탕으로 보강할 위치를 먼저 보여줍니다.",
          en: "Shows where to strengthen first from the author's self-assessment.",
        })}
      </div>
    </div>
  );
}

export function WorkReceiptCard({
  language,
  receipt,
  onIssueReceipt,
}: {
  language: AppLanguage;
  receipt: string;
  onIssueReceipt: () => void;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Quote size={15} />
        {L4(language, { ko: "과정기록 요약", en: "Process summary" })}
      </div>
      <button
        type="button"
        className="btn wr-full-action"
        onClick={onIssueReceipt}
      >
        <Check size={14} />
        {L4(language, { ko: "요약 남기기", en: "Save summary" })}
      </button>
      {receipt ? (
        <pre
          className="wr-receipt-pre"
        >
          {receipt}
        </pre>
      ) : (
        <div className="wr-srow wr-muted-row wr-gap-top">
          {L4(language, {
            ko: "검수, 플랫폼 적합, 권리/IP 점검 내역을 과정기록으로 남깁니다.",
            en: "Saves audit, platform fit, and rights/IP checks into the process record.",
          })}
        </div>
      )}
    </div>
  );
}
