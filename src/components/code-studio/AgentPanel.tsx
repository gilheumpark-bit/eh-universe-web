"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Bot, Play, Pause, Square, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronRight, FileCode, Pencil, Search,
  Terminal, GitBranch,
} from "lucide-react";
import type { AgentRole, AgentSession } from "@/lib/code-studio/ai/agents";
import { useCodeStudioAgent } from "@/hooks/useCodeStudioAgent";

type AgentMode = "idle" | "planning" | "executing" | "paused" | "complete" | "error";

interface AgentStep {
  id: string;
  action: "plan" | "read" | "edit" | "create" | "delete" | "search" | "run" | "verify" | "think";
  label: string;
  status: "pending" | "running" | "done" | "error";
  output?: string;
  durationMs?: number;
}

interface Props {
  code: string;
  language: string;
  fileName: string;
  onApplyCode?: (code: string, fileName?: string) => void;
}

interface AgentApplyCandidate {
  code: string;
  fileName?: string;
  language: string;
  sourceRole: AgentRole;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=AgentStep,Props

// ============================================================
// PART 2 — Sub-Components
// ============================================================

const STEP_ICONS: Record<string, React.ReactNode> = {
  plan: <GitBranch size={11} />,
  read: <Search size={11} />,
  edit: <Pencil size={11} />,
  create: <FileCode size={11} />,
  delete: <XCircle size={11} />,
  search: <Search size={11} />,
  run: <Terminal size={11} />,
  verify: <CheckCircle size={11} />,
  think: <Bot size={11} />,
};

function StepRow({ step, expanded, onToggle }: { step: AgentStep; expanded: boolean; onToggle: () => void }) {
  const icon = STEP_ICONS[step.action] ?? <Bot size={11} />;
  const statusIcon =
    step.status === "running" ? <Loader2 size={10} className="animate-spin text-blue-400" /> :
    step.status === "done" ? <CheckCircle size={10} className="text-green-400" /> :
    step.status === "error" ? <XCircle size={10} className="text-red-400" /> :
    <div className="w-2.5 h-2.5 rounded-full bg-[#30363d]" />;

  return (
    <div className="border-l-2 border-[#30363d] pl-3 ml-1">
      <button onClick={onToggle} className="flex items-center gap-2 w-full text-left py-1 hover:bg-[#21262d]/50 rounded px-1 -ml-1">
        {statusIcon}
        <span className="text-[#8b949e]">{icon}</span>
        <span className="text-xs flex-1 truncate text-[#e6edf3]">{step.label}</span>
        {step.durationMs != null && <span className="text-[9px] text-[#8b949e]">{step.durationMs}ms</span>}
        {step.output && (expanded ? <ChevronDown size={10} className="text-[#8b949e]" /> : <ChevronRight size={10} className="text-[#8b949e]" />)}
      </button>
      {expanded && step.output && (
        <pre className="text-[10px] text-[#8b949e] bg-[#010409] p-2 rounded mt-1 mb-2 overflow-x-auto whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
          {step.output}
        </pre>
      )}
    </div>
  );
}

function AgentBadge({ mode }: { mode: AgentMode }) {
  const cfg: Record<AgentMode, { label: string; color: string }> = {
    idle: { label: "Idle", color: "text-[#8b949e]" },
    planning: { label: "Planning", color: "text-blue-400" },
    executing: { label: "Running", color: "text-green-400" },
    paused: { label: "Paused", color: "text-yellow-400" },
    complete: { label: "Done", color: "text-green-400" },
    error: { label: "Error", color: "text-red-400" },
  };
  const c = cfg[mode];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded bg-current/10 ${c.color}`}>
      {mode === "executing" && <Loader2 size={8} className="inline animate-spin mr-1" />}
      {c.label}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1">
      <div className="w-16 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-[#8b949e]">{pct}%</span>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=SubComponents | inputs=AgentStep | outputs=JSX

// ============================================================
// PART 3 — Agent Roles Display
// ============================================================

const AGENT_ROLES: Array<{ role: AgentRole; label: string; color: string }> = [
  { role: "architect", label: "Architect", color: "text-purple-400" },
  { role: "developer", label: "Developer", color: "text-blue-400" },
  { role: "reviewer", label: "Reviewer", color: "text-yellow-400" },
  { role: "tester", label: "Tester", color: "text-green-400" },
  { role: "documenter", label: "Documenter", color: "text-cyan-400" },
];

const ROLE_PRIORITY: Record<AgentRole, number> = {
  developer: 5,
  reviewer: 4,
  tester: 3,
  documenter: 2,
  architect: 1,
};

function extractCodeBlocks(content: string): Array<{ code: string; language: string; fileName?: string }> {
  const blocks: Array<{ code: string; language: string; fileName?: string }> = [];
  const regex = /```([\w.+-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const code = match[2]?.trim();
    if (!code) {
      continue;
    }

    const beforeBlock = content.slice(Math.max(0, match.index - 120), match.index);
    const fileMatch = beforeBlock.match(/[`"]([^`"]+\.\w+)[`"]/);
    blocks.push({
      code,
      language: match[1] || "plaintext",
      fileName: fileMatch?.[1],
    });
  }

  return blocks;
}

export function pickAgentApplyCandidate(session: AgentSession | null): AgentApplyCandidate | null {
  if (!session) {
    return null;
  }

  const candidates = session.messages.flatMap((message, messageIndex) =>
    extractCodeBlocks(message.content).map((block, blockIndex) => ({
      ...block,
      sourceRole: message.role,
      score: ROLE_PRIORITY[message.role] * 10_000 + messageIndex * 100 + blockIndex,
    })),
  );

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates.reduce((currentBest, candidate) =>
    candidate.score > currentBest.score ? candidate : currentBest,
  );

  return {
    code: best.code,
    fileName: best.fileName,
    language: best.language,
    sourceRole: best.sourceRole,
  };
}

// IDENTITY_SEAL: PART-3 | role=AgentRoles | inputs=none | outputs=AGENT_ROLES

// ============================================================
// PART 4 — Main Component
// ============================================================

export function AgentPanel({ code, language, fileName, onApplyCode }: Props) {
  const agent = useCodeStudioAgent();

  const [mode, setMode] = useState<AgentMode>("idle");
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<AgentSession | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync mode with agent.running
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (agent.running && mode === "idle") setMode("executing");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!agent.running && mode === "executing") setMode(agent.session ? "complete" : "idle");
  }, [agent.running, agent.session, mode]);

  // Derive steps from agent.messages
  useEffect(() => {
    if (agent.messages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSteps(agent.messages.map((m, i) => ({
        id: `step-${i}`,
        action: "think" as const,
        label: `${m.role}: ${m.content.slice(0, 80)}...`,
        status: "done" as const,
        output: m.content,
        durationMs: 0,
      })));
    }
  }, [agent.messages]);

  // Derive confidences from agent.messages
  const confidences = useMemo<Record<AgentRole, number>>(() => {
    const base: Record<AgentRole, number> = { architect: 0, developer: 0, reviewer: 0, tester: 0, documenter: 0 };
    for (const m of agent.messages) {
      base[m.role] = m.confidence;
    }
    return base;
  }, [agent.messages]);

  // Derive activeAgentIdx from agent.progress
  const activeAgentIdx = useMemo(() => {
    if (!agent.progress.currentRole) return 0;
    const idx = AGENT_ROLES.findIndex((a) => a.role === agent.progress.currentRole);
    return idx >= 0 ? idx : 0;
  }, [agent.progress.currentRole]);

  const applyCandidate = useMemo(
    () => pickAgentApplyCandidate(session),
    [session],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [steps]);

  const toggleStep = useCallback((id: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleRun = useCallback(async () => {
    if (!input.trim() || agent.running) return;
    setMode("executing");
    setSteps([]);
    setSummary(null);
    try {
      const ctx = `File: ${fileName}\nLanguage: ${language}\n\n${code}`;
      const result = await agent.run(input.trim(), ctx);
      setSession(result);
      setSummary(`Pipeline complete — ${result.messages.length} messages, avg confidence: ${Math.round((result.summary?.finalConfidence ?? agent.averageConfidence) * 100)}%`);
      setMode("complete");
    } catch {
      setMode("error");
      setSummary("Agent pipeline failed");
    }
  }, [input, agent, fileName, language, code]);

  const handleReset = useCallback(() => {
    agent.reset();
    setMode("idle");
    setSteps([]);
    setSummary(null);
    setSession(null);
  }, [agent]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#e6edf3]">
          <Bot size={14} className="text-green-400" /> Agent Orchestrator
          <AgentBadge mode={mode} />
        </span>
        <div className="flex items-center gap-1">
          {mode === "executing" && (
            <button onClick={() => { agent.abort(); setMode("paused"); }} aria-label="일시정지" className="p-1 hover:bg-[#21262d] rounded"><Pause size={12} className="text-yellow-400" /></button>
          )}
          {(mode === "complete" || mode === "error") && (
            <button onClick={handleReset} aria-label="초기화" className="p-1 hover:bg-[#21262d] rounded"><Square size={12} className="text-[#8b949e]" /></button>
          )}
        </div>
      </div>

      {/* Agent Role Cards */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#30363d] overflow-x-auto">
        {AGENT_ROLES.map((a, i) => (
          <div key={a.role}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[9px] min-w-[60px] transition-all ${
              i === activeAgentIdx && mode === "executing" ? "bg-[#21262d] ring-1 ring-blue-500/30" : "bg-[#010409]"
            }`}>
            <span className={a.color}>{a.label}</span>
            <ConfidenceBar value={confidences[a.role]} />
          </div>
        ))}
      </div>

      {/* Steps Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {mode === "idle" && !session ? (
          <div className="text-center text-[#8b949e] py-8">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-xs mb-2">Agent Orchestrator</p>
            <p className="text-[10px] opacity-60">Describe a task for the 5-agent team to execute.</p>
            <div className="mt-4 space-y-1 text-[10px] text-left max-w-[220px] mx-auto">
              <p className="text-green-400">Examples:</p>
              <p>Refactor this file into modules</p>
              <p>Add error handling to all async calls</p>
              <p>Write unit tests for the API layer</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {steps.map((step) => (
              <StepRow key={step.id} step={step} expanded={expandedSteps.has(step.id)} onToggle={() => toggleStep(step.id)} />
            ))}
            {mode === "complete" && summary && (
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-green-400"><CheckCircle size={12} />{summary}</div>
              </div>
            )}
            {mode === "complete" && applyCandidate && (
              <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-[11px] text-blue-300">
                  Ready to apply {applyCandidate.sourceRole} output
                  {applyCandidate.fileName ? ` from ${applyCandidate.fileName}` : ""}.
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => onApplyCode?.(applyCandidate.code, applyCandidate.fileName)}
                    className="rounded bg-blue-500/15 px-2.5 py-1 text-[10px] text-blue-300 hover:bg-blue-500/25"
                  >
                    Apply to editor
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(applyCandidate.code)}
                    className="rounded bg-[#21262d] px-2.5 py-1 text-[10px] text-[#8b949e] hover:text-[#e6edf3]"
                  >
                    Copy code
                  </button>
                </div>
              </div>
            )}
            {mode === "error" && summary && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-red-400"><XCircle size={12} />{summary}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#30363d] p-2">
        <div className="flex items-center gap-2 bg-[#21262d] rounded-lg px-3 py-2">
          <Bot size={14} className="text-green-400 flex-shrink-0" />
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRun()}
            placeholder="Describe a task for the agents..."
            className="flex-1 bg-transparent text-xs outline-none text-[#e6edf3] placeholder:text-[#8b949e]"
            disabled={agent.running}
          />
          <button onClick={handleRun} disabled={!input.trim() || agent.running}
            className="text-green-400 hover:text-white disabled:opacity-30 transition-colors">
            <Play size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=AgentUI | inputs=Props | outputs=JSX
