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
        <span className={"pill tex-push " + statusPillClass(packagePlan.status)}>
          {statusLabelKo(packagePlan.status)}
        </span>
      </div>
      <div className="tex-profile-grid tex-package-profile-grid">
        {packageProfiles.map((profile) => {
          const active = profile.id === packageProfileId;
          return (
            <button
              key={profile.id}
              type="button"
              className={`mini-btn tex-profile-btn${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => onPackageProfileChange(profile.id)}
            >
              <span className={"rdot " + (active ? "green" : "gray")} />
              {profile.labelKo}
            </button>
          );
        })}
      </div>
      <div className="wr-srow tex-muted-row tex-row-spaced">
        <span className="tex-grow">{packagePlan.profile.publicSummaryKo}</span>
      </div>
      <div className="wr-srow tex-muted-row">
        대상 <b>{packagePlan.profile.audienceKo}</b>
      </div>
      <div className="wr-srow tex-muted-row">
        경계 <b>{packagePlan.profile.boundaryKo}</b>
      </div>
      <div
        className="lg-public-boundary-grid tex-public-boundary-grid"
        aria-label="공개용 카드와 제출용 문서 차이"
      >
        {publicSubmissionBoundaryRows.map((row) => (
          <div
            key={row.id}
            className={`tex-boundary-card${row.id === packageProfileId ? " is-active" : ""}`}
          >
            <div className="wr-srow tex-ink-row tex-row-flush">
              <b>{row.titleKo}</b>
              <span className={"pill tex-push " + statusPillClass(row.status)}>
                {row.profile.shortLabelKo}
              </span>
            </div>
            <div className="wr-srow tex-muted-row tex-row-start tex-row-padtop">
              <span>대상</span>
              <b className="tex-right">{row.profile.audienceKo}</b>
            </div>
            <div className="wr-srow tex-muted-row tex-row-start tex-row-padtop">
              <span>{row.focusLabelKo}</span>
              <b className="tex-right">{row.focusItemsKo.slice(0, 4).join(" · ")}</b>
            </div>
            <div className="wr-srow tex-muted-row tex-row-start tex-row-padtop">
              <span>{row.privateLabelKo}</span>
              <b className="tex-right">{row.privateItemsKo.join(" · ")}</b>
            </div>
            <div className="tex-boundary-note">
              {row.profile.boundaryKo}
            </div>
          </div>
        ))}
      </div>
      <div className="wr-srow tex-muted-row tex-row-start">
        <span>필수</span>
        <b className="tex-right">{packagePlan.requiredItems.map((item) => item.roleKo).join(" · ")}</b>
      </div>
      {packagePlan.recommendedItems.length > 0 && (
        <div className="wr-srow tex-muted-row tex-row-start">
          <span>권장</span>
          <b className="tex-right">{packagePlan.recommendedItems.map((item) => item.roleKo).join(" · ")}</b>
        </div>
      )}
      {packagePlan.privateItems.length > 0 && (
        <div className="wr-srow tex-muted-row tex-row-start">
          <span>비공개</span>
          <b className="tex-right">{packagePlan.privateItems.map((item) => item.roleKo).join(" · ")}</b>
        </div>
      )}
      <div className="wr-srow tex-muted-row">
        {packagePlan.summaryKo}
      </div>
    </div>
  );
}
