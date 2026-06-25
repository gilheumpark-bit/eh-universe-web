import { Flag } from "../icons";
import type { MediaIpPackProfileId } from "@/lib/creative/media-ip-pack-profile";
import type { useTabExportModel } from "@/components/loreguard/tabs/TabExport.model";
import { formatKrw, formatProductConditionKo } from "@/components/loreguard/tabs/TabExport.helpers";

type TabExportModel = ReturnType<typeof useTabExportModel>;

interface TabExportReleaseOverviewCardProps {
  creatorSegment: TabExportModel["creatorSegment"];
  packagePlan: TabExportModel["packagePlan"];
  segmentProducts: TabExportModel["segmentProducts"];
  recommendedPlan: TabExportModel["recommendedPlan"];
  upgradePlan: TabExportModel["upgradePlan"];
  segmentMediaLabels: TabExportModel["segmentMediaLabels"];
  groupReleaseScope: TabExportModel["groupReleaseScope"];
  groupReleaseVisibleFieldsKo: TabExportModel["groupReleaseVisibleFieldsKo"];
  releaseCreditGateTone: TabExportModel["releaseCreditGateTone"];
  releaseCreditPreview: TabExportModel["releaseCreditPreview"];
  releaseCreditBalanceKo: TabExportModel["releaseCreditBalanceKo"];
  releaseCreditGateLabelKo: TabExportModel["releaseCreditGateLabelKo"];
  releaseEntitlement: TabExportModel["releaseEntitlement"];
  releaseProductLineup: TabExportModel["releaseProductLineup"];
  mediaIpPackProfileById: TabExportModel["mediaIpPackProfileById"];
  mediaProfileId: MediaIpPackProfileId;
  copyrightPrepReadyLabelKo: string;
  copyrightPrepSummaryKo: string;
  onMediaProfileChange: (profileId: MediaIpPackProfileId) => void;
}

export default function TabExportReleaseOverviewCard({
  creatorSegment,
  packagePlan,
  segmentProducts,
  recommendedPlan,
  upgradePlan,
  segmentMediaLabels,
  groupReleaseScope,
  groupReleaseVisibleFieldsKo,
  releaseCreditGateTone,
  releaseCreditPreview,
  releaseCreditBalanceKo,
  releaseCreditGateLabelKo,
  releaseEntitlement,
  releaseProductLineup,
  mediaIpPackProfileById,
  mediaProfileId,
  copyrightPrepReadyLabelKo,
  copyrightPrepSummaryKo,
  onMediaProfileChange,
}: TabExportReleaseOverviewCardProps) {
  const releaseFlow = [
    { label: "작가 결정", value: `${creatorSegment.requiredProjectInputsKo.length}개 입력 기준` },
    { label: "과정기록", value: "작업·검수 기록 포함" },
    { label: "권리/IP", value: segmentMediaLabels.length > 0 ? `${segmentMediaLabels.length}개 자산 범위 확인` : "프로젝트 기준 확인 필요" },
    { label: "발급 조건", value: "조건 확인 후 발급" },
  ];

  return (
            <div className="pcard">
              <div className="pcard-h">
                <Flag size={15} />
                출고 문서함
                <span className="pill gray tex-push">
                  {creatorSegment.labelKo}
                </span>
              </div>
              <div className="lg-release-brief" aria-label="출고 문서함 요약">
                <div className="lg-release-brief-main">
                  <span>지금 준비하는 묶음</span>
                  <b>{packagePlan.profile.labelKo}</b>
                  <small>{packagePlan.profile.purposeKo}</small>
                </div>
                <div className="lg-release-brief-aside">
                  <span>작가에게 남는 산출물</span>
                  <b>{segmentProducts.map((product) => product.labelKo).join(" · ")}</b>
                </div>
                <div className="lg-release-brief-aside">
                  <span>저작권 등록 준비</span>
                  <b>{copyrightPrepReadyLabelKo} · {copyrightPrepSummaryKo}</b>
                </div>
              </div>
              <div className="lg-release-spine" aria-label="출고 결정 흐름">
                {releaseFlow.map((item, index) => (
                  <div key={item.label}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{item.label}</b>
                    <small>{item.value}</small>
                  </div>
                ))}
              </div>
              <div className="wr-srow tex-muted-row tex-row-start">
                <span className="tex-grow">{creatorSegment.descriptionKo}</span>
              </div>
              <div className="wr-srow tex-muted-row">
                핵심 필요 <b>{creatorSegment.primaryNeedKo}</b>
              </div>
              <div className="wr-srow tex-muted-row">
                준비 조건 <b>{recommendedPlan.label}{upgradePlan ? ` → ${upgradePlan.label}` : ""} 기준</b>
              </div>
              <div className="wr-srow tex-muted-row">
                문서 묶음 <b>{packagePlan.profile.labelKo}</b>
              </div>
              <div className="lg-release-purpose-first" aria-label="출고 목적과 산출물">
                <div>
                  <span>이 화면의 목적</span>
                  <b>{packagePlan.profile.purposeKo}</b>
                </div>
                <div>
                  <span>권장 산출물</span>
                  <b>{segmentProducts.map((product) => product.labelKo).join(" · ")}</b>
                </div>
                <div>
                  <span>필수 입력</span>
                  <b>{creatorSegment.requiredProjectInputsKo.join(" · ")}</b>
                </div>
                <div>
                  <span>위험 점검</span>
                  <b>{creatorSegment.riskChecksKo.join(" · ")}</b>
                </div>
                <div>
                  <span>권리/IP 자산화</span>
                  <b>{segmentMediaLabels.join(" · ") || "프로젝트 기준 확인 필요"}</b>
                </div>
                <div>
                  <span>저작권 등록 준비</span>
                  <b>{copyrightPrepReadyLabelKo} · {copyrightPrepSummaryKo}</b>
                </div>
              </div>
              {groupReleaseScope ? (
                <div
                  aria-label="조직 워크스페이스 제출 상태"
                  className="tex-divider-grid"
                >
                  <div className="wr-srow tex-muted-row tex-row-start">
                    <span>조직 제출 상태</span>
                    <b className="tex-right">
                      {groupReleaseScope.issueAllowed ? "프로젝트별 원장 분리 준비" : groupReleaseScope.reasonKo}
                    </b>
                  </div>
                  <div className="wr-srow tex-muted-row tex-row-start">
                    <span>프로젝트 경계</span>
                    <b className="tex-right">{groupReleaseScope.projectId ?? "프로젝트 선택 필요"}</b>
                  </div>
                  <div className="wr-srow tex-muted-row tex-row-start">
                    <span>공유 필드</span>
                    <b className="tex-right">{groupReleaseVisibleFieldsKo}</b>
                  </div>
                </div>
              ) : null}
              <details className="lg-release-credit-detail">
                <summary>
                  <span className={"rdot " + releaseCreditGateTone} aria-hidden="true" />
                  <b>패키지 조건 보기</b>
                  <span>조건과 예상 차감은 접어 둡니다. 실제 차감은 실행하지 않습니다.</span>
                </summary>
                <div className="lg-release-credit-detail-body">
                  <div aria-label="출고 권한 상태" className="tex-grid-6">
                    <div className="wr-srow tex-muted-row tex-row-start">
                      <span>권한 상태</span>
                      <b className="tex-right">
                        <span className={"pill " + releaseCreditGateTone}>
                          {releaseCreditPreview.eventDraft.statusKo}
                        </span>
                      </b>
                    </div>
                    <div className="wr-srow tex-muted-row tex-row-start">
                      <span>크레딧 조건</span>
                      <b className="tex-right">{releaseCreditBalanceKo}</b>
                    </div>
                    <div className="wr-srow tex-muted-row tex-row-start">
                      <span>버튼 조건</span>
                      <b className="tex-right">{releaseCreditGateLabelKo}</b>
                    </div>
                  </div>
                  <div className="wr-srow tex-muted-row tex-row-start">
                    <span>차감 미리보기</span>
                    <b className="tex-right">{releaseCreditPreview.receiptDraftKo}</b>
                  </div>
                  <div className="wr-srow tex-muted-row">
                    플랜 연결 <b>{releaseEntitlement.actionKo}</b>
                  </div>
                  <div className="wr-srow tex-muted-row tex-row-start">
                    <span>원장 처리</span>
                    <b className="tex-right">{releaseCreditPreview.ledgerNoteKo}</b>
                  </div>
                  <div className="wr-srow tex-muted-row tex-row-start">
                    <span>프로젝트 격리</span>
                    <b className="tex-right">{releaseCreditPreview.projectScopeNoteKo}</b>
                  </div>
                  <div className="wr-srow tex-muted-row tex-row-start">
                    <span>패키지 조건</span>
                    <b className="tex-right">
                      {releaseEntitlement.productLabelKo} · {formatKrw(releaseEntitlement.productPriceKrw)}
                    </b>
                  </div>
                  <div className="lg-release-product-note" aria-label="출고 패키지 발급 전 안내">
                    <span className="rdot blue" aria-hidden="true" />
                    <span>
                      <b>패키지 조건 미리보기</b>
                      <span>현재 화면은 발급 전 검토용입니다. 실제 발급과 차감은 서버 원장 연결 뒤에만 실행됩니다.</span>
                    </span>
                    <strong>검토만 진행</strong>
                  </div>
                  <div className="lg-release-product-line" aria-label="출고 패키지 구성">
                    {releaseProductLineup.map((item) => (
                      <div
                        key={item.productId}
                        className={`lg-release-product-card${item.currentProduct ? " active" : ""}`}
                      >
                        <div className="wr-srow tex-ink-row tex-row-flush">
                          <b>{item.labelKo}</b>
                          <span
                            className={
                              "pill tex-push " +
                              (item.status === "included" ? "green" : item.status === "separate-purchase" ? "amber" : "red")
                            }
                          >
                            {item.currentProduct ? "선택 구성" : item.unitKo}
                          </span>
                        </div>
                        <div className="wr-srow tex-muted-row tex-row-padtop">
                          <span>출고 범위</span>
                          <b>{item.outputScopeKo}</b>
                        </div>
                        <div className="wr-srow tex-muted-row tex-row-start tex-row-padtop">
                          <span>조건</span>
                          <b className="tex-right">{item.availabilityKo}</b>
                        </div>
                        <div className="lg-release-product-foot">
                          <span>{item.approvalPolicyKo}</span>
                          <span className="lg-release-product-cost">
                            <small>크레딧 조건</small>
                            <b>{formatProductConditionKo(item.priceKrw, item.requiredCreditsKo)}</b>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
              <div className="wr-srow tex-muted-row tex-row-spaced">
                {creatorSegment.packagePitchKo}
              </div>
              <div className="tex-action-row tex-action-row-spaced">
                {creatorSegment.mediaProfiles.map((profileId) => {
                  const profile = mediaIpPackProfileById.get(profileId);
                  if (!profile) return null;
                  const active = profile.id === mediaProfileId;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      className={`mini-btn tex-profile-btn${active ? " is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => onMediaProfileChange(profile.id)}
                    >
                      <span className={"rdot " + (active ? "green" : "blue")} />
                      {profile.shortLabelKo} 자산화
                    </button>
                  );
                })}
              </div>
            </div>
  );
}
