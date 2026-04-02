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
import type { TeamResult, Finding } from "@/lib/code-studio/pipeline/pipeline-teams";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { generateReport } from "@/lib/code-studio/pipeline/pipeline-utils";

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

const TEAM_CONFIG: Record<string, { label: string; icon: React.ReactNode; colorClass: string }> = {
  simulation:     { label: "Simulation",   icon: <Zap size={14} />,          colorClass: "text-accent-blue" },
  generation:     { label: "Generation",   icon: <Code2 size={14} />,        colorClass: "text-accent-green" },
  validation:     { label: "Validation",   icon: <Eye size={14} />,          colorClass: "text-accent-amber" },
  "size-density": { label: "Size/Density", icon: <Scale size={14} />,        colorClass: "text-accent-purple" },
  "asset-trace":  { label: "Asset Trace",  icon: <Network size={14} />,      colorClass: "text-accent-blue" },
  stability:      { label: "Stability",    icon: <ShieldCheck size={14} />,  colorClass: "text-accent-green" },
  "release-ip":   { label: "Release/IP",   icon: <Gavel size={14} />,        colorClass: "text-accent-red" },
  governance:     { label: "Governance",   icon: <BarChart3 size={14} />,    colorClass: "text-accent-purple" },
};

function TeamStatusIcon({ status }: { status: string }) {
  if (status === "running") return <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin text-accent-blue" /><span className="sr-only">Running</span></span>;
  if (status === "pass") return <span className="flex items-center gap-1"><CheckCircle size={12} className="text-accent-green" /><span className="sr-only">Pass</span></span>;
  if (status === "warn") return <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-accent-amber" /><span className="sr-only">Warning</span></span>;
  if (status === "fail") return <span className="flex items-center gap-1"><XCircle size={12} className="text-accent-red" /><span className="sr-only">Fail</span></span>;
  return <div className="w-3 h-3 rounded-full bg-border animate-pulse" aria-label="Pending" />;
}

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const icon = status === "pass" ? <CheckCircle size={10} /> : status === "warn" ? <AlertTriangle size={10} /> : <XCircle size={10} />;
  const colors =
    status === "pass" ? "bg-accent-green/15 text-accent-green" :
    status === "warn" ? "bg-accent-amber/15 text-accent-amber" :
    "bg-accent-red/15 text-accent-red";
  
  const text = status === "pass" ? L4(lang, { ko: "통과", en: "PASS" }) :
               status === "warn" ? L4(lang, { ko: "경고", en: "WARN" }) :
               L4(lang, { ko: "실패", en: "FAIL" });

  return <span className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${colors}`}>{icon}{text}</span>;
}

// IDENTITY_SEAL: PART-2 | role=TeamConfig | inputs=none | outputs=TEAM_CONFIG

// ============================================================
// PART 3 — Main Component
// ============================================================

export function PipelinePanel({ result, onRun, onAbort, isRunning, lastRunTimestamp }: Props) {
  const { lang } = useLang();
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
      <div className="h-64 border-t border-border bg-bg-secondary flex flex-col items-center justify-center gap-3">
        <Shield size={32} className="text-text-tertiary opacity-30" />
        <p className="text-xs text-text-tertiary">{L4(lang, { ko: "파이프라인 결과 없음", en: "No pipeline results yet" })}</p>
        {onRun && (
          <button onClick={onRun} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-amber-800 text-stone-100 hover:opacity-90 transition-opacity">
            <Play size={12} /> {L4(lang, { ko: "파이프라인 실행", en: "Run Pipeline" })}
          </button>
        )}
        {lastRunTimestamp && (
          <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "최근 실행:", en: "Last run:" })} {new Date(lastRunTimestamp).toLocaleString()}</span>
        )}
      </div>
    );
  }

  // Running state
  if (isRunning && !result) {
    return (
      <div className="h-64 border-t border-border bg-bg-secondary flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-amber-400" />
        <p className="text-xs text-text-tertiary">{L4(lang, { ko: "파이프라인 실행 중...", en: "Pipeline running..." })}</p>
        {onAbort && (
          <button onClick={onAbort} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-border text-yellow-400 hover:bg-bg-tertiary">
            <Square size={12} /> {L4(lang, { ko: "중단", en: "Abort" })}
          </button>
        )}
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="h-64 border-t border-border bg-bg-secondary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          <Shield size={12} className="text-amber-400" /> {L4(lang, { ko: "파이프라인 결과", en: "Pipeline Results" })}
          <StatusBadge status={result.overallStatus} lang={lang} />
          <span className="text-text-tertiary font-mono">{result.overallScore}/100</span>
        </span>
        <span className="flex items-center gap-1">
          {onRun && (
            <button onClick={onRun} className="p-1 rounded hover:bg-bg-tertiary text-blue-400" title={L4(lang, { ko: "다시 실행", en: "Re-run" })} aria-label={L4(lang, { ko: "다시 실행", en: "Re-run" })}><Play size={12} /></button>
          )}
          <button onClick={handleCopyReport} className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary" title={L4(lang, { ko: "보고서 복사", en: "Copy report" })} aria-label={L4(lang, { ko: "보고서 복사", en: "Copy report" })}><Copy size={12} /></button>
          <button onClick={handleDownloadReport} className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary" title={L4(lang, { ko: "보고서 다운로드", en: "Download report" })} aria-label={L4(lang, { ko: "보고서 다운로드", en: "Download report" })}><Download size={12} /></button>
        </span>
      </div>

      {/* 8-Team Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-2">
          {result.stages.map((stage) => {
            const stageKey = stage.stage;
            const config = TEAM_CONFIG[stageKey] ?? { label: stageKey, icon: <Shield size={14} />, colorClass: "text-text-tertiary" };
            const getTeamLabel = (key: string) => {
              const labels: Record<string, string> = {
                simulation:     L4(lang, { ko: "시뮬레이션", en: "Simulation" }),
                generation:     L4(lang, { ko: "생성", en: "Generation" }),
                validation:     L4(lang, { ko: "검증", en: "Validation" }),
                "size-density": L4(lang, { ko: "크기/밀도", en: "Size/Density" }),
                "asset-trace":  L4(lang, { ko: "자산 추적", en: "Asset Trace" }),
                stability:      L4(lang, { ko: "안정성", en: "Stability" }),
                "release-ip":   L4(lang, { ko: "릴리스/IP", en: "Release/IP" }),
                governance:     L4(lang, { ko: "거버넌스", en: "Governance" }),
              };
              return labels[key] || config.label;
            };
            const isExpanded = expandedTeam === stageKey;

            return (
              <div key={stageKey} className="flex flex-col">
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : stageKey)}
                  className={`p-2 rounded-lg border transition-all ${
                    stage.status === "pass" ? "border-green-500/30 hover:border-green-500/60" :
                    stage.status === "warn" ? "border-accent-amber/30 hover:border-accent-amber/60" :
                    stage.status === "fail" ? "border-accent-red/30 hover:border-accent-red/60" :
                    "border-border"
                  } bg-bg-primary`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={config.colorClass}>{config.icon}</span>
                    <span className="text-[10px] font-semibold flex-1 text-left text-text-primary">{getTeamLabel(stageKey)}</span>
                    <TeamStatusIcon status={stage.status} />
                  </div>
                  <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full transition-all duration-500 ${stage.score >= 80 ? "bg-accent-green" : stage.score >= 60 ? "bg-accent-amber" : "bg-accent-red"}`}
                      style={{ width: `${stage.score}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-text-primary">{stage.score}</span>
                  </div>
                  {stage.findings.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-text-tertiary">
                      {isExpanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                      {stage.findings.length} {L4(lang, { ko: "개 항목", en: "findings" })}
                    </div>
                  )}
                </button>

                {isExpanded && stage.findings.length > 0 && (
                  <div className="mt-1 p-2 bg-bg-primary border border-border rounded text-[9px] space-y-1 max-h-32 overflow-y-auto">
                    {stage.findings.map((f: Finding, i: number) => (
                      <div key={i} className="flex items-start gap-1">
                        <span className={
                          f.severity === "critical" ? "text-red-400" :
                          f.severity === "major" ? "text-yellow-400" :
                          "text-text-tertiary"
                        }>
                          {f.severity === "critical" ? "C" : f.severity === "major" ? "M" : "m"}
                        </span>
                        <span className="flex-1 text-text-primary">{f.message}</span>
                        {f.line != null && <span className="text-text-tertiary">L{f.line}</span>}
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
