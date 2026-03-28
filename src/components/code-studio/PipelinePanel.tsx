"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useCallback } from "react";
import {
  CheckCircle, AlertTriangle, XCircle, Shield, Loader2,
  ChevronDown, ChevronRight, Zap, Eye, Code2, Scale,
  Network, ShieldCheck, Gavel, BarChart3, Download, Copy,
  Play, Square,
} from "lucide-react";
import type { TeamResult, Finding } from "@/lib/code-studio-pipeline-teams";
import { generateReport } from "@/lib/code-studio-pipeline-utils";

interface PipelineResultData {
  stages: TeamResult[];
  overallScore: number;
  overallStatus: "pass" | "warn" | "fail";
  timestamp: number;
}

interface Props {
  result: PipelineResultData | null;
  onRun?: () => Promise<void>;
  onAbort?: () => void;
  isRunning?: boolean;
  lastRunTimestamp?: number;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=Props

// ============================================================
// PART 2 — Team Configuration & Icons
// ============================================================

const TEAM_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  simulation:     { label: "Simulation",   icon: <Zap size={14} />,          color: "#58a6ff" },
  generation:     { label: "Generation",   icon: <Code2 size={14} />,        color: "#3fb950" },
  validation:     { label: "Validation",   icon: <Eye size={14} />,          color: "#d29922" },
  "size-density": { label: "Size/Density", icon: <Scale size={14} />,        color: "#bc8cff" },
  "asset-trace":  { label: "Asset Trace",  icon: <Network size={14} />,      color: "#58a6ff" },
  stability:      { label: "Stability",    icon: <ShieldCheck size={14} />,  color: "#3fb950" },
  "release-ip":   { label: "Release/IP",   icon: <Gavel size={14} />,        color: "#f85149" },
  governance:     { label: "Governance",   icon: <BarChart3 size={14} />,    color: "#bc8cff" },
};

function TeamStatusIcon({ status }: { status: string }) {
  if (status === "running") return <Loader2 size={12} className="animate-spin text-blue-400" />;
  if (status === "pass") return <CheckCircle size={12} className="text-green-400" />;
  if (status === "warn") return <AlertTriangle size={12} className="text-yellow-400" />;
  if (status === "fail") return <XCircle size={12} className="text-red-400" />;
  return <div className="w-3 h-3 rounded-full bg-[#30363d] animate-pulse" />;
}

function StatusBadge({ status }: { status: string }) {
  const colors =
    status === "pass" ? "bg-green-500/15 text-green-400" :
    status === "warn" ? "bg-yellow-500/15 text-yellow-400" :
    "bg-red-500/15 text-red-400";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors}`}>{status.toUpperCase()}</span>;
}

// IDENTITY_SEAL: PART-2 | role=TeamConfig | inputs=none | outputs=TEAM_CONFIG

// ============================================================
// PART 3 — Main Component
// ============================================================

export function PipelinePanel({ result, onRun, onAbort, isRunning, lastRunTimestamp }: Props) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const handleCopyReport = useCallback(() => {
    if (!result) return;
    const report = generateReport(result.stages, result.timestamp);
    navigator.clipboard.writeText(report.markdown).catch(() => {});
  }, [result]);

  const handleDownloadReport = useCallback(() => {
    if (!result) return;
    const report = generateReport(result.stages, result.timestamp);
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // No result state
  if (!result && !isRunning) {
    return (
      <div className="h-64 border-t border-[#30363d] bg-[#0d1117] flex flex-col items-center justify-center gap-3">
        <Shield size={32} className="text-[#8b949e] opacity-30" />
        <p className="text-xs text-[#8b949e]">No pipeline results yet</p>
        {onRun && (
          <button onClick={onRun} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-purple-500 text-white hover:opacity-90 transition-opacity">
            <Play size={12} /> Run Pipeline
          </button>
        )}
        {lastRunTimestamp && (
          <span className="text-[9px] text-[#8b949e]">Last run: {new Date(lastRunTimestamp).toLocaleString()}</span>
        )}
      </div>
    );
  }

  // Running state
  if (isRunning && !result) {
    return (
      <div className="h-64 border-t border-[#30363d] bg-[#0d1117] flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-purple-400" />
        <p className="text-xs text-[#8b949e]">Pipeline running...</p>
        {onAbort && (
          <button onClick={onAbort} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-[#30363d] text-yellow-400 hover:bg-[#21262d]">
            <Square size={12} /> Abort
          </button>
        )}
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="h-64 border-t border-[#30363d] bg-[#0d1117] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#30363d]">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#e6edf3]">
          <Shield size={12} className="text-purple-400" /> Pipeline Results
          <StatusBadge status={result.overallStatus} />
          <span className="text-[#8b949e] font-mono">{result.overallScore}/100</span>
        </span>
        <span className="flex items-center gap-1">
          {onRun && (
            <button onClick={onRun} className="p-1 rounded hover:bg-[#21262d] text-blue-400" title="Re-run"><Play size={12} /></button>
          )}
          <button onClick={handleCopyReport} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e]" title="Copy report"><Copy size={12} /></button>
          <button onClick={handleDownloadReport} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e]" title="Download report"><Download size={12} /></button>
        </span>
      </div>

      {/* 8-Team Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-2">
          {result.stages.map((stage) => {
            const stageKey = stage.stage;
            const config = TEAM_CONFIG[stageKey] ?? { label: stageKey, icon: <Shield size={14} />, color: "#8b949e" };
            const isExpanded = expandedTeam === stageKey;

            return (
              <div key={stageKey} className="flex flex-col">
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : stageKey)}
                  className={`p-2 rounded-lg border transition-all ${
                    stage.status === "pass" ? "border-green-500/30 hover:border-green-500/60" :
                    stage.status === "warn" ? "border-yellow-500/30 hover:border-yellow-500/60" :
                    stage.status === "fail" ? "border-red-500/30 hover:border-red-500/60" :
                    "border-[#30363d]"
                  } bg-[#010409]`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span className="text-[10px] font-semibold flex-1 text-left text-[#e6edf3]">{config.label}</span>
                    <TeamStatusIcon status={stage.status} />
                  </div>
                  <div className="w-full h-1.5 bg-[#21262d] rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${stage.score}%`, backgroundColor: stage.score >= 80 ? "#3fb950" : stage.score >= 60 ? "#d29922" : "#f85149" }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#e6edf3]">{stage.score}</span>
                  </div>
                  {stage.findings.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-[#8b949e]">
                      {isExpanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                      {stage.findings.length} findings
                    </div>
                  )}
                </button>

                {isExpanded && stage.findings.length > 0 && (
                  <div className="mt-1 p-2 bg-[#010409] border border-[#30363d] rounded text-[9px] space-y-1 max-h-32 overflow-y-auto">
                    {stage.findings.map((f: Finding, i: number) => (
                      <div key={i} className="flex items-start gap-1">
                        <span className={
                          f.severity === "critical" ? "text-red-400" :
                          f.severity === "major" ? "text-yellow-400" :
                          "text-[#8b949e]"
                        }>
                          {f.severity === "critical" ? "C" : f.severity === "major" ? "M" : "m"}
                        </span>
                        <span className="flex-1 text-[#e6edf3]">{f.message}</span>
                        {f.line != null && <span className="text-[#8b949e]">L{f.line}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=PipelineUI | inputs=Props | outputs=JSX
