import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, X } from "@/components/loreguard/icons";
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
import { PLATFORM_SPECS, checkPlatformFit } from "@/lib/desktop/export-spec";
import { computeIPReadiness, type IPReadinessParts } from "@/lib/creative/ip-readiness";
import { buildReceipt } from "@/lib/creative/work-receipt";
import { canShare, canShareFiles, shareManuscript, shareText } from "@/lib/browser/web-share";
import {
  EpisodeManuscriptsCard,
  ExportActionsCard,
  IpReadinessCard,
  PlatformFitCard,
  PublishAuditCard,
  WorkReceiptCard,
} from "@/components/loreguard/tabs/TabWritingManuscriptExportCards";

export function ManuscriptExportPanel() {
  const {
    currentSession,
    currentSessionId,
    currentProjectId,
    projects,
    sessions,
    setCurrentSessionId,
    setCurrentProjectId,
    setConfig,
    language,
    isKO,
    writingMode,
    editDraft,
  } = useStudio();

  const [open, setOpen] = useState(false);
  const [audit, setAudit] = useState<PublishAuditReport | null>(null);
  const [shareSupported] = useState(() => canShare());

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-export", onOpen);
    return () => window.removeEventListener("loreguard:open-export", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  const manuscripts = useMemo<EpisodeManuscript[]>(() => {
    const list = currentSession?.config?.manuscripts ?? [];
    return [...list].sort((a, b) => a.episode - b.episode);
  }, [currentSession]);

  const currentEpisode = currentSession?.config?.episode ?? null;

  const auditTarget = useMemo<{ label: string; content: string } | null>(() => {
    if (editDraft.trim()) {
      return {
        label: L4(language, { ko: "편집 중 원고", en: "draft in editing" }),
        content: editDraft,
      };
    }
    const manuscript =
      manuscripts.find((item) => item.episode === currentEpisode) ??
      manuscripts[manuscripts.length - 1];
    if (manuscript?.content?.trim()) {
      return {
        label: L4(language, { ko: `EP.${manuscript.episode} 저장 원고`, en: `EP.${manuscript.episode} saved manuscript` }),
        content: manuscript.content,
      };
    }
    return null;
  }, [editDraft, manuscripts, currentEpisode, language]);

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

  const runAudit = useCallback(() => {
    if (!auditTarget) return;
    setAudit(runPublishAudit(auditTarget.content, harnessToAuditOptions(harness)));
    const used = markHarnessUsed(harness);
    setConfig((prev) => ({ ...prev, qualityHarness: used }));
  }, [auditTarget, harness, setConfig]);

  const regenerateHarness = useCallback(() => {
    const fresh = buildHarness(harnessInput);
    setConfig((prev) => ({ ...prev, qualityHarness: fresh }));
  }, [harnessInput, setConfig]);

  const platformFits = useMemo(
    () =>
      auditTarget == null
        ? []
        : PLATFORM_SPECS.filter((platform) => platform.id !== "free").map((spec) => ({
            spec,
            fit: checkPlatformFit(auditTarget.content, spec.id),
          })),
    [auditTarget],
  );

  const [ipParts, setIpParts] = useState<IPReadinessParts>({
    rights: 60,
    market: 60,
    adaptation: 60,
    assetPackage: 60,
    riskControl: 60,
  });
  const ipResult = useMemo(() => computeIPReadiness(ipParts), [ipParts]);

  const [receipt, setReceipt] = useState("");
  const issueReceipt = useCallback(() => {
    const did: { action: string; evidence: string }[] = [];
    const skipped: { action: string; reason: string }[] = [];
    if (audit && auditTarget) {
      did.push({
        action: L4(language, { ko: "출고 점검", en: "Publish check" }),
        evidence: L4(language, {
          ko: `${audit.findings.length}건 확인 · ${auditTarget.label}`,
          en: `${audit.findings.length} findings · ${auditTarget.label}`,
        }),
      });
    } else {
      skipped.push({
        action: L4(language, { ko: "출고 점검", en: "Publish check" }),
        reason: L4(language, { ko: "아직 실행 전 — [검수 실행] 버튼으로 진행", en: "Not run yet — use the [Run check] button" }),
      });
    }
    if (auditTarget && platformFits.length > 0) {
      const okCount = platformFits.filter((item) => item.fit.withinRange).length;
      did.push({
        action: L4(language, { ko: "플랫폼 자수 적합 검사 (5 플랫폼)", en: "Platform length fit check (5 platforms)" }),
        evidence: L4(language, {
          ko: `적합 ${okCount}/${platformFits.length} · ${platformFits[0].fit.chars.toLocaleString()}자`,
          en: `${okCount}/${platformFits.length} within range · ${platformFits[0].fit.chars.toLocaleString()} chars`,
        }),
      });
    } else {
      skipped.push({
        action: L4(language, { ko: "플랫폼 자수 적합 검사", en: "Platform length fit check" }),
        reason: L4(language, { ko: "검수할 원고 없음", en: "No manuscript to check" }),
      });
    }
    did.push({
      action: L4(language, {
        ko: "권리/IP 준비도 확인",
        en: "Rights/IP readiness check",
      }),
      evidence: L4(language, {
        ko: `${ipResult.tier} 단계 · 작가 자가 평가 반영`,
        en: `${ipResult.tier} stage · author self-check reflected`,
      }),
    });
    setReceipt(
      buildReceipt({
        did,
        skipped,
        metrics: {
          chars: auditTarget ? auditTarget.content.length : undefined,
          dialogueRatio: audit ? audit.stats.dialogueRatio * 100 : undefined,
        },
      }),
    );
  }, [audit, auditTarget, platformFits, ipResult, language]);

  const shareCurrentManuscript = useCallback(() => {
    if (!auditTarget) return;
    const title = `${currentSession?.title?.trim() || "manuscript"} — ${auditTarget.label}`;
    void (async () => {
      const ok = canShareFiles()
        ? await shareManuscript(title, auditTarget.content, "txt")
        : await shareText(title, auditTarget.content.slice(0, 4000));
      if (!ok) return;
    })();
  }, [auditTarget, currentSession?.title]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--overlay-scrim)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "원고함·출고", en: "Manuscript library and publishing" })}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(420px, 92vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Download size={16} />
          {L4(language, { ko: "원고함 · 출고", en: "Manuscripts · Publishing" })}
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <EpisodeManuscriptsCard
          language={language}
          manuscripts={manuscripts}
          currentEpisode={currentEpisode ?? 0}
        />

        <ExportActionsCard
          language={language}
          canExportProject={Boolean(currentProjectId)}
          canExportSession={Boolean(currentSession)}
          canExportAll={projects.length > 0}
          shareSupported={shareSupported}
          canShareCurrent={Boolean(auditTarget)}
          onExportTxt={() => exportApi.exportProjectManuscripts("txt")}
          onExportEPUB={exportApi.handleExportEPUB}
          onExportDOCX={exportApi.handleExportDOCX}
          onExportFullBackup={exportApi.exportAllJSON}
          onShareCurrent={shareCurrentManuscript}
        />

        <PublishAuditCard
          language={language}
          audit={audit}
          auditTarget={auditTarget}
          harnessSummary={L4(language, summarizeHarness(harness))}
          onRunAudit={runAudit}
          onRegenerateHarness={regenerateHarness}
        />

        <PlatformFitCard
          language={language}
          auditTarget={auditTarget}
          platformFits={platformFits}
        />

        <IpReadinessCard
          language={language}
          ipParts={ipParts}
          setIpParts={setIpParts}
          ipResult={ipResult}
        />

        <WorkReceiptCard
          language={language}
          receipt={receipt}
          onIssueReceipt={issueReceipt}
        />
      </aside>
    </div>
  );
}
