"use client";

import type { RefObject } from "react";
import { L4 } from "@/lib/i18n";
import { Alert, Wand, X } from "@/components/loreguard/icons";
import type { AppLanguage, EpisodeManuscript } from "@/lib/studio-types";
import type { analyzeRevision, revisionIssues } from "@/lib/desktop/revision-analysis";
import type { scanAISignature } from "@/lib/creative/ai-signature-scan";
import type { analyzeRhythm } from "@/lib/creative/rhythm-analysis";
import type { auditManuscript, auditVerdict } from "@/lib/creative/qa-auditor";
import type {
  buildChapterReactionForecast,
  buildEpisodeReactionForecasts,
} from "@/lib/creative/chapter-reaction-forecast";
import type { computeIntegratedGrade } from "@/lib/creative/integrated-grade";
import RevisionCompressionCard from "./RevisionCompressionCard";
import {
  CRITIQUE_LABEL,
  CRITIQUE_ORDER,
  REACTION_RISK_LABEL,
  SEVERITY_LABEL,
  type ProofreadFinding,
} from "./RevisionPanel.proofread";
import { RevisionAiReportCard } from "./RevisionPanel.ai-card";

export type RevisionAiStatus = "idle" | "working" | "success" | "error";

type RevisionMetrics = ReturnType<typeof analyzeRevision>;
type RevisionIssue = ReturnType<typeof revisionIssues>[number];
type AiSignatureScan = ReturnType<typeof scanAISignature>;
type RhythmAnalysis = ReturnType<typeof analyzeRhythm>;
type AuditFinding = ReturnType<typeof auditManuscript>[number];
type AuditVerdict = ReturnType<typeof auditVerdict>;
type ChapterReactionForecast = ReturnType<typeof buildChapterReactionForecast>;
type EpisodeReactionForecast = ReturnType<typeof buildEpisodeReactionForecasts>;
type IntegratedGrade = ReturnType<typeof computeIntegratedGrade>;

interface RevisionPanelViewProps {
  language: AppLanguage;
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  manuscripts: EpisodeManuscript[];
  target: EpisodeManuscript | null;
  setRequestedEpisode: (episode: number) => void;
  hasText: boolean;
  metrics: RevisionMetrics;
  issues: RevisionIssue[];
  sig: AiSignatureScan;
  rhythm: RhythmAnalysis;
  audit: AuditFinding[];
  verdict: AuditVerdict;
  reactionForecast: ChapterReactionForecast;
  episodeReactionForecast: EpisodeReactionForecast;
  grade: IntegratedGrade;
  judgementLabel: string;
  showRaw: boolean;
  onToggleRaw: () => void;
  aiStatus: RevisionAiStatus;
  aiError: string | null;
  aiFindings: ProofreadFinding[] | null;
  aiTruncNotice: boolean;
  onAiReport: () => void;
}

const metric = (label: string, val: string) => (
  <div key={label} className="rvpanel-metric">
    <div className="rvpanel-metric-label">{label}</div>
    <div className="rvpanel-metric-value">{val}</div>
  </div>
);

export function RevisionPanelView({
  language,
  dialogRef,
  onClose,
  manuscripts,
  target,
  setRequestedEpisode,
  hasText,
  metrics,
  issues,
  sig,
  rhythm,
  audit,
  verdict,
  reactionForecast,
  episodeReactionForecast,
  grade,
  judgementLabel,
  showRaw,
  onToggleRaw,
  aiStatus,
  aiError,
  aiFindings,
  aiTruncNotice,
  onAiReport,
}: RevisionPanelViewProps) {
  return (
    <div
      role="presentation"
      className="rvpanel-overlay"
      onClick={onClose}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "퇴고 패널", en: "Revision panel" })}
        className="rvpanel-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pcard-h rvpanel-head">
          <Wand size={16} />
          {L4(language, { ko: "퇴고", en: "Revision" })}
          <span className="pill gray">{judgementLabel}</span>
          <button
            type="button"
            className="eh-icbtn rvpanel-close"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {manuscripts.length > 0 && target && (
          <div className="wr-srow rvpanel-target-row">
            <label
              htmlFor="rv-episode"
              className="rvpanel-target-label"
            >
              {L4(language, { ko: "대상 회차", en: "Target episode" })}
            </label>
            {manuscripts.length > 1 ? (
              <select
                id="rv-episode"
                value={target.episode}
                onChange={(e) => setRequestedEpisode(Number(e.target.value))}
                className="rvpanel-target-select"
              >
                {manuscripts.map((m) => (
                  <option key={m.episode} value={m.episode}>
                    {L4(language, {
                      ko: `EP.${m.episode}${m.title ? ` · ${m.title}` : ""} (${m.content.length.toLocaleString()}자)`,
                      en: `EP.${m.episode}${m.title ? ` · ${m.title}` : ""} (${m.content.length.toLocaleString()} chars)`,
                    })}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rvpanel-target-title">
                {L4(language, {
                  ko: `EP.${target.episode}${target.title ? ` · ${target.title}` : ""}`,
                  en: `EP.${target.episode}${target.title ? ` · ${target.title}` : ""}`,
                })}
              </span>
            )}
          </div>
        )}

        {!hasText && (
          <div className="wr-srow rvpanel-muted">
            {L4(language, {
              ko: "저장된 회차 원고가 없습니다 — 집필 탭에서 원고를 저장하면 문장 상태가 표시됩니다",
              en: "No saved episode manuscript — save a draft in the Writing tab to see revision status",
            })}
          </div>
        )}

        {hasText && (
          <>
            <RevisionCompressionCard
              metrics={metrics}
              issues={issues}
              sigHits={sig.hits}
              sigScore={sig.score}
              audit={audit}
              language={language}
              judgementLabel={judgementLabel}
              showRaw={showRaw}
              onToggleRaw={onToggleRaw}
            />

            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "문장 상태", en: "Revision status" })}
                <span className="pill gray">{judgementLabel}</span>
              </div>
              <div className="rvpanel-grid">
                {metric(L4(language, { ko: "글자 수", en: "Characters" }), metrics.chars.toLocaleString())}
                {metric(L4(language, { ko: "설명형 문장", en: "Telling" }), `${metrics.tellPct}%`)}
                {metric(L4(language, { ko: "반복어", en: "Repetition" }), `${metrics.repetitionPct}%`)}
                {metric(L4(language, { ko: "대사 비율", en: "Dialogue" }), `${metrics.dialoguePct}%`)}
                {metric(
                  L4(language, { ko: "문장 다양성", en: "Sentence variety" }),
                  `${metrics.sentenceVariety}`,
                )}
                {metric(
                  L4(language, { ko: "평균 문장", en: "Avg sentence" }),
                  L4(language, { ko: `${metrics.avgLen}자`, en: `${metrics.avgLen} chars` }),
                )}
              </div>
              {showRaw && (
                <div className="rvpanel-raw">
                  <div className="rvpanel-raw-title">
                    {L4(language, { ko: `세부 후보 (${issues.length})`, en: `Detailed findings (${issues.length})` })}
                  </div>
                  {issues.length === 0 ? (
                    <div className="wr-srow rvpanel-muted">
                      {L4(language, { ko: "지금 바로 볼 후보는 없습니다", en: "No immediate findings" })}
                    </div>
                  ) : (
                    <ul className="rvpanel-list-compact">
                      {issues.map((it, i) => (
                        <li key={i} className="wr-srow rvpanel-listitem">
                          <Alert size={13} className="rvpanel-icon-muted" aria-hidden />
                          <span>{it.hint}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "사전 독자 반응", en: "Pre-reader response" })}
                <span className="pill gray">{L4(language, { ko: "16관점", en: "16 views" })}</span>
              </div>
              <div className="rvpanel-grid">
                {metric(
                  L4(language, { ko: "예상 몰입도", en: "Expected engagement" }),
                  `${reactionForecast.avgEngagement}`,
                )}
                {metric(
                  L4(language, { ko: "이탈 신호", en: "Dropout signals" }),
                  `${reactionForecast.dropoutCount}/16`,
                )}
                {metric(
                  L4(language, { ko: "위험 최고 회차", en: "Highest-risk episode" }),
                  `${episodeReactionForecast.maxDropoutCount}/16`,
                )}
              </div>

              <div className="wr-srow rvpanel-reader-row">
                <span className="rdot blue rvpanel-dot-top" />
                <div>
                  <div className="rvpanel-kicker">
                    {L4(language, { ko: "다음 화 클릭 이유", en: "Next-click reason" })}
                  </div>
                  <p className="rvpanel-body-copy">
                    {reactionForecast.summary.nextClickReason}
                  </p>
                </div>
              </div>
              {episodeReactionForecast.worstEpisode && (
                <p className="rvpanel-small-note">
                  {L4(language, {
                    ko: `우선 손볼 회차: EP.${episodeReactionForecast.worstEpisode.episode} · 이탈 신호 ${episodeReactionForecast.worstEpisode.dropoutCount}/16`,
                    en: `Review first: EP.${episodeReactionForecast.worstEpisode.episode} · dropout signals ${episodeReactionForecast.worstEpisode.dropoutCount}/16`,
                  })}
                </p>
              )}

              <div className="rvpanel-grid-spaced">
                {metric(
                  L4(language, {
                    ko: "표현 습관",
                    en: "Writing style",
                    ja: "表現のクセ",
                    zh: "表达习惯",
                  }),
                  `${sig.score}`,
                )}
                {metric(
                  L4(language, { ko: "문장 리듬 변화", en: "Rhythm variance" }),
                  rhythm.micro.burstiness.toFixed(2),
                )}
                {metric(
                  L4(language, { ko: "단락 수", en: "Paragraphs" }),
                  `${rhythm.macro.paragraphCount}`,
                )}
              </div>
              {showRaw && sig.hits.length > 0 && (
                <p className="rvpanel-fineprint">
                  {L4(language, {
                    ko: "어색한 표현 후보:",
                    en: "Awkward phrasing:",
                    ja: "違和感のある表現:",
                    zh: "生硬表达：",
                  })}{" "}
                  {sig.hits.slice(0, 4).map((h) => `${h.pattern}(${h.count})`).join(" · ")}
                </p>
              )}
              <p className="rvpanel-fineprint">
                {L4(language, {
                  ko: `${reactionForecast.modeLabel} · 사전 예측 점검`,
                  en: `${reactionForecast.modeLabel} — virtual review, not real reader data.`,
                })}
              </p>
              {showRaw && (
                <div className="rvpanel-review-block">
                  <div className="wr-srow">
                    <span className="rdot blue" />
                    {L4(language, { ko: "이탈 위험", en: "Dropout risk" })}
                    <b>{L4(language, REACTION_RISK_LABEL[reactionForecast.summary.dropoutRisk])}</b>
                  </div>
                  <p className="rvpanel-softcopy">
                    {reactionForecast.summary.immersionPoint}
                  </p>
                  <p className="rvpanel-softcopy">
                    {reactionForecast.summary.confusionPoint}
                  </p>
                  <p className="rvpanel-softcopy">
                    {reactionForecast.summary.nextClickReason}
                  </p>
                </div>
              )}
            </div>

            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "감평 시스템", en: "Critique system" })}
                <span className="pill gray rvpanel-push">
                  {L4(language, { ko: "평론가 · 작가", en: "Critic · Writer" })}
                </span>
                <span className={"pill " + (verdict.passed ? "green" : "amber")}>
                  {L4(language, {
                    ko: verdict.passed ? "통과" : "검토",
                    en: verdict.passed ? "pass" : "review",
                  })}
                </span>
              </div>
              <div className="rvpanel-critique-grid">
                {CRITIQUE_ORDER.map((perspective) => (
                  <div key={perspective} className="wr-srow">
                    {L4(language, CRITIQUE_LABEL[perspective])}
                    <b>{verdict.byPerspective[perspective]}</b>
                  </div>
                ))}
              </div>
              {audit.length === 0 ? (
                <div className="wr-srow rvpanel-muted">
                  {L4(language, {
                    ko: "감평 관점에서 바로 볼 후보는 없습니다.",
                    en: "No immediate critique findings.",
                  })}
                </div>
              ) : (
                <>
                  <ul className="rvpanel-list-compact">
                    {audit.slice(0, showRaw ? audit.length : 4).map((f, i) => (
                      <li key={i} className="wr-srow rvpanel-listitem">
                        <span className="pill gray rvpanel-critique-chip">
                          {L4(language, CRITIQUE_LABEL[f.perspective])}
                        </span>
                        <span>
                          {f.issue}{" "}
                          <span className="rvpanel-inline-muted">
                            ({L4(language, SEVERITY_LABEL[f.severity === "mid" ? "medium" : f.severity])})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!showRaw && audit.length > 4 && (
                    <p className="rvpanel-fineprint">
                      {L4(language, {
                        ko: `감평 후보 ${audit.length - 4}건은 전체 보기에서 확인할 수 있습니다.`,
                        en: `${audit.length - 4} more critique findings are available in full view.`,
                      })}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "원고 준비도", en: "Manuscript readiness" })}
                <span className="pill gray">{judgementLabel}</span>
              </div>
              <div className="rvpanel-grade-row">
                <div className="rvpanel-grade-value">{grade.grade}</div>
                <div className="rvpanel-grade-copy">
                  {L4(language, {
                    ko: `${grade.weighted}점 · 먼저 볼 항목 ${grade.weakest}`,
                    en: `${grade.weighted} pts · review first: ${grade.weakest}`,
                  })}
                </div>
              </div>
              <p className="rvpanel-fineprint">
                {L4(language, {
                  ko: "원고에서 계산한 문장 상태와 현재 채워진 설정 상태를 함께 본 준비도입니다.",
                  en: "Readiness combines manuscript signals with the setup already filled in.",
                })}
              </p>
            </div>

            <RevisionAiReportCard
              language={language}
              judgementLabel={judgementLabel}
              aiStatus={aiStatus}
              aiError={aiError}
              aiFindings={aiFindings}
              aiTruncNotice={aiTruncNotice}
              onAiReport={onAiReport}
            />
          </>
        )}
      </aside>
    </div>
  );
}
