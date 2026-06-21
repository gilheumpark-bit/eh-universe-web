import { useMemo, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import type { EpisodeManuscript } from "@/lib/studio-types";
import { analyzeRevision } from "@/lib/writing-workspace/revision-analysis";
import {
  buildRevisionReport,
  type RevisionReportFinding,
  type RevisionReportSeverity,
} from "@/lib/writing-workspace/revision-report";
import { buildRevisionDecisionRecordFromKey } from "@/lib/writing-workspace/revision-decision-record";
import { buildRevisionApplyPlan } from "@/lib/writing-workspace/revision-apply-plan";
import { appendDecision, loadJournal, type ReceiptDecision, type ReceiptJournalEntry } from "@/lib/creative/work-receipt-journal";
import { scanAISignature } from "@/lib/creative/ai-signature-scan";
import { analyzeRhythm } from "@/lib/creative/rhythm-analysis";
import {
  auditManuscript,
  auditVerdict,
  type AuditPerspective,
  type AuditSeverity,
} from "@/lib/creative/qa-auditor";
import { auditMechanicalDefects } from "@/lib/creative/mechanical-defect-audit";
import { computeIntegratedGrade } from "@/lib/creative/integrated-grade";
import IdeResizablePanel, { type IdeCollapsedSummaryItem } from "../IdeResizablePanel";
import { Alert, Book, Check, Edit, Layers, Plus, Scale, Shield, Wand } from "../icons";

const REVISION_SOURCE_LABEL: Record<RevisionReportFinding["source"], string> = {
  "local-revision": "기본 점검",
  mechanical: "원고 결함",
  "ai-report": "노아 보고서",
};

const DECISION_LABEL: Record<ReceiptDecision, string> = {
  approved: "승인",
  rejected: "보류",
};

const REVISION_IMPORTANCE_LABEL: Record<RevisionReportSeverity, string> = {
  high: "중요",
  medium: "확인",
  low: "참고",
};

const CRITIQUE_ORDER: readonly AuditPerspective[] = ["consistency", "outsider", "refuter", "structure"];

const CRITIQUE_LABEL: Record<AuditPerspective, string> = {
  consistency: "편집자",
  outsider: "평론가",
  refuter: "동료 작가",
  structure: "구조 감평",
};

const CRITIQUE_IMPORTANCE_LABEL: Record<AuditSeverity, string> = {
  high: "중요",
  mid: "확인",
  low: "참고",
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sortManuscripts(list: EpisodeManuscript[] | undefined): EpisodeManuscript[] {
  return [...(list ?? [])].sort((a, b) => a.episode - b.episode);
}

function compactPreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 1600) return trimmed;
  return `${trimmed.slice(0, 1600).trimEnd()}\n\n...`;
}

function compactCount(value: number): string {
  if (value >= 10000) return `${Math.round(value / 1000) / 10}만`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

function compactGrade(grade: string): string {
  if (grade === "대성공") return "대성";
  if (grade === "성공상위") return "상위";
  return grade;
}

function decisionMapFromJournal(
  findings: RevisionReportFinding[],
  journal: ReceiptJournalEntry[] = loadJournal(),
): Record<string, ReceiptDecision> {
  const keys = new Set(findings.map((finding) => finding.decisionKey));
  const decisions: Record<string, ReceiptDecision> = {};
  for (const entry of journal) {
    if (!keys.has(entry.fixId)) continue;
    if (decisions[entry.fixId]) continue;
    decisions[entry.fixId] = entry.decision;
  }
  return decisions;
}

export default function TabRevision() {
  const { currentSession, createNewSession } = useStudio();
  const config = currentSession?.config ?? null;
  const manuscripts = useMemo(() => sortManuscripts(config?.manuscripts), [config?.manuscripts]);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [revisionJournal, setRevisionJournal] = useState<ReceiptJournalEntry[]>(() => loadJournal());

  const currentEpisode = config?.episode ?? null;
  const target =
    manuscripts.find((item) => item.episode === (selectedEpisode ?? currentEpisode)) ??
    manuscripts[manuscripts.length - 1] ??
    null;
  const text = target?.content ?? "";
  const hasText = text.trim().length > 0;

  const metrics = useMemo(() => analyzeRevision(text), [text]);
  const signature = useMemo(() => scanAISignature(text), [text]);
  const rhythm = useMemo(() => analyzeRhythm(text), [text]);
  const qaFindings = useMemo(() => auditManuscript(text), [text]);
  const qaVerdict = useMemo(() => auditVerdict(qaFindings), [qaFindings]);
  const mechanicalAudit = useMemo(() => auditMechanicalDefects(text), [text]);
  const refreshRevisionJournal = () => setRevisionJournal(loadJournal());
  const revisionReport = useMemo(
    () =>
      buildRevisionReport({
        text,
        sessionId: currentSession?.id ?? null,
        episode: target?.episode ?? null,
        generatedAt: target?.lastUpdate ?? null,
      }),
    [currentSession?.id, target?.episode, target?.lastUpdate, text],
  );
  const revisionDecisions = useMemo(
    () => decisionMapFromJournal(revisionReport.findings, revisionJournal),
    [revisionReport.findings, revisionJournal],
  );
  const mechanicalReportFindings = useMemo(
    () => revisionReport.findings.filter((finding) => finding.source === "mechanical"),
    [revisionReport],
  );
  const revisionApplyPlan = useMemo(
    () =>
      buildRevisionApplyPlan({
        text,
        candidates: mechanicalReportFindings
          .map((finding, index) => {
            const mechanicalFinding = mechanicalAudit.findings[index];
            if (!mechanicalFinding) return null;
            return {
              finding: mechanicalFinding,
              decisionKey: finding.decisionKey,
              decision: revisionDecisions[finding.decisionKey],
            };
          })
          .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null),
      }),
    [mechanicalAudit.findings, mechanicalReportFindings, revisionDecisions, text],
  );
  const decisionCounts = useMemo(() => {
    const values = Object.values(revisionDecisions);
    return {
      approved: values.filter((decision) => decision === "approved").length,
      rejected: values.filter((decision) => decision === "rejected").length,
    };
  }, [revisionDecisions]);
  const grade = useMemo(() => {
    const sheet = config?.episodeSceneSheets?.find((item) => item.episode === target?.episode);
    const hasWorld = Boolean(config?.corePremise?.trim() || config?.worldHistory?.trim() || config?.worldSimData);
    const hasCharacter = Boolean(config?.characters?.some((character) => character.name.trim()));
    const hasScene = Boolean((config?.episodeSceneSheets?.length ?? 0) > 0);
    const hasDirection = Boolean(
      sheet?.directionSnapshot ||
        config?.sceneDirection ||
        sheet?.scenes?.some((scene) => scene.tone.trim() || scene.summary.trim()),
    );
    return computeIntegratedGrade({
      world: hasWorld ? 75 : 45,
      character: hasCharacter ? 75 : 45,
      scene: hasScene ? 75 : 45,
      direction: hasDirection ? 75 : 45,
      writing: clampScore(100 - signature.score),
      revision: clampScore(100 - metrics.tellPct - metrics.repetitionPct / 2),
    });
  }, [config, metrics.repetitionPct, metrics.tellPct, signature.score, target?.episode]);
  const revisionFindingCount = revisionReport.summary.total + qaFindings.length;
  const queueCollapsedSummary: IdeCollapsedSummaryItem[] = [
    { label: "원고", value: String(manuscripts.length), tone: manuscripts.length > 0 ? "blue" : "gray" },
    { label: "현재", value: target ? `EP${target.episode}` : "-", tone: hasText ? "green" : "gray" },
    {
      label: "자수",
      value: compactCount(target?.charCount ?? target?.content.length ?? 0),
      tone: hasText ? "blue" : "gray",
    },
  ];
  const inspectorCollapsedSummary: IdeCollapsedSummaryItem[] = [
    {
      label: "후보",
      value: String(revisionFindingCount),
      tone: revisionFindingCount > 0 ? "amber" : hasText ? "green" : "gray",
    },
    {
      label: "승인",
      value: String(decisionCounts.approved),
      tone: decisionCounts.approved > 0 ? "green" : "gray",
    },
    {
      label: "등급",
      value: compactGrade(grade.grade),
      tone: grade.weighted >= 80 ? "green" : grade.weighted >= 60 ? "amber" : "red",
    },
  ];

  const recordRevisionDecision = (finding: RevisionReportFinding, decision: ReceiptDecision) => {
    const record = buildRevisionDecisionRecordFromKey({
      decisionKey: finding.decisionKey,
      finding,
      decision,
    });
    appendDecision({
      id: record.id,
      at: target?.lastUpdate ?? currentSession?.lastUpdate ?? 0,
      fixId: record.fixId,
      decision,
      reason: record.reason,
      scoreDelta: null,
      context: {
        taskId: "loreguard-revision",
        role: "author-decision",
        actor: "author",
        decision: DECISION_LABEL[decision],
        sourceRefs: [
          {
            label: `EP.${target?.episode ?? 0} ${target?.title ?? ""}`.trim(),
          },
        ],
        },
        metrics: {
          chars: text.length,
          heldCount: decision === "rejected" ? 1 : 0,
        },
      });
    refreshRevisionJournal();
  };

  if (!currentSession || !config) {
    return (
      <div className="wd-grid">
        <section className="wd-center" style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--ink-2)" }}>
            <Wand size={40} style={{ color: "var(--ink-3)", marginBottom: 14 }} />
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>퇴고할 프로젝트가 없습니다</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 18 }}>
              먼저 프로젝트와 회차 원고를 만들면 퇴고 점검을 시작할 수 있습니다.
            </div>
            <button type="button" className="btn" onClick={() => createNewSession("writing")}>
              <Plus size={15} />
              프로젝트 만들기
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wd-grid">
      <IdeResizablePanel
        id="revision-manuscripts"
        side="left"
        className="wd-rail"
        ariaLabel="퇴고 원고함"
        stripLabel="원고"
        defaultWidth={240}
        minWidth={64}
        maxWidth={560}
        collapsedSummary={queueCollapsedSummary}
      >
        <div className="pcard-h">
          <Layers size={15} />
          퇴고 큐
        </div>
        {manuscripts.length === 0 ? (
          <div className="wr-srow" style={{ color: "var(--ink-3)" }}>저장 원고 없음</div>
        ) : (
          manuscripts.map((item) => {
            const active = item.episode === target?.episode;
            return (
              <button
                key={`${item.episode}-${item.lastUpdate}`}
                type="button"
                className="mini-btn"
                aria-pressed={active}
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  borderColor: active ? "var(--primary)" : "var(--line)",
                  background: active ? "color-mix(in srgb, var(--primary) 14%, var(--card-2))" : "var(--card-2)",
                }}
                onClick={() => setSelectedEpisode(item.episode)}
              >
                <span className={"rdot " + (active ? "green" : "gray")} />
                EP.{item.episode}
                <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>
                  {(item.charCount ?? item.content.length).toLocaleString()}자
                </span>
              </button>
            );
          })
        )}
      </IdeResizablePanel>

      <section className="wd-center">
        <div className="wd-chat card">
          <div className="wd-chat-head">
            <div className="wd-chat-title">
              <Wand size={17} />
              퇴고 모드
              <span className="wd-online">
                <span className={"rdot " + (hasText ? "green" : "gray")} />
                {hasText ? "점검 가능" : "원고 대기"}
              </span>
            </div>
            <span className="pill gray">검토 참고 · 작가 결정 영역</span>
          </div>

          {!hasText ? (
            <div className="wd-chat-body" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <Book size={40} style={{ color: "var(--ink-3)" }} />
              <strong>퇴고할 저장 원고가 없습니다</strong>
              <p className="wd-p" style={{ color: "var(--ink-3)", maxWidth: 520 }}>
                집필 탭에서 회차 원고를 저장하면 여기서 리듬, 반복, 감평 시스템, 출고 잔여를 이어서 볼 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="wd-chat-body">
              <div className="pcard">
                <div className="pcard-h">
                  <Edit size={15} />
                  EP.{target?.episode} {target?.title || "무제"}
                  <span className="pill gray" style={{ marginLeft: "auto" }}>
                    {metrics.chars.toLocaleString()}자
                  </span>
                </div>
                <pre
                  style={{
                    maxHeight: 260,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                    color: "var(--ink-2)",
                    fontSize: 13,
                    lineHeight: 1.75,
                    fontFamily: "var(--font-document, inherit)",
                  }}
                >
                  {compactPreview(text)}
                </pre>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <div className="pcard">
                  <div className="stat-label">원고 준비도</div>
                  <div className="stat-val">{grade.grade}</div>
                  <div className="stat-foot">먼저 볼 항목 · {grade.weakest}</div>
                </div>
                <div className="pcard">
                  <div className="stat-label">리듬 다양성</div>
                  <div className="stat-val">{metrics.sentenceVariety}</div>
                  <div className="stat-foot">평균 {rhythm.macro.avgLen}자 · 단락 {rhythm.macro.paragraphCount}</div>
                </div>
                <div className="pcard">
                  <div className="stat-label">반복/설명</div>
                  <div className="stat-val">{metrics.repetitionPct}%</div>
                  <div className="stat-foot">설명형 {metrics.tellPct}% · 대사 {metrics.dialoguePct}%</div>
                </div>
                <div className="pcard">
                  <div className="stat-label">표현 습관</div>
                  <div className="stat-val">{signature.score}</div>
                  <div className="stat-foot">어색한 표현 {signature.hits.length}건</div>
                </div>
              </div>

              <div className="pcard">
                <div className="pcard-h">
                  <Alert size={15} />
                  퇴고 후보
                  <span className="pill gray" style={{ marginLeft: "auto" }}>
                    {revisionReport.summary.total + qaFindings.length}건
                  </span>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  자동 점검 → 연결성 → 회차 → 묶음 → 최종판 → 작가 승인 순서로 봅니다.
                </div>
                {revisionReport.findings.length === 0 && qaFindings.length === 0 ? (
                  <div className="wr-srow">
                    <span className="rdot green" />
                    지금 원고에서 즉시 볼 큰 후보는 없습니다.
                  </div>
                ) : (
                  <>
                    {revisionReport.findings.slice(0, 12).map((finding) => {
                      const decision = revisionDecisions[finding.decisionKey];
                      return (
                        <div
                          key={finding.decisionKey}
                          className="wr-srow"
                          style={{ alignItems: "flex-start", gap: 10 }}
                        >
                          <span
                            className={"rdot " + (finding.severity === "high" ? "amber" : finding.severity === "medium" ? "blue" : "gray")}
                            style={{ marginTop: 5 }}
                          />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span>{REVISION_SOURCE_LABEL[finding.source]}</span>
                              <span className="pill gray">{REVISION_IMPORTANCE_LABEL[finding.severity]}</span>
                              {decision && <span className={"pill " + (decision === "approved" ? "green" : "amber")}>{DECISION_LABEL[decision]}</span>}
                            </span>
                            <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                              {finding.diagnosis || finding.suggestion || finding.type}
                            </span>
                            {finding.location && (
                              <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>
                                {finding.location}
                              </span>
                            )}
                            {finding.requiresAuthorDecision ? (
                              <span style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="mini-btn"
                                  onClick={() => recordRevisionDecision(finding, "approved")}
                                >
                                  승인
                                </button>
                                <button
                                  type="button"
                                  className="mini-btn"
                                  onClick={() => recordRevisionDecision(finding, "rejected")}
                                >
                                  보류
                                </button>
                              </span>
                            ) : (
                              <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5, marginTop: 4 }}>
                                참고 의견 — 원고 수정은 직접 판단합니다.
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                    {qaFindings.slice(0, 6).map((finding, index) => (
                      <div key={`${finding.perspective}-${index}`} className="wr-srow" style={{ alignItems: "flex-start" }}>
                        <span className={"rdot " + (finding.severity === "high" ? "amber" : "gray")} style={{ marginTop: 5 }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span className="pill gray">{CRITIQUE_LABEL[finding.perspective]}</span>
                            <span className="pill gray">{CRITIQUE_IMPORTANCE_LABEL[finding.severity]}</span>
                          </span>
                          <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                            {finding.issue}
                          </span>
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="pcard">
                <div className="pcard-h">
                  <Check size={15} />
                  승인한 수정 후보
                  <span className="pill gray" style={{ marginLeft: "auto" }}>
                    {revisionApplyPlan.patches.length}개 적용 후보
                  </span>
                </div>
                <div className="wr-srow">
                  승인 <b>{decisionCounts.approved}</b>
                </div>
                <div className="wr-srow">
                  보류 <b>{decisionCounts.rejected}</b>
                </div>
                <div className="wr-srow">
                  건너뜀 <b>{revisionApplyPlan.skipped.length}</b>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  되돌릴 기준점 준비됨
                </div>
                {revisionApplyPlan.patches[0] && (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--ink-2)" }}>
                    첫 후보: “{revisionApplyPlan.patches[0].before}” → “{revisionApplyPlan.patches[0].after}”
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <IdeResizablePanel
        id="revision-inspector"
        side="right"
        className="wd-board"
        ariaLabel="퇴고 보조 패널"
        stripLabel="보조"
        defaultWidth={420}
        minWidth={300}
        maxWidth={920}
        collapsedSummary={inspectorCollapsedSummary}
      >
        <div className="wr-panel-head" style={{ marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Wand size={15} />
            퇴고 보조 패널
          </span>
          <span className="pill gray">작가 결정</span>
        </div>
        <div className="pcard">
          <div className="pcard-h">
            <Shield size={15} />
            감평 시스템
            <span className={"pill " + (qaVerdict.passed ? "green" : "amber")} style={{ marginLeft: "auto" }}>
              {qaVerdict.passed ? "통과" : "검토"}
            </span>
          </div>
          {CRITIQUE_ORDER.map((perspective) => (
            <div key={perspective} className="wr-srow">
              {CRITIQUE_LABEL[perspective]}
              <b>{qaVerdict.byPerspective[perspective]}</b>
            </div>
          ))}
        </div>
        <div className="pcard">
          <div className="pcard-h">
            <Scale size={15} />
            리듬
          </div>
          <div className="wr-srow">문장 수 <b>{rhythm.micro.sentenceLengths.length}</b></div>
          <div className="wr-srow">리듬 변화 <b>{rhythm.micro.burstiness.toFixed(2)}</b></div>
          <div className="wr-srow">출고 전 남은 항목 <b>{metrics.artifacts.length}</b></div>
        </div>
        <div className="pcard">
          <div className="pcard-h">
            <Check size={15} />
            다음 작업
          </div>
          <div className="wr-srow">작가 승인 <b>{decisionCounts.approved}</b></div>
          <div className="wr-srow">보류 기록 <b>{decisionCounts.rejected}</b></div>
          <div className="wr-srow">승인 적용 후보 <b>{revisionApplyPlan.patches.length}</b></div>
          <div className="wr-srow">출고 탭에서 최종판 점검</div>
        </div>
      </IdeResizablePanel>
    </div>
  );
}
