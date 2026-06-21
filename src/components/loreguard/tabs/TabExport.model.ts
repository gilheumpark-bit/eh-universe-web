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
  IP_BIBLE_SECTION_KEYS,
  IP_BIBLE_SECTION_META,
  type IpBibleCluster,
  type IpBibleSectionKey,
} from "@/lib/creative/ip-bible-builder";
import type {
  MediaIpPackMarkdownInput,
  MediaIpPackRightsLedgerRow,
} from "@/lib/creative/media-ip-pack-markdown";
import {
  buildReleaseEntitlementPlan,
  buildReleaseProductLineup,
  getCertificateProduct,
  getLoreguardPlan,
} from "@/lib/billing/loreguard-plans";
import { buildReleaseCreditPreview } from "@/lib/billing/release-credit-ledger";
import { recommendCreatorSegment } from "@/lib/billing/creator-segments";
import { buildGroupReleaseLedgerScope } from "@/lib/group-workspace/rbac";
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
  formatKrw,
  formatReleaseCredits,
} from "@/components/loreguard/tabs/TabExport.helpers";
import {
  IMPORT_REPORT_STATUS_LABEL_KO,
  IP_BIBLE_CLUSTER_DESCRIPTION_KO,
  IP_BIBLE_CLUSTER_LABEL_KO,
  OVERSEAS_RELEASE_REVIEW_FIELD_IDS,
  RIGHTS_STATUS_LABEL_KO,
  SOURCE_TYPE_LABEL_KO,
  SOURCE_VISIBILITY_LABEL_KO,
} from "@/components/loreguard/tabs/TabExport.constants";
import {
  getRightsLedgerMissingFieldLabels,
  importReportNoteKo,
  importReportVisibilityKo,
  mergeRightsLedgerRows,
  shortenHashKo,
  summarizeSourceOriginKo,
} from "@/components/loreguard/tabs/TabExport.rights-ledger";

function sectionLabelKo(key: IpBibleSectionKey): string {
  return IP_BIBLE_SECTION_META[key]?.title ?? key;
}

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
  const releaseCreditGateTone =
    releaseCreditPreview.status === "included" || releaseCreditPreview.status === "unlimited"
      ? "green"
      : releaseCreditPreview.status === "separate-purchase"
        ? "amber"
        : "red";
  const releaseCreditGateLabelKo =
    releaseCreditPreview.status === "included"
      ? "발급 전 검토 가능"
      : releaseCreditPreview.status === "unlimited"
        ? "조직 원장 협의"
        : releaseCreditPreview.status === "separate-purchase"
          ? "사전 안내 후 크레딧 반영"
          : "상위 권한 확인 필요";
  const submissionPackageCtaLabelKo =
    releaseCreditPreview.status === "included"
      ? "출고 묶음 검토 생성"
      : releaseCreditPreview.status === "unlimited"
        ? "조직 제출 묶음 검토 생성"
        : releaseCreditPreview.status === "separate-purchase"
          ? "출고 묶음 미리보기"
          : "상위 권한 검토용 미리보기";
  const releaseCreditBalanceKo =
    releaseCreditPreview.remainingCredits === null
      ? `필요 ${formatReleaseCredits(releaseCreditPreview.requiredCredits)} · 보유 ${formatReleaseCredits(releaseCreditPreview.availableCredits)} · 잔여 협의`
      : `필요 ${formatReleaseCredits(releaseCreditPreview.requiredCredits)} · 보유 ${formatReleaseCredits(releaseCreditPreview.availableCredits)} · 잔여 ${formatReleaseCredits(releaseCreditPreview.remainingCredits)}`;
  const submissionPackageGateNoteKo = `${releaseCreditPreview.eventDraft.statusKo} · ${releaseCreditBalanceKo} · ${releaseCreditPreview.ledgerNoteKo}`;
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
  const groupReleaseScope = useMemo(
    () =>
      publisherWorkspaceNeeded
        ? buildGroupReleaseLedgerScope({
          workspaceId: "publisher-workspace-preview",
          role: "owner",
          projectId: currentProjectId,
          packageProfileId,
          certificateId: scopedLatestCertificate?.id ?? null,
          assignedProjectIds: currentProjectId ? [currentProjectId] : [],
        })
        : null,
    [
      currentProjectId,
      scopedLatestCertificate?.id,
      packageProfileId,
      publisherWorkspaceNeeded,
    ],
  );
  const groupReleaseVisibleFieldsKo = groupReleaseScope
    ? groupReleaseScope.visibleFields.length > 0
      ? `${groupReleaseScope.visibleFields.length}개 제출 필드`
      : "표시 필드 없음"
    : "";
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
    () => ({
      "work-title": config?.title,
      "author-display-name": currentSessionTitle,
      "primary-language": config?.projectTargetLanguage,
      "target-market": config?.targetMarket,
      "release-channel": config?.releasePurpose ? [config.releasePurpose] : [],
      "author-final-decision": config?.rightsStatus ? RIGHTS_STATUS_LABEL_KO[config.rightsStatus] : "",
      "human-decisions": [config?.corePremise, config?.synopsis, config?.sceneDirection?.writerNotes].filter(Boolean).join("\n"),
      "noa-involvement-scope": "노아 제안은 작가 승인 뒤에만 과정기록으로 남깁니다.",
      "accepted-suggestions": receiptJournal,
      "revision-log": manuscripts,
      "work-note-index": (config?.acceptedImportCandidates ?? []).map((item) => item.title),
      "hash-chain": Boolean(currentProjectId),
      "author-ownership": config?.rightsStatus ? RIGHTS_STATUS_LABEL_KO[config.rightsStatus] : "",
      "external-materials": config?.importFileReports ?? [],
      "license-notes": config?.rightsNote,
      "character-world-bible": [
        config?.setting,
        ...(config?.characters ?? []).map((character) => character.name),
        ...(config?.items ?? []).map((item) => item.name),
      ].filter(Boolean),
      "derivative-rights": [
        mediaIpPackPlan?.profile.labelKo,
        config?.releasePurpose,
        config?.genreMode,
      ].filter(Boolean),
      "source-inventory": config?.importFileReports ?? [],
      "read-evidence": (config?.importFileReports ?? [])
        .map((report) => `${report.fileName}: ${report.detail}`)
        .filter(Boolean)
        .join("\n"),
      "classification-result": [
        ...(config?.acceptedImportCandidates ?? []).map((item) => item.title),
        ...(config?.importFileReports ?? []).map((report) => `${report.fileName} · ${IMPORT_REPORT_STATUS_LABEL_KO[report.status]}`),
      ],
      "source-target-language": config?.translatedManuscripts?.length
        ? config.translatedManuscripts.map((item) => `${item.sourceLang} → ${item.targetLang}`)
        : `KO → ${config?.projectTargetLanguage ?? "KO"}`,
      "faithful-market-track": config?.translatedManuscripts?.length
        ? "보관본/시장판 분리 검토 필요"
        : "원문 출고 기준",
      "glossary-lock": config?.translationConfig?.glossary?.filter((item) => item.locked).map((item) => item.source) ?? [],
      "author-signoff": config?.translatedManuscripts?.some((item) => item.faithfulApproved || item.marketApproved)
        ? "번역 승인 기록 있음"
        : currentProjectId
          ? "프로젝트 출고 전 작가 승인 대기"
          : "",
      "source-preservation-copy": (config?.translatedManuscripts ?? []).filter((item) => item.faithfulApproved),
      "market-release-copy": (config?.translatedManuscripts ?? []).filter((item) => item.marketApproved),
      "localization-decision-log": (config?.translatedManuscripts ?? []).filter((item) => item.approvedAt),
      "clean-manuscript": manuscripts,
      "process-record": currentProjectId ? [`프로젝트 ${currentProjectId} 과정기록`] : [],
      "ip-pack-manifest": mediaIpPackPlan ? [mediaIpPackPlan.profile.labelKo] : [],
      "limitation-statement": true,
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
  const baseRightsLedgerRows = useMemo<MediaIpPackRightsLedgerRow[]>(() => {
    const rightsStatusKo = config?.rightsStatus ? RIGHTS_STATUS_LABEL_KO[config.rightsStatus] : "권리 확인 필요";
    const rightsNote = config?.rightsNote?.trim() || "별도 메모 없음";
    const importedCount = (config?.importFileReports ?? []).length;
    const sourceCount = scopedSourceRecords.length;
    const sourcePreviewKo = scopedSourceRecords
      .slice(0, 3)
      .map((source) => `${source.label}(${SOURCE_TYPE_LABEL_KO[source.sourceType]})`)
      .join(" · ");
    const translatedCount = config?.translatedManuscripts?.length ?? 0;
    const mediaPurpose = mediaIpPackPlan?.profile.purposeKo ?? "매체별 권리/IP 자산화";

    return [
      {
        id: "manuscriptText",
        categoryKo: "원고 본문",
        ownerKo: "작가/프로젝트 소유자",
        usageScopeKo: `${packagePlan.profile.labelKo} · ${packagePlan.profile.audienceKo}`,
        exclusivityKo: "계약 전 미정",
        termKo: "출고 전 확인",
        regionKo: jurisdictionPack.label.ko,
        mediaKo: "웹소설·출판·제출용",
        evidenceFileKo: "원고 파일 · 과정기록",
        statusKo: rightsStatusKo,
        noteKo: rightsNote,
      },
      {
        id: "storyAssets",
        categoryKo: "설정·캐릭터·아이템",
        ownerKo: "프로젝트 작품 기준",
        usageScopeKo: "세계관·캐릭터·아이템·씬시트·연출 연계",
        exclusivityKo: "작가 승인 전 외부 제공 금지",
        termKo: "프로젝트 기간",
        regionKo: jurisdictionPack.label.ko,
        mediaKo: mediaIpPackPlan?.profile.labelKo ?? "매체 확장 미정",
        evidenceFileKo: "설정집 · 씬시트 · 연출 기록",
        statusKo: mediaIpPackPlan
          ? `${mediaIpPackPlan.completionPercent}% · ${mediaIpPackPlan.status === "ready" ? "제안 준비" : mediaIpPackPlan.status === "review" ? "보강 권장" : "필수 보강"}`
          : "작품 기준 보강 필요",
        noteKo: mediaIpPackPlan?.summaryKo ?? "프로젝트 설정을 먼저 보강해야 합니다.",
      },
      {
        id: "sourceMaterials",
        categoryKo: "외부 자료·출처",
        ownerKo: sourceCount > 0 || importedCount > 0 ? "출처 기록 있음" : "작가 확인 필요",
        usageScopeKo: "불러오기 자료·참조 자료·출처 자료",
        exclusivityKo: "원천 권리 조건 따름",
        termKo: "자료별 조건 확인",
        regionKo: "자료별 조건 확인",
        mediaKo: "제출용 참고 자료",
        evidenceFileKo: sourcePreviewKo || "불러오기 파일 · 출처 기록",
        statusKo: sourceCount > 0 || importedCount > 0 ? `기록 ${sourceCount + importedCount}건` : "미기록",
        noteKo: sourceCount > 0 || importedCount > 0
          ? `${sourcePreviewKo || "불러온 자료"} · 원문 전문은 출고 초안에 넣지 않고 별도 조건으로 분리합니다.`
          : "외부 자료를 썼다면 출처와 사용 범위를 먼저 남겨야 합니다.",
      },
      {
        id: "translationRelease",
        categoryKo: "번역·해외 출고",
        ownerKo: "작가 승인 필요",
        usageScopeKo: `${jurisdictionPack.label.ko} · 번역·현지화 기록`,
        exclusivityKo: "번역권 계약 전 미정",
        termKo: "지역·언어권 계약 전 확인",
        regionKo: config?.targetMarket ?? "대상 국가 미정",
        mediaKo: "번역·현지화·해외 플랫폼",
        evidenceFileKo: "원문 보관본 · 번역 기록 · 용어집",
        statusKo: translatedCount > 0 ? `번역 기록 ${translatedCount}건` : "번역 기록 없음",
        noteKo: translatedCount > 0
          ? "원문 보관본과 시장 출고본을 분리해 확인합니다."
          : "해외 출고 전 원문 보관본, 시장 출고본, 용어집을 분리해야 합니다.",
      },
      {
        id: "mediaExpansion",
        categoryKo: "매체 확장",
        ownerKo: "계약 전 확인 필요",
        usageScopeKo: mediaPurpose,
        exclusivityKo: "독점/비독점 협의 전",
        termKo: "옵션 기간 협의 전",
        regionKo: "매체 제안처별 확인",
        mediaKo: mediaIpPackPlan?.profile.shortLabelKo ?? "매체 미정",
        evidenceFileKo: "매체별 권리팩 · 제안서",
        statusKo: mediaIpPackPlan?.profile.labelKo ?? "매체 방향 미정",
        noteKo: mediaIpPackPlan?.profile.rightsChecklistKo.slice(0, 3).join(" · ") || "매체별 권리 체크 항목이 필요합니다.",
      },
    ];
  }, [
    config?.importFileReports,
    config?.rightsNote,
    config?.rightsStatus,
    config?.targetMarket,
    config?.translatedManuscripts,
    jurisdictionPack.label.ko,
    mediaIpPackPlan,
    packagePlan.profile.audienceKo,
    packagePlan.profile.labelKo,
    scopedSourceRecords,
  ]);
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
    () => {
      const sourceFileNames = new Set(
        scopedSourceRecords
          .map((source) => source.fileName?.trim())
          .filter((fileName): fileName is string => Boolean(fileName)),
      );
      const sourceRows = scopedSourceRecords.map((source) => ({
        id: source.id,
        labelKo: source.label,
        typeKo: SOURCE_TYPE_LABEL_KO[source.sourceType],
        originKo: summarizeSourceOriginKo(source),
        visibilityKo: SOURCE_VISIBILITY_LABEL_KO[source.visibility],
        licenseKo: source.licenseNote?.trim() || "권리 메모 없음",
        evidenceKo: `해시 ${shortenHashKo(source.contentHash)}`,
        noteKo: source.note,
      }));
      const importReportRows = (config?.importFileReports ?? [])
        .filter((report) => !sourceFileNames.has(report.fileName))
        .map((report) => ({
          id: report.id,
          labelKo: report.fileName,
          typeKo: "불러오기 파일",
          originKo: report.fileName,
          visibilityKo: importReportVisibilityKo(report),
          licenseKo: "작가 제공 자료",
          evidenceKo: `파일 기록 ${report.id}`,
          noteKo: importReportNoteKo(report),
        }));

      return [...sourceRows, ...importReportRows];
    },
    [config?.importFileReports, scopedSourceRecords],
  );
  const mediaIpPackMarkdownInput = useMemo<MediaIpPackMarkdownInput | null>(() => {
    if (!mediaIpPackPlan) return null;

    return {
      workTitle: config?.title ?? currentSessionTitle,
      generatedAt: "현재 화면 기준",
      plan: mediaIpPackPlan,
      packageSummary: {
        labelKo: packagePlan.profile.labelKo,
        audienceKo: packagePlan.profile.audienceKo,
        boundaryKo: packagePlan.profile.boundaryKo,
        requiredItemsKo: packagePlan.requiredItems.map((item) => item.roleKo),
        recommendedItemsKo: packagePlan.recommendedItems.map((item) => item.roleKo),
        privateItemsKo: packagePlan.privateItems.map((item) => item.roleKo),
        summaryKo: packagePlan.summaryKo,
      },
      jurisdictionLabelKo: jurisdictionPack.label.ko,
      jurisdictionFormRows: jurisdictionFormRows.map(({ form, completion }) => ({
        titleKo: form.title.ko,
        purposeKo: form.purpose.ko,
        requiredPresent: completion.requiredPresent,
        requiredTotal: completion.requiredTotal,
      })),
      jurisdictionSourceRows: jurisdictionPack.sourceReferences.map((reference) => ({
        titleKo: reference.title,
        url: reference.url,
        checkedAt: reference.checkedAt,
      })),
      rightsLedgerRows,
      sourceSummaryRows,
      certificateOutput: {
        labelKo: certificateOutputPlan.profile.labelKo,
        purposeKo: certificateOutputPlan.profile.purposeKo,
        boundaryKo: certificateOutputPlan.profile.boundaryKo,
        visualModeKo: certificateOutputPlan.profile.visualMode === "compact-card" ? "공개 카드" : "전체 문서",
        verificationUrl: certificateOutputPlan.verificationUrl,
        sealNumber: certificateOutputPlan.sealNumber,
        exposedFieldsKo: certificateOutputPlan.exposedFieldsKo,
        privateFieldsKo: certificateOutputPlan.privateFieldsKo,
        includedArtifactsKo: certificateOutputPlan.includedArtifactsKo,
        excludedArtifactsKo: certificateOutputPlan.excludedArtifactsKo,
        rightsLedgerPolicyKo: certificateOutputPlan.rightsLedgerPolicyKo,
        safetyPolicyKo: certificateOutputPlan.safetyPolicyKo,
        missingKo: certificateOutputPlan.missingKo,
        summaryKo: certificateOutputPlan.summaryKo,
      },
      formGroupCompletions: mediaIpPackFormCompletions,
      productLabelKo: releaseEntitlement.productLabelKo,
      productPriceKrw: releaseEntitlement.productPriceKrw,
      productPriceLabelKo: formatKrw(releaseEntitlement.productPriceKrw),
      rightsStatusKo: config?.rightsStatus ? RIGHTS_STATUS_LABEL_KO[config.rightsStatus] : "권리 확인 필요",
      rightsNote: config?.rightsNote,
    };
  }, [
    config?.rightsNote,
    config?.rightsStatus,
    config?.title,
    currentSessionTitle,
    releaseEntitlement.productLabelKo,
    releaseEntitlement.productPriceKrw,
    certificateOutputPlan.exposedFieldsKo,
    certificateOutputPlan.excludedArtifactsKo,
    certificateOutputPlan.includedArtifactsKo,
    certificateOutputPlan.missingKo,
    certificateOutputPlan.privateFieldsKo,
    certificateOutputPlan.profile.boundaryKo,
    certificateOutputPlan.profile.labelKo,
    certificateOutputPlan.profile.purposeKo,
    certificateOutputPlan.profile.visualMode,
    certificateOutputPlan.rightsLedgerPolicyKo,
    certificateOutputPlan.sealNumber,
    certificateOutputPlan.safetyPolicyKo,
    certificateOutputPlan.summaryKo,
    certificateOutputPlan.verificationUrl,
    jurisdictionFormRows,
    jurisdictionPack.label.ko,
    jurisdictionPack.sourceReferences,
    mediaIpPackFormCompletions,
    mediaIpPackPlan,
    packagePlan,
    rightsLedgerRows,
    sourceSummaryRows,
  ]);
  const mediaReadiness = mediaIpPackPlan
    ? `${mediaIpPackPlan.completionPercent}%`
    : "작품 기준 필요";
  const rightsStatusLabelKo = config?.rightsStatus ? RIGHTS_STATUS_LABEL_KO[config.rightsStatus] : "확인 필요";
  const filledSections = new Set(mediaIpPackPlan?.filledSections ?? []);
  const sectionStatus = (key: IpBibleSectionKey) => (filledSections.has(key) ? "채움" : "보강");
  const assetizationSummaryRows = [
    {
      label: "원고 품질",
      value: sectionStatus("themeTone"),
      detail: "문체·리듬·문장 가독성",
    },
    {
      label: "설정 흐름",
      value: mediaReadiness,
      detail: "세계관·캐릭터·씬시트·연출",
    },
    {
      label: "권리/IP",
      value: rightsStatusLabelKo,
      detail: `${rightsLedgerRows.length}개 원장 · 출처 ${sourceSummaryRows.length}개`,
    },
    {
      label: "출고",
      value: packagePlan.profile.labelKo,
      detail: `${releaseEntitlement.productLabelKo} · ${certificateOutputPlan.profile.shortLabelKo}`,
    },
  ];
  const ipBibleClusterRows = useMemo(() => {
    const filledSections = new Set(mediaIpPackPlan?.filledSections ?? []);
    const requiredSections = new Set(mediaIpPackPlan?.missingRequired ?? []);
    const recommendedSections = new Set(mediaIpPackPlan?.missingRecommended ?? []);

    return (Object.keys(IP_BIBLE_CLUSTER_LABEL_KO) as IpBibleCluster[]).map((cluster) => {
      const sections = IP_BIBLE_SECTION_KEYS.filter((key) => IP_BIBLE_SECTION_META[key].cluster === cluster);
      const filledCount = sections.filter((key) => filledSections.has(key)).length;
      return {
        cluster,
        labelKo: IP_BIBLE_CLUSTER_LABEL_KO[cluster],
        descriptionKo: IP_BIBLE_CLUSTER_DESCRIPTION_KO[cluster],
        filledCount,
        totalCount: sections.length,
        sections: sections.map((key) => ({
          key,
          labelKo: sectionLabelKo(key),
          statusKo: filledSections.has(key)
            ? "채움"
            : requiredSections.has(key)
              ? "필수 보강"
              : recommendedSections.has(key)
                ? "권장 보강"
                : "대기",
        })),
      };
    });
  }, [
    mediaIpPackPlan?.filledSections,
    mediaIpPackPlan?.missingRecommended,
    mediaIpPackPlan?.missingRequired,
  ]);

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
