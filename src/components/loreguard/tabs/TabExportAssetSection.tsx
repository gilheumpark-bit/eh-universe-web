import type { ComponentProps } from "react";
import type { StoryConfig } from "@/lib/studio-types";
import type { MediaIpPackProfileId } from "@/lib/creative/media-ip-pack-profile";
import { IP_BIBLE_SECTION_META } from "@/lib/creative/ip-bible-builder";
import {
  evaluateFormCompletion,
  type ReleaseFormDefinition,
} from "@/lib/creative-process/jurisdiction-form-pack";
import type { ExportPackageProfileId } from "@/lib/creative-process/export-package-profile";
import type { MediaIpPackRightsLedgerRow } from "@/lib/creative/media-ip-pack-markdown";
import { Book, Download, Flag, Scale } from "../icons";
import TabExportCertificateOutputCard from "@/components/loreguard/tabs/TabExportCertificateOutputCard";
import TabExportCoreCopyrightCard from "@/components/loreguard/tabs/TabExportCoreCopyrightCard";
import TabExportCopyrightRegistrationPrepCard from "@/components/loreguard/tabs/TabExportCopyrightRegistrationPrepCard";
import TabExportPackageProfileCard from "@/components/loreguard/tabs/TabExportPackageProfileCard";
import TabExportRightsLedgerCard from "@/components/loreguard/tabs/TabExportRightsLedgerCard";
import TabExportRightsProposalAdvisorCard from "@/components/loreguard/tabs/TabExportRightsProposalAdvisorCard";
import type { useTabExportModel } from "@/components/loreguard/tabs/TabExport.model";
import { sectionLabelKo } from "@/components/loreguard/tabs/TabExport.model";
import { RIGHTS_STATUS_LABEL_KO } from "@/components/loreguard/tabs/TabExport.constants";
import { formatKrw } from "@/components/loreguard/tabs/TabExport.helpers";
import type { RightsLedgerDraft } from "@/components/loreguard/tabs/TabExport.rights-ledger";

type TabExportModel = ReturnType<typeof useTabExportModel>;
type CoreCopyrightPackage = ComponentProps<typeof TabExportCoreCopyrightCard>["coreCopyrightPackage"];
type CopyrightRegistrationPrep = ComponentProps<typeof TabExportCopyrightRegistrationPrepCard>["copyrightRegistrationPrep"];
type RightsProposalAdvisor = ComponentProps<typeof TabExportRightsProposalAdvisorCard>["rightsProposalAdvisor"];

interface TabExportAssetSectionProps {
  assetizationSummaryRows: TabExportModel["assetizationSummaryRows"];
  packageProfiles: TabExportModel["packageProfiles"];
  packageProfileId: ExportPackageProfileId;
  packagePlan: TabExportModel["packagePlan"];
  publicSubmissionBoundaryRows: TabExportModel["publicSubmissionBoundaryRows"];
  onPackageProfileChange: (profileId: ExportPackageProfileId) => void;
  certificateOutputPlan: TabExportModel["certificateOutputPlan"];
  mediaIpPackPlan: TabExportModel["mediaIpPackPlan"];
  mediaIpPackProfiles: TabExportModel["mediaIpPackProfiles"];
  mediaProfileId: MediaIpPackProfileId;
  segmentMediaProfileId: MediaIpPackProfileId;
  onMediaProfileChange: (profileId: MediaIpPackProfileId) => void;
  config: StoryConfig;
  ipBibleClusterRows: TabExportModel["ipBibleClusterRows"];
  releaseEntitlement: TabExportModel["releaseEntitlement"];
  jurisdictionPack: TabExportModel["jurisdictionPack"];
  jurisdictionPackReadiness: TabExportModel["jurisdictionPackReadiness"];
  overseasReleaseReviewFields: TabExportModel["overseasReleaseReviewFields"];
  jurisdictionFormRows: TabExportModel["jurisdictionFormRows"];
  groupReleaseScope: TabExportModel["groupReleaseScope"];
  jurisdictionPreviewNotice: string;
  onDownloadMediaIpPackMarkdown: () => void;
  onOpenJurisdictionPackPreview: () => void;
  coreCopyrightPackage: CoreCopyrightPackage;
  onDownloadCoreCopyrightPackage: () => void;
  rightsProposalAdvisor: RightsProposalAdvisor;
  proposalAdvisorText: string;
  onProposalAdvisorTextChange: (value: string) => void;
  onDownloadRightsProposalAdvisor: () => void;
  copyrightRegistrationPrep: CopyrightRegistrationPrep;
  onDownloadCopyrightRegistrationPrep: () => void;
  rightsLedgerRows: TabExportModel["rightsLedgerRows"];
  rightsLedgerMissingCount: number;
  rightsLedgerMissingLabelsByRowId: TabExportModel["rightsLedgerMissingLabelsByRowId"];
  editingRightsLedgerId: string | null;
  rightsLedgerDraft: RightsLedgerDraft | null;
  rightsLedgerNotice: string;
  onBeginRightsLedgerEdit: (row: MediaIpPackRightsLedgerRow) => void;
  onUpdateRightsLedgerDraft: (field: keyof Omit<RightsLedgerDraft, "id">, value: string) => void;
  onSaveRightsLedgerDraft: () => void;
  onCancelRightsLedgerEdit: () => void;
}

export default function TabExportAssetSection({
  assetizationSummaryRows,
  packageProfiles,
  packageProfileId,
  packagePlan,
  publicSubmissionBoundaryRows,
  onPackageProfileChange,
  certificateOutputPlan,
  mediaIpPackPlan,
  mediaIpPackProfiles,
  mediaProfileId,
  segmentMediaProfileId,
  onMediaProfileChange,
  config,
  ipBibleClusterRows,
  releaseEntitlement,
  jurisdictionPack,
  jurisdictionPackReadiness,
  overseasReleaseReviewFields,
  jurisdictionFormRows,
  groupReleaseScope,
  jurisdictionPreviewNotice,
  onDownloadMediaIpPackMarkdown,
  onOpenJurisdictionPackPreview,
  coreCopyrightPackage,
  onDownloadCoreCopyrightPackage,
  rightsProposalAdvisor,
  proposalAdvisorText,
  onProposalAdvisorTextChange,
  onDownloadRightsProposalAdvisor,
  copyrightRegistrationPrep,
  onDownloadCopyrightRegistrationPrep,
  rightsLedgerRows,
  rightsLedgerMissingCount,
  rightsLedgerMissingLabelsByRowId,
  editingRightsLedgerId,
  rightsLedgerDraft,
  rightsLedgerNotice,
  onBeginRightsLedgerEdit,
  onUpdateRightsLedgerDraft,
  onSaveRightsLedgerDraft,
  onCancelRightsLedgerEdit,
}: TabExportAssetSectionProps) {
  return (
            <section
              aria-labelledby="lg-assetization-package-heading"
              aria-label="자산화 통합 카테고리"
              style={{
                display: "grid",
                gap: 10,
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 12,
                background: "color-mix(in srgb, var(--card) 92%, var(--primary) 8%)",
              }}
            >
              <div className="pcard-h" style={{ marginBottom: 0 }}>
                <Scale size={15} />
                <span id="lg-assetization-package-heading">자산화 패키지</span>
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  문체·설정·권리/IP·출고
                </span>
              </div>
              <div className="wr-srow" style={{ color: "var(--ink-3)", alignItems: "flex-start" }}>
                문체·리듬, 작품 기준, 권리 원장, 공개용 카드와 제출용 문서를 한 묶음으로 점검합니다.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {assetizationSummaryRows.map((row) => (
                  <div
                    key={row.label}
                    className="wr-srow"
                    style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)" }}
                  >
                    <span className="rdot blue" style={{ marginTop: 5 }} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <b>{row.label}</b>
                      <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>
                        {row.value} · {row.detail}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

            <TabExportPackageProfileCard
              packageProfiles={packageProfiles}
              packageProfileId={packageProfileId}
              packagePlan={packagePlan}
              publicSubmissionBoundaryRows={publicSubmissionBoundaryRows}
              onPackageProfileChange={onPackageProfileChange}
            />

            <TabExportCertificateOutputCard certificateOutputPlan={certificateOutputPlan} />

            {mediaIpPackPlan ? (
              <div className="pcard">
              <div className="pcard-h">
                <Flag size={15} />
                  매체별 권리팩
                  <span
                    className={
                      "pill " +
                      (mediaIpPackPlan.status === "ready" ? "green" : mediaIpPackPlan.status === "review" ? "amber" : "red")
                    }
                    style={{ marginLeft: "auto" }}
                  >
                    {mediaIpPackPlan.completionPercent}%
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 8 }}>
                  {mediaIpPackProfiles.map((profile) => {
                    const active = profile.id === mediaProfileId;
                    const suggested = profile.id === segmentMediaProfileId;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        className="mini-btn"
                        aria-pressed={active}
                        onClick={() => onMediaProfileChange(profile.id)}
                        style={{
                          justifyContent: "flex-start",
                          borderColor: active ? "var(--primary)" : "var(--line)",
                          background: active ? "color-mix(in srgb, var(--primary) 14%, var(--card-2))" : "var(--card-2)",
                        }}
                      >
                        <span className={"rdot " + (active ? "green" : suggested ? "blue" : "gray")} />
                        {profile.shortLabelKo}
                        {suggested ? <small style={{ marginLeft: "auto", color: "var(--ink-3)" }}>권장</small> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-3)", marginTop: 8 }}>
                  <span style={{ flex: 1 }}>{mediaIpPackPlan.profile.purposeKo}</span>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  대상 <b>{mediaIpPackPlan.profile.audienceKo}</b>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  권리 상태 <b>{config.rightsStatus ? RIGHTS_STATUS_LABEL_KO[config.rightsStatus] : "권리 확인 필요"}</b>
                </div>
                <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
                  <span>부족한 필수 항목</span>
                  <b style={{ textAlign: "right" }}>
                    {mediaIpPackPlan.missingRequired.length > 0
                      ? mediaIpPackPlan.missingRequired.map(sectionLabelKo).join(" · ")
                      : "없음"}
                  </b>
                </div>
                {mediaIpPackPlan.missingRecommended.length > 0 ? (
                  <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
                    <span>보강하면 좋은 항목</span>
                    <b style={{ textAlign: "right" }}>
                      {mediaIpPackPlan.missingRecommended.map(sectionLabelKo).join(" · ")}
                    </b>
                  </div>
                ) : null}
                <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
                  <span>제시 자료 묶음</span>
                  <b style={{ textAlign: "right" }}>
                    {ipBibleClusterRows.map((row) => `${row.labelKo} ${row.filledCount}/${row.totalCount}`).join(" · ")}
                  </b>
                </div>
                <details className="lg-ip-pack-inline-detail">
                  <summary>
                    <Book size={13} />
                    IP 바이블 13섹션
                    <span className="pill gray">자산화 양식</span>
                  </summary>
                  <div className="lg-ip-pack-inline-detail-body" aria-label="IP 바이블 13섹션">
                    <div className="lg-ip-pack-note">
                      클로드1 자산화 양식을 출고 기준으로 묶었습니다. 채움 항목만 제안 자료에 들어가고, 보강 항목은 작가 확인 후 편입합니다.
                    </div>
                    {ipBibleClusterRows.map((clusterRow) => (
                      <div
                        key={clusterRow.cluster}
                        className="lg-ip-pack-form-list"
                        aria-label={`IP 바이블 ${clusterRow.labelKo}`}
                      >
                        <div className="lg-ip-pack-form-row">
                          <div>
                            <b>{clusterRow.labelKo}</b>
                            <span>{clusterRow.descriptionKo}</span>
                          </div>
                          <strong>
                            {clusterRow.filledCount}/{clusterRow.totalCount}
                          </strong>
                        </div>
                        {clusterRow.sections.map((sectionItem) => (
                          <div key={sectionItem.key} className="lg-ip-pack-form-row">
                            <div>
                              <b>{sectionItem.labelKo}</b>
                              <span>
                                {IP_BIBLE_SECTION_META[sectionItem.key].sourceHint}
                              </span>
                            </div>
                            <strong>{sectionItem.statusKo}</strong>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
                <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
                  <span>출력물</span>
                  <b style={{ textAlign: "right" }}>{mediaIpPackPlan.profile.deliverablesKo.slice(0, 3).join(" · ")}</b>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  패키지 조건 <b>{releaseEntitlement.productLabelKo} · {formatKrw(releaseEntitlement.productPriceKrw)}</b>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  {mediaIpPackPlan.summaryKo}
                </div>
                <div aria-label="국가·언어권 Pack 진행" style={{ display: "grid", gap: 6 }}>
                  <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                    국가·언어권 Pack{" "}
                    <b>
                      {jurisdictionPack.label.ko} · 필수 {jurisdictionPackReadiness.requiredPresent}/
                      {jurisdictionPackReadiness.requiredTotal}
                    </b>
                  </div>
                  <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
                    <span>보강 양식</span>
                    <b style={{ textAlign: "right" }}>
                      {jurisdictionPackReadiness.missingFormTitles.length > 0
                        ? `${jurisdictionPackReadiness.missingFormTitles.slice(0, 3).join(" · ")}${
                            jurisdictionPackReadiness.missingFormTitles.length > 3
                              ? ` 외 ${jurisdictionPackReadiness.missingFormTitles.length - 3}개`
                              : ""
                          }`
                        : "필수 양식 채움"}
                    </b>
                  </div>
                  <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
                    <span>확인 출처</span>
                    <b style={{ textAlign: "right" }}>{jurisdictionPackReadiness.sourceSummaryKo}</b>
                  </div>
                </div>
                <details className="lg-ip-pack-inline-detail">
                  <summary>
                    <Book size={13} />
                    상세 양식 보기
                    <span className="pill gray">{jurisdictionPack.label.ko}</span>
                  </summary>
                  <div className="lg-ip-pack-inline-detail-body" aria-label="상세 양식 빠른 보기">
                    <div className="lg-ip-pack-note">
                      대상 언어를 직접 읽지 못해도 원문 보존안·시장판·역번역 요약·문화 리스크를 분리해 검토합니다.
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-start" }}>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={onDownloadMediaIpPackMarkdown}
                      >
                        <Download size={13} />
                        문서 내려받기
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={onOpenJurisdictionPackPreview}
                      >
                        <Book size={13} />
                        양식 크게 보기
                      </button>
                    </div>
                    {jurisdictionPreviewNotice ? (
                      <div className="lg-ip-pack-note" role="status">
                        {jurisdictionPreviewNotice}
                      </div>
                    ) : null}
                    <div className="lg-ip-pack-form-list" aria-label="상세 양식 확인 출처">
                      {jurisdictionPack.sourceReferences.length > 0 ? (
                        jurisdictionPack.sourceReferences.map((sourceItem) => (
                          <div key={`${sourceItem.title}-${sourceItem.url}`} className="lg-ip-pack-form-row">
                            <div>
                              <b>{sourceItem.title}</b>
                              <span>기준일 {sourceItem.checkedAt}</span>
                            </div>
                            <strong>
                              <a href={sourceItem.url} target="_blank" rel="noopener noreferrer">
                                출처 열기
                              </a>
                            </strong>
                          </div>
                        ))
                      ) : (
                        <div className="lg-ip-pack-form-row">
                          <div>
                            <b>공통 기준</b>
                            <span>국가별 공식 출처는 출고 전 제출처 기준으로 다시 확인합니다.</span>
                          </div>
                          <strong>확인 필요</strong>
                        </div>
                      )}
                    </div>
                    <div className="lg-ip-pack-form-list" aria-label="상세 양식 해외 출고 검수">
                      {overseasReleaseReviewFields.map(({ field, statusKo }) => (
                        <div key={field.id} className="lg-ip-pack-form-row">
                          <div>
                            <b>{field.label.ko}</b>
                            <span>{field.help.ko}</span>
                          </div>
                          <strong>{statusKo} · 필수</strong>
                        </div>
                      ))}
                    </div>
                    <div className="lg-ip-pack-form-list" aria-label="상세 양식 국가별 양식">
                      {jurisdictionFormRows.map(({ form, completion }: { form: ReleaseFormDefinition; completion: ReturnType<typeof evaluateFormCompletion> }) => (
                        <div key={form.id} className="lg-ip-pack-form-row">
                          <div>
                            <b>{form.title.ko}</b>
                            <span>{form.purpose.ko}</span>
                          </div>
                          <strong>
                            {completion.requiredPresent}/{completion.requiredTotal}
                          </strong>
                        </div>
                      ))}
                    </div>
                    {groupReleaseScope ? (
                      <div className="lg-ip-pack-form-row" aria-label="상세 양식 조직 제출 경계">
                        <div>
                          <b>조직 제출 경계</b>
                          <span>그룹별 제출·재발급 충돌을 막기 위해 프로젝트 단위 키로 분리합니다.</span>
                        </div>
                        <strong>{groupReleaseScope.issueAllowed ? groupReleaseScope.idempotencyScopeKey : groupReleaseScope.reasonKo}</strong>
                      </div>
                    ) : null}
                  </div>
                </details>
                {overseasReleaseReviewFields.length > 0 ? (
                  <div aria-label="해외 출고 검수 요약" style={{ display: "grid", gap: 6, marginTop: 10 }}>
                    <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                      해외 출고 검수 <b>{overseasReleaseReviewFields.filter((item) => item.statusKo === "채움").length}/{overseasReleaseReviewFields.length}개 채움</b>
                    </div>
                    {overseasReleaseReviewFields.map(({ field, statusKo }) => (
                      <div key={field.id} className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
                        <span>{field.label.ko}</span>
                        <b style={{ textAlign: "right" }}>{statusKo} · 필수</b>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <TabExportCoreCopyrightCard
              coreCopyrightPackage={coreCopyrightPackage}
              onDownload={onDownloadCoreCopyrightPackage}
            />

            <TabExportRightsProposalAdvisorCard
              rightsProposalAdvisor={rightsProposalAdvisor}
              proposalAdvisorText={proposalAdvisorText}
              onProposalAdvisorTextChange={onProposalAdvisorTextChange}
              onDownload={onDownloadRightsProposalAdvisor}
            />

            <TabExportCopyrightRegistrationPrepCard
              copyrightRegistrationPrep={copyrightRegistrationPrep}
              onDownload={onDownloadCopyrightRegistrationPrep}
            />

            <TabExportRightsLedgerCard
              rows={rightsLedgerRows}
              missingCount={rightsLedgerMissingCount}
              missingLabelsByRowId={rightsLedgerMissingLabelsByRowId}
              editingId={editingRightsLedgerId}
              draft={rightsLedgerDraft}
              notice={rightsLedgerNotice}
              onBeginEdit={onBeginRightsLedgerEdit}
              onUpdateDraft={onUpdateRightsLedgerDraft}
              onSave={onSaveRightsLedgerDraft}
              onCancel={onCancelRightsLedgerEdit}
            />
            </section>
  );
}
