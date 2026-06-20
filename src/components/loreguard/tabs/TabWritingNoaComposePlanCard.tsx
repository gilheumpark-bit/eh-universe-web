import { memo } from "react";
import { Check, Sparkle, X } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import {
  summarizeNoaComposePlan,
  type NoaComposePlan,
} from "@/lib/loreguard/noa-compose";
import { NOA_COMPOSE_SURFACE_LABEL } from "@/components/loreguard/tabs/TabWriting.shared";

export const NoaComposePlanCard = memo(function NoaComposePlanCard({
  plan,
  language,
  receiptValid,
  onApprove,
  onClose,
}: {
  plan: NoaComposePlan;
  language: AppLanguage;
  receiptValid: boolean;
  onApprove: () => void;
  onClose: () => void;
}) {
  const summary = summarizeNoaComposePlan(plan);
  const tone = summary.blocked ? "amber" : summary.canApply ? "green" : "blue";
  return (
    <div className="pcard" aria-label={L4(language, { ko: "노아 작업 묶음", en: "Noa work bundle" })}>
      <div className="pcard-h">
        <Sparkle size={15} />
        {L4(language, { ko: "노아 작업 묶음", en: "Noa work bundle" })}
        <span className={"pill " + tone} style={{ marginLeft: "auto" }}>
          {summary.label}
        </span>
        <button
          type="button"
          className="mini-btn"
          aria-label={L4(language, { ko: "노아 작업 묶음 닫기", en: "Close Noa work bundle" })}
          onClick={onClose}
        >
          <X size={13} />
        </button>
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "승인 방식", en: "Approval policy" })}
        <b>{summary.approvalPolicyLabel}</b>
      </div>
      <div className="wr-compose-item" aria-label={L4(language, { ko: "작업 묶음 요약", en: "Work bundle summary" })}>
        <b>{plan.title}</b>
        <small>{plan.prompt}</small>
      </div>
      <div className="wr-srow">
        <span className={receiptValid ? "rdot green" : "rdot amber"} />
        {L4(language, { ko: "과정기록", en: "Process record" })}
        <b>{receiptValid ? L4(language, { ko: "유효", en: "Valid" }) : L4(language, { ko: "검토", en: "Review" })}</b>
      </div>
      <div className="wr-srow">
        <span className={plan.missingReferences.length ? "rdot amber" : "rdot green"} />
        {L4(language, { ko: "참조 근거", en: "References" })}
        <b>
          {L4(language, {
            ko: `${plan.referencesUsed.length}개 사용`,
            en: `${plan.referencesUsed.length} used`,
          })}
        </b>
      </div>
      <div className="wr-compose-list">
        {plan.changes.map((change) => (
          <div key={change.changeId} className="wr-compose-item">
            <span className="pill gray">{NOA_COMPOSE_SURFACE_LABEL[change.surface] ?? change.surface}</span>
            <b>{change.title}</b>
            <small>{change.summary}</small>
          </div>
        ))}
      </div>
      {plan.missingReferences.length > 0 && (
        <div className="wr-srow" style={{ color: "var(--c-amber)" }}>
          <span className="rdot amber" />
          {L4(language, {
            ko: `누락 근거: ${plan.missingReferences.join(", ")}`,
            en: `Missing references: ${plan.missingReferences.join(", ")}`,
          })}
        </div>
      )}
      <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
        {L4(language, {
          ko: "노아는 묶어서 제안하고, 적용 여부는 작가가 결정합니다.",
          en: "Noa bundles suggestions; the author decides what applies.",
        })}
      </div>
      <button
        type="button"
        className="btn primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
        disabled={summary.blocked || plan.state === "APPROVED"}
        onClick={onApprove}
      >
        <Check size={14} />
        {plan.state === "APPROVED"
          ? L4(language, { ko: "승인됨", en: "Approved" })
          : L4(language, { ko: "작가 승인 기록", en: "Record author approval" })}
      </button>
    </div>
  );
});
