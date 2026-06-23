import type { buildWorkReceiptCoverageAudit, WorkReceiptCoverageStatus } from "@/lib/creative-process";
import { canShareFiles, shareManuscript, shareText } from "@/lib/browser/web-share";
import type { AuditSeverity, PublishAuditReport } from "@/lib/translation/publish-audit";
import { Check, Download, Quote, Shield, Sync } from "../icons";

export type TabExportAuditTarget = {
  label: string;
  content: string;
};

type WorkReceiptCoverage = ReturnType<typeof buildWorkReceiptCoverageAudit>;

type TabExportEvidenceSectionProps = {
  workReceiptCoverage: WorkReceiptCoverage;
  shareSupported: boolean;
  auditTarget: TabExportAuditTarget | null;
  sessionTitle: string | undefined;
  canExportProject: boolean;
  canExportSession: boolean;
  canExportAll: boolean;
  audit: PublishAuditReport | null;
  harnessLabel: string;
  receipt: string;
  onExportText: () => void;
  onExportEpub: () => void;
  onExportDocx: () => void;
  onExportHwpx: () => void;
  onExportAllJson: () => void;
  onRegenerateHarness: () => void;
  onRunAudit: () => void;
  onIssueReceipt: () => void;
};

const COVERAGE_STATUS_LABEL: Record<WorkReceiptCoverageStatus, string> = {
  covered: "기록됨",
  partial: "부분",
  missing: "누락",
  "not-applicable": "해당 없음",
};

function auditSevColor(severity: AuditSeverity): "amber" | "blue" | "gray" {
  if (severity === "high" || severity === "medium") return "amber";
  if (severity === "low") return "blue";
  return "gray";
}

export default function TabExportEvidenceSection({
  workReceiptCoverage,
  shareSupported,
  auditTarget,
  sessionTitle,
  canExportProject,
  canExportSession,
  canExportAll,
  audit,
  harnessLabel,
  receipt,
  onExportText,
  onExportEpub,
  onExportDocx,
  onExportHwpx,
  onExportAllJson,
  onRegenerateHarness,
  onRunAudit,
  onIssueReceipt,
}: TabExportEvidenceSectionProps) {
  return (
    <>
      <div className="pcard">
        <div className="pcard-h">
          <Quote size={15} />
          과정기록 커버리지
          <span
            className={
              "pill " +
              (workReceiptCoverage.status === "ready"
                ? "green"
                : workReceiptCoverage.status === "review"
                  ? "amber"
                  : "red")
              + " tex-push"
            }
          >
            {workReceiptCoverage.coveredCount}/{workReceiptCoverage.expectedCount}
          </span>
        </div>
        <div className="wr-srow tex-muted-row">
          {workReceiptCoverage.summaryKo}
        </div>
        <div className="tex-evidence-grid">
          {workReceiptCoverage.items.map((item) => (
            <div key={item.key} className="wr-srow tex-row-start">
              <span
                className={
                  "rdot " +
                  (item.status === "covered"
                    ? "green"
                    : item.status === "missing"
                      ? "amber"
                      : "gray")
                  + " tex-dot-top"
                }
              />
              <span className="tex-grow">
                <b>{item.labelKo}</b>
                <span className="tex-summary-detail">
                  {COVERAGE_STATUS_LABEL[item.status]}
                  {item.status === "missing" ? ` · ${item.missingKo}` : ""}
                  {item.status === "covered" && item.evidence[0]
                    ? ` · ${item.evidence[0].detail}`
                    : ""}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Download size={15} />
          내보내기
        </div>
        <div className="tex-action-row">
          <button type="button" className="mini-btn" disabled={!canExportProject} onClick={onExportText}>
            TXT 전체
          </button>
          <button type="button" className="mini-btn" disabled={!canExportSession} onClick={onExportEpub}>
            EPUB
          </button>
          <button type="button" className="mini-btn" disabled={!canExportSession} onClick={onExportDocx}>
            DOCX
          </button>
          <button type="button" className="mini-btn" disabled={!canExportSession} onClick={onExportHwpx}>
            HWPX
          </button>
          <button type="button" className="mini-btn" disabled={!canExportAll} onClick={onExportAllJson}>
            전체 백업 파일
          </button>
          {shareSupported ? (
            <button
              type="button"
              className="mini-btn"
              disabled={!auditTarget}
              onClick={() => {
                if (!auditTarget) return;
                const title = `${sessionTitle || "manuscript"} — ${auditTarget.label}`;
                void (async () => {
                  if (canShareFiles()) {
                    await shareManuscript(title, auditTarget.content, "txt");
                    return;
                  }
                  await shareText(title, auditTarget.content.slice(0, 4000));
                })();
              }}
            >
              시스템 공유
            </button>
          ) : null}
        </div>
        <div className="wr-srow tex-muted-row tex-row-spaced">
          원고 파일만이 아니라 설정집, 과정기록, 권리/IP 점검까지 묶는 출고 패키지 기준입니다.
        </div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Shield size={15} />
          출고 검수
          {audit ? (
            <span className={"pill tex-push " + (audit.findings.length === 0 ? "green" : "amber")}>
              {audit.findings.length === 0 ? "문제 없음" : `확인 ${audit.findings.length}건`}
            </span>
          ) : null}
        </div>
        <div className="wr-srow tex-muted-row">
          <span className="tex-grow">검수 기준: {harnessLabel}</span>
          <button type="button" className="mini-btn" onClick={onRegenerateHarness}>
            <Sync size={12} />
            다시 만들기
          </button>
        </div>
        <button type="button" className="btn tex-full-cta" disabled={!auditTarget} onClick={onRunAudit}>
          <Check size={14} />
          {auditTarget ? `검수 실행 · ${auditTarget.label}` : "검수할 저장 원고가 없습니다"}
        </button>
        {audit == null ? (
          <div className="wr-srow tex-muted-row tex-row-spaced">
            문장부호, 맞춤법, 띄어쓰기, 문장 길이, 미완 표식을 점검합니다.
          </div>
        ) : audit.findings.length === 0 ? (
          <div className="wr-srow tex-row-spaced">
            <span className="rdot green" />
            검출된 후보 없음
            <b>0건</b>
          </div>
        ) : (
          audit.findings.slice(0, 10).map((finding) => (
            <div key={finding.id} className="wr-srow tex-row-start">
              <span className={"rdot tex-dot-top " + auditSevColor(finding.severity)} />
              <span className="tex-grow">
                {finding.title}
                <span className="tex-summary-detail">
                  {finding.detail}
                  {finding.suggestion ? ` · ${finding.suggestion}` : ""}
                </span>
              </span>
            </div>
          ))
        )}
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Quote size={15} />
          작업 영수증
        </div>
        <button type="button" className="btn tex-full-cta" onClick={onIssueReceipt}>
          <Check size={14} />
          영수증 발급
        </button>
        {receipt ? (
          <pre className="wr-receipt-pre tex-receipt-pre">
            {receipt}
          </pre>
        ) : (
          <div className="wr-srow tex-muted-row tex-row-spaced">
            실제 실행한 점검과 보류된 항목을 분리해 기록합니다.
          </div>
        )}
      </div>
    </>
  );
}
