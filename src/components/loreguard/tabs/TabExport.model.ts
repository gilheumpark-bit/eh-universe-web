import { useCallback, useMemo } from "react";
import type { EpisodeManuscript, StoryConfig } from "@/lib/studio-types";
import { computeIPReadiness, type IPReadinessParts } from "@/lib/creative/ip-readiness";
import {
  buildProjectMediaIpPackFormCompletions,
  buildProjectMediaIpPackPlan,
  inferMediaIpPackProfileId,
} from "@/lib/creative/media-ip-pack-project";
import {
  listMediaIpPackProfiles,
  type MediaIpPackProfileId,
} from "@/lib/creative/media-ip-pack-profile";
import {
  buildReleaseEntitlementPlan,
  buildReleaseProductLineup,
  getCertificateProduct,
  getLoreguardPlan,
} from "@/lib/billing/loreguard-plans";
import { buildReleaseCreditPreview } from "@/lib/billing/release-credit-ledger";
import { recommendCreatorSegment } from "@/lib/billing/creator-segments";
import {
  evaluateFormCompletion,
  getJurisdictionFormPack,
  inferLocalePackId,
  type FormFieldDefinition,
} from "@/lib/creative-process/jurisdiction-form-pack";
import {
  buildExportPackageProfilePlan,
  labelExportArtifactKo,
  listExportPackageProfiles,
  type ExportPackageProfileId,
} from "@/lib/creative-process/export-package-profile";
import {
  buildCertificateOutputPlan,
  selectCertificateOutputProfile,
} from "@/lib/creative-process/certificate-output-profile";
import type { ProcessCertificate, SourceRecord } from "@/lib/creative-process";
import type { ArtifactId } from "@/lib/creative-process/submission-package";
import type { PublishAuditReport } from "@/lib/translation/publish-audit";
import {
  buildJurisdictionPackPreviewHtml,
} from "@/components/loreguard/tabs/TabExport.helpers";
import {
  OVERSEAS_RELEASE_REVIEW_FIELD_IDS,
  RIGHTS_STATUS_LABEL_KO,
} from "@/components/loreguard/tabs/TabExport.constants";
import {
  getRightsLedgerMissingFieldLabels,
  mergeRightsLedgerRows,
} from "@/components/loreguard/tabs/TabExport.rights-ledger";
import { buildTabExportAssetizationSummaryRows, buildTabExportBaseRightsLedgerRows, buildTabExportGroupReleasePreview, buildTabExportIpBibleClusterRows, buildTabExportJurisdictionFormValues, buildTabExportMediaIpPackMarkdownInput, buildTabExportReleaseCreditPresentation, buildTabExportSourceSummaryRows, sectionLabelKo } from "@/components/loreguard/tabs/TabExport.model.builders";

interface UseTabExportModelArgs {
  ipParts: IPReadinessParts;
  config: StoryConfig | null;
  manuscripts: EpisodeManuscript[];
  manualMediaProfileId: MediaIpPackProfileId | null;
  packageProfileId: ExportPackageProfileId;
  currentProjectId: string | null | undefined;
  currentSessionTitle: string | undefined;
  scopedLatestCertificate: ProcessCertificate | null;
  scopedSourceRecords: SourceRecord[];
  audit: PublishAuditReport | null;
  receipt: string;
  receiptJournal: unknown[];
  setJurisdictionPreviewNotice: (message: string) => void;
}

export function useTabExportModel({
  ipParts,
  config,
  manuscripts,
  manualMediaProfileId,
  packageProfileId,
  currentProjectId,
  currentSessionTitle,
  scopedLatestCertificate,
  scopedSourceRecords,
  audit,
  receipt,
  receiptJournal,
  setJurisdictionPreviewNotice,
}: UseTabExportModelArgs) {
  const ipResult = useMemo(() => computeIPReadiness(ipParts), [ipParts]);
  const packageProfiles = useMemo(() => listExportPackageProfiles(), []);
  const mediaIpPackProfiles = useMemo(() => listMediaIpPackProfiles(), []);
  const mediaIpPackProfileById = useMemo(
    () => new Map(mediaIpPackProfiles.map((profile) => [profile.id, profile])),
    [mediaIpPackProfiles],
  );
  const suggestedMediaProfileId = useMemo(
    () => inferMediaIpPackProfileId(config),
    [config],
  );
  const creatorSegment = useMemo(
    () => recommendCreatorSegment(config),
    [config],
  );
  const segmentMediaProfileId = creatorSegment.mediaProfiles.includes(suggestedMediaProfileId)
    ? suggestedMediaProfileId
    : creatorSegment.mediaProfiles[0] ?? suggestedMediaProfileId;
  const mediaProfileId = manualMediaProfileId ?? segmentMediaProfileId;
  const recommendedPlan = useMemo(
    () => getLoreguardPlan(creatorSegment.recommendedPlanId),
    [creatorSegment.recommendedPlanId],
  );
  const upgradePlan = useMemo(
    () =>
      creatorSegment.upgradePlanId
        ? getLoreguardPlan(creatorSegment.upgradePlanId)
        : null,
    [creatorSegment.upgradePlanId],
  );
  const segmentProducts = useMemo(
    () => creatorSegment.certificateProducts.map((id) => getCertificateProduct(id)),
    [creatorSegment.certificateProducts],
  );
  const releaseEntitlement = useMemo(
    () =>
      buildReleaseEntitlementPlan({
        planId: recommendedPlan.id,
        packageProfileId,
      }),
    [packageProfileId, recommendedPlan.id],
  );
  const releaseCreditPreview = useMemo(
    () =>
      buildReleaseCreditPreview({
        planId: recommendedPlan.id,
        packageProfileId,
        projectId: currentProjectId,
        workTitle: config?.title ?? currentSessionTitle,
        certificateId: scopedLatestCertificate?.id ?? null,
      }),
    [
      config?.title,
      currentProjectId,
      currentSessionTitle,
      scopedLatestCertificate?.id,
      packageProfileId,
      recommendedPlan.id,
    ],
  );
  const {
    releaseCreditGateTone,
    releaseCreditGateLabelKo,
    submissionPackageCtaLabelKo,
    releaseCreditBalanceKo,
    submissionPackageGateNoteKo,
  } = useMemo(
    () => buildTabExportReleaseCreditPresentation(releaseCreditPreview),
    [releaseCreditPreview],
  );
  const releaseProductLineup = useMemo(
    () =>
      buildReleaseProductLineup({
        planId: recommendedPlan.id,
        currentProductId: releaseEntitlement.productId,
      }),
    [recommendedPlan.id, releaseEntitlement.productId],
  );
  const publisherWorkspaceNeeded =
    creatorSegment.id === "studioPublisher" || recommendedPlan.id === "publisher" || upgradePlan?.id === "publisher";
  const { groupReleaseScope, groupReleaseVisibleFieldsKo } = useMemo(
    () =>
      buildTabExportGroupReleasePreview({
        publisherWorkspaceNeeded,
        currentProjectId,
        packageProfileId,
        certificateId: scopedLatestCertificate?.id ?? null,
      }),
    [currentProjectId, packageProfileId, publisherWorkspaceNeeded, scopedLatestCertificate?.id],
  );
  const segmentMediaLabels = useMemo(
    () =>
      creatorSegment.mediaProfiles
        .map((id) => mediaIpPackProfileById.get(id)?.shortLabelKo)
        .filter((label): label is string => Boolean(label)),
    [creatorSegment.mediaProfiles, mediaIpPackProfileById],
  );
  const mediaIpPackPlan = useMemo(
    () =>
      config
        ? buildProjectMediaIpPackPlan({
          config,
          manuscripts,
          profileId: mediaProfileId,
        })
        : null,
    [config, manuscripts, mediaProfileId],
  );
  const mediaIpPackFormCompletions = useMemo(
    () =>
      config
        ? buildProjectMediaIpPackFormCompletions({
          config,
          manuscripts,
          profileId: mediaProfileId,
        })
        : [],
    [config, manuscripts, mediaProfileId],
  );
  const jurisdictionPackId = useMemo(() => inferLocalePackId(config), [config]);
  const jurisdictionPack = useMemo(() => getJurisdictionFormPack(jurisdictionPackId), [jurisdictionPackId]);
  const jurisdictionFormValues = useMemo(
    () =>
      buildTabExportJurisdictionFormValues({
        config,
        currentSessionTitle,
        currentProjectId,
        mediaIpPackPlan,
        manuscripts,
        receiptJournal,
      }),
    [config, currentSessionTitle, currentProjectId, mediaIpPackPlan, manuscripts, receiptJournal],
  );
  const jurisdictionFormRows = useMemo(
    () =>
      jurisdictionPack.forms.map((formItem) => ({
        form: formItem,
        completion: evaluateFormCompletion(jurisdictionPack.id, formItem.id, jurisdictionFormValues),
      })),
    [jurisdictionFormValues, jurisdictionPack.forms, jurisdictionPack.id],
  );
  const jurisdictionPackReadiness = useMemo(() => {
    const requiredTotal = jurisdictionFormRows.reduce(
      (totalCount, row) => totalCount + row.completion.requiredTotal,
      0,
    );
    const requiredPresent = jurisdictionFormRows.reduce(
      (presentCount, row) => presentCount + row.completion.requiredPresent,
      0,
    );
    const missingFormTitles = jurisdictionFormRows
      .filter((row) => row.completion.requiredPresent < row.completion.requiredTotal)
      .map((row) => row.form.title.ko);
    const checkedDateList = Array.from(
      new Set(jurisdictionPack.sourceReferences.map((sourceItem) => sourceItem.checkedAt)),
    );
    const sourceSummaryKo =
      jurisdictionPack.sourceReferences.length > 0
        ? `${jurisdictionPack.sourceReferences.length}건 · 기준일 ${checkedDateList.join(" · ")}`
        : "공통 기준 · 제출처별 확인 필요";

    return {
      missingFormTitles,
      requiredPresent,
      requiredTotal,
      sourceSummaryKo,
    };
  }, [jurisdictionFormRows, jurisdictionPack.sourceReferences]);
  const overseasReleaseReviewRow = useMemo(
    () => jurisdictionFormRows.find(({ form }) => form.id === "translation-localization") ?? null,
    [jurisdictionFormRows],
  );
  const overseasReleaseReviewFields = useMemo<Array<{ field: FormFieldDefinition; statusKo: "채움" | "보강" }>>(() => {
    if (!overseasReleaseReviewRow) return [];

    const fieldsById = new Map(
      overseasReleaseReviewRow.form.sections
        .flatMap((sectionItem) => sectionItem.fields)
        .map((fieldItem) => [fieldItem.id, fieldItem]),
    );
    const missingFieldIds = new Set(overseasReleaseReviewRow.completion.missingRequiredFieldIds);

    return OVERSEAS_RELEASE_REVIEW_FIELD_IDS
      .map((fieldId) => fieldsById.get(fieldId))
      .filter((fieldItem): fieldItem is FormFieldDefinition => Boolean(fieldItem))
      .map((fieldItem) => ({
        field: fieldItem,
        statusKo: missingFieldIds.has(fieldItem.id) ? "보강" : "채움",
      }));
  }, [overseasReleaseReviewRow]);
  const openJurisdictionPackPreview = useCallback(() => {
    const previewWindow = window.open("", "_blank", "width=1100,height=900");
    if (!previewWindow) {
      setJurisdictionPreviewNotice("새 창이 열리지 않았습니다. 브라우저의 팝업 허용 뒤 다시 열어 주세요.");
      return;
    }

    previewWindow.opener = null;
    previewWindow.document.open();
    previewWindow.document.write(buildJurisdictionPackPreviewHtml({
      formRows: jurisdictionFormRows,
      packLabelKo: jurisdictionPack.label.ko,
      sourceReferences: jurisdictionPack.sourceReferences,
    }));
    previewWindow.document.close();
    previewWindow.focus();
    setJurisdictionPreviewNotice("국가별 양식 미리보기를 새 창으로 열었습니다.");
  }, [jurisdictionFormRows, jurisdictionPack.label.ko, jurisdictionPack.sourceReferences, setJurisdictionPreviewNotice]);
  const availableArtifactIds = useMemo(() => {
    const ids: ArtifactId[] = [];
    if (manuscripts.length > 0) {
      ids.push("manuscript-md", "manuscript-final-md", "manuscript-final-clean-md");
      ids.push("public-certificate-card", "process-certificate", "digital-signature");
      ids.push("ip-pack-manifest");
    }
    if ((config?.importFileReports ?? []).length > 0) ids.push("import-file-report");
    if (audit) ids.push("final-clean-audit");
    if (receipt) ids.push("package-issuance-receipt");
    return ids;
  }, [audit, config?.importFileReports, manuscripts.length, receipt]);
  const packagePlan = useMemo(
    () =>
      buildExportPackageProfilePlan({
        profileId: packageProfileId,
        availableArtifactIds,
      }),
    [availableArtifactIds, packageProfileId],
  );
  const publicSubmissionBoundaryRows = useMemo(
    () =>
      (["public-reader", "external-submission"] as const).map((profileId) => {
        const plan = buildExportPackageProfilePlan({
          profileId,
          availableArtifactIds,
        });
        return {
          id: profileId,
          titleKo: profileId === "public-reader" ? "공개용 카드" : "제출용 문서",
          focusLabelKo: profileId === "public-reader" ? "보여줄 항목" : "제출에 포함",
          privateLabelKo: profileId === "public-reader" ? "공개하지 않음" : "조건부 첨부",
          profile: plan.profile,
          status: plan.status,
          focusItemsKo:
            profileId === "public-reader"
              ? plan.requiredItems.map((item) => item.roleKo)
              : [...plan.requiredItems, ...plan.recommendedItems].map((item) => item.roleKo),
          privateItemsKo:
            plan.profile.privateArtifactIds.length > 0
              ? plan.profile.privateArtifactIds.slice(0, 4).map(labelExportArtifactKo)
              : ["외부 공유 제한 없음"],
        };
      }),
    [availableArtifactIds],
  );
  const certificateOutputPlan = useMemo(
    () =>
      buildCertificateOutputPlan({
        profileId: selectCertificateOutputProfile(packageProfileId),
        verificationUrl: scopedLatestCertificate?.verificationUrl ?? null,
        sealNumber: scopedLatestCertificate?.sealNumber ?? null,
        availableArtifactIds,
        includeRightsLedgerDetail: packageProfileId !== "public-reader" && (config?.rightsLedger?.length ?? 0) > 0,
        rightsLedgerAttachmentCreditKo: `${releaseEntitlement.productLabelKo} · 필요 ${releaseEntitlement.requiredCredits}개`,
      }),
    [
      availableArtifactIds,
      config?.rightsLedger?.length,
      scopedLatestCertificate?.sealNumber,
      scopedLatestCertificate?.verificationUrl,
      packageProfileId,
      releaseEntitlement.productLabelKo,
      releaseEntitlement.requiredCredits,
    ],
  );
  const baseRightsLedgerRows = useMemo(
    () =>
      buildTabExportBaseRightsLedgerRows({
        config,
        scopedSourceRecords,
        mediaIpPackPlan,
        packagePlan,
        jurisdictionLabelKo: jurisdictionPack.label.ko,
      }),
    [config, jurisdictionPack.label.ko, mediaIpPackPlan, packagePlan, scopedSourceRecords],
  );
  const rightsLedgerRows = useMemo(
    () => mergeRightsLedgerRows(baseRightsLedgerRows, config?.rightsLedger),
    [baseRightsLedgerRows, config?.rightsLedger],
  );
  const rightsLedgerMissingLabelsByRowId = useMemo(() => {
    const entries = rightsLedgerRows.map((row) => [
      row.id ?? row.categoryKo,
      getRightsLedgerMissingFieldLabels(row),
    ] as const);
    return new Map(entries);
  }, [rightsLedgerRows]);
  const rightsLedgerMissingCount = useMemo(
    () =>
      Array.from(rightsLedgerMissingLabelsByRowId.values()).reduce(
        (total, labels) => total + labels.length,
        0,
      ),
    [rightsLedgerMissingLabelsByRowId],
  );
  const sourceSummaryRows = useMemo(
    () => buildTabExportSourceSummaryRows({ config, scopedSourceRecords }),
    [config, scopedSourceRecords],
  );
  const mediaIpPackMarkdownInput = useMemo(
    () =>
      buildTabExportMediaIpPackMarkdownInput({
        config,
        currentSessionTitle,
        mediaIpPackPlan,
        packagePlan,
        jurisdictionLabelKo: jurisdictionPack.label.ko,
        jurisdictionFormRows,
        jurisdictionSourceReferences: jurisdictionPack.sourceReferences,
        rightsLedgerRows,
        sourceSummaryRows,
        certificateOutputPlan,
        mediaIpPackFormCompletions,
        releaseEntitlement,
      }),
    [
      certificateOutputPlan,
      config,
      currentSessionTitle,
      jurisdictionFormRows,
      jurisdictionPack.label.ko,
      jurisdictionPack.sourceReferences,
      mediaIpPackFormCompletions,
      mediaIpPackPlan,
      packagePlan,
      releaseEntitlement,
      rightsLedgerRows,
      sourceSummaryRows,
    ],
  );
  const rightsStatusLabelKo = config?.rightsStatus ? RIGHTS_STATUS_LABEL_KO[config.rightsStatus] : "확인 필요";
  const assetizationSummaryRows = useMemo(
    () =>
      buildTabExportAssetizationSummaryRows({
        mediaIpPackPlan,
        rightsLedgerRowsLength: rightsLedgerRows.length,
        sourceSummaryRowsLength: sourceSummaryRows.length,
        packageLabelKo: packagePlan.profile.labelKo,
        releaseProductLabelKo: releaseEntitlement.productLabelKo,
        certificateOutputShortLabelKo: certificateOutputPlan.profile.shortLabelKo,
        rightsStatusLabelKo,
      }),
    [
      certificateOutputPlan.profile.shortLabelKo,
      mediaIpPackPlan,
      packagePlan.profile.labelKo,
      releaseEntitlement.productLabelKo,
      rightsLedgerRows.length,
      rightsStatusLabelKo,
      sourceSummaryRows.length,
    ],
  );
  const ipBibleClusterRows = useMemo(
    () => buildTabExportIpBibleClusterRows(mediaIpPackPlan),
    [mediaIpPackPlan],
  );

  return {
    ipResult,
    packageProfiles,
    mediaIpPackProfiles,
    mediaIpPackProfileById,
    creatorSegment,
    segmentMediaProfileId,
    mediaProfileId,
    recommendedPlan,
    upgradePlan,
    segmentProducts,
    releaseEntitlement,
    releaseCreditPreview,
    releaseCreditGateTone,
    releaseCreditGateLabelKo,
    submissionPackageCtaLabelKo,
    releaseCreditBalanceKo,
    submissionPackageGateNoteKo,
    releaseProductLineup,
    groupReleaseScope,
    groupReleaseVisibleFieldsKo,
    segmentMediaLabels,
    mediaIpPackPlan,
    jurisdictionPack,
    jurisdictionFormRows,
    jurisdictionPackReadiness,
    overseasReleaseReviewFields,
    openJurisdictionPackPreview,
    packagePlan,
    publicSubmissionBoundaryRows,
    certificateOutputPlan,
    baseRightsLedgerRows,
    rightsLedgerRows,
    rightsLedgerMissingLabelsByRowId,
    rightsLedgerMissingCount,
    mediaIpPackMarkdownInput,
    assetizationSummaryRows,
    ipBibleClusterRows,
  };
}

export { sectionLabelKo };
