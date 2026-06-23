"use client";

import { L4 } from "@/lib/i18n";
import { Check, Sync, Wand } from "@/components/loreguard/icons";
import type { AppLanguage } from "@/lib/studio-types";
import {
  FINDING_TYPE_LABEL,
  MAX_AI_CHARS,
  SEVERITY_LABEL,
  type ProofreadFinding,
} from "./RevisionPanel.proofread";
import type { RevisionAiStatus } from "./RevisionPanel.view";

export function RevisionAiReportCard({
  language,
  judgementLabel,
  aiStatus,
  aiError,
  aiFindings,
  aiTruncNotice,
  onAiReport,
}: {
  language: AppLanguage;
  judgementLabel: string;
  aiStatus: RevisionAiStatus;
  aiError: string | null;
  aiFindings: ProofreadFinding[] | null;
  aiTruncNotice: boolean;
  onAiReport: () => void;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Wand size={15} />
        {L4(language, { ko: "노아 퇴고 보고서", en: "Noa revision report" })}
        <span className="pill gray">{judgementLabel}</span>
        {aiStatus === "success" && (
          <span className="pill gray rvpanel-push">
            <Check size={12} />
            {L4(language, { ko: "검토 완료", en: "Done" })}
          </span>
        )}
      </div>
      <div className="wr-srow rvpanel-muted">
        {L4(language, {
          ko: "검토 의견만 보여줍니다. 원고를 고칠지는 작가가 결정합니다.",
          en: "Shows review notes only. The author decides what to change.",
        })}
      </div>
      {aiTruncNotice && (
        <div className="wr-srow rvpanel-muted">
          {L4(language, {
            ko: `원고가 길어 앞 ${MAX_AI_CHARS.toLocaleString()}자부터 먼저 봅니다`,
            en: `Long manuscript — reviewing the first ${MAX_AI_CHARS.toLocaleString()} chars first`,
          })}
        </div>
      )}
      <button
        type="button"
        className="btn primary rvpanel-full-cta"
        aria-label={L4(language, {
          ko: "노아 퇴고 의견 받기",
          en: "Get Noa revision notes",
        })}
        disabled={aiStatus === "working"}
        onClick={onAiReport}
      >
        {aiStatus === "working" ? (
          <>
            <Sync size={14} className="animate-spin" />
            {L4(language, { ko: "검토 중…", en: "Reviewing…" })}
          </>
        ) : (
          <>
            <Wand size={14} />
            {L4(language, { ko: "노아 퇴고 의견 받기", en: "Get Noa notes" })}
          </>
        )}
      </button>
      {aiStatus === "error" && aiError && (
        <div className="wr-srow rvpanel-alert" role="alert">
          <span className="rdot amber" />
          {L4(language, { ko: "검토를 만들지 못했습니다:", en: "Review failed:" })} {aiError}
          <button
            type="button"
            className="mini-btn rvpanel-retry"
            onClick={onAiReport}
          >
            <Sync size={13} />
            {L4(language, { ko: "다시 시도", en: "Retry" })}
          </button>
        </div>
      )}
      {aiStatus === "working" && (
        <div className="wr-srow rvpanel-status" role="status" aria-live="polite">
          <span className="rdot blue" />
          {L4(language, { ko: "반복, 인과, 목소리, 속도를 살피는 중…", en: "Reviewing repetition, causality, voice, and pacing…" })}
        </div>
      )}
      {aiStatus === "success" && aiFindings && (
        aiFindings.length === 0 ? (
          <div className="wr-srow rvpanel-muted rvpanel-status">
            {L4(language, {
              ko: "노아가 추가로 짚을 부분은 없습니다",
              en: "Noa found no additional points",
            })}
          </div>
        ) : (
          <ul className="rvpanel-list">
            {aiFindings.map((f, i) => (
              <li
                key={i}
                className="rvpanel-finding-card"
              >
                <div className="rvpanel-finding-head">
                  <span className="pill gray">
                    {L4(language, FINDING_TYPE_LABEL[f.type])}
                  </span>
                  <span className="rvpanel-finding-meta">
                    {L4(language, {
                      ko: `중요도 ${SEVERITY_LABEL[f.severity].ko}`,
                      en: `importance: ${SEVERITY_LABEL[f.severity].en}`,
                    })}
                  </span>
                </div>
                {f.location && (
                  <div className="rvpanel-location">
                    “{f.location}”
                  </div>
                )}
                <div className="rvpanel-diagnosis">{f.diagnosis}</div>
                {f.suggestion && (
                  <div className="rvpanel-suggestion">
                    {L4(language, { ko: "고쳐볼 방향:", en: "Direction:" })} {f.suggestion}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
