import { memo, useMemo, useState } from "react";
import { Shield } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import {
  buildWritingContextComplianceReport,
  type WritingContextCheckState,
} from "@/lib/writing-workspace/context-compliance";

function complianceStateLabel(state: WritingContextCheckState, language: AppLanguage): string {
  if (state === "ready") return L4(language, { ko: "준비", en: "Ready" });
  if (state === "needs-review") return L4(language, { ko: "검토", en: "Review" });
  return L4(language, { ko: "부족", en: "Missing" });
}

function complianceStateTone(state: WritingContextCheckState): "green" | "amber" | "gray" {
  if (state === "ready") return "green";
  if (state === "needs-review") return "amber";
  return "gray";
}

export const WritingContextComplianceCard = memo(function WritingContextComplianceCard({
  config,
  draft,
  language,
}: {
  config: StoryConfig;
  draft: string;
  language: AppLanguage;
}) {
  const [open, setOpen] = useState(false);
  const report = useMemo(
    () => buildWritingContextComplianceReport(config, draft),
    [config, draft],
  );
  const scoreTone =
    report.missingCount > 0 ? "gray" : report.reviewCount > 0 ? "amber" : "green";

  return (
    <div className="pcard">
      <div className="pcard-h">
        <Shield size={15} />
        {L4(language, { ko: "작품 정보 점검", en: "Work info check" })}
        <span className={"pill wr-push " + scoreTone}>
          {report.missingCount > 0
            ? L4(language, { ko: `보강 ${report.missingCount}개`, en: `${report.missingCount} to fill` })
            : report.reviewCount > 0
              ? L4(language, { ko: `확인 ${report.reviewCount}개`, en: `${report.reviewCount} to review` })
              : L4(language, { ko: "준비됨", en: "Ready" })}
        </span>
        <button
          type="button"
          className="mini-btn"
          aria-expanded={open}
          aria-label={L4(language, {
            ko: "작품 정보 점검 카드 접기/펼치기",
            en: "Expand or collapse work info check card",
          })}
          onClick={() => setOpen((v) => !v)}
        >
          {open
            ? L4(language, { ko: "접기", en: "Collapse" })
            : L4(language, { ko: "펼치기", en: "Expand" })}
        </button>
      </div>

      <div className="wr-srow">
        <span className="rdot green" />
        {L4(language, { ko: "준비", en: "Ready" })}
        <b className="wr-push">
          {report.readyCount}
          {L4(language, { ko: "개", en: "" })}
        </b>
      </div>
      <div className="wr-srow">
        <span className="rdot amber" />
        {L4(language, { ko: "검토", en: "Review" })}
        <b className="wr-push">
          {report.reviewCount}
          {L4(language, { ko: "개", en: "" })}
        </b>
      </div>
      <div className="wr-srow">
        <span className="rdot gray" />
        {L4(language, { ko: "부족", en: "Missing" })}
        <b className="wr-push">
          {report.missingCount}
          {L4(language, { ko: "개", en: "" })}
        </b>
      </div>

      {open && (
        <>
          {report.checks.map((check) => {
            const tone = complianceStateTone(check.state);
            return (
              <div key={check.id} className="wr-srow wr-row-top">
                <span className={"rdot wr-dot-top " + tone} />
                <span className="wr-row-body">
                  {check.label}
                  <span className="wr-row-detail">
                    {check.detail}
                  </span>
                  <span className="wr-row-detail">
                    {check.hint}
                  </span>
                </span>
                <span className={"pill wr-pill-static " + tone}>
                  {complianceStateLabel(check.state, language)}
                </span>
              </div>
            );
          })}
          <div className="wr-srow wr-muted-row">
            {L4(language, {
              ko: report.limitation,
              en: "Advisory only. The author decides whether to accept, hold, or revise.",
            })}
          </div>
        </>
      )}
    </div>
  );
});
