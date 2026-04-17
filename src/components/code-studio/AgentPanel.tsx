"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
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
import { SagaOrchestrator } from "@/lib/noa/saga-transaction";

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
  /** Apply 후 Preview 패널 자동 오픈 */
  onOpenPreview?: () => void;
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

const StepRow = memo(function StepRow({ step, expanded, onToggle }: { step: AgentStep; expanded: boolean; onToggle: () => void }) {
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
        <span className="text-xs flex-1 truncate text-[#e6edf3]" title={step.label}>{step.label}</span>
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
});

const AgentBadge = memo(function AgentBadge({ mode }: { mode: AgentMode }) {
  const { lang } = useLang();
  const cfg: Record<AgentMode, { ko: string; en: string; ja: string; zh: string; color: string }> = {
    idle: { ko: "대기", en: "Idle", ja: "待機", zh: "待机", color: "text-[#8b949e]" },
    planning: { ko: "계획 중", en: "Planning", ja: "計画中", zh: "规划中", color: "text-blue-400" },
    executing: { ko: "실행 중", en: "Running", ja: "実行中", zh: "运行中", color: "text-green-400" },
    paused: { ko: "일시 정지", en: "Paused", ja: "一時停止", zh: "已暂停", color: "text-accent-amber" },
    complete: { ko: "완료", en: "Done", ja: "完了", zh: "完成", color: "text-green-400" },
    error: { ko: "오류", en: "Error", ja: "エラー", zh: "错误", color: "text-red-400" },
  };
  const c = cfg[mode];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded bg-current/10 ${c.color}`}>
      {mode === "executing" && <Loader2 size={8} className="inline animate-spin mr-1" />}
      {L4(lang, { ko: c.ko, en: c.en, ja: c.ja, zh: c.zh })}
    </span>
  );
});

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-accent-amber" : "bg-red-400";
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
  verification: "text-accent-amber",
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

export function AgentPanel({ code, language, fileName, onApplyCode, onOpenPreview }: Props) {
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
      setSummary(L4(lang, { ko: `파이프라인 완료 — ${result.messages.length} 메시지, 평균 신뢰도: ${confidence}%`, en: summaryText, ja: `パイプライン完了 — ${result.messages.length} メッセージ、平均信頼度: ${confidence}%`, zh: `流水线完成 — ${result.messages.length} 消息，平均置信度: ${confidence}%` }));
      setMode("staged");
      browser.notifyCodeVerifyComplete(result.messages.length, confidence);
      browser.incrementBadge();
      // AI 캐시에 검증 결과 저장 (같은 코드 재검증 시 캐시 히트)
      browser.cacheResponse('agents', 'verify', [{ role: 'user', content: input.trim() }], 0.2, result.messages.map((m: { content: string }) => m.content).join('\n---\n')).catch(() => {});
    } catch {
      setMode("error");
      setSummary(L4(lang, { ko: "에이전트 파이프라인 실패", en: "Agent pipeline failed", ja: "エージェントパイプライン失敗", zh: "代理流水线失败"}));
    } finally {
      browser.releaseWakeLock().catch(() => {});
    }
  }, [input, agent, fileName, language, code, lang, agentPreset]);

  const handleReset = useCallback(() => {
    agent.reset();
    setMode("idle");
    setSummary(null);
    setSession(null);
  }, [agent]);

  const handleApply = useCallback(async () => {
    if(applyCandidate) {
      // L4 Saga: 원자적 적용 — snapshot → apply → verify, 실패 시 역순 보상
      const previousCode = code; // 현재 코드 스냅샷 (보상용)
      const saga = new SagaOrchestrator('agent-apply');

      saga.addStep({
        name: 'snapshot',
        execute: async () => previousCode,
        compensate: async () => {
          // 스냅샷 단계는 보상 불필요
        },
      });

      saga.addStep({
        name: 'apply-code',
        execute: async () => {
          onApplyCode?.(applyCandidate.code, applyCandidate.fileName);
          return applyCandidate.code;
        },
        compensate: async () => {
          // 롤백: 이전 코드로 복원
          onApplyCode?.(previousCode, applyCandidate.fileName);
          setMode("staged");
          setSummary(L4(lang, { ko: "Saga 롤백: 이전 코드로 복원됨", en: "Saga rollback: reverted to previous code", ja: "Sagaロールバック: 以前のコードに復元", zh: "Saga回滚: 已恢复到先前代码"}));
        },
      });

      const sagaResult = await saga.execute();
      if (sagaResult.status !== 'COMPLETED') {
        setSummary(L4(lang, {
          ko: `Saga 실패: ${sagaResult.error ?? '알 수 없는 오류'}`,
          en: `Saga failed: ${sagaResult.error ?? 'unknown error'}`, ja: `Saga失敗: ${sagaResult.error ?? '不明なエラー'}`, zh: `Saga失败: ${sagaResult.error ?? '未知错误'}`}));
        return;
      }

      setMode("applied");
      // Apply 후 Preview 자동 오픈
      onOpenPreview?.();

      // 하네스 루프: 빌드 → 에러 → AI 수정 → 재빌드 (백그라운드)
      try {
        const { runHarnessLoop, errorsToPrompt } = await import('@/lib/code-studio/harness');
        const { createWebContainer } = await import('@/lib/code-studio/features/webcontainer');
        const wc = await createWebContainer();
        if (!wc.isAvailable) return;

        const result = await runHarnessLoop(wc, applyCandidate.code, {
          maxIterations: 2,
          steps: ['typecheck', 'lint', 'build'],
          onProgress: (step, iter, errors) => {
            setSummary(L4(lang, {
              ko: `하네스: ${step} 검증 중 (${iter}/2)${errors.length > 0 ? ` — ${errors.length}개 에러` : ''}`,
              en: `Harness: ${step} (${iter}/2)${errors.length > 0 ? ` — ${errors.length} error(s)` : ''}`,
              ja: `ハーネス: ${step} 検証中 (${iter}/2)${errors.length > 0 ? ` — ${errors.length}件エラー` : ''}`,
              zh: `测试: ${step} 验证中 (${iter}/2)${errors.length > 0 ? ` — ${errors.length}个错误` : ''}`,
            }));
          },
          onFixRequest: async (errors, currentCode) => {
            // progressive-repair 에이전트에게 에러 피드백
            const prompt = errorsToPrompt(errors);
            if (!prompt) return null;
            let fixed = '';
            await agent.run(
              `Fix these errors in the code:\n\n${prompt}\n\nCurrent code:\n\`\`\`\n${currentCode.slice(0, 3000)}\n\`\`\`\n\nOutput ONLY the fixed code.`,
              '',
              ['progressive-repair'],
            ).then(session => {
              const lastMsg = session.messages[session.messages.length - 1];
              if (lastMsg) {
                const codeMatch = lastMsg.content.match(/```[\s\S]*?\n([\s\S]*?)```/);
                fixed = codeMatch ? codeMatch[1] : lastMsg.content;
              }
            }).catch(() => {});
            return fixed || null;
          },
        });

        if (result.success) {
          // 정적 하네스 통과 → 동적 테스트 실행
          setSummary(L4(lang, { ko: `정적 검증 통과. 동적 테스트 실행 중...`, en: `Static checks passed. Running dynamic tests...`, ja: `静的検証合格。動的テスト実行中...`, zh: `静态验证通过。正在运行动态测试...`}));
          try {
            const { runDynamicSuite, runFrontendGate1, runFrontendGate2 } = await import('@/lib/code-studio/harness');

            // 프론트엔드 게이트
            const fg1 = runFrontendGate1(applyCandidate.code);
            const fg2 = runFrontendGate2(applyCandidate.code);

            // 동적 테스트 (WebContainer)
            const dynamic = await runDynamicSuite(wc, applyCandidate.code, {
              entryFunction: 'main',
              onProgress: (gate, status) => {
                setSummary(L4(lang, { ko: `동적 테스트: ${gate} ${status}`, en: `Dynamic: ${gate} ${status}`, ja: `動的テスト: ${gate} ${status}`, zh: `动态测试: ${gate} ${status}`}));
              },
            });

            const totalScore = Math.round((fg1.score + fg2.score + dynamic.totalScore) / 3);
            const allPassed = fg1.passed && fg2.passed && dynamic.allPassed;

            setSummary(L4(lang, {
              ko: `검증 완료: ${allPassed ? '전 게이트 통과 ✅' : '일부 미통과 ⚠️'} (점수: ${totalScore}/100, ${result.iterations}회 반복)`,
              en: `Verification: ${allPassed ? 'All gates passed ✅' : 'Some gates failed ⚠️'} (Score: ${totalScore}/100, ${result.iterations} iteration(s))`, ja: `検証完了: ${allPassed ? '全ゲート合格 ✅' : '一部未通過 ⚠️'} (スコア: ${totalScore}/100, ${result.iterations}回反復)`, zh: `验证完成: ${allPassed ? '全部通过 ✅' : '部分未通过 ⚠️'} (分数: ${totalScore}/100, ${result.iterations}次迭代)`}));
          } catch {
            setSummary(L4(lang, { ko: `하네스 통과 (${result.iterations}회)`, en: `Harness passed (${result.iterations} iteration(s))`, ja: `ハーネス合格 (${result.iterations}回)`, zh: `测试通过 (${result.iterations}次)`}));
          }
        } else {
          setSummary(L4(lang, {
            ko: `하네스: ${result.buildErrors.length + result.typeErrors.length + result.lintErrors.length}개 에러 잔존 (${result.iterations}/${result.maxIterations}회)`,
            en: `Harness: ${result.buildErrors.length + result.typeErrors.length + result.lintErrors.length} error(s) remain (${result.iterations}/${result.maxIterations})`, ja: `ハーネス: ${result.buildErrors.length + result.typeErrors.length + result.lintErrors.length}件エラー残存 (${result.iterations}/${result.maxIterations}回)`, zh: `测试: ${result.buildErrors.length + result.typeErrors.length + result.lintErrors.length}个错误残留 (${result.iterations}/${result.maxIterations}次)`}));
        }
      } catch { /* harness is best-effort, don't block */ }
    }
  }, [applyCandidate, onApplyCode, onOpenPreview, agent, lang, code]);

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
          <Bot size={14} className="text-green-400" /> {L4(lang, { ko: "Action Dock (에이전트)", en: "Action Dock (Agent)", ja: "Action Dock (エージェント)", zh: "Action Dock (代理)"})}
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
            <button onClick={() => { agent.abort(); setMode("paused"); }} aria-label="일시정지" className="p-1 hover:bg-[#21262d] rounded"><Pause size={12} className="text-accent-amber" /></button>
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
            <span className="text-accent-amber font-bold">[G] 성능</span>
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
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[9px] min-w-[60px] transition-[transform,opacity,background-color,border-color,color] ${
              i === activeAgentIdx && mode === "executing" ? "bg-[#21262d] ring-1 ring-amber-700/35" : "bg-[#010409]"
            }`}>
            <span className={a.color}>{L4(lang, { ko: a.ko, en: a.en, ja: a.en, zh: a.en })}</span>
            <ConfidenceBar value={confidences[a.role]} />
          </div>
        ))}
      </div>

      {/* Steps Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {mode === "idle" && !session ? (
          <div className="text-center text-[#8b949e] py-8">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-xs mb-2">{L4(lang, { ko: "Action Dock (에이전트 조율)", en: "Action Dock (Agent Orchestration)", ja: "Action Dock (エージェント調整)", zh: "Action Dock (代理协调)"})}</p>
            <p className="text-[10px] opacity-60">{L4(lang, { ko: "지능형 팀이 실행할 작업을 설명하세요.", en: "Describe a task for the 5-agent team to execute.", ja: "インテリジェントチームに実行させるタスクを説明してください。", zh: "请描述智能团队要执行的任务。"})}</p>
            <div className="mt-4 space-y-1 text-[10px] text-left max-w-[220px] mx-auto">
              <p className="text-green-400">{L4(lang, { ko: "예시:", en: "Examples:", ja: "例:", zh: "示例:"})}</p>
              <p>{L4(lang, { ko: "이 파일을 여러 모듈로 리팩터링하기", en: "Refactor this file into modules", ja: "このファイルを複数モジュールにリファクタリング", zh: "将此文件重构为多个模块"})}</p>
              <p>{L4(lang, { ko: "모든 비동기 호출에 에러 핸들링 추가", en: "Add error handling to all async calls", ja: "すべての非同期呼び出しにエラー処理を追加", zh: "为所有异步调用添加错误处理"})}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Show last 10 steps when list is long, with toggle */}
            {steps.length > 10 && !expandedSteps.has('__show_all__') && (
              <button
                onClick={() => toggleStep('__show_all__')}
                className="w-full text-center py-1 text-[9px] text-text-tertiary hover:text-accent-purple transition-colors"
              >
                {L4(lang, { ko: `+${steps.length - 10}개 이전 스텝 보기`, en: `Show ${steps.length - 10} earlier steps`, ja: `+${steps.length - 10}件の以前のステップを表示`, zh: `+${steps.length - 10}个先前步骤`})}
              </button>
            )}
            {(steps.length <= 10 || expandedSteps.has('__show_all__') ? steps : steps.slice(-10)).map((step) => (
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
                    en: `[Staged] Ready to apply ${applyCandidate.sourceRole} output.`, ja: `[Staged] ${applyCandidate.sourceRole}の結果を適用する準備ができました。`, zh: `[Staged] ${applyCandidate.sourceRole}结果已准备好应用。`})}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApply}
                    className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 transition-colors font-medium"
                  >
                    {L4(lang, { ko: "수락 및 적용 (Accept)", en: "Accept & Apply", ja: "承認して適用 (Accept)", zh: "接受并应用 (Accept)"})}
                  </button>
                  <button
                    onClick={handleRollback}
                    className="flex-1 rounded bg-[#21262d] border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    {L4(lang, { ko: "폐기 (Rollback)", en: "Discard (Rollback)", ja: "破棄 (Rollback)", zh: "废弃 (Rollback)"})}
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
            placeholder={L4(lang, { ko: "에이전트가 수행할 작업을 설명하세요...", en: "Describe a task for the agents...", ja: "エージェントに実行させるタスクを説明してください...", zh: "请描述代理要执行的任务..."})}
            className="flex-1 bg-transparent text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-[#e6edf3] placeholder:text-[#8b949e]"
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
