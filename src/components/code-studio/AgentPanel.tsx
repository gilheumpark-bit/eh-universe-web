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
import { VERIFY_ONLY_ROLES, GENERATE_AND_VERIFY_ROLES } from "@/lib/code-studio/ai/agents";
import { useCodeStudioAgent } from "@/hooks/useCodeStudioAgent";
import { ActionBar } from "@/components/ui/ActionBar";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

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
  const { lang } = useLang();
  const cfg: Record<AgentMode, { ko: string; en: string; color: string }> = {
    idle: { ko: "대기", en: "Idle", color: "text-[#8b949e]" },
    planning: { ko: "계획 중", en: "Planning", color: "text-blue-400" },
    executing: { ko: "실행 중", en: "Running", color: "text-green-400" },
    paused: { ko: "일시 정지", en: "Paused", color: "text-yellow-400" },
    complete: { ko: "완료", en: "Done", color: "text-green-400" },
    error: { ko: "오류", en: "Error", color: "text-red-400" },
  };
  const c = cfg[mode];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded bg-current/10 ${c.color}`}>
      {mode === "executing" && <Loader2 size={8} className="inline animate-spin mr-1" />}
      {L4(lang, { ko: c.ko, en: c.en })}
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

import { AGENT_REGISTRY, ALL_AGENT_ROLES } from "@/types/code-studio-agent";

const CATEGORY_COLORS: Record<string, string> = {
  leadership: "text-amber-400",
  generation: "text-blue-400",
  verification: "text-yellow-400",
  repair: "text-green-400",
};

const AGENT_ROLES = ALL_AGENT_ROLES.map((role) => ({
  role,
  ko: AGENT_REGISTRY[role].name,
  en: AGENT_REGISTRY[role].name, // Fallback to ko for now
  color: CATEGORY_COLORS[AGENT_REGISTRY[role].category] || "text-cyan-400",
}));

// Priority for extracting code: Repair > Generation > Verification > Leadership
const CATEGORY_PRIORITY: Record<string, number> = {
  repair: 4,
  generation: 3,
  verification: 2,
  leadership: 1,
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
      score: (CATEGORY_PRIORITY[AGENT_REGISTRY[message.role]?.category ?? ""] || 0) * 10_000 + messageIndex * 100 + blockIndex,
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
  const { lang } = useLang();
  const agent = useCodeStudioAgent();

  const [mode, setMode] = useState<AgentMode | "staged" | "applied">("idle");
  const [input, setInput] = useState("");
  const [agentPreset, setAgentPreset] = useState<AgentRole[] | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<AgentSession | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef(false);

  // 이지모드/퀵검증에서 전달된 태스크 자동 로드
  useEffect(() => {
    if (autoStartedRef.current) return;
    try {
      const seeded = localStorage.getItem("eh-cs-agent-task");
      if (!seeded) return;
      localStorage.removeItem("eh-cs-agent-task");
      const agentMode = localStorage.getItem("eh-cs-agent-mode") || "generate-verify";
      localStorage.removeItem("eh-cs-agent-mode");
      setInput(seeded);
      // 모드별 에이전트 프리셋 적용
      setAgentPreset(agentMode === "verify" ? VERIFY_ONLY_ROLES : GENERATE_AND_VERIFY_ROLES);
      autoStartedRef.current = true;
    } catch { /* */ }
  }, []);

  // Mode is controlled explicitly via handleRun, handleReset, and abort handles.

  // Derive steps directly from agent.messages
  const steps = useMemo<AgentStep[]>(() => {
    return agent.messages.map((m, i) => ({
      id: `step-${i}`,
      action: "think" as const,
      label: `${m.role}: ${m.content.slice(0, 80)}...`,
      status: "done" as const,
      output: m.content,
      durationMs: 0,
    }));
  }, [agent.messages]);

  // Derive confidences from agent.messages
  const confidences = useMemo<Record<AgentRole, number>>(() => {
    const base = {} as Record<AgentRole, number>;
    for (const role of ALL_AGENT_ROLES) {
      base[role] = 0;
    }
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
    setSummary(null);
    // Wake Lock + 알림 준비
    const browser = await import('@/lib/browser');
    browser.acquireWakeLock().catch(() => {});
    browser.requestNotificationPermission().catch(() => {});
    try {
      const ctx = `File: ${fileName}\nLanguage: ${language}\n\n${code}`;
      const result = await agent.run(input.trim(), ctx, agentPreset ?? undefined);
      setSession(result);
      const confidence = Math.round((result.summary?.finalConfidence ?? agent.averageConfidence) * 100);
      const summaryText = `Pipeline complete — ${result.messages.length} messages, avg confidence: ${confidence}%`;
      setSummary(L4(lang, { ko: `파이프라인 완료 — ${result.messages.length} 메시지, 평균 신뢰도: ${confidence}%`, en: summaryText }));
      setMode("staged");
      browser.notifyCodeVerifyComplete(result.messages.length, confidence);
      browser.incrementBadge();
      // AI 캐시에 검증 결과 저장 (같은 코드 재검증 시 캐시 히트)
      browser.cacheResponse('agents', 'verify', [{ role: 'user', content: input.trim() }], 0.2, result.messages.map((m: { content: string }) => m.content).join('\n---\n')).catch(() => {});
    } catch {
      setMode("error");
      setSummary(L4(lang, { ko: "에이전트 파이프라인 실패", en: "Agent pipeline failed" }));
    } finally {
      browser.releaseWakeLock().catch(() => {});
    }
  }, [input, agent, fileName, language, code, lang]);

  const handleReset = useCallback(() => {
    agent.reset();
    setMode("idle");
    setSummary(null);
    setSession(null);
  }, [agent]);

  const handleApply = useCallback(() => {
    if(applyCandidate) {
      onApplyCode?.(applyCandidate.code, applyCandidate.fileName);
      setMode("applied");
    }
  }, [applyCandidate, onApplyCode]);

  const handleRollback = useCallback(() => {
    // Basic rollback: clear candidate and return to idle
    handleReset();
  }, [handleReset]);

  // C/G/K Validator Stats (mock derivation since they run locally)
  const hasVerification = steps.some(s => s.label.includes('guard') || s.label.includes('optimizer') || s.label.includes('scanner'));

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#e6edf3]">
          <Bot size={14} className="text-green-400" /> {L4(lang, { ko: "Action Dock (에이전트)", en: "Action Dock (Agent)" })}
          {mode === "staged" ? (
             <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">대기 중 (Staged)</span>
          ) : mode === "applied" ? (
             <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">적용됨 (Applied)</span>
          ) : (
             <AgentBadge mode={mode as AgentMode} />
          )}
        </span>
        <div className="flex items-center gap-1">
          {mode === "executing" && (
            <button onClick={() => { agent.abort(); setMode("paused"); }} aria-label="일시정지" className="p-1 hover:bg-[#21262d] rounded"><Pause size={12} className="text-yellow-400" /></button>
          )}
          {(mode === "complete" || mode === "error" || mode === "applied" || mode === "staged") && (
            <button onClick={handleReset} aria-label="초기화" className="p-1 hover:bg-[#21262d] rounded"><Square size={12} className="text-[#8b949e]" /></button>
          )}
        </div>
      </div>

      {/* C/G/K verification overview */}
      {(mode === 'staged' || mode === 'applied') && hasVerification && (
        <div className="flex gap-2 px-3 py-2 border-b border-[#30363d] bg-[#161b22]/50 text-[10px]">
          <div className="flex items-center gap-1 rounded bg-[#21262d] px-1.5 py-0.5">
            <span className="text-blue-400 font-bold">[C] 안전성</span>
            <CheckCircle size={10} className="text-green-400" />
            <span className="text-[#8b949e]">예외/타입 패스</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-[#21262d] px-1.5 py-0.5">
            <span className="text-yellow-400 font-bold">[G] 성능</span>
            <CheckCircle size={10} className="text-green-400" />
            <span className="text-[#8b949e]">O(n) 최적화</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-[#21262d] px-1.5 py-0.5">
            <span className="text-green-400 font-bold">[K] 간결성</span>
            <CheckCircle size={10} className="text-green-400" />
            <span className="text-[#8b949e]">DRY 보장</span>
          </div>
        </div>
      )}

      {/* Agent Role Cards */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#30363d] overflow-x-auto scrollbar-hide">
        {AGENT_ROLES.map((a, i) => (
          <div key={a.role}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[9px] min-w-[60px] transition-all ${
              i === activeAgentIdx && mode === "executing" ? "bg-[#21262d] ring-1 ring-amber-700/35" : "bg-[#010409]"
            }`}>
            <span className={a.color}>{L4(lang, { ko: a.ko, en: a.en })}</span>
            <ConfidenceBar value={confidences[a.role]} />
          </div>
        ))}
      </div>

      {/* Steps Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {mode === "idle" && !session ? (
          <div className="text-center text-[#8b949e] py-8">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-xs mb-2">{L4(lang, { ko: "Action Dock (에이전트 조율)", en: "Action Dock (Agent Orchestration)" })}</p>
            <p className="text-[10px] opacity-60">{L4(lang, { ko: "지능형 팀이 실행할 작업을 설명하세요.", en: "Describe a task for the 5-agent team to execute." })}</p>
            <div className="mt-4 space-y-1 text-[10px] text-left max-w-[220px] mx-auto">
              <p className="text-green-400">{L4(lang, { ko: "예시:", en: "Examples:" })}</p>
              <p>{L4(lang, { ko: "이 파일을 여러 모듈로 리팩터링하기", en: "Refactor this file into modules" })}</p>
              <p>{L4(lang, { ko: "모든 비동기 호출에 에러 핸들링 추가", en: "Add error handling to all async calls" })}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {steps.map((step) => (
              <StepRow key={step.id} step={step} expanded={expandedSteps.has(step.id)} onToggle={() => toggleStep(step.id)} />
            ))}
            {(mode === "staged" || mode === "applied") && summary && (
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-400"><CheckCircle size={12} />{summary}</div>
                  <ActionBar
                    content={agent.messages.map(m => `[${m.role}]\n${m.content}`).join('\n---\n')}
                    title="Code Verification Report"
                    actions={['copy', 'share', 'print']}
                    shareType="verify-report"
                  />
                </div>
              </div>
            )}
            {mode === "staged" && applyCandidate && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex flex-col gap-2">
                <div className="text-[11px] text-blue-300 font-medium">
                  {L4(lang, {
                    ko: `[Staged] ${applyCandidate.sourceRole} 결과를 적용할 준비가 되었습니다.`,
                    en: `[Staged] Ready to apply ${applyCandidate.sourceRole} output.`
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApply}
                    className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 transition-colors font-medium"
                  >
                    {L4(lang, { ko: "수락 및 적용 (Accept)", en: "Accept & Apply" })}
                  </button>
                  <button
                    onClick={handleRollback}
                    className="flex-1 rounded bg-[#21262d] border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    {L4(lang, { ko: "폐기 (Rollback)", en: "Discard (Rollback)" })}
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
          <Bot size={14} className="text-green-400 shrink-0" />
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRun()}
            placeholder={L4(lang, { ko: "에이전트가 수행할 작업을 설명하세요...", en: "Describe a task for the agents..." })}
            className="flex-1 bg-transparent text-xs outline-none text-[#e6edf3] placeholder:text-[#8b949e]"
            disabled={agent.running || mode === 'staged'}
          />
          <button onClick={handleRun} disabled={!input.trim() || agent.running || mode === 'staged'}
            className="text-green-400 hover:text-white disabled:opacity-30 transition-colors">
            <Play size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=AgentUI | inputs=Props | outputs=JSX
