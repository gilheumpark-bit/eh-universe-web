import type {
  ExportPackagePlanStatus,
  ExportPackageProfile,
  ExportPackageProfileId,
  ExportPackageProfilePlan,
} from "@/lib/creative-process/export-package-profile";
import { Flag } from "../icons";

export type TabExportPublicSubmissionBoundaryRow = {
  id: ExportPackageProfileId;
  titleKo: string;
  focusLabelKo: string;
  privateLabelKo: string;
  profile: ExportPackageProfile;
  status: ExportPackagePlanStatus;
  focusItemsKo: string[];
  privateItemsKo: string[];
};

type TabExportPackageProfileCardProps = {
  packageProfiles: ExportPackageProfile[];
  packageProfileId: ExportPackageProfileId;
  packagePlan: ExportPackageProfilePlan;
  publicSubmissionBoundaryRows: TabExportPublicSubmissionBoundaryRow[];
  onPackageProfileChange: (profileId: ExportPackageProfileId) => void;
};

function statusPillClass(status: ExportPackagePlanStatus): string {
  if (status === "ready") return "green";
  if (status === "review") return "amber";
  return "red";
}

function statusLabelKo(status: ExportPackagePlanStatus): string {
  if (status === "ready") return "준비";
  if (status === "review") return "검토";
  return "보류";
}

export default function TabExportPackageProfileCard({
  packageProfiles,
  packageProfileId,
  packagePlan,
  publicSubmissionBoundaryRows,
  onPackageProfileChange,
}: TabExportPackageProfileCardProps) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Flag size={15} />
        출고 구성
        <span className={"pill " + statusPillClass(packagePlan.status)} style={{ marginLeft: "auto" }}>
          {statusLabelKo(packagePlan.status)}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
        {packageProfiles.map((profile) => {
          const active = profile.id === packageProfileId;
          return (
            <button
              key={profile.id}
              type="button"
              className="mini-btn"
              aria-pressed={active}
              onClick={() => onPackageProfileChange(profile.id)}
              style={{
                justifyContent: "flex-start",
                borderColor: active ? "var(--primary)" : "var(--line)",
                background: active ? "color-mix(in srgb, var(--primary) 14%, var(--card-2))" : "var(--card-2)",
              }}
            >
              <span className={"rdot " + (active ? "green" : "gray")} />
              {profile.labelKo}
            </button>
          );
        })}
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", marginTop: 8 }}>
        <span style={{ flex: 1 }}>{packagePlan.profile.publicSummaryKo}</span>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        대상 <b>{packagePlan.profile.audienceKo}</b>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        경계 <b>{packagePlan.profile.boundaryKo}</b>
      </div>
      <div
        className="lg-public-boundary-grid"
        aria-label="공개용 카드와 제출용 문서 차이"
        style={{ gap: 8, marginTop: 8 }}
      >
        {publicSubmissionBoundaryRows.map((row) => (
          <div
            key={row.id}
            style={{
              border: "1px solid var(--line)",
              background:
                row.id === packageProfileId
                  ? "color-mix(in srgb, var(--primary) 10%, var(--card-2))"
                  : "var(--card-2)",
              padding: 10,
            }}
          >
            <div className="wr-srow" style={{ color: "var(--ink)", padding: 0 }}>
              <b>{row.titleKo}</b>
              <span className={"pill " + statusPillClass(row.status)} style={{ marginLeft: "auto" }}>
                {row.profile.shortLabelKo}
              </span>
            </div>
            <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)", padding: "6px 0 0" }}>
              <span>대상</span>
              <b style={{ textAlign: "right" }}>{row.profile.audienceKo}</b>
            </div>
            <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)", padding: "6px 0 0" }}>
              <span>{row.focusLabelKo}</span>
              <b style={{ textAlign: "right" }}>{row.focusItemsKo.slice(0, 4).join(" · ")}</b>
            </div>
            <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)", padding: "6px 0 0" }}>
              <span>{row.privateLabelKo}</span>
              <b style={{ textAlign: "right" }}>{row.privateItemsKo.join(" · ")}</b>
            </div>
            <div style={{ color: "var(--ink-3)", fontSize: 11.5, marginTop: 8, lineHeight: 1.45 }}>
              {row.profile.boundaryKo}
            </div>
          </div>
        ))}
      </div>
      <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
        <span>필수</span>
        <b style={{ textAlign: "right" }}>{packagePlan.requiredItems.map((item) => item.roleKo).join(" · ")}</b>
      </div>
      {packagePlan.recommendedItems.length > 0 && (
        <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
          <span>권장</span>
          <b style={{ textAlign: "right" }}>{packagePlan.recommendedItems.map((item) => item.roleKo).join(" · ")}</b>
        </div>
      )}
      {packagePlan.privateItems.length > 0 && (
        <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
          <span>비공개</span>
          <b style={{ textAlign: "right" }}>{packagePlan.privateItems.map((item) => item.roleKo).join(" · ")}</b>
        </div>
      )}
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        {packagePlan.summaryKo}
      </div>
    </div>
  );
}
