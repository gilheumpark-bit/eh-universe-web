"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Package,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { FileNode } from "@/lib/code-studio-types";

// ============================================================
// PART 1 — Types & Constants
// ============================================================

interface DeployPanelProps {
  files: FileNode[];
  language: string; // 'KO' | 'EN'
}

interface DeployStep {
  label: string;
  status: "pending" | "running" | "done" | "error";
}

interface DeployRecord {
  id: string;
  timestamp: number;
  status: "success" | "error";
  fileCount: number;
}

type TabId = "export" | "deploy" | "history";

const STEP_DELAY_MS = 500;
const MAX_HISTORY = 5;

const LABELS = {
  KO: {
    exportZip: "JSON 번들 내보내기",
    exportJson: "파일 트리 JSON 내보내기",
    deploy: "배포 시뮬레이션",
    history: "배포 이력",
    export: "내보내기",
    noFiles: "내보낼 파일이 없습니다",
    noHistory: "배포 이력이 없습니다",
    deploying: "배포 중...",
    deploySuccess: "배포 완료",
    deployError: "배포 실패",
    startDeploy: "배포 시작",
    steps: [
      "의존성 설치 중...",
      "프로젝트 빌드 중...",
      "테스트 실행 중...",
      "프로덕션 배포 중...",
    ],
    files: "파일",
    success: "성공",
    error: "실패",
  },
  EN: {
    exportZip: "Export JSON Bundle",
    exportJson: "Export File Tree JSON",
    deploy: "Deploy Preview",
    history: "Deploy History",
    export: "Export",
    noFiles: "No files to export",
    noHistory: "No deploy history",
    deploying: "Deploying...",
    deploySuccess: "Deploy complete",
    deployError: "Deploy failed",
    startDeploy: "Start Deploy",
    steps: [
      "Installing dependencies...",
      "Building project...",
      "Running tests...",
      "Deploying to production...",
    ],
    files: "files",
    success: "Success",
    error: "Error",
  },
} as const;

type Labels = (typeof LABELS)[keyof typeof LABELS];

// IDENTITY_SEAL: PART-1 | role=TypeDefinitions | inputs=none | outputs=DeployPanelProps,DeployStep,DeployRecord,LABELS

// ============================================================
// PART 2 — Utilities
// ============================================================

function flattenFilesWithPath(
  nodes: FileNode[],
  prefix: string = ""
): { path: string; content: string }[] {
  const result: { path: string; content: string }[] = [];
  for (const node of nodes) {
    const currentPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === "file" && node.content != null) {
      result.push({ path: currentPath, content: node.content });
    }
    if (node.children) {
      result.push(...flattenFilesWithPath(node.children, currentPath));
    }
  }
  return result;
}

function countAllFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") count++;
    if (node.children) count += countAllFiles(node.children);
  }
  return count;
}

function generateId(): string {
  return `deploy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// IDENTITY_SEAL: PART-2 | role=Utilities | inputs=FileNode[] | outputs=FlatFile[],number,string

// ============================================================
// PART 3 — Export Section
// ============================================================

interface ExportSectionProps {
  files: FileNode[];
  t: Labels;
}

function ExportSection({ files, t }: ExportSectionProps) {
  const fileCount = useMemo(() => countAllFiles(files), [files]);

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
    triggerDownload(blob, "project-bundle.json");
  }, [files, fileCount]);

  const handleExportJson = useCallback(() => {
    if (fileCount === 0) return;
    const json = JSON.stringify(files, null, 2);
    const blob = new Blob([json], { type: "application/json" });
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
        <div className="mb-2 text-xs text-text-tertiary">
          {fileCount} {t.files}
        </div>

        <button
          onClick={handleExportBundle}
          className="flex w-full items-center gap-2 rounded bg-accent-green/15 px-3 py-2 text-sm font-medium text-accent-green transition-colors hover:bg-accent-green/25"
        >
          <Download size={14} />
          {t.exportZip}
        </button>

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

// IDENTITY_SEAL: PART-3 | role=ExportSection | inputs=FileNode[],Labels | outputs=JSX

// ============================================================
// PART 4 — Deploy Simulation
// ============================================================

interface DeploySimulationProps {
  files: FileNode[];
  t: Labels;
  onDeployComplete: (record: DeployRecord) => void;
}

function DeploySimulation({ files, t, onDeployComplete }: DeploySimulationProps) {
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileCount = useMemo(() => countAllFiles(files), [files]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const runDeploy = useCallback(() => {
    if (isRunning || fileCount === 0) return;

    const initialSteps: DeployStep[] = t.steps.map((label) => ({
      label,
      status: "pending" as const,
    }));
    setSteps(initialSteps);
    setIsRunning(true);

    let currentIndex = 0;

    function advanceStep() {
      setSteps((prev) => {
        const next = prev.map((s, i) => {
          if (i === currentIndex) return { ...s, status: "running" as const };
          return s;
        });
        return next;
      });

      timerRef.current = setTimeout(() => {
        const hasError = currentIndex === t.steps.length - 1 && Math.random() < 0.1;

        setSteps((prev) => {
          const next = prev.map((s, i) => {
            if (i === currentIndex) {
              return { ...s, status: hasError ? ("error" as const) : ("done" as const) };
            }
            return s;
          });
          return next;
        });

        if (hasError) {
          setIsRunning(false);
          onDeployComplete({
            id: generateId(),
            timestamp: Date.now(),
            status: "error",
            fileCount,
          });
          return;
        }

        currentIndex++;
        if (currentIndex < t.steps.length) {
          timerRef.current = setTimeout(advanceStep, STEP_DELAY_MS);
        } else {
          setIsRunning(false);
          onDeployComplete({
            id: generateId(),
            timestamp: Date.now(),
            status: "success",
            fileCount,
          });
        }
      }, STEP_DELAY_MS);
    }

    timerRef.current = setTimeout(advanceStep, 200);
  }, [isRunning, fileCount, t.steps, onDeployComplete]);

  return (
    <div className="flex flex-col gap-3">
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
          <div className="space-y-2 font-[family-name:var(--font-mono)] text-xs">
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
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=DeploySimulation | inputs=FileNode[],Labels,callback | outputs=JSX

// ============================================================
// PART 5 — Deploy History
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
            </div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary">
              {formatTimestamp(record.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=DeployHistory | inputs=DeployRecord[],Labels | outputs=JSX

// ============================================================
// PART 6 — Main DeployPanel Component
// ============================================================

export default function DeployPanel({ files, language }: DeployPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("export");
  const [deployRecords, setDeployRecords] = useState<DeployRecord[]>([]);

  const t = language === "KO" ? LABELS.KO : LABELS.EN;

  const handleDeployComplete = useCallback((record: DeployRecord) => {
    setDeployRecords((prev) => {
      const next = [record, ...prev];
      return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
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

// IDENTITY_SEAL: PART-6 | role=DeployPanelMain | inputs=DeployPanelProps | outputs=JSX
