import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStudio } from "@/app/studio/StudioContext";
import { useStudioExport } from "@/hooks/useStudioExport";
import { L4 } from "@/lib/i18n";
import type { EpisodeManuscript } from "@/lib/studio-types";
import { runPublishAudit, type PublishAuditReport } from "@/lib/translation/publish-audit";
import {
  buildHarness,
  gradeFromPrismMode,
  harnessToAuditOptions,
  koreanGenreIdFromStoryGenre,
  loadOrBuildHarness,
  markHarnessUsed,
  summarizeHarness,
} from "@/lib/creative/quality-harness";
import type { IPReadinessParts } from "@/lib/creative/ip-readiness";
import type { MediaIpPackProfileId } from "@/lib/creative/media-ip-pack-profile";
import type { ExportPackageProfileId } from "@/lib/creative-process/export-package-profile";
import {
  buildCopyrightRegistrationPrep,
} from "@/lib/creative-process/copyright-registration-prep";
import {
  buildCoreCopyrightPackage,
} from "@/lib/creative-process/core-copyright-package";
import {
  buildRightsProposalAdvisor,
} from "@/lib/creative-process/rights-proposal-advisor";
import { checkPlatformFit, PLATFORM_SPECS } from "@/lib/writing-workspace/export-spec";
import { Download } from "../icons";
import TabExportAssetSection from "@/components/loreguard/tabs/TabExportAssetSection";
import TabExportChecklistPanel from "@/components/loreguard/tabs/TabExportChecklistPanel";
import TabExportEvidenceSection from "@/components/loreguard/tabs/TabExportEvidenceSection";
import TabExportEmptyState from "@/components/loreguard/tabs/TabExportEmptyState";
import TabExportManuscriptRail from "@/components/loreguard/tabs/TabExportManuscriptRail";
import { useTabExportModel } from "@/components/loreguard/tabs/TabExport.model";
import TabExportPremiumRightsPackageCard from "@/components/loreguard/tabs/TabExportPremiumRightsPackageCard";
import TabExportReleaseOverviewCard from "@/components/loreguard/tabs/TabExportReleaseOverviewCard";
import type { ExportSectionId } from "@/components/loreguard/tabs/TabExport.constants";
import {
  TabExportHeaderTabs,
  TabExportStatsGrid,
} from "@/components/loreguard/tabs/TabExport.chrome";
import { useTabExportProcessEvidence } from "@/components/loreguard/tabs/TabExport.process";
import { useTabExportDownloads } from "@/components/loreguard/tabs/TabExport.downloads";
import { useTabExportReceiptIssuer } from "@/components/loreguard/tabs/TabExport.receipt";
import { useTabExportRightsLedgerRuntime } from "@/components/loreguard/tabs/TabExport.rights-ledger-runtime";

const SubmissionPackageBuilder = dynamic(
  () => import("@/components/studio/SubmissionPackageBuilder").then((module) => module.default),
  {
    ssr: false,
    loading: () => (
      <section
        aria-label="제출 묶음 준비"
        className="lg-submission-loading"
      >
        제출 묶음 생성 도구를 준비하고 있습니다.
      </section>
    ),
  },
);

function sortManuscripts(list: EpisodeManuscript[] | undefined): EpisodeManuscript[] {
  return [...(list ?? [])].sort((a, b) => a.episode - b.episode);
}

export default function TabExport() {
  const {
    currentSession,
    currentSessionId,
    currentProjectId,
    projects,
    sessions,
    setCurrentProjectId,
    setCurrentSessionId,
    setConfig,
    createNewSession,
    language,
    isKO,
    writingMode,
    editDraft,
  } = useStudio();

  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [packageProfileId, setPackageProfileId] = useState<ExportPackageProfileId>("external-submission");
  const [manualMediaProfileId, setManualMediaProfileId] = useState<MediaIpPackProfileId | null>(null);
  const [audit, setAudit] = useState<PublishAuditReport | null>(null);
  const [receipt, setReceipt] = useState("");
  const [jurisdictionPreviewNotice, setJurisdictionPreviewNotice] = useState("");
  const [proposalAdvisorText, setProposalAdvisorText] = useState("");
  const [activeExportSection, setActiveExportSection] = useState<ExportSectionId>("overview");
  const [ipParts, setIpParts] = useState<IPReadinessParts>({
    rights: 60,
    market: 60,
    adaptation: 60,
    assetPackage: 60,
    riskControl: 60,
  });

  const config = currentSession?.config ?? null;
  const manuscripts = useMemo(() => sortManuscripts(config?.manuscripts), [config?.manuscripts]);
  const target =
    manuscripts.find((item) => item.episode === (selectedEpisode ?? config?.episode)) ??
    manuscripts[manuscripts.length - 1] ??
    null;
  const auditTargetText = target?.content?.trim() ?? "";
  const auditTarget = useMemo(() => {
    const targetEpisode = target?.episode;
    if (!auditTargetText) return null;
    return {
      label: targetEpisode ? `EP.${targetEpisode} 저장 원고` : "저장 원고",
      content: auditTargetText,
    };
  }, [auditTargetText, target?.episode]);

  const exportApi = useStudioExport({
    currentSession,
    sessions,
    currentSessionId,
    currentProjectId,
    projects,
    setProjects: () => {},
    setCurrentProjectId,
    setSessions: () => {},
    setCurrentSessionId,
    setActiveTab: () => {},
    isKO,
    language,
    writingMode,
    editDraft,
  });

  const storyConfig = currentSession?.config;
  const harnessInput = useMemo(
    () => ({
      genre: koreanGenreIdFromStoryGenre(storyConfig?.genre),
      grade: gradeFromPrismMode(storyConfig?.prismMode),
      platform: storyConfig?.publishPlatform ?? "NONE",
    }),
    [storyConfig?.genre, storyConfig?.prismMode, storyConfig?.publishPlatform],
  );
  const { harness } = useMemo(
    () => loadOrBuildHarness(storyConfig?.qualityHarness, harnessInput),
    [storyConfig?.qualityHarness, harnessInput],
  );
  const {
    receiptJournal,
    scopedLatestCertificate,
    scopedSourceRecords,
    shareSupported,
    workReceiptCoverage,
  } = useTabExportProcessEvidence({
    config,
    currentProjectId,
    manuscripts,
    receipt,
  });

  const {
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
  } = useTabExportModel({
    ipParts,
    config,
    manuscripts,
    manualMediaProfileId,
    packageProfileId,
    currentProjectId,
    currentSessionTitle: currentSession?.title,
    scopedLatestCertificate,
    scopedSourceRecords,
    audit,
    receipt,
    receiptJournal,
    setJurisdictionPreviewNotice,
  });
  const platformFits = useMemo(
    () =>
      auditTarget == null
        ? []
        : PLATFORM_SPECS.filter((spec) => spec.id !== "free").map((spec) => ({
            spec,
            fit: checkPlatformFit(auditTarget.content, spec.id),
          })),
    [auditTarget],
  );
  const copyrightRegistrationPrep = useMemo(
    () =>
      buildCopyrightRegistrationPrep({
        config,
        manuscripts,
        authorDisplayName: config?.authorDisplayName,
        authorLegalName: config?.authorLegalName,
        generatedAtKo: "현재 화면 기준",
      }),
    [config, manuscripts],
  );
  const coreCopyrightPackage = useMemo(
    () =>
      buildCoreCopyrightPackage({
        config,
        manuscripts,
        authorDisplayName: config?.authorDisplayName,
        authorLegalName: config?.authorLegalName,
        generatedAtKo: "현재 화면 기준",
      }),
    [config, manuscripts],
  );
  const rightsProposalAdvisor = useMemo(
    () =>
      buildRightsProposalAdvisor({
        proposalText: proposalAdvisorText,
        corePackage: coreCopyrightPackage,
        rightsLedger: rightsLedgerRows,
        generatedAtKo: "현재 화면 기준",
      }),
    [coreCopyrightPackage, proposalAdvisorText, rightsLedgerRows],
  );
  const {
    downloadCoreCopyrightPackage,
    downloadCopyrightRegistrationPrep,
    downloadMediaIpPackMarkdown,
    downloadRightsProposalAdvisor,
  } = useTabExportDownloads({
    coreCopyrightPackage,
    copyrightRegistrationPrep,
    mediaIpPackMarkdownInput,
    rightsProposalAdvisor,
  });
  const {
    beginRightsLedgerEdit,
    cancelRightsLedgerEdit,
    editingRightsLedgerId,
    rightsLedgerDraft,
    rightsLedgerNotice,
    saveRightsLedgerDraft,
    updateRightsLedgerDraft,
  } = useTabExportRightsLedgerRuntime({
    baseRightsLedgerRows,
    config,
    currentProjectId,
    setConfig,
  });

  const runAudit = useCallback(() => {
    if (!auditTarget) return;
    const next = runPublishAudit(auditTarget.content, harnessToAuditOptions(harness));
    setAudit(next);
    setConfig((prev) => ({ ...prev, qualityHarness: markHarnessUsed(harness) }));
  }, [auditTarget, harness, setConfig]);

  const regenerateHarness = useCallback(() => {
    setConfig((prev) => ({ ...prev, qualityHarness: buildHarness(harnessInput) }));
  }, [harnessInput, setConfig]);
  const issueReceipt = useTabExportReceiptIssuer({
    audit,
    auditTarget,
    coreCopyrightPackage,
    copyrightRegistrationPrep,
    ipResult,
    platformFits,
    rightsProposalAdvisor,
    setReceipt,
  });

  const updateIpPart = useCallback((key: keyof IPReadinessParts, value: number) => {
    setIpParts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateAuthorIdentity = useCallback(
    (field: "authorDisplayName" | "authorLegalName", value: string) => {
      setConfig((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [setConfig],
  );

  if (!currentSession || !config) {
    return <TabExportEmptyState onCreateProject={() => createNewSession("writing")} />;
  }

  return (
    <div className="wd-grid wd-export-grid">
      <TabExportManuscriptRail
        manuscripts={manuscripts}
        selectedEpisode={target?.episode}
        onSelectEpisode={setSelectedEpisode}
      />

      <section className="wd-center" data-testid="export-package-ready">
        <div className="wd-chat card">
          <TabExportHeaderTabs
            activeExportSection={activeExportSection}
            hasAuditTarget={Boolean(auditTarget)}
            onSectionChange={setActiveExportSection}
          />

          <div className="wd-chat-body">
            <TabExportReleaseOverviewCard
              creatorSegment={creatorSegment}
              packagePlan={packagePlan}
              segmentProducts={segmentProducts}
              recommendedPlan={recommendedPlan}
              upgradePlan={upgradePlan}
              segmentMediaLabels={segmentMediaLabels}
              groupReleaseScope={groupReleaseScope}
              groupReleaseVisibleFieldsKo={groupReleaseVisibleFieldsKo}
              releaseCreditGateTone={releaseCreditGateTone}
              releaseCreditPreview={releaseCreditPreview}
              releaseCreditBalanceKo={releaseCreditBalanceKo}
              releaseCreditGateLabelKo={releaseCreditGateLabelKo}
              releaseEntitlement={releaseEntitlement}
              releaseProductLineup={releaseProductLineup}
              mediaIpPackProfileById={mediaIpPackProfileById}
              mediaProfileId={mediaProfileId}
              copyrightPrepReadyLabelKo={`${copyrightRegistrationPrep.readyCount}/${copyrightRegistrationPrep.checks.length} 점검`}
              copyrightPrepSummaryKo={copyrightRegistrationPrep.workTypeRecommendationKo}
              onMediaProfileChange={setManualMediaProfileId}
            />

            <TabExportPremiumRightsPackageCard
              authorDisplayName={config.authorDisplayName ?? ""}
              authorLegalName={config.authorLegalName ?? ""}
              certificateOutputPlan={certificateOutputPlan}
              copyrightRegistrationPrep={copyrightRegistrationPrep}
              coreCopyrightPackage={coreCopyrightPackage}
              mediaIpPackPlan={mediaIpPackPlan}
              packagePlan={packagePlan}
              rightsLedgerMissingCount={rightsLedgerMissingCount}
              rightsProposalAdvisor={rightsProposalAdvisor}
              onSelectSection={setActiveExportSection}
            />

            <TabExportStatsGrid
              audit={audit}
              ipTier={ipResult.tier}
              manuscriptCount={manuscripts.length}
              platformFits={platformFits}
              recommendedPlanLabel={recommendedPlan.label}
            />

            {activeExportSection === "asset" ? (
              <TabExportAssetSection
                assetizationSummaryRows={assetizationSummaryRows}
                packageProfiles={packageProfiles}
                packageProfileId={packageProfileId}
                packagePlan={packagePlan}
                publicSubmissionBoundaryRows={publicSubmissionBoundaryRows}
                onPackageProfileChange={setPackageProfileId}
                certificateOutputPlan={certificateOutputPlan}
                mediaIpPackPlan={mediaIpPackPlan}
                mediaIpPackProfiles={mediaIpPackProfiles}
                mediaProfileId={mediaProfileId}
                segmentMediaProfileId={segmentMediaProfileId}
                onMediaProfileChange={setManualMediaProfileId}
                config={config}
                ipBibleClusterRows={ipBibleClusterRows}
                releaseEntitlement={releaseEntitlement}
                jurisdictionPack={jurisdictionPack}
                jurisdictionPackReadiness={jurisdictionPackReadiness}
                overseasReleaseReviewFields={overseasReleaseReviewFields}
                jurisdictionFormRows={jurisdictionFormRows}
                groupReleaseScope={groupReleaseScope}
                jurisdictionPreviewNotice={jurisdictionPreviewNotice}
                onDownloadMediaIpPackMarkdown={downloadMediaIpPackMarkdown}
                onOpenJurisdictionPackPreview={openJurisdictionPackPreview}
                coreCopyrightPackage={coreCopyrightPackage}
                onDownloadCoreCopyrightPackage={downloadCoreCopyrightPackage}
                rightsProposalAdvisor={rightsProposalAdvisor}
                proposalAdvisorText={proposalAdvisorText}
                onProposalAdvisorTextChange={setProposalAdvisorText}
                onDownloadRightsProposalAdvisor={downloadRightsProposalAdvisor}
                copyrightRegistrationPrep={copyrightRegistrationPrep}
                onDownloadCopyrightRegistrationPrep={downloadCopyrightRegistrationPrep}
                authorDisplayName={config.authorDisplayName ?? ""}
                authorLegalName={config.authorLegalName ?? ""}
                onAuthorIdentityChange={updateAuthorIdentity}
                rightsLedgerRows={rightsLedgerRows}
                rightsLedgerMissingCount={rightsLedgerMissingCount}
                rightsLedgerMissingLabelsByRowId={rightsLedgerMissingLabelsByRowId}
                editingRightsLedgerId={editingRightsLedgerId}
                rightsLedgerDraft={rightsLedgerDraft}
                rightsLedgerNotice={rightsLedgerNotice}
                onBeginRightsLedgerEdit={beginRightsLedgerEdit}
                onUpdateRightsLedgerDraft={updateRightsLedgerDraft}
                onSaveRightsLedgerDraft={saveRightsLedgerDraft}
                onCancelRightsLedgerEdit={cancelRightsLedgerEdit}
              />
            ) : null}

            {activeExportSection === "evidence" ? (
              <TabExportEvidenceSection
                workReceiptCoverage={workReceiptCoverage}
                shareSupported={shareSupported}
                auditTarget={auditTarget}
                sessionTitle={currentSession?.title}
                canExportProject={Boolean(currentProjectId)}
                canExportSession={Boolean(currentSession)}
                canExportAll={projects.length > 0}
                audit={audit}
                harnessLabel={L4(language, summarizeHarness(harness))}
                receipt={receipt}
                onExportText={() => exportApi.exportProjectManuscripts("txt")}
                onExportEpub={exportApi.handleExportEPUB}
                onExportDocx={exportApi.handleExportDOCX}
                onExportHwpx={exportApi.handleExportHWPX}
                onExportAllJson={exportApi.exportAllJSON}
                onRegenerateHarness={regenerateHarness}
                onRunAudit={runAudit}
                onIssueReceipt={issueReceipt}
              />
            ) : null}
          </div>
        </div>

        {activeExportSection === "package" ? (
        <details className="lg-submission-package-detail" open>
          <summary aria-label="제출 묶음 생성 도구 열기">
            <Download size={14} aria-hidden="true" />
            <span>제출 묶음 생성</span>
            <span className="lg-submission-package-summary-hint">검토용 미리보기와 ZIP 다운로드를 준비합니다.</span>
            <span className={"pill " + releaseCreditGateTone}>{releaseCreditPreview.eventDraft.statusKo}</span>
          </summary>
          <div aria-label="제출 묶음 CTA 상태" className="lg-release-product-note tex-row-spaced">
            <span className={"rdot " + releaseCreditGateTone} aria-hidden="true" />
            <span>
              <b>{submissionPackageCtaLabelKo}</b>
              <span>{releaseCreditGateLabelKo} · 실제 차감은 실행하지 않습니다.</span>
            </span>
            <strong>{releaseCreditPreview.eventDraft.statusKo}</strong>
          </div>
          <div className="lg-submission-package-detail-body" aria-label="제출 묶음 생성 도구">
            <SubmissionPackageBuilder
              key={packageProfileId}
              language={language}
              projectIdOverride={currentProjectId}
              packageProfileId={packageProfileId}
              planId={recommendedPlan.id}
              issueButtonLabelKo={submissionPackageCtaLabelKo}
              issueGateNoteKo={submissionPackageGateNoteKo}
            />
          </div>
        </details>
        ) : null}
      </section>

      <TabExportChecklistPanel
        target={target}
        platformFits={platformFits}
        ipParts={ipParts}
        ipResult={ipResult}
        onChangeIpPart={updateIpPart}
      />
    </div>
  );
}

