// @ts-nocheck
"use client";

/**
 * @module DeployPanel
 *
 * HYBRID — real build verification + zip export with simulation fallback.
 *
 * Logic extracted to: ./deploy/deploy-logic.ts
 * This file contains only React UI components.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  Upload,
  Download,
  Package,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import type { FileNode } from "@eh/quill-engine/types";
import {
  type DeployPanelProps,
  type DeployStep,
  type DeployRecord,
  type TabId,
  type Labels,
  type BuildVerification,
  LABELS,
  STEP_DELAY_MS,
  MAX_HISTORY,
  countAllFiles,
  flattenFilesWithPath,
  detectProjectType,
  generateId,
  formatTimestamp,
  formatBytes,
  triggerDownload,
  createZipBlob,
  runBuildVerification,
  loadDeployHistory,
  saveDeployHistory,
} from "./deploy/deploy-logic";

// ============================================================
// PART 1 — Export Section
// ============================================================

interface ExportSectionProps {
  files: FileNode[];
  t: Labels;
}

function ExportSection({ files, t }: ExportSectionProps) {
  const fileCount = useMemo(() => countAllFiles(files), [files]);
  const [zipping, setZipping] = useState(false);
  const [lastArtifactSize, setLastArtifactSize] = useState<number | null>(null);
  const [zipProgress, setZipProgress] = useState<{ processed: number; total: number } | null>(null);

  const handleExportZip = useCallback(async () => {
    if (fileCount === 0) return;
    setZipping(true);
    setZipProgress(null);
    try {
      const flatFiles = flattenFilesWithPath(files);
      const blob = await createZipBlob(flatFiles, (processed, total) => {
        setZipProgress({ processed, total });
      });
      setLastArtifactSize(blob.size);
      const ext = blob.type === "application/json" ? "json" : "zip";
      triggerDownload(blob, `project-export.${ext}`);
    } finally {
      setZipping(false);
      setZipProgress(null);
    }
  }, [files, fileCount]);

  const handleExportBundle = useCallback(() => {
    if (fileCount === 0) return;
    const flatFiles = flattenFilesWithPath(files);
    const bundle = {
      exportedAt: new Date().toISOString(),
      fileCount: flatFiles.length,
      files: flatFiles,
    };
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    setLastArtifactSize(blob.size);
    triggerDownload(blob, "project-bundle.json");
  }, [files, fileCount]);

  const handleExportJson = useCallback(() => {
    if (fileCount === 0) return;
    const json = JSON.stringify(files, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    setLastArtifactSize(blob.size);
    triggerDownload(blob, "file-tree.json");
  }, [files, fileCount]);

  if (fileCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
        <Package size={24} className="mb-2 opacity-50" />
        <span className="text-sm">{t.noFiles}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded border border-border/20 bg-bg-primary/30 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-text-tertiary">
          <span>{fileCount} {t.files}</span>
          {lastArtifactSize != null && (
            <span className="font-mono text-accent-purple">{formatBytes(lastArtifactSize)}</span>
          )}
        </div>

        {/* ZIP progress indicator */}
        {zipping && zipProgress != null && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-1">
              <span>Packing files...</span>
              <span>{zipProgress.processed}/{zipProgress.total}</span>
            </div>
            <div className="h-1 w-full rounded-full bg-bg-primary/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-green transition-all"
                style={{ width: `${(zipProgress.processed / zipProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Primary: ZIP export */}
        <button
          onClick={handleExportZip}
          disabled={zipping}
          className="flex w-full items-center gap-2 rounded bg-accent-green/15 px-3 py-2 text-sm font-medium text-accent-green transition-colors hover:bg-accent-green/25 disabled:opacity-50"
        >
          {zipping ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {t.exportZip}
        </button>

        {/* Secondary: JSON bundle */}
        <button
          onClick={handleExportBundle}
          className="mt-2 flex w-full items-center gap-2 rounded bg-bg-primary/50 px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
        >
          <Download size={14} />
          {t.exportBundle}
        </button>

        {/* Tertiary: Raw file tree JSON */}
        <button
          onClick={handleExportJson}
          className="mt-2 flex w-full items-center gap-2 rounded bg-bg-primary/50 px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
        >
          <Upload size={14} />
          {t.exportJson}
        </button>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=ExportSection | inputs=FileNode[],Labels | outputs=JSX

// ============================================================
// PART 2 — Deploy Simulation
// ============================================================

interface DeploySimulationProps {
  files: FileNode[];
  t: Labels;
  onDeployComplete: (record: DeployRecord) => void;
}

function DeploySimulation({ files, t, onDeployComplete }: DeploySimulationProps) {
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [verificationResults, setVerificationResults] = useState<BuildVerification[]>([]);
  const [zipReady, setZipReady] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [artifactSize, setArtifactSize] = useState<number | null>(null);
  const [detectedType, setDetectedType] = useState<"react" | "nextjs" | "generic">("generic");
  const [usedFallback, setUsedFallback] = useState(false);
  const fileCount = useMemo(() => countAllFiles(files), [files]);

  const runDeploy = useCallback(async () => {
    if (isRunning || fileCount === 0) return;

    const initialSteps: DeployStep[] = t.steps.map((label) => ({
      label,
      status: "pending" as const,
    }));
    setSteps(initialSteps);
    setIsRunning(true);
    setVerificationResults([]);
    setZipReady(false);
    setArtifactSize(null);
    setUsedFallback(false);

    const flatFiles = flattenFilesWithPath(files);
    const projectType = detectProjectType(flatFiles);
    setDetectedType(projectType);

    const verifications = await runBuildVerification(flatFiles, projectType);
    const stepCount = t.steps.length;

    for (let i = 0; i < stepCount; i++) {
      const progress = Math.round(((i + 1) / stepCount) * 100);
      setSteps((prev) => prev.map((s, j) =>
        j === i ? { ...s, status: "running" as const, progress } : s,
      ));

      await new Promise((r) => setTimeout(r, STEP_DELAY_MS));

      const verification = verifications[i];
      const passed = verification?.passed ?? true;

      setSteps((prev) => prev.map((s, j) =>
        j === i ? { ...s, status: passed ? "done" as const : "error" as const, progress: 100 } : s,
      ));

      if (!passed) {
        setIsRunning(false);
        setVerificationResults(verifications.slice(0, i + 1));
        onDeployComplete({
          id: generateId(),
          timestamp: Date.now(),
          status: "error",
          fileCount,
          projectType,
        });
        return;
      }
    }

    setVerificationResults(verifications);
    setZipReady(true);
    setIsRunning(false);
    onDeployComplete({
      id: generateId(),
      timestamp: Date.now(),
      status: "success",
      fileCount,
      projectType,
    });
  }, [isRunning, fileCount, t.steps, onDeployComplete, files]);

  const handleDownloadZip = useCallback(async () => {
    setZipping(true);
    setUsedFallback(false);
    try {
      const flatFiles = flattenFilesWithPath(files);
      const blob = await createZipBlob(flatFiles);
      setArtifactSize(blob.size);
      const isJson = blob.type === "application/json";
      if (isJson) setUsedFallback(true);
      const ext = isJson ? "json" : "zip";
      triggerDownload(blob, `build-output.${ext}`);
    } finally {
      setZipping(false);
    }
  }, [files]);

  return (
    <div className="flex flex-col gap-3">
      {/* Project type badge */}
      {detectedType !== "generic" && steps.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
          <Package size={10} />
          <span>{t.projectType}: <span className="font-medium text-text-secondary">{detectedType}</span></span>
        </div>
      )}

      <button
        onClick={runDeploy}
        disabled={isRunning || fileCount === 0}
        className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
          isRunning
            ? "cursor-not-allowed bg-bg-primary/50 text-text-tertiary"
            : fileCount === 0
              ? "cursor-not-allowed bg-bg-primary/30 text-text-tertiary"
              : "bg-accent-green/15 text-accent-green hover:bg-accent-green/25"
        }`}
      >
        {isRunning ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ExternalLink size={14} />
        )}
        {isRunning ? t.deploying : t.startDeploy}
      </button>

      {steps.length > 0 && (
        <div className="rounded border border-border/20 bg-bg-primary/30 p-3">
          {/* Overall progress bar */}
          {isRunning && (
            <div className="mb-2">
              <div className="h-1.5 w-full rounded-full bg-bg-primary/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-green transition-all duration-300"
                  style={{
                    width: `${(steps.filter((s) => s.status === "done").length / steps.length) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-right text-[10px] font-mono text-text-tertiary">
                {steps.filter((s) => s.status === "done").length}/{steps.length}
              </div>
            </div>
          )}

          <div className="space-y-2 font-mono text-xs">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                {step.status === "pending" && (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border/40" />
                )}
                {step.status === "running" && (
                  <Loader2 size={14} className="shrink-0 animate-spin text-accent-amber" />
                )}
                {step.status === "done" && (
                  <CheckCircle size={14} className="shrink-0 text-accent-green" />
                )}
                {step.status === "error" && (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-accent-red text-[9px] font-bold text-white">
                    !
                  </span>
                )}
                <span
                  className={
                    step.status === "done"
                      ? "text-accent-green"
                      : step.status === "error"
                        ? "text-accent-red"
                        : step.status === "running"
                          ? "text-text-primary"
                          : "text-text-tertiary"
                  }
                >
                  {step.label}
                  {step.status === "done" && " \u2713"}
                  {step.status === "error" && " \u2717"}
                </span>
              </div>
            ))}
          </div>

          {/* Verification details */}
          {verificationResults.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border/20 pt-2">
              {verificationResults.map((v, i) => (
                <div key={i} className={`text-[10px] ${v.passed ? "text-text-tertiary" : "text-accent-red"}`}>
                  {v.passed ? "\u2713" : "\u2717"} {v.details}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ZIP download after successful build */}
      {zipReady && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleDownloadZip}
            disabled={zipping}
            className="flex items-center justify-center gap-2 rounded bg-accent-purple/15 px-3 py-2 text-sm font-medium text-accent-purple transition-colors hover:bg-accent-purple/25 disabled:opacity-50"
          >
            {zipping ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {t.downloadZip}
          </button>
          {artifactSize != null && (
            <div className="text-center text-[10px] font-mono text-text-tertiary">
              {t.artifactSize}: {formatBytes(artifactSize)}
            </div>
          )}
          {usedFallback && (
            <div className="flex items-center justify-center gap-1 text-[10px] text-accent-amber">
              <AlertTriangle size={10} />
              {t.fallbackJson}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=DeploySimulation | inputs=FileNode[],Labels,callback | outputs=JSX

// ============================================================
// PART 3 — Deploy History
// ============================================================

interface DeployHistoryProps {
  records: DeployRecord[];
  t: Labels;
}

function DeployHistory({ records, t }: DeployHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
        <Package size={24} className="mb-2 opacity-50" />
        <span className="text-sm">{t.noHistory}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {records.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-2 rounded border border-border/20 bg-bg-primary/30 px-3 py-2"
        >
          {record.status === "success" ? (
            <CheckCircle size={14} className="shrink-0 text-accent-green" />
          ) : (
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-accent-red text-[9px] font-bold text-white">
              !
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  record.status === "success"
                    ? "font-medium text-accent-green"
                    : "font-medium text-accent-red"
                }
              >
                {record.status === "success" ? t.success : t.error}
              </span>
              <span className="text-text-tertiary">
                {record.fileCount} {t.files}
              </span>
              {record.projectType && record.projectType !== "generic" && (
                <span className="rounded bg-bg-primary/50 px-1 py-0.5 text-[10px] text-text-tertiary">
                  {record.projectType}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-text-tertiary">
              <span>{formatTimestamp(record.timestamp)}</span>
              {record.artifactBytes != null && (
                <span className="text-accent-purple">{formatBytes(record.artifactBytes)}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=DeployHistory | inputs=DeployRecord[],Labels | outputs=JSX

// ============================================================
// PART 4 — Main DeployPanel Component
// ============================================================

export default function DeployPanel({ files, language }: DeployPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("export");
  const [deployRecords, setDeployRecords] = useState<DeployRecord[]>(() => loadDeployHistory());

  const t = language === "KO" ? LABELS.KO : LABELS.EN;

  const handleDeployComplete = useCallback((record: DeployRecord) => {
    setDeployRecords((prev) => {
      const next = [record, ...prev];
      const trimmed = next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
      saveDeployHistory(trimmed);
      return trimmed;
    });
  }, []);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: "export",
      label: t.export,
      icon: <Download size={14} />,
    },
    {
      id: "deploy",
      label: t.deploy,
      icon: <Upload size={14} />,
    },
    {
      id: "history",
      label: t.history,
      icon: <Package size={14} />,
      count: deployRecords.length > 0 ? deployRecords.length : undefined,
    },
  ];

  return (
    <div className="flex h-full flex-col bg-bg-secondary text-text-primary">
      {/* Mode notice */}
      <div className="flex items-center gap-1.5 text-[9px] text-emerald-300 bg-emerald-950/20 px-3 py-1 border-b border-white/[0.08]">
        <Upload size={12} className="text-emerald-400 shrink-0" />
        <span className="font-medium">Build Verify + Export (Real)</span>
        <span className="text-text-tertiary ml-1">— ZIP export, JSON bundle, build verification</span>
      </div>
      {/* Tab bar */}
      <div className="flex border-b border-border/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-accent-green text-accent-green"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span className="ml-1 rounded-full bg-bg-primary px-1.5 py-0.5 text-[10px] leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === "export" && <ExportSection files={files} t={t} />}
        {activeTab === "deploy" && (
          <DeploySimulation
            files={files}
            t={t}
            onDeployComplete={handleDeployComplete}
          />
        )}
        {activeTab === "history" && (
          <DeployHistory records={deployRecords} t={t} />
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=DeployPanelMain | inputs=DeployPanelProps | outputs=JSX
