"use client";

import { useState } from "react";
import { Check, Eye, X, Clock } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

export type CandidateDecisionStatus = "candidate" | "review" | "accepted" | "held" | "discarded";

export interface CandidateDecisionNotice {
  label: string;
  detail: string;
  severity?: "info" | "warning";
}

interface CandidateDecisionCardProps {
  title: string;
  body: string;
  subtitle?: string;
  meta?: string;
  notices?: CandidateDecisionNotice[];
  status?: CandidateDecisionStatus;
  acceptLabel?: string;
  language?: AppLanguage;
  onAccept: () => void;
  onHold: () => void;
  onDiscard: () => void;
}

const STATUS_LABEL: Record<CandidateDecisionStatus, { ko: string; en: string; ja: string; zh: string }> = {
  candidate: { ko: "후보", en: "Candidate", ja: "候補", zh: "候选" },
  review: { ko: "검토 필요", en: "Needs review", ja: "確認必要", zh: "需要检查" },
  accepted: { ko: "반영됨", en: "Applied", ja: "反映済み", zh: "已反映" },
  held: { ko: "보류", en: "Held", ja: "保留", zh: "暂缓" },
  discarded: { ko: "폐기", en: "Discarded", ja: "破棄", zh: "已丢弃" },
};

export default function CandidateDecisionCard({
  title,
  body,
  subtitle,
  meta,
  notices = [],
  status = "candidate",
  acceptLabel = "채택",
  language = "KO",
  onAccept,
  onHold,
  onDiscard,
}: CandidateDecisionCardProps) {
  const [open, setOpen] = useState(false);
  const statusLabel = L4(language, STATUS_LABEL[status]);
  const normalizedBody = body.trim() || L4(language, { ko: "내용 없음", en: "No content", ja: "内容なし", zh: "无内容" });
  const resolvedAcceptLabel = acceptLabel === "채택"
    ? L4(language, { ko: "반영", en: "Apply", ja: "反映", zh: "反映" })
    : acceptLabel;
  const visibleNotices = notices.filter((notice) => notice.label.trim() || notice.detail.trim()).slice(0, 4);
  const isAccepted = status === "accepted";
  const isDiscarded = status === "discarded";
  const noticeSection = visibleNotices.length > 0 ? (
    <div className="lg-candidate-notices" aria-label={L4(language, { ko: "기준 확인", en: "Basis review", ja: "基準確認", zh: "基准检查" })}>
      <div className="lg-candidate-notices-title">{L4(language, { ko: "기준 확인", en: "Basis review", ja: "基準確認", zh: "基准检查" })}</div>
      {visibleNotices.map((notice, index) => (
        <div key={`${notice.label}-${index}`} className={`lg-candidate-notice ${notice.severity ?? "info"}`}>
          <b>{notice.label}</b>
          <span>{notice.detail}</span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <>
      <article className={`lg-candidate-card ${status}`} aria-label={`${title} ${statusLabel}`}>
        <div className="lg-candidate-head">
          <div className="lg-candidate-titlewrap">
            <strong className="lg-candidate-title">{title}</strong>
            {subtitle ? <span className="lg-candidate-subtitle">{subtitle}</span> : null}
          </div>
          <span className={`lg-candidate-status ${status}`}>{statusLabel}</span>
        </div>
        {noticeSection}
        <p className="lg-candidate-body">{normalizedBody}</p>
        <div className="lg-candidate-foot">
          {meta ? <span className="lg-candidate-meta">{meta}</span> : <span />}
          <div className="lg-candidate-actions">
            <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
              <Eye size={14} />{L4(language, { ko: "큰 보기", en: "Open large", ja: "大きく表示", zh: "大视图" })}
            </button>
            <button type="button" className="btn" onClick={onHold} disabled={isAccepted || isDiscarded}>
              <Clock size={14} />{L4(language, { ko: "보류", en: "Hold", ja: "保留", zh: "暂缓" })}
            </button>
            <button type="button" className="btn" onClick={onAccept} disabled={isAccepted || isDiscarded}>
              <Check size={14} />{resolvedAcceptLabel}
            </button>
            <button type="button" className="btn ghost" onClick={onDiscard} disabled={isDiscarded}>
              <X size={14} />{L4(language, { ko: "폐기", en: "Discard", ja: "破棄", zh: "丢弃" })}
            </button>
          </div>
        </div>
      </article>

      {open ? (
        <div className="lg-candidate-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section
            className="lg-candidate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lg-candidate-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="lg-candidate-modal-head">
              <div>
                <div className="lg-candidate-modal-kicker">{statusLabel}</div>
                <h2 id="lg-candidate-modal-title">{title}</h2>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setOpen(false)}
                aria-label={L4(language, { ko: "큰 보기 닫기", en: "Close large view", ja: "大きな表示を閉じる", zh: "关闭大视图" })}
              >
                <X size={16} />
              </button>
            </div>
            <div className="lg-candidate-modal-body">
              {noticeSection}
              <div className="lg-candidate-modal-text">{normalizedBody}</div>
            </div>
            <div className="lg-candidate-modal-actions">
              <button type="button" className="btn" onClick={onHold} disabled={isAccepted || isDiscarded}>
                <Clock size={14} />{L4(language, { ko: "보류", en: "Hold", ja: "保留", zh: "暂缓" })}
              </button>
              <button type="button" className="btn primary" onClick={onAccept} disabled={isAccepted || isDiscarded}>
                <Check size={14} />{resolvedAcceptLabel}
              </button>
              <button type="button" className="btn ghost" onClick={onDiscard} disabled={isDiscarded}>
                <X size={14} />{L4(language, { ko: "폐기", en: "Discard", ja: "破棄", zh: "丢弃" })}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
