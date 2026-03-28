"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle, AlertTriangle, XCircle, Shield, Loader2,
  ChevronDown, ChevronRight, Zap, Eye, Code2, Scale,
  Network, ShieldCheck, Gavel, BarChart3, Download, Copy,
} from "lucide-react";
import { generateReport } from "@/lib/pipeline/report-generator";
import type { PipelineResult } from "@/lib/types";
import { useLocale } from "@/lib/i18n";

interface Props {
  result: PipelineResult;
}

const TEAM_CONFIG: Record<string, { labelKey: string; icon: React.ReactNode; color: string }> = {
  simulation:    { labelKey: "pipeline.teamSimulation",  icon: <Zap size={14} />,          color: "var(--accent-blue)" },
  generation:    { labelKey: "pipeline.teamGeneration",  icon: <Code2 size={14} />,        color: "var(--accent-green)" },
  validation:    { labelKey: "pipeline.teamValidation",  icon: <Eye size={14} />,          color: "var(--accent-yellow)" },
  "size-density": { labelKey: "pipeline.teamSizeDensity", icon: <Scale size={14} />,        color: "var(--accent-purple)" },
  "asset-trace":  { labelKey: "pipeline.teamAssetTrace",  icon: <Network size={14} />,      color: "#58a6ff" },
  stability:     { labelKey: "pipeline.teamStability",   icon: <ShieldCheck size={14} />,   color: "#3fb950" },
  "release-ip":   { labelKey: "pipeline.teamReleaseIp",   icon: <Gavel size={14} />,        color: "#f85149" },
  governance:    { labelKey: "pipeline.teamGovernance",  icon: <BarChart3 size={14} />,    color: "#bc8cff" },
};

export function PipelinePanel({ result }: Props) {
  const { t } = useLocale();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const handleCopyReport = useCallback(() => {
    const report = generateReport(result);
    navigator.clipboard.writeText(report.markdown).catch(() => {});
  }, [result]);

  const handleDownloadReport = useCallback(() => {
    const report = generateReport(result);
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="h-64 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <Shield size={12} className="text-[var(--accent-purple)]" />
          {t('pipeline.headerTitle')}
          <StatusBadge status={result.overallStatus} />
          <span className="text-[var(--text-secondary)] font-mono">{result.overallScore}/100</span>
        </span>
        <span className="flex items-center gap-1">
          <button onClick={handleCopyReport} className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]" title={t('pipeline.copyReportTitle')} aria-label={t('pipeline.copyReportAria')}>
            <Copy size={12} />
          </button>
          <button onClick={handleDownloadReport} className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]" title={t('pipeline.downloadReportTitle')} aria-label={t('pipeline.downloadReportAria')}>
            <Download size={12} />
          </button>
        </span>
      </div>

      {/* 8-Team Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-2">
          {result.stages.map((stage) => {
            const stageKey = stage.stage ?? stage.team;
            const config = TEAM_CONFIG[stageKey] ?? { labelKey: stageKey, icon: <Shield size={14} />, color: "#8b949e" };
            const isExpanded = expandedTeam === stageKey;
            const findings = "findings" in stage ? (stage as { findings?: { severity: string; message: string; line?: number }[] }).findings ?? [] : [];

            return (
              <div key={stageKey} className="flex flex-col">
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : stageKey)}
                  className={`p-2 rounded-lg border transition-all ${
                    stage.status === "pass" ? "border-[var(--accent-green)]/30 hover:border-[var(--accent-green)]/60" :
                    stage.status === "warn" ? "border-[var(--accent-yellow)]/30 hover:border-[var(--accent-yellow)]/60" :
                    stage.status === "fail" ? "border-[var(--accent-red)]/30 hover:border-[var(--accent-red)]/60" :
                    "border-[var(--border)]"
                  } bg-[var(--bg-primary)]`}
                >
                  {/* Team Header */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span className="text-[10px] font-semibold flex-1 text-left">{t(config.labelKey)}</span>
                    <TeamStatusIcon status={stage.status} />
                  </div>

                  {/* Score Bar */}
                  <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stage.score}%`,
                        backgroundColor:
                          stage.score >= 80 ? "var(--accent-green)" :
                          stage.score >= 60 ? "var(--accent-yellow)" :
                          "var(--accent-red)",
                      }}
                    />
                  </div>

                  {/* Score + Time */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono">{stage.score}</span>
                    <span className="text-[9px] text-[var(--text-secondary)]">{stage.durationMs}ms</span>
                  </div>

                  {/* Message */}
                  <p className="text-[9px] text-[var(--text-secondary)] mt-1 text-left truncate">
                    {stage.message}
                  </p>

                  {/* Expand indicator */}
                  {findings.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-[var(--text-secondary)]">
                      {isExpanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                      {t('pipeline.findingsCount', { count: findings.length })}
                    </div>
                  )}
                </button>

                {/* Expanded Findings */}
                {isExpanded && findings.length > 0 && (
                  <div className="mt-1 p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[9px] space-y-1 max-h-32 overflow-y-auto">
                    {findings.map((f: { severity: string; message: string; line?: number }, i: number) => (
                      <div key={i} className="flex items-start gap-1">
                        <span className={
                          f.severity === "critical" ? "text-[var(--accent-red)]" :
                          f.severity === "major" ? "text-[var(--accent-yellow)]" :
                          "text-[var(--text-secondary)]"
                        }>
                          {f.severity === "critical" ? "●" : f.severity === "major" ? "▲" : "○"}
                        </span>
                        <span className="flex-1">{f.message}</span>
                        {f.line && <span className="text-[var(--text-secondary)]">L{f.line}</span>}
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

function TeamStatusIcon({ status }: { status: string }) {
  if (status === "running") return <Loader2 size={12} className="animate-spin text-[var(--accent-blue)]" />;
  if (status === "pass") return <CheckCircle size={12} className="text-[var(--accent-green)]" />;
  if (status === "warn") return <AlertTriangle size={12} className="text-[var(--accent-yellow)]" />;
  if (status === "fail") return <XCircle size={12} className="text-[var(--accent-red)]" />;
  return <div className="w-3 h-3 rounded-full bg-[var(--border)] animate-pulse" />;
}

function StatusBadge({ status }: { status: string }) {
  const colors =
    status === "pass" ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]" :
    status === "warn" ? "bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)]" :
    "bg-[var(--accent-red)]/15 text-[var(--accent-red)]";

  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors}`}>{status.toUpperCase()}</span>;
}
