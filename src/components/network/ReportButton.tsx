"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { L2, useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { submitReport } from "@/lib/network-firestore";
import { REPORT_REASONS, type ReportReason } from "@/lib/network-types";

// ============================================================
// PART 1 - LABELS
// ============================================================

const LABELS = {
  report: { ko: "신고", en: "Report" },
  title: { ko: "콘텐츠 신고", en: "Report Content" },
  reason: { ko: "사유", en: "Reason" },
  detail: { ko: "상세 설명", en: "Details" },
  detailPlaceholder: { ko: "구체적인 내용을 입력하세요.", en: "Provide details about the issue." },
  submit: { ko: "신고 제출", en: "Submit Report" },
  cancel: { ko: "취소", en: "Cancel" },
  success: { ko: "신고가 접수되었습니다.", en: "Report submitted." },
  loginRequired: { ko: "로그인 후 신고할 수 있습니다.", en: "Sign in to report." },
} as const;

const REASON_LABELS: Record<ReportReason, { ko: string; en: string }> = {
  spam: { ko: "스팸", en: "Spam" },
  inappropriate: { ko: "부적절한 콘텐츠", en: "Inappropriate Content" },
  copyright: { ko: "저작권 침해", en: "Copyright Violation" },
  other: { ko: "기타", en: "Other" },
};

// IDENTITY_SEAL: PART-1 | role=report labels | inputs=none | outputs=i18n labels

// ============================================================
// PART 2 - COMPONENT
// ============================================================

interface ReportButtonProps {
  targetType: "planet" | "post" | "comment";
  targetId: string;
}

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState<string | null>(null);
  const loginHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup: clear loginHint timer on unmount
  useEffect(() => () => { clearTimeout(loginHintTimer.current); }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || submitting) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      await submitReport({
        reporterId: user.uid,
        targetType,
        targetId,
        reason,
        detail,
      });
      setSubmitted(true);
      setTimeout(() => { setOpen(false); setSubmitted(false); setDetail(""); setSubmitError(null); }, 2000);
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : '';
      if (msg.includes('Duplicate report') || msg.includes('already reported')) {
        setSubmitError(L4(lang, { ko: "이미 동일한 신고가 접수되어 있습니다.", en: "You have already reported this item." }));
      } else {
        setSubmitError(L4(lang, { ko: "신고 제출에 실패했습니다.", en: "Failed to submit report." }));
      }
    } finally {
      setSubmitting(false);
    }
  }, [detail, lang, reason, submitting, targetId, targetType, user]);

  return (
    <>
      <span className="inline-flex flex-col items-start gap-0.5">
        <button
          type="button"
          onClick={() => {
            if (!user) {
              void signInWithGoogle().then(() => {
                const hint = L4(lang, { ko: "로그인 후 다시 신고 버튼을 눌러주세요", en: "Please tap report again after login" });
                setLoginHint(hint);
                clearTimeout(loginHintTimer.current);
                loginHintTimer.current = setTimeout(() => setLoginHint(null), 3000);
              });
              return;
            }
            setOpen(true);
          }}
          className="text-xs text-text-tertiary transition hover:text-accent-red"
        >
          {L2(LABELS.report, lang)}
        </button>
        {loginHint && (
          <span className="text-[10px] text-accent-green">{loginHint}</span>
        )}
      </span>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/8 bg-bg-primary p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            data-modal="report"
          >
            <h3 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-red">
              {L2(LABELS.title, lang)}
            </h3>

            {submitted ? (
              <p className="mt-6 text-sm text-accent-green">{L2(LABELS.success, lang)}</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">{L2(LABELS.reason, lang)}</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="w-full rounded-lg border border-white/8 bg-white/[0.02] p-2 text-sm text-text-primary focus:border-accent-red/40 focus:outline-none"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {L2(REASON_LABELS[r], lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-text-secondary">{L2(LABELS.detail, lang)}</label>
                  <textarea
                    className="w-full resize-none rounded-lg border border-white/8 bg-white/[0.02] p-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-red/40 focus:outline-none"
                    rows={3}
                    maxLength={1000}
                    placeholder={L2(LABELS.detailPlaceholder, lang)}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                  />
                  <div className="mt-1 text-right text-[11px] text-text-tertiary">{detail.length}/1000</div>
                </div>

                {submitError && (
                  <p className="text-xs text-accent-red">{submitError}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-white/5 px-4 py-2 text-xs text-text-secondary transition hover:bg-white/10"
                  >
                    {L2(LABELS.cancel, lang)}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                    className="rounded-lg bg-accent-red/20 px-4 py-2 text-xs font-medium text-accent-red transition hover:bg-accent-red/30 disabled:opacity-40"
                  >
                    {L2(LABELS.submit, lang)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

// IDENTITY_SEAL: PART-2 | role=report button with modal | inputs=targetType, targetId | outputs=report submission UI
