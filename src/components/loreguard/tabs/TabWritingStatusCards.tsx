import { Fragment } from "react";
import { Check, ChevronR, Clock, Layers, Pen, Plus, Shield, Sync } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

export interface VersionSnapshotRow {
  timestamp: number;
  label: string;
}

export function VersionSnapshotsCard({
  language,
  backups,
  armedRestore,
  restoring,
  canRestore,
  onRefresh,
  onArmRestore,
  onCancelRestore,
  onRestore,
}: {
  language: AppLanguage;
  backups: VersionSnapshotRow[];
  armedRestore: number | null;
  restoring: number | null;
  canRestore: boolean;
  onRefresh?: () => void;
  onArmRestore: (timestamp: number) => void;
  onCancelRestore: () => void;
  onRestore: (timestamp: number) => void;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Clock size={15} />
        {L4(language, { ko: "버전 스냅샷", en: "Version snapshots" })}
        {onRefresh && (
          <button type="button" className="mini-btn" style={{ marginLeft: "auto" }} onClick={onRefresh}>
            <Sync size={13} />
            {L4(language, { ko: "새로고침", en: "Refresh" })}
          </button>
        )}
      </div>
      {backups.length === 0 ? (
        <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
          {L4(language, { ko: "저장된 스냅샷이 없습니다", en: "No saved snapshots" })}
        </div>
      ) : (
        backups.map((backup) => (
          <Fragment key={backup.timestamp}>
            <div className="wr-srow">
              <span className="rdot blue" />
              {backup.label}
              {armedRestore === backup.timestamp ? (
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
                  <button
                    type="button"
                    className="mini-btn ok"
                    aria-label={L4(language, { ko: "복원 확인 — 현재 작업 대체", en: "Confirm restore — replaces current work" })}
                    disabled={restoring != null || !canRestore}
                    onClick={() => onRestore(backup.timestamp)}
                  >
                    <Check size={13} />
                    {L4(language, { ko: "확인", en: "Confirm" })}
                  </button>
                  <button
                    type="button"
                    className="mini-btn no"
                    aria-label={L4(language, { ko: "복원 취소", en: "Cancel restore" })}
                    onClick={onCancelRestore}
                  >
                    {L4(language, { ko: "취소", en: "Cancel" })}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="mini-btn"
                  style={{ marginLeft: "auto" }}
                  aria-label={`${L4(language, { ko: "버전 복원", en: "Restore version" })} — ${backup.label}`}
                  disabled={restoring != null || !canRestore}
                  onClick={() => onArmRestore(backup.timestamp)}
                >
                  {restoring === backup.timestamp
                    ? L4(language, { ko: "복원 중…", en: "Restoring…" })
                    : L4(language, { ko: "복원", en: "Restore" })}
                </button>
              )}
            </div>
            {armedRestore === backup.timestamp && (
              <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)" }}>
                <span className="rdot amber" />
                {L4(language, {
                  ko: "정말 복원할까요? 현재 작업이 대체됩니다",
                  en: "Restore this snapshot? Your current work will be replaced",
                })}
              </div>
            )}
          </Fragment>
        ))
      )}
    </div>
  );
}

export function ContaminationGuardCard({
  language,
  directorScore,
  hasReport,
  hasFindings,
  rows,
  onDetails,
}: {
  language: AppLanguage;
  directorScore: number | null;
  hasReport: boolean;
  hasFindings: boolean;
  rows: Array<[string, number]>;
  onDetails: () => void;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Shield size={15} />
        {L4(language, { ko: "문장 점검 요약", en: "Draft review summary" })}
        {directorScore != null && (
          <span className={"pill " + (hasFindings ? "amber" : "green")} style={{ marginLeft: "auto" }}>
            {hasFindings
              ? L4(language, { ko: "확인 필요", en: "Needs review" })
              : L4(language, { ko: "문제 없음", en: "No issues" })}
          </span>
        )}
      </div>
      {!hasReport ? (
        <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
          {L4(language, { ko: "노아 제안 후 점검 결과가 표시됩니다", en: "Review results appear after Noa suggestions" })}
        </div>
      ) : rows.length === 0 ? (
        <div className="wr-srow">
          <span className="rdot green" />
          {L4(language, { ko: "검출된 문제 없음", en: "No issues found" })}
          <b style={{ marginLeft: "auto" }}>{L4(language, { ko: "0건", en: "0" })}</b>
        </div>
      ) : (
        rows.map(([kind, count]) => (
          <div key={kind} className="wr-srow">
            <span className="rdot amber" />
            {kind}
            <b style={{ marginLeft: "auto" }}>{L4(language, { ko: `${count}건`, en: `${count}` })}</b>
          </div>
        ))
      )}
      <button
        type="button"
        className="btn"
        style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
        onClick={onDetails}
      >
        {L4(language, { ko: "메인 시나리오에서 자세히", en: "Details in main scenario" })} <ChevronR size={14} />
      </button>
    </div>
  );
}

export interface SelfCheckLabels {
  selfCheckTitle: string;
  selfCheckToggleAria: string;
  selfCheckCollapse: string;
  selfCheckExpand: string;
  rowDeclarative: string;
  rowExplanatory: string;
  rowRepeatedStart: string;
  advisoryCaption: string;
  countUnit: string;
  voiceNotice: string;
}

export function SelfCheckCard({
  labels,
  open,
  counts,
  onToggle,
}: {
  labels: SelfCheckLabels;
  open: boolean;
  counts: {
    declarativeEndings: number;
    explanatoryEndings: number;
    repeatedStartPairs: number;
  };
  onToggle: () => void;
}) {
  const rows = [
    [labels.rowDeclarative, counts.declarativeEndings],
    [labels.rowExplanatory, counts.explanatoryEndings],
    [labels.rowRepeatedStart, counts.repeatedStartPairs],
  ] as const;

  return (
    <div className="pcard">
      <div className="pcard-h">
        <Pen size={15} />
        {labels.selfCheckTitle}
        <button
          type="button"
          className="mini-btn"
          style={{ marginLeft: "auto" }}
          aria-expanded={open}
          aria-label={labels.selfCheckToggleAria}
          onClick={onToggle}
        >
          {open ? labels.selfCheckCollapse : labels.selfCheckExpand}
        </button>
      </div>
      {open && (
        <>
          {rows.map(([label, count]) => (
            <div key={label} className="wr-srow" style={{ alignItems: "flex-start" }}>
              <span className="rdot gray" style={{ marginTop: 5 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                {label}
                <span style={{ display: "block", color: "var(--c-sub, #888)", fontSize: 11.5 }}>
                  {labels.advisoryCaption}
                </span>
              </span>
              <b>
                {count.toLocaleString()}
                {labels.countUnit}
              </b>
            </div>
          ))}
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 8 }}>
            {labels.voiceNotice}
          </div>
        </>
      )}
    </div>
  );
}

export interface WorkQueueStage {
  stage: string;
  status: string;
  score?: number | null;
}

export function WorkQueueCard({
  language,
  stages,
  stageLabel,
  stageStatusLabel,
}: {
  language: AppLanguage;
  stages: WorkQueueStage[];
  stageLabel: Record<string, [string, string, string]>;
  stageStatusLabel: Record<string, string>;
}) {
  const stageStatusColor = (status: string): "green" | "amber" =>
    status === "passed" ? "green" : "amber";

  return (
    <div className="pcard">
      <div className="pcard-h">
        <Layers size={15} />
        {L4(language, { ko: "작업 큐", en: "Work queue" })}
      </div>
      {stages.length === 0 ? (
        <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
          {L4(language, { ko: "작업 실행 기록이 없습니다", en: "No pipeline runs yet" })}
        </div>
      ) : (
        <div className="wr-queue">
          {stages.map((stage) => {
            const [en, ko, avatar] = stageLabel[stage.stage] ?? [stage.stage, stage.stage, "S"];
            const color = stageStatusColor(stage.status);
            const pct = stage.status === "passed" ? 100 : stage.status === "running" ? 50 : stage.status === "failed" ? 100 : 0;
            return (
              <div key={stage.stage} className="wr-q">
                <div className={"wr-q-ic " + color}>
                  {color === "green" ? <Check size={14} /> : <Plus size={14} />}
                </div>
                <div className="wr-q-en">{en}</div>
                <div className="wr-q-ko">{ko}</div>
                <span className={"pill " + color}>{stageStatusLabel[stage.status] ?? stage.status}</span>
                <div className="tbar" style={{ marginTop: "8px" }}>
                  <span
                    style={{
                      width: pct + "%",
                      background: color === "green" ? "var(--c-green)" : "var(--c-amber)",
                    }}
                  />
                </div>
                <div className="wr-q-foot">
                  <span className="wr-q-av">{avatar}</span>
                  {stage.score != null
                    ? L4(language, { ko: "확인 완료", en: "Checked" })
                    : pct + "%"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LogDotColor = "green" | "amber" | "blue" | "gray";

function severityToDot(severity: number): LogDotColor {
  if (severity >= 2) return "amber";
  if (severity >= 1) return "blue";
  return "gray";
}

export interface SynthesisIssueRow {
  severity: number;
  category: string;
  message: string;
}

export interface SynthesisSummary {
  grade: string;
  aiTonePercent: number;
  eosScore: number;
}

export function SynthesisLogCard({
  language,
  issues,
  summary,
  timeLabel,
}: {
  language: AppLanguage;
  issues: SynthesisIssueRow[];
  summary: SynthesisSummary | null;
  timeLabel: string;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Clock size={15} />
        {L4(language, { ko: "합성 로그", en: "Synthesis log" })}
      </div>
      <div className="log">
        {issues.length === 0 ? (
          <div className="log-row">
            <span className="log-dot gray" />
            <span className="log-m">
              {L4(language, { ko: "아직 생성된 회차가 없습니다", en: "No episodes generated yet" })}
            </span>
          </div>
        ) : (
          issues.map((issue, index) => (
            <div key={`${issue.category}:${index}`} className="log-row">
              <span className={"log-dot " + severityToDot(issue.severity)} />
              {summary && <span className="log-t">{timeLabel}</span>}
              <span className="log-m">
                {issue.category}: {issue.message}
              </span>
            </div>
          ))
        )}
      </div>
      {summary && (
        <div className="wr-srow" style={{ marginTop: 8 }}>
          <span className="rdot green" />
          {L4(language, { ko: "등급", en: "Grade" })} {summary.grade} ·{" "}
          {L4(language, {
            ko: "표현 습관",
            en: "Writing style",
            ja: "表現のクセ",
            zh: "表达习惯",
          })}{" "}
          {summary.aiTonePercent}%
          <b style={{ marginLeft: "auto" }}>EOS {summary.eosScore}</b>
        </div>
      )}
    </div>
  );
}
