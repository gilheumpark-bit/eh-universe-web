import type { EpisodeManuscript, StoryConfig } from "@/lib/studio-types";
import type { SourceRecord } from "@/lib/creative-process";
import type {
  MediaIpPackMarkdownInput,
  MediaIpPackRightsLedgerRow,
} from "@/lib/creative/media-ip-pack-markdown";
import type {
  buildProjectMediaIpPackFormCompletions,
  buildProjectMediaIpPackPlan,
} from "@/lib/creative/media-ip-pack-project";
import {
  IP_BIBLE_SECTION_KEYS,
  IP_BIBLE_SECTION_META,
  type IpBibleCluster,
  type IpBibleSectionKey,
} from "@/lib/creative/ip-bible-builder";
import type { buildExportPackageProfilePlan } from "@/lib/creative-process/export-package-profile";
import type { buildCertificateOutputPlan } from "@/lib/creative-process/certificate-output-profile";
import type { buildReleaseEntitlementPlan } from "@/lib/billing/loreguard-plans";
import { buildGroupReleaseLedgerScope } from "@/lib/group-workspace/rbac";
import {
  IMPORT_REPORT_STATUS_LABEL_KO,
  IP_BIBLE_CLUSTER_DESCRIPTION_KO,
  IP_BIBLE_CLUSTER_LABEL_KO,
  RIGHTS_STATUS_LABEL_KO,
  SOURCE_TYPE_LABEL_KO,
  SOURCE_VISIBILITY_LABEL_KO,
} from "@/components/loreguard/tabs/TabExport.constants";
import { formatKrw, formatReleaseCredits } from "@/components/loreguard/tabs/TabExport.helpers";
import {
  importReportNoteKo,
  importReportVisibilityKo,
  shortenHashKo,
  summarizeSourceOriginKo,
} from "@/components/loreguard/tabs/TabExport.rights-ledger";

type MediaIpPackPlan = ReturnType<typeof buildProjectMediaIpPackPlan>;
type MediaIpPackFormCompletions = ReturnType<typeof buildProjectMediaIpPackFormCompletions>;
type ExportPackagePlan = ReturnType<typeof buildExportPackageProfilePlan>;
type CertificateOutputPlan = ReturnType<typeof buildCertificateOutputPlan>;
type ReleaseEntitlementPlan = ReturnType<typeof buildReleaseEntitlementPlan>;
type ReleaseCreditPreview = {
  status: "included" | "unlimited" | "separate-purchase" | string;
  remainingCredits: number | null;
  requiredCredits: number;
  availableCredits: number;
  eventDraft: { statusKo: string };
  ledgerNoteKo: string;
};

type JurisdictionFormRow = {
  form: {
    title: { ko: string };
    purpose: { ko: string };
  };
  completion: {
    requiredPresent: number;
    requiredTotal: number;
  };
};

type JurisdictionSourceReference = {
  title: string;
  url: string;
  checkedAt: string;
};

export function sectionLabelKo(key: IpBibleSectionKey): string {
  return IP_BIBLE_SECTION_META[key]?.title ?? key;
}

export function buildTabExportReleaseCreditPresentation(releaseCreditPreview: ReleaseCreditPreview) {
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

  return {
    releaseCreditGateTone,
    releaseCreditGateLabelKo,
    submissionPackageCtaLabelKo,
    releaseCreditBalanceKo,
    submissionPackageGateNoteKo,
  };
}

export function buildTabExportGroupReleasePreview(args: {
  publisherWorkspaceNeeded: boolean;
  currentProjectId: string | null | undefined;
  packageProfileId: string;
  certificateId: string | null;
}) {
  const { publisherWorkspaceNeeded, currentProjectId, packageProfileId, certificateId } = args;
  const groupReleaseScope = publisherWorkspaceNeeded
    ? buildGroupReleaseLedgerScope({
      workspaceId: "publisher-workspace-preview",
      role: "owner",
      projectId: currentProjectId,
      packageProfileId,
      certificateId,
      assignedProjectIds: currentProjectId ? [currentProjectId] : [],
    })
    : null;
  const groupReleaseVisibleFieldsKo = groupReleaseScope
    ? groupReleaseScope.visibleFields.length > 0
      ? `${groupReleaseScope.visibleFields.length}개 제출 필드`
      : "표시 필드 없음"
    : "";

  return { groupReleaseScope, groupReleaseVisibleFieldsKo };
}

export function buildTabExportJurisdictionFormValues(args: {
  config: StoryConfig | null;
  currentSessionTitle: string | undefined;
  currentProjectId: string | null | undefined;
  mediaIpPackPlan: MediaIpPackPlan | null;
  manuscripts: EpisodeManuscript[];
  receiptJournal: unknown[];
}) {
  const { config, currentSessionTitle, currentProjectId, mediaIpPackPlan, manuscripts, receiptJournal } = args;

  return {
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
  };
}

export function buildTabExportBaseRightsLedgerRows(args: {
  config: StoryConfig | null;
  scopedSourceRecords: SourceRecord[];
  mediaIpPackPlan: MediaIpPackPlan | null;
  packagePlan: ExportPackagePlan;
  jurisdictionLabelKo: string;
}): MediaIpPackRightsLedgerRow[] {
  const { config, scopedSourceRecords, mediaIpPackPlan, packagePlan, jurisdictionLabelKo } = args;
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
      regionKo: jurisdictionLabelKo,
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
      regionKo: jurisdictionLabelKo,
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
      usageScopeKo: `${jurisdictionLabelKo} · 번역·현지화 기록`,
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
}

export function buildTabExportSourceSummaryRows(args: {
  config: StoryConfig | null;
  scopedSourceRecords: SourceRecord[];
}) {
  const { config, scopedSourceRecords } = args;
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
}

export function buildTabExportMediaIpPackMarkdownInput(args: {
  config: StoryConfig | null;
  currentSessionTitle: string | undefined;
  mediaIpPackPlan: MediaIpPackPlan | null;
  packagePlan: ExportPackagePlan;
  jurisdictionLabelKo: string;
  jurisdictionFormRows: JurisdictionFormRow[];
  jurisdictionSourceReferences: readonly JurisdictionSourceReference[];
  rightsLedgerRows: MediaIpPackRightsLedgerRow[];
  sourceSummaryRows: ReturnType<typeof buildTabExportSourceSummaryRows>;
  certificateOutputPlan: CertificateOutputPlan;
  mediaIpPackFormCompletions: MediaIpPackFormCompletions;
  releaseEntitlement: ReleaseEntitlementPlan;
}): MediaIpPackMarkdownInput | null {
  const {
    config,
    currentSessionTitle,
    mediaIpPackPlan,
    packagePlan,
    jurisdictionLabelKo,
    jurisdictionFormRows,
    jurisdictionSourceReferences,
    rightsLedgerRows,
    sourceSummaryRows,
    certificateOutputPlan,
    mediaIpPackFormCompletions,
    releaseEntitlement,
  } = args;
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
    jurisdictionLabelKo,
    jurisdictionFormRows: jurisdictionFormRows.map(({ form, completion }) => ({
      titleKo: form.title.ko,
      purposeKo: form.purpose.ko,
      requiredPresent: completion.requiredPresent,
      requiredTotal: completion.requiredTotal,
    })),
    jurisdictionSourceRows: jurisdictionSourceReferences.map((reference) => ({
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
}

export function buildTabExportAssetizationSummaryRows(args: {
  mediaIpPackPlan: MediaIpPackPlan | null;
  rightsLedgerRowsLength: number;
  sourceSummaryRowsLength: number;
  packageLabelKo: string;
  releaseProductLabelKo: string;
  certificateOutputShortLabelKo: string;
  rightsStatusLabelKo: string;
}) {
  const {
    mediaIpPackPlan,
    rightsLedgerRowsLength,
    sourceSummaryRowsLength,
    packageLabelKo,
    releaseProductLabelKo,
    certificateOutputShortLabelKo,
    rightsStatusLabelKo,
  } = args;
  const mediaReadiness = mediaIpPackPlan
    ? `${mediaIpPackPlan.completionPercent}%`
    : "작품 기준 필요";
  const filledSections = new Set(mediaIpPackPlan?.filledSections ?? []);
  const sectionStatus = (key: IpBibleSectionKey) => (filledSections.has(key) ? "채움" : "보강");

  return [
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
      detail: `${rightsLedgerRowsLength}개 원장 · 출처 ${sourceSummaryRowsLength}개`,
    },
    {
      label: "출고",
      value: packageLabelKo,
      detail: `${releaseProductLabelKo} · ${certificateOutputShortLabelKo}`,
    },
  ];
}

export function buildTabExportIpBibleClusterRows(mediaIpPackPlan: MediaIpPackPlan | null) {
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
}
