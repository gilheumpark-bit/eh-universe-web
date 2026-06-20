import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStudio } from "@/app/studio/StudioContext";
import { useStudioExport } from "@/hooks/useStudioExport";
import { L4 } from "@/lib/i18n";
import type { EpisodeManuscript } from "@/lib/studio-types";
import { canShare } from "@/lib/browser/web-share";
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
import {
  buildMediaIpPackMarkdown,
  type MediaIpPackRightsLedgerRow,
} from "@/lib/creative/media-ip-pack-markdown";
import { buildReceipt } from "@/lib/creative/work-receipt";
import { loadJournal } from "@/lib/creative/work-receipt-journal";
import type { ExportPackageProfileId } from "@/lib/creative-process/export-package-profile";
import {
  buildCopyrightRegistrationPrep,
  serializeCopyrightRegistrationPrepMarkdown,
} from "@/lib/creative-process/copyright-registration-prep";
import {
  buildCoreCopyrightPackage,
  serializeCoreCopyrightPackageMarkdown,
} from "@/lib/creative-process/core-copyright-package";
import {
  buildRightsProposalAdvisor,
  serializeRightsProposalAdvisorMarkdown,
} from "@/lib/creative-process/rights-proposal-advisor";
import {
  buildWorkReceiptCoverageAudit,
  getLatestProcessCertificate,
  listCreativeEvents,
  listSources,
  recordCreativeEvent,
  type CreativeEvent,
  type ProcessCertificate,
  type SourceRecord,
} from "@/lib/creative-process";
import { checkPlatformFit, PLATFORM_SPECS } from "@/lib/writing-workspace/export-spec";
import { Download } from "../icons";
import TabExportAssetSection from "@/components/loreguard/tabs/TabExportAssetSection";
import TabExportChecklistPanel from "@/components/loreguard/tabs/TabExportChecklistPanel";
import TabExportEvidenceSection from "@/components/loreguard/tabs/TabExportEvidenceSection";
import TabExportEmptyState from "@/components/loreguard/tabs/TabExportEmptyState";
import TabExportManuscriptRail from "@/components/loreguard/tabs/TabExportManuscriptRail";
import { useTabExportModel } from "@/components/loreguard/tabs/TabExport.model";
import TabExportReleaseOverviewCard from "@/components/loreguard/tabs/TabExportReleaseOverviewCard";
import {
  downloadTextDocument,
  safeDownloadName,
} from "@/components/loreguard/tabs/TabExport.helpers";
import {
  EXPORT_SECTION_TABS,
  type ExportSectionId,
} from "@/components/loreguard/tabs/TabExport.constants";
import {
  hashRightsLedgerRow,
  toRightsLedgerEntry,
  type RightsLedgerDraft,
} from "@/components/loreguard/tabs/TabExport.rights-ledger";

const SubmissionPackageBuilder = dynamic(
  () => import("@/components/studio/SubmissionPackageBuilder").then((module) => module.default),
  {
    ssr: false,
    loading: () => (
      <section
        aria-label="제출 묶음 준비"
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          padding: 18,
          color: "var(--ink-3)",
          fontSize: 13,
        }}
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
  const [editingRightsLedgerId, setEditingRightsLedgerId] = useState<string | null>(null);
  const [rightsLedgerDraft, setRightsLedgerDraft] = useState<RightsLedgerDraft | null>(null);
  const [rightsLedgerNotice, setRightsLedgerNotice] = useState("");
  const [jurisdictionPreviewNotice, setJurisdictionPreviewNotice] = useState("");
  const [proposalAdvisorText, setProposalAdvisorText] = useState("");
  const [shareSupported] = useState(() => canShare());
  const [processEvents, setProcessEvents] = useState<CreativeEvent[]>([]);
  const [sourceRecords, setSourceRecords] = useState<SourceRecord[]>([]);
  const [latestCertificate, setLatestCertificate] = useState<ProcessCertificate | null>(null);
  const [activeExportSection, setActiveExportSection] = useState<ExportSectionId>("overview");
  const receiptJournal = useMemo(() => loadJournal(), []);
  const [ipParts, setIpParts] = useState<IPReadinessParts>({
    rights: 60,
    market: 60,
    adaptation: 60,
    assetPackage: 60,
    riskControl: 60,
  });

  const scopedLatestCertificate = currentProjectId ? latestCertificate : null;
  const scopedProcessEvents = useMemo(
    () => (currentProjectId ? processEvents : []),
    [currentProjectId, processEvents],
  );
  const scopedSourceRecords = useMemo(
    () => (currentProjectId ? sourceRecords : []),
    [currentProjectId, sourceRecords],
  );

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
  });  const downloadMediaIpPackMarkdown = useCallback(() => {
    if (!mediaIpPackMarkdownInput) return;
    const content = buildMediaIpPackMarkdown({
      ...mediaIpPackMarkdownInput,
      generatedAt: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    });
    const fileName = `${safeDownloadName(mediaIpPackMarkdownInput.workTitle)}_권리_IP_자산화_초안.md`;
    downloadTextDocument(fileName, content);
  }, [mediaIpPackMarkdownInput]);
  useEffect(() => {
    let alive = true;
    const loadCoverage = async () => {
      if (!currentProjectId) return;
      try {
        const [events, sources, certificate] = await Promise.all([
          listCreativeEvents({ projectId: currentProjectId, limit: 500 }),
          listSources(currentProjectId),
          getLatestProcessCertificate(currentProjectId),
        ]);
        if (!alive) return;
        setProcessEvents(events);
        setSourceRecords(sources);
        setLatestCertificate(certificate);
      } catch {
        if (!alive) return;
        setProcessEvents([]);
        setSourceRecords([]);
        setLatestCertificate(null);
      }
    };
    void loadCoverage();
    return () => {
      alive = false;
    };
  }, [currentProjectId]);
  const workReceiptCoverage = useMemo(
    () =>
      buildWorkReceiptCoverageAudit({
        events: scopedProcessEvents,
        sources: scopedSourceRecords,
        decisions: receiptJournal,
        localReceipts: receipt ? [receipt] : [],
        expectations: {
          externalImport: (config?.importFileReports?.length ?? 0) > 0 || scopedSourceRecords.length > 0,
          authorDecision: receiptJournal.some((entry) => entry.fixId.startsWith("candidate:")),
          manualRevision: manuscripts.length > 0,
          translationSignoff: (config?.translatedManuscripts ?? []).some(
            (entry) => entry.faithfulApproved || entry.marketApproved,
          ),
          packageIssuance: true,
        },
      }),
    [
      config?.importFileReports,
      config?.translatedManuscripts,
      manuscripts.length,
      scopedProcessEvents,
      receipt,
      receiptJournal,
      scopedSourceRecords,
    ],
  );
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
        authorDisplayName: currentSession?.title,
        generatedAtKo: "현재 화면 기준",
      }),
    [config, currentSession?.title, manuscripts],
  );
  const coreCopyrightPackage = useMemo(
    () =>
      buildCoreCopyrightPackage({
        config,
        manuscripts,
        authorDisplayName: currentSession?.title,
        generatedAtKo: "현재 화면 기준",
      }),
    [config, currentSession?.title, manuscripts],
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

  const runAudit = useCallback(() => {
    if (!auditTarget) return;
    const next = runPublishAudit(auditTarget.content, harnessToAuditOptions(harness));
    setAudit(next);
    setConfig((prev) => ({ ...prev, qualityHarness: markHarnessUsed(harness) }));
  }, [auditTarget, harness, setConfig]);

  const regenerateHarness = useCallback(() => {
    setConfig((prev) => ({ ...prev, qualityHarness: buildHarness(harnessInput) }));
  }, [harnessInput, setConfig]);

  const downloadCopyrightRegistrationPrep = useCallback(() => {
    const content = serializeCopyrightRegistrationPrepMarkdown({
      ...copyrightRegistrationPrep,
      generatedAtKo: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    });
    const fileName = `${safeDownloadName(copyrightRegistrationPrep.workTitle)}_저작권_등록_준비_3안.md`;
    downloadTextDocument(fileName, content);
  }, [copyrightRegistrationPrep]);

  const downloadCoreCopyrightPackage = useCallback(() => {
    const content = serializeCoreCopyrightPackageMarkdown({
      ...coreCopyrightPackage,
      generatedAtKo: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    });
    const fileName = `${safeDownloadName(coreCopyrightPackage.workTitle)}_코어_저작권_패키지.md`;
    downloadTextDocument(fileName, content);
  }, [coreCopyrightPackage]);

  const downloadRightsProposalAdvisor = useCallback(() => {
    const content = serializeRightsProposalAdvisorMarkdown({
      ...rightsProposalAdvisor,
      generatedAtKo: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    });
    const fileName = `${safeDownloadName(rightsProposalAdvisor.workTitle)}_권리_제안_어드바이저.md`;
    downloadTextDocument(fileName, content);
  }, [rightsProposalAdvisor]);

  const issueReceipt = useCallback(() => {
    const did: { action: string; evidence: string }[] = [];
    const skipped: { action: string; reason: string }[] = [];
    if (audit && auditTarget) {
      did.push({
        action: "출고 검수",
        evidence: `${audit.findings.length}건 확인 · ${auditTarget.label}`,
      });
    } else {
      skipped.push({ action: "출고 검수", reason: "아직 실행하지 않음" });
    }
    if (auditTarget && platformFits.length > 0) {
      const okCount = platformFits.filter((item) => item.fit.withinRange).length;
      did.push({
        action: "플랫폼 자수 적합 점검",
        evidence: `${okCount}/${platformFits.length} 적합 · ${platformFits[0].fit.chars.toLocaleString()}자`,
      });
    } else {
      skipped.push({ action: "플랫폼 자수 적합 점검", reason: "검수할 저장 원고 없음" });
    }
    did.push({
      action: "IP 준비도 산출",
      evidence: `${ipResult.tier} 단계 · 권리/IP 점검 반영`,
    });
    did.push({
      action: "저작권 등록 준비 3안",
      evidence: `${copyrightRegistrationPrep.readyCount}/${copyrightRegistrationPrep.checks.length} 점검 · A/B/C + 혼합안`,
    });
    did.push({
      action: "코어 저작권 패키지",
      evidence: `${coreCopyrightPackage.documents.length}개 기준본 · ${coreCopyrightPackage.readiness.summaryKo}`,
    });
    if (rightsProposalAdvisor.hasProposal) {
      did.push({
        action: "권리 제안 어드바이저",
        evidence: rightsProposalAdvisor.summaryKo,
      });
    } else {
      skipped.push({ action: "권리 제안 어드바이저", reason: "제안 문구 입력 대기" });
    }
    setReceipt(
      buildReceipt({
        did,
        skipped,
        metrics: {
          chars: auditTarget?.content.length,
          dialogueRatio: audit ? audit.stats.dialogueRatio * 100 : undefined,
        },
      }),
    );
  }, [audit, auditTarget, copyrightRegistrationPrep, coreCopyrightPackage, ipResult.score, ipResult.tier, platformFits, rightsProposalAdvisor]);

  const beginRightsLedgerEdit = useCallback((row: MediaIpPackRightsLedgerRow) => {
    const rowId = row.id ?? row.categoryKo;
    setEditingRightsLedgerId(rowId);
    setRightsLedgerDraft({
      id: rowId,
      categoryKo: row.categoryKo,
      ownerKo: row.ownerKo,
      usageScopeKo: row.usageScopeKo,
      statusKo: row.statusKo,
      noteKo: row.noteKo,
    });
    setRightsLedgerNotice("");
  }, []);

  const updateRightsLedgerDraft = useCallback(
    (field: keyof Omit<RightsLedgerDraft, "id">, value: string) => {
      setRightsLedgerDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [],
  );

  const saveRightsLedgerDraft = useCallback(() => {
    if (!rightsLedgerDraft) return;
    const nextEntry = toRightsLedgerEntry(rightsLedgerDraft);
    const beforeRow =
      config?.rightsLedger?.find((row) => row.id === nextEntry.id) ??
      baseRightsLedgerRows.find((row) => row.id === nextEntry.id);

    setConfig((prev) => {
      const rest = (prev.rightsLedger ?? []).filter((row) => row.id !== nextEntry.id);
      return {
        ...prev,
        rightsLedger: [...rest, nextEntry],
      };
    });
    setEditingRightsLedgerId(null);
    setRightsLedgerDraft(null);
    setRightsLedgerNotice(`${nextEntry.categoryKo} 원장 항목을 저장했습니다.`);

    if (currentProjectId) {
      void Promise.all([hashRightsLedgerRow(beforeRow), hashRightsLedgerRow(nextEntry)])
        .then(([beforeHash, afterHash]) =>
          recordCreativeEvent({
            projectId: currentProjectId,
            targetType: "metadata",
            targetId: `rights-ledger:${nextEntry.id}`,
            eventType: "edit",
            actorType: "human",
            actorId: "author",
            originType: "HUMAN_REVISION",
            beforeHash,
            afterHash,
            stage: "publish",
            note: `권리 원장 수정: ${nextEntry.categoryKo}`,
          }),
        )
        .catch(() => undefined);
    }
  }, [baseRightsLedgerRows, config?.rightsLedger, currentProjectId, rightsLedgerDraft, setConfig]);

  const cancelRightsLedgerEdit = useCallback(() => {
    setEditingRightsLedgerId(null);
    setRightsLedgerDraft(null);
  }, []);

  const updateIpPart = useCallback((key: keyof IPReadinessParts, value: number) => {
    setIpParts((prev) => ({ ...prev, [key]: value }));
  }, []);

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
          <div className="wd-chat-head">
            <div className="wd-chat-title">
              <Download size={17} />
              출고 문서함
              <span className="wd-online">
                <span className={"rdot " + (auditTarget ? "green" : "gray")} />
                {auditTarget ? "패키지 준비" : "원고 대기"}
              </span>
            </div>
            <span className="pill gray">출고 패키지 · 과정기록 포함</span>
          </div>
          <nav className="lg-export-tabs" role="tablist" aria-label="출고 내부 보기">
            {EXPORT_SECTION_TABS.map((section) => {
              const selected = activeExportSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className="lg-export-tab"
                  data-selected={selected ? "true" : "false"}
                  onClick={() => setActiveExportSection(section.id)}
                >
                  <b>{section.labelKo}</b>
                  <span>{section.detailKo}</span>
                </button>
              );
            })}
          </nav>

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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div className="pcard">
                <div className="stat-label">회차 원고</div>
                <div className="stat-val">{manuscripts.length}</div>
                <div className="stat-foot">저장된 원고 기준</div>
              </div>
              <div className="pcard">
                <div className="stat-label">출고 검수</div>
                <div className="stat-val">{audit ? (audit.findings.length === 0 ? "완료" : "확인") : "대기"}</div>
                <div className="stat-foot">{audit ? `${audit.findings.length}건` : "검수 실행 필요"}</div>
              </div>
              <div className="pcard">
                <div className="stat-label">플랫폼 적합</div>
                <div className="stat-val">{platformFits.filter((item) => item.fit.withinRange).length}/{platformFits.length || 5}</div>
                <div className="stat-foot">자수 기준 참고 · {platformFits[0]?.fit.checkedAt ?? "기준일 대기"}</div>
              </div>
              <div className="pcard">
                <div className="stat-label">IP 준비도</div>
                <div className="stat-val">{ipResult.tier}</div>
                <div className="stat-foot">권리/IP 점검 반영</div>
              </div>
              <div className="pcard">
                <div className="stat-label">패키지 조건</div>
                <div className="stat-val">{recommendedPlan.label}</div>
                <div className="stat-foot">자세한 조건은 접어서 확인</div>
              </div>
            </div>

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
          <div aria-label="제출 묶음 CTA 상태" className="lg-release-product-note" style={{ marginTop: 10 }}>
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

