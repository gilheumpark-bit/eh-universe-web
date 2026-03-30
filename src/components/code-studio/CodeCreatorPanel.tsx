"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useCallback, useRef } from "react";
import {
  Play, Square, CheckCircle, XCircle, AlertTriangle,
  Loader2, ChevronDown, ChevronRight, FileCode2,
  GitMerge, Trash2, RefreshCw, Eye, X, Shield, Box,
  ArrowRight,
} from "lucide-react";

/** Simplified creation phase type for EH Code Studio */
export type CreationPhase =
  | "spec" | "architecture" | "component-spec" | "generation"
  | "self-review" | "multi-review" | "stress-test" | "patent-check"
  | "revision" | "user-review" | "approved" | "merged";

export interface CreationProgress {
  phase: CreationPhase;
  phaseLabel: string;
  phaseIndex: number;
  totalPhases: number;
  detail: string;
}

export interface CreationFileResult {
  path: string;
  content: string;
  originalContent?: string;
  isNew: boolean;
  status: "pending" | "approved" | "rejected";
}

export interface CreationResult {
  files: CreationFileResult[];
  pipelineScore: number;
  reviewScore: number;
  stressScore: number;
  patentScore: number;
  overallScore: number;
  passedAllChecks: boolean;
  summary: string;
}

interface CodeCreatorPanelProps {
  onMerge?: (files: CreationFileResult[]) => void;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=타입 정의 | inputs=none | outputs=CreationPhase, CreationResult, Props

// ============================================================
// PART 2 — Phase Definitions
// ============================================================

const PHASES: Array<{ phase: CreationPhase; label: string }> = [
  { phase: "spec", label: "Spec" },
  { phase: "architecture", label: "Architecture" },
  { phase: "component-spec", label: "Components" },
  { phase: "generation", label: "Generation" },
  { phase: "self-review", label: "Pipeline" },
  { phase: "multi-review", label: "AI Review" },
  { phase: "stress-test", label: "Stress Test" },
  { phase: "patent-check", label: "Patent Check" },
  { phase: "revision", label: "Revision" },
  { phase: "user-review", label: "User Review" },
  { phase: "approved", label: "Approved" },
  { phase: "merged", label: "Merged" },
];

const PHASE_ICONS: Partial<Record<CreationPhase, React.ReactNode>> = {
  spec: <FileCode2 size={10} />,
  architecture: <Box size={10} />,
  generation: <Play size={10} />,
  "self-review": <Shield size={10} />,
  "stress-test": <RefreshCw size={10} />,
  "patent-check": <Shield size={10} />,
  "user-review": <Eye size={10} />,
  approved: <CheckCircle size={10} />,
  merged: <GitMerge size={10} />,
};

// IDENTITY_SEAL: PART-2 | role=페이즈 정의 | inputs=none | outputs=PHASES, PHASE_ICONS

// ============================================================
// PART 3 — CodeCreatorPanel Component
// ============================================================

export default function CodeCreatorPanel({ onMerge, onClose }: CodeCreatorPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [result, setResult] = useState<CreationResult | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showMergeWarning, setShowMergeWarning] = useState(false);
  const [fileDecisions, setFileDecisions] = useState<Map<string, "approved" | "rejected">>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  // ── Simulated creation (in real implementation this calls code-creator pipeline) ──
  const handleStart = useCallback(async () => {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setResult(null);
    setShowMergeWarning(false);
    setFileDecisions(new Map());
    abortRef.current = new AbortController();

    // Simulate phase progression
    for (let i = 0; i < PHASES.length - 2; i++) {
      if (abortRef.current.signal.aborted) break;
      setProgress({
        phase: PHASES[i].phase, phaseLabel: PHASES[i].label,
        phaseIndex: i, totalPhases: PHASES.length,
        detail: `Processing ${PHASES[i].label}...`,
      });
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!abortRef.current.signal.aborted) {
      setResult({
        files: [
          { path: "src/generated.ts", content: `// Generated from: ${prompt}\nexport function main() {\n  console.log("Generated code");\n}\n`, isNew: true, status: "pending" },
        ],
        pipelineScore: 85, reviewScore: 88, stressScore: 72, patentScore: 95, overallScore: 85,
        passedAllChecks: true,
        summary: "All checks passed. Code is ready for review.",
      });
    }
    setRunning(false);
    abortRef.current = null;
  }, [prompt, running]);

  const handleStop = useCallback(() => { abortRef.current?.abort(); }, []);

  const handleFileApprove = useCallback((path: string) => {
    setFileDecisions((prev) => new Map(prev).set(path, "approved"));
  }, []);

  const handleFileReject = useCallback((path: string) => {
    setFileDecisions((prev) => new Map(prev).set(path, "rejected"));
  }, []);

  const handleMerge = useCallback(() => {
    if (!result) return;
    if (!result.passedAllChecks) { setShowMergeWarning(true); return; }
    onMerge?.(result.files.filter((f) => fileDecisions.get(f.path) !== "rejected"));
    onClose();
  }, [result, onMerge, onClose, fileDecisions]);

  const handleForceMerge = useCallback(() => {
    if (!result) return;
    onMerge?.(result.files.filter((f) => fileDecisions.get(f.path) !== "rejected"));
    setShowMergeWarning(false);
    onClose();
  }, [result, onMerge, onClose, fileDecisions]);

  const handleDiscard = useCallback(() => {
    setResult(null); setProgress(null); setPrompt(""); setFileDecisions(new Map());
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0a0e17] text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <FileCode2 size={14} className="text-purple-400" />
          Code Creator
        </span>
        <button onClick={onClose} aria-label="닫기" className="p-1 rounded hover:bg-white/5 text-text-secondary"><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Input section */}
        {!result && (
          <div className="flex flex-col gap-2">
            <textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              className="w-full h-24 px-3 py-2 text-sm bg-[#0d1117] border border-white/10 rounded resize-none focus:outline-none focus:border-purple-500/50"
              disabled={running}
            />
            <div className="flex gap-2">
              {!running ? (
                <button onClick={handleStart} disabled={!prompt.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40">
                  <Play size={12} /> Start Creation
                </button>
              ) : (
                <button onClick={handleStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-500">
                  <Square size={12} /> Stop
                </button>
              )}
            </div>
          </div>
        )}

        {/* Phase progress */}
        {(running || result) && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Phases</span>
            <div className="flex flex-wrap gap-1">
              {PHASES.map((p, i) => {
                const isCurrent = progress?.phase === p.phase;
                const isDone = progress ? (progress.phaseIndex > i || (!!result && !running)) : false;
                const isActive = isCurrent && running;
                return (
                  <div key={p.phase} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]" style={{
                    background: isCurrent ? "rgba(139,92,246,0.3)" : isDone ? "rgba(63,185,80,0.2)" : "rgba(255,255,255,0.04)",
                    color: isCurrent || isDone ? "#fff" : "rgba(255,255,255,0.35)",
                  }}>
                    {isActive ? <Loader2 size={9} className="animate-spin" /> : isDone ? <CheckCircle size={9} /> : PHASE_ICONS[p.phase] ?? <ArrowRight size={9} />}
                    {p.label}
                  </div>
                );
              })}
            </div>
            {progress && running && (
              <div className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> {progress.detail}
              </div>
            )}
          </div>
        )}

        {/* Score badges */}
        {result && (
          <div className="flex flex-col gap-1.5 p-2 rounded border border-white/8 bg-[#0d1117]">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Verification</span>
            <div className="flex items-center justify-around">
              <ScoreBadge score={result.pipelineScore} label="Pipeline" />
              <ScoreBadge score={result.reviewScore} label="AI Review" />
              <ScoreBadge score={result.stressScore} label="Stress" />
              <ScoreBadge score={result.patentScore} label="Patent" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-text-tertiary">Overall</span>
                <span className="text-base font-bold font-mono px-2 py-0.5 rounded" style={{
                  color: result.passedAllChecks ? "#3fb950" : "#f85149",
                  background: result.passedAllChecks ? "rgba(63,185,80,0.1)" : "rgba(248,81,73,0.1)",
                }}>{result.overallScore}</span>
              </div>
            </div>
            <p className="text-[11px] text-center text-text-secondary">{result.summary}</p>
          </div>
        )}

        {/* File list */}
        {result && result.files.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
              Files ({result.files.length})
            </span>
            {result.files.map((file) => {
              const isExpanded = expandedFile === file.path;
              const decision = fileDecisions.get(file.path) ?? file.status;
              return (
                <div key={file.path} className="rounded border border-white/8 bg-[#0d1117] overflow-hidden">
                  <div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5"
                    onClick={() => setExpandedFile(isExpanded ? null : file.path)}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <FileCode2 size={12} className="text-purple-400" />
                    <span className="text-[11px] font-mono flex-1 truncate">{file.path}</span>
                    {file.isNew && <span className="text-[9px] px-1 py-0.5 rounded bg-green-600 text-white">NEW</span>}
                    <span className="text-[9px] px-1 py-0.5 rounded" style={{
                      background: decision === "approved" ? "rgba(63,185,80,0.15)" : decision === "rejected" ? "rgba(248,81,73,0.15)" : "rgba(255,255,255,0.05)",
                      color: decision === "approved" ? "#3fb950" : decision === "rejected" ? "#f85149" : "#888",
                    }}>
                      {decision === "approved" ? "Approved" : decision === "rejected" ? "Rejected" : "Pending"}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleFileApprove(file.path); }}
                      className="p-0.5 rounded hover:bg-green-500/20"><CheckCircle size={12} className="text-green-500" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleFileReject(file.path); }}
                      className="p-0.5 rounded hover:bg-red-500/20"><XCircle size={12} className="text-red-500" /></button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-white/8 p-2">
                      <pre className="text-[10px] font-mono text-text-primary whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                        {file.content}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Merge warning */}
        {showMergeWarning && (
          <div className="p-3 rounded border-2 border-red-500 bg-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-bold text-red-500">Warning: Not all checks passed</span>
            </div>
            <p className="text-xs text-text-secondary mb-2">Some verification steps did not pass. Merging may introduce issues.</p>
            <div className="flex gap-2">
              <button onClick={handleForceMerge} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-500">
                <AlertTriangle size={12} /> Force Merge
              </button>
              <button onClick={() => setShowMergeWarning(false)} className="px-3 py-1.5 text-xs rounded bg-white/5 text-text-primary hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Approval section */}
        {result && !running && (
          <div className="flex flex-col gap-2 p-2 rounded border border-white/8 bg-[#0d1117]">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Approval</span>
            <div className="flex gap-2">
              <input value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder="Revision feedback..."
                className="flex-1 px-2 py-1 text-xs bg-[#0a0e17] border border-white/10 rounded focus:outline-none focus:border-purple-500/50" />
              <button disabled={!feedback.trim()}
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
                <RefreshCw size={10} /> Revise
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleMerge}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-500">
                <GitMerge size={14} /> Merge to Main
              </button>
              <button onClick={handleDiscard}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded bg-white/5 text-red-400 hover:bg-red-500/10">
                <Trash2 size={12} /> Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=코드 생성 패널 UI | inputs=Props | outputs=JSX.Element

// ============================================================
// PART 4 — Sub-components
// ============================================================

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 77 ? "#3fb950" : score >= 50 ? "#d29922" : "#f85149";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-text-tertiary">{label}</span>
      <span className="text-sm font-bold font-mono px-2 py-0.5 rounded" style={{ color, background: `${color}15` }}>
        {score}
      </span>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=서브 컴포넌트 | inputs=score, label | outputs=JSX.Element
