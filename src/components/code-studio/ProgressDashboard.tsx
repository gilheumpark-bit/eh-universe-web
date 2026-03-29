"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  X, Activity, FileText, Brain, TrendingUp,
  Clock, BarChart3, Zap, Trophy, AlertTriangle,
  Loader2, Gauge,
} from "lucide-react";
import type { TeamResult } from "@/lib/code-studio-pipeline-teams";
import type { StressReport } from "@/lib/code-studio-stress-test";
import type { VerificationResult } from "@/lib/code-studio-verification-loop";

interface TeamProgress {
  name: string;
  progress: number;
  status: "pending" | "running" | "done" | "error";
  score?: number;
  estimatedMs?: number;
}

interface RecentAction {
  time: number;
  label: string;
  type: "ai" | "edit" | "pipeline" | "system";
}

interface Props {
  teams?: TeamProgress[];
  pipelineScore?: number;
  pipelineStatus?: "pass" | "warn" | "fail";
  onClose?: () => void;
  stressReport?: StressReport | null;
  onRunStress?: () => void;
  isStressTesting?: boolean;
  verificationScore?: number;
  onRunVerification?: () => void;
  isVerifying?: boolean;
  verificationResult?: VerificationResult | null;
  currentVerifyRound?: number;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=TeamProgress,Props

// ============================================================
// PART 2 — Helpers
// ============================================================

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return `${tokens}`;
}

function loadRecentActions(): RecentAction[] {
  try {
    const raw = localStorage.getItem("eh_recent_actions");
    if (!raw) return [];
    return (JSON.parse(raw) as RecentAction[]).slice(-10).reverse();
  } catch { return []; }
}

function useTimeAgo() {
  return (ts: number): string => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };
}

function loadSessionStats(): { fileEdits: number; aiCalls: number; tokens: number } {
  try {
    const raw = localStorage.getItem("eh_session_stats");
    if (!raw) return { fileEdits: 0, aiCalls: 0, tokens: 0 };
    return JSON.parse(raw);
  } catch { return { fileEdits: 0, aiCalls: 0, tokens: 0 }; }
}

// IDENTITY_SEAL: PART-2 | role=Helpers | inputs=localStorage | outputs=stats

// ============================================================
// PART 3 — Sub-Components
// ============================================================

function TeamProgressBar({ team }: { team: TeamProgress }) {
  const barColor =
    team.status === "done" ? "#3fb950" :
    team.status === "running" ? "#58a6ff" :
    team.status === "error" ? "#f85149" :
    "#8b949e";

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[10px] text-[#8b949e] truncate">{team.name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#21262d] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{
          width: `${Math.max(team.progress, 2)}%`, backgroundColor: barColor,
        }} />
      </div>
      <span className="w-10 text-right text-[10px] text-[#8b949e]">
        {team.status === "done" && team.score != null ? `${team.score}` : team.status === "running" ? `${team.progress}%` : "-"}
      </span>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-[#21262d]">
      <span className="text-[#8b949e] mb-1">{icon}</span>
      <span className="text-sm font-bold text-[#e6edf3]">{value}</span>
      <span className="text-[10px] text-[#8b949e]">{label}</span>
    </div>
  );
}

function ActionIcon({ type }: { type: RecentAction["type"] }) {
  switch (type) {
    case "ai": return <Brain size={10} className="text-purple-400 shrink-0" />;
    case "edit": return <FileText size={10} className="text-blue-400 shrink-0" />;
    case "pipeline": return <Zap size={10} className="text-yellow-400 shrink-0" />;
    default: return <Activity size={10} className="text-[#8b949e] shrink-0" />;
  }
}

// IDENTITY_SEAL: PART-3 | role=SubComponents | inputs=team,stats | outputs=JSX

// ============================================================
// PART 3.5 — Stress Test Grade Helpers
// ============================================================

const GRADE_COLOR: Record<string, string> = {
  A: "#3fb950", B: "#58a6ff", C: "#d29922", D: "#e3833a", F: "#f85149",
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
      style={{ backgroundColor: `${GRADE_COLOR[grade] ?? "#8b949e"}22`, color: GRADE_COLOR[grade] ?? "#8b949e" }}
    >
      {grade}
    </span>
  );
}

function ScoreBar({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="flex-1 h-1.5 rounded-full bg-[#21262d] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(score, 2)}%`, backgroundColor: GRADE_COLOR[grade] ?? "#8b949e" }}
      />
    </div>
  );
}

// IDENTITY_SEAL: PART-3.5 | role=StressHelpers | inputs=grade,score | outputs=JSX

// ============================================================
// PART 4 — Main Component
// ============================================================

export function ProgressDashboard({ teams, pipelineScore, pipelineStatus, onClose, stressReport, onRunStress, isStressTesting, verificationScore, onRunVerification, isVerifying, verificationResult, currentVerifyRound }: Props) {
  const timeAgo = useTimeAgo();
  const [sessionStats, setSessionStats] = useState(() => loadSessionStats());
  const [recentActions, setRecentActions] = useState<RecentAction[]>(() => loadRecentActions());

  const refresh = useCallback(() => {
    setSessionStats(loadSessionStats());
    setRecentActions(loadRecentActions());
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Compute overall pipeline progress
  const overallProgress = teams && teams.length > 0
    ? Math.round(teams.reduce((s, t) => s + t.progress, 0) / teams.length)
    : 0;
  const completedTeams = teams?.filter((t) => t.status === "done").length ?? 0;
  const totalTeams = teams?.length ?? 0;
  const runningTeams = teams?.filter((t) => t.status === "running").length ?? 0;

  // Estimated time remaining (simple heuristic)
  const avgEstMs = teams?.reduce((s, t) => s + (t.estimatedMs ?? 0), 0) ?? 0;
  const etaMs = runningTeams > 0 ? Math.round(avgEstMs / runningTeams * (1 - overallProgress / 100)) : 0;

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-l border-[#30363d] overflow-hidden" style={{ minWidth: 320 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#e6edf3]">
          <Activity size={14} className="text-blue-400" /> Progress Dashboard
        </span>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e]" title="Close"><X size={14} /></button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">

        {/* Overall Progress */}
        {teams && teams.length > 0 && (
          <section>
            <h3 className="flex items-center gap-1.5 font-semibold text-[#e6edf3] mb-2">
              <BarChart3 size={12} className="text-purple-400" /> Pipeline Progress
            </h3>
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                <span>{completedTeams}/{totalTeams} teams complete</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500 bg-purple-500" style={{ width: `${overallProgress}%` }} />
              </div>
              {etaMs > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-[#8b949e]">
                  <Clock size={9} /> Est. remaining: {Math.round(etaMs / 1000)}s
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {teams.map((team) => <TeamProgressBar key={team.name} team={team} />)}
            </div>
          </section>
        )}

        {/* Pipeline Score */}
        {pipelineScore != null && (
          <section>
            <h3 className="flex items-center gap-1.5 font-semibold text-[#e6edf3] mb-2">
              <TrendingUp size={12} className="text-green-400" /> Code Quality
            </h3>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[#21262d]">
              <div className="text-center">
                <div className="text-lg font-bold" style={{
                  color: pipelineScore >= 80 ? "#3fb950" : pipelineScore >= 60 ? "#d29922" : "#f85149",
                }}>{pipelineScore}</div>
                <div className="text-[10px] text-[#8b949e]">Score</div>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-[#010409] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${pipelineScore}%`,
                    backgroundColor: pipelineScore >= 80 ? "#3fb950" : pipelineScore >= 60 ? "#d29922" : "#f85149",
                  }} />
                </div>
                {pipelineStatus && (
                  <div className="text-[10px] text-[#8b949e] mt-1">Status: {pipelineStatus.toUpperCase()}</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Session Stats */}
        <section>
          <h3 className="flex items-center gap-1.5 font-semibold text-[#e6edf3] mb-2">
            <Zap size={12} className="text-yellow-400" /> Session Stats
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="File Edits" value={`${sessionStats.fileEdits}`} icon={<FileText size={12} />} />
            <StatCard label="AI Calls" value={`${sessionStats.aiCalls}`} icon={<Brain size={12} />} />
            <StatCard label="Tokens" value={formatTokens(sessionStats.tokens)} icon={<Trophy size={12} />} />
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h3 className="flex items-center gap-1.5 font-semibold text-[#e6edf3] mb-2">
            <Clock size={12} className="text-[#8b949e]" /> Recent Activity
          </h3>
          <div className="space-y-1">
            {recentActions.length === 0 ? (
              <div className="text-[#8b949e] text-center py-3">No recent activity</div>
            ) : (
              recentActions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#21262d]">
                  <ActionIcon type={action.type} />
                  <span className="flex-1 truncate text-[#e6edf3]">{action.label}</span>
                  <span className="text-[10px] text-[#8b949e] whitespace-nowrap">{timeAgo(action.time)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AI-Predicted Performance Analysis */}
        <section>
          <h3 className="flex items-center gap-1.5 font-semibold text-[#e6edf3] mb-2">
            <Gauge size={12} className="text-orange-400" /> AI-Predicted Performance
          </h3>

          {onRunStress && (
            <button
              onClick={onRunStress}
              disabled={isStressTesting}
              className="w-full mb-3 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-[11px] font-medium transition-colors bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStressTesting ? (
                <><Loader2 size={12} className="animate-spin" /> Running Stress Test...</>
              ) : (
                <><Zap size={12} /> Run Stress Test</>
              )}
            </button>
          )}

          {stressReport ? (
            <div className="space-y-2">
              {/* Overall score */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-[#21262d]">
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: GRADE_COLOR[stressReport.grade] }}>
                    {stressReport.grade}
                  </div>
                  <div className="text-[10px] text-[#8b949e]">Grade</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] text-[#8b949e] mb-1">
                    <span>Overall</span>
                    <span>{stressReport.overallScore}/100</span>
                  </div>
                  <ScoreBar score={stressReport.overallScore} grade={stressReport.grade} />
                </div>
              </div>

              {/* Per-scenario breakdown */}
              <div className="space-y-1.5">
                {stressReport.scenarios.map((r) => {
                  const score = r.grade === "A" ? 100 : r.grade === "B" ? 80 : r.grade === "C" ? 60 : r.grade === "D" ? 40 : 20;
                  return (
                    <div key={r.scenario.id} className="flex items-center gap-2">
                      <span className="w-24 text-[10px] text-[#8b949e] truncate" title={`${r.scenario.name} (${r.scenario.virtualUsers}u)`}>
                        {r.scenario.name} ({r.scenario.virtualUsers}u)
                      </span>
                      <ScoreBar score={score} grade={r.grade} />
                      <GradeBadge grade={r.grade} />
                      <span className="w-8 text-right text-[10px] text-[#8b949e]">{score}</span>
                    </div>
                  );
                })}
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-1.5 pt-1 text-[9px] text-[#8b949e]">
                <AlertTriangle size={10} className="shrink-0 mt-px text-[#d29922]" />
                <span>AI-Predicted — not real load test results</span>
              </div>
            </div>
          ) : !isStressTesting ? (
            <div className="text-[#8b949e] text-center py-3 text-[11px]">
              Run a stress test to see predicted performance
            </div>
          ) : null}
        </section>

        {/* Full Verification */}
        <section className="rounded-lg border border-white/8 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trophy size={13} className="text-[#d2a8ff]" />
              <h3 className="text-[11px] font-semibold text-[#e6edf3]">Full Verification</h3>
            </div>
            <button
              onClick={onRunVerification}
              disabled={isVerifying}
              className="flex items-center gap-1 rounded border border-[#d2a8ff]/30 bg-[#d2a8ff]/10 px-2 py-0.5 text-[10px] text-[#d2a8ff] hover:bg-[#d2a8ff]/20 disabled:opacity-40"
            >
              {isVerifying ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
              {isVerifying ? "Verifying..." : "Run All"}
            </button>
          </div>

          {verificationScore != null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#8b949e]">Pipeline + Bugs + Stress</span>
                <div className="flex items-center gap-1.5">
                  <GradeBadge grade={verificationScore >= 77 ? "A" : verificationScore >= 60 ? "B" : verificationScore >= 40 ? "C" : "F"} />
                  <span className="text-sm font-bold text-[#e6edf3]">{verificationScore}/100</span>
                </div>
              </div>
              <ScoreBar score={verificationScore} grade={verificationScore >= 77 ? "A" : verificationScore >= 60 ? "C" : "F"} />
              <div className="text-[9px] text-[#8b949e]">
                {verificationScore >= 77 ? "✅ PASS — Safe to deploy" : verificationScore >= 60 ? "⚠️ WARN — Review before deploy" : "❌ FAIL — Critical issues found"}
              </div>
            </div>
          )}

          {/* Verification Loop Details */}
          {isVerifying && currentVerifyRound != null && currentVerifyRound > 0 && (
            <div className="flex items-center gap-2 py-1">
              <Loader2 size={10} className="animate-spin text-[#d2a8ff]" />
              <span className="text-[10px] text-[#8b949e]">Round {currentVerifyRound}/3 — auto-fixing...</span>
            </div>
          )}

          {verificationResult && (
            <div className="space-y-1 mt-1">
              <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                <span>Rounds: {verificationResult.iterations.length}</span>
                <span>Fixes: {verificationResult.totalFixesApplied}</span>
                <span>Stop: {verificationResult.stopReason}</span>
              </div>
              {verificationResult.scoreDelta !== 0 && (
                <div className="text-[9px] text-[#8b949e]">
                  Score delta: {verificationResult.scoreDelta > 0 ? "+" : ""}{verificationResult.scoreDelta}
                </div>
              )}
              {verificationResult.hardGateFailures.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-red-400">
                  <AlertTriangle size={9} /> Hard gate: {verificationResult.hardGateFailures.join(", ")}
                </div>
              )}
            </div>
          )}

          {verificationScore == null && !isVerifying && (
            <div className="text-[#8b949e] text-center py-2 text-[11px]">
              Pipeline + Bug Scan + Stress Test combined verification
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=DashboardUI | inputs=Props | outputs=JSX
