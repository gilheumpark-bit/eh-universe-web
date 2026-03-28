"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { streamChatWithSlot } from "@/lib/ai-providers";
import { runPipeline } from "@/lib/pipeline";
import type { ChatMsg } from "@/lib/ai-providers";
import type { OpenFile, FileNode } from "@/lib/types";
import type { PipelineContext } from "@/lib/pipeline";
import { getProjectRulesContext } from "@/lib/project-rules";
import { getRelevantContext, updateIndexDebounced, type CodeIndex } from "@/lib/code-indexer";
import { orchestrateTask, type OrchestrationResult } from "@/lib/agent-orchestrator";
import { estimateTokens } from "@/lib/usage-tracker";

/* ── Types ── */

type StepStatus = "pending" | "running" | "done" | "error" | "skipped";
type AgentMode = "idle" | "planning" | "executing" | "paused" | "complete" | "error";

export interface AgentStep {
  id: string;
  action: "plan" | "read" | "edit" | "create" | "delete" | "search" | "run" | "verify" | "think";
  label: string;
  detail?: string;
  fileId?: string;
  fileName?: string;
  status: StepStatus;
  output?: string;
  durationMs?: number;
}

export interface AgentTask {
  id: string;
  prompt: string;
  mode: AgentMode;
  steps: AgentStep[];
  startedAt: number;
  summary?: string;
  /** Estimated remaining time in ms, based on step count and average step duration */
  estimatedRemainingMs?: number;
  /** Total tokens sent to AI across all agent steps */
  totalTokensSent?: number;
  /** Files created by the agent (for rollback on failure) */
  createdFiles?: { name: string; content: string }[];
  /** Files edited by the agent with original content (for rollback on failure) */
  editedFiles?: { name: string; originalContent: string }[];
  /** Timestamp when the task completed or errored */
  completedAt?: number;
}

/* ── Hook ── */

interface UseCSLAgentOptions {
  openFiles: OpenFile[];
  allFiles?: FileNode[];
  onOpenFile?: (name: string, content: string) => void;
  onEditFile?: (id: string, content: string) => void;
}

const AGENT_SYSTEM_PROMPT = `You are CSL Agent — an autonomous AI coding assistant.
You receive a task and must output a JSON execution plan.

Respond ONLY with a JSON array of steps:
[
  { "action": "think", "label": "분석", "detail": "..." },
  { "action": "create", "fileName": "example.ts", "label": "파일 생성", "detail": "..." },
  { "action": "edit", "fileName": "main.ts", "label": "수정", "detail": "..." }
]

Valid actions: think, read, create, edit, delete, search, verify
Each step must have: action, label. Optional: fileName, detail.
Do NOT include any text outside the JSON array.`;

export function useCSLAgent({ openFiles, allFiles, onOpenFile, onEditFile }: UseCSLAgentOptions) {
  const [task, setTask] = useState<AgentTask | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const indexRef = useRef<CodeIndex | null>(null);

  // Auto-update code index when files change
  useEffect(() => {
    if (!allFiles || allFiles.length === 0) return;
    updateIndexDebounced(allFiles, 1000, (index) => {
      indexRef.current = index;
    });
  }, [allFiles]);

  const stopAgent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTask((prev) => prev ? { ...prev, mode: "paused" } : null);
  }, []);

  const resetAgent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTask(null);
  }, []);

  /** Offer to rollback all agent changes on failure */
  const rollbackAgent = useCallback(() => {
    setTask((prev) => {
      if (!prev) return null;
      // Restore edited files to original content
      if (prev.editedFiles && onEditFile) {
        for (const ef of prev.editedFiles) {
          const target = openFiles.find((f) => f.name === ef.name);
          if (target) onEditFile(target.id, ef.originalContent);
        }
      }
      // Note: created files can't be deleted via onEditFile, but we mark them in summary
      const createdCount = prev.createdFiles?.length ?? 0;
      return {
        ...prev,
        mode: "complete" as AgentMode,
        completedAt: Date.now(),
        summary: `롤백 완료: ${prev.editedFiles?.length ?? 0}개 파일 복원${createdCount > 0 ? `, ${createdCount}개 생성 파일은 수동 삭제 필요` : ""}`,
      };
    });
  }, [openFiles, onEditFile]);

  const runAgent = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    abortRef.current = new AbortController();
    const newTask: AgentTask = {
      id: crypto.randomUUID(),
      prompt,
      mode: "planning",
      steps: [],
      startedAt: Date.now(),
      totalTokensSent: 0,
      createdFiles: [],
      editedFiles: [],
    };
    setTask(newTask);

    let cumulativeTokens = 0;

    const update = (partial: Partial<AgentTask>) => {
      setTask((prev) => prev ? { ...prev, ...partial } : null);
    };
    const addStep = (step: AgentStep) => {
      setTask((prev) => prev ? { ...prev, steps: [...prev.steps, step] } : null);
    };
    const updateStep = (id: string, partial: Partial<AgentStep>) => {
      setTask((prev) => prev ? {
        ...prev,
        steps: prev.steps.map((s) => s.id === id ? { ...s, ...partial } : s),
      } : null);
    };

    try {
      // ── Phase 1: AI Planning ──
      const thinkStep: AgentStep = {
        id: crypto.randomUUID(), action: "think", label: "요청 분석 중…", status: "running",
      };
      addStep(thinkStep);

      const fileContext = openFiles.slice(0, 5).map((f) =>
        `[${f.name}] (${f.language}, ${f.content.split("\n").length}줄)`
      ).join("\n");

      // Use code-indexer for relevant context
      let relevantContext = "";
      if (indexRef.current) {
        const indexContext = getRelevantContext(indexRef.current, prompt, 4000);
        if (indexContext) relevantContext = `\n\n관련 코드 컨텍스트:\n${indexContext}`;
      }

      let planJson = "";
      const planMessages: ChatMsg[] = [{
        role: "user",
        content: `현재 열린 파일:\n${fileContext}${relevantContext}\n\n작업 요청: ${prompt}`,
      }];

      // Inject project rules into system prompt
      const projectRules = allFiles ? getProjectRulesContext(allFiles) : "";
      const fullSystemPrompt = [AGENT_SYSTEM_PROMPT, projectRules]
        .filter(Boolean)
        .join("\n\n");

      await streamChatWithSlot('power', {
        systemInstruction: fullSystemPrompt,
        messages: planMessages,
        temperature: 0.3,
        signal: abortRef.current.signal,
        onChunk: (chunk) => { planJson += chunk; },
      });

      // Track tokens for planning step
      cumulativeTokens += estimateTokens(planMessages[0].content) + estimateTokens(planJson);
      update({ totalTokensSent: cumulativeTokens });

      updateStep(thinkStep.id, { status: "done", output: planJson.slice(0, 200), durationMs: Date.now() - newTask.startedAt });

      // Parse plan
      let steps: { action: string; label: string; fileName?: string; detail?: string }[] = [];
      try {
        const match = planJson.match(/\[[\s\S]*\]/);
        if (match) steps = JSON.parse(match[0]);
      } catch {
        steps = [{ action: "create", label: "코드 생성", fileName: "generated.ts", detail: prompt }];
      }

      // ── Phase 2: Execution ──
      update({ mode: "executing" });

      // Step deduplication: skip duplicate (same action + same file)
      const seenStepKeys = new Set<string>();
      const completedStepDurations: number[] = [];

      // Helper: check if a step depends on another step's output (edits to created files, etc.)
      const getStepDependency = (s: typeof steps[0]) =>
        (s.action === "edit" && s.fileName) ? `create:${s.fileName}` : null;

      // Helper: execute a single step
      const executeStep = async (planned: typeof steps[0]) => {
        const dedupeKey = `${planned.action}:${planned.fileName ?? ""}`;
        if (seenStepKeys.has(dedupeKey)) return;
        seenStepKeys.add(dedupeKey);

        const stepId = crypto.randomUUID();
        const step: AgentStep = {
          id: stepId,
          action: planned.action as AgentStep["action"],
          label: planned.label,
          fileName: planned.fileName,
          status: "running",
        };
        addStep(step);
        const stepStart = performance.now();

        if (planned.action === "think" || planned.action === "read") {
          const target = openFiles.find((f) => f.name === planned.fileName);
          updateStep(stepId, {
            status: "done",
            output: target ? target.content.slice(0, 500) : planned.detail ?? "분석 완료",
            durationMs: Math.round(performance.now() - stepStart),
          });
          return;
        }

        if (planned.action === "create" || planned.action === "edit") {
          let generated = "";
          const genMessages: ChatMsg[] = [{
            role: "user",
            content: planned.action === "edit" && planned.fileName
              ? `파일 "${planned.fileName}" 수정:\n${openFiles.find((f) => f.name === planned.fileName)?.content?.slice(0, 2000) ?? ""}\n\n요청: ${planned.detail ?? prompt}\n\n수정된 전체 코드만 출력하세요. 설명 없이 코드만.`
              : `다음 파일을 생성하세요: ${planned.fileName ?? "generated.ts"}\n요청: ${planned.detail ?? prompt}\n\n코드만 출력하세요. 마크다운 코드블록 없이 순수 코드만.`,
          }];

          await streamChatWithSlot('power', {
            systemInstruction: "You are a code generator. Output ONLY code, no explanations, no markdown fences.",
            messages: genMessages,
            temperature: 0.4,
            signal: abortRef.current!.signal,
            onChunk: (chunk) => {
              generated += chunk;
              updateStep(stepId, { output: generated });
            },
          });

          const cleaned = generated.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();

          cumulativeTokens += estimateTokens(genMessages[0].content) + estimateTokens(generated);
          update({ totalTokensSent: cumulativeTokens });

          if (planned.action === "create" && planned.fileName && onOpenFile) {
            onOpenFile(planned.fileName, cleaned);
            setTask((prev) => prev ? { ...prev, createdFiles: [...(prev.createdFiles ?? []), { name: planned.fileName!, content: cleaned }] } : null);
          } else if (planned.action === "edit" && planned.fileName && onEditFile) {
            const target = openFiles.find((f) => f.name === planned.fileName);
            if (target) {
              setTask((prev) => prev ? { ...prev, editedFiles: [...(prev.editedFiles ?? []), { name: target.name, originalContent: target.content }] } : null);
              onEditFile(target.id, cleaned);
            }
          }

          const stepDuration = Math.round(performance.now() - stepStart);
          completedStepDurations.push(stepDuration);
          updateStep(stepId, {
            status: "done",
            output: cleaned.slice(0, 300) + (cleaned.length > 300 ? "…" : ""),
            durationMs: stepDuration,
          });
          return;
        }

        updateStep(stepId, {
          status: "done",
          output: planned.detail ?? "완료",
          durationMs: Math.round(performance.now() - stepStart),
        });
      };

      // Group independent create steps for parallel execution; sequential for dependent ones
      let stepIndex = 0;
      while (stepIndex < steps.length) {
        if (abortRef.current?.signal.aborted) break;

        // Progress estimation
        const avgDuration = completedStepDurations.length > 0
          ? completedStepDurations.reduce((a, b) => a + b, 0) / completedStepDurations.length
          : 3000;
        const remainingSteps = steps.length - stepIndex;
        update({ estimatedRemainingMs: Math.round(avgDuration * remainingSteps) });

        const current = steps[stepIndex];
        const _dep = getStepDependency(current);

        // Collect a batch of independent create steps (no dependencies on each other)
        if (current.action === "create") {
          const batch = [current];
          let j = stepIndex + 1;
          while (j < steps.length) {
            const next = steps[j];
            const nextDep = getStepDependency(next);
            // Only batch independent creates that don't depend on any file being created in this batch
            if (next.action === "create" && !nextDep && !batch.some(b => b.fileName === next.fileName)) {
              batch.push(next);
              j++;
            } else {
              break;
            }
          }

          if (batch.length > 1) {
            // Execute independent creates in parallel
            await Promise.all(batch.map(s => executeStep(s)));
            stepIndex = j;
            continue;
          }
        }

        // Sequential execution for dependent or non-batchable steps
        await executeStep(current);
        stepIndex++;
      }

      // ── Phase 3: Verify via Pipeline ──
      const verifyId = crypto.randomUUID();
      addStep({ id: verifyId, action: "verify", label: "파이프라인 검증", status: "running" });

      const targetFile = openFiles[0];
      if (targetFile) {
        const ctx: PipelineContext = {
          code: targetFile.content,
          language: targetFile.language,
          fileName: targetFile.name,
          intent: prompt,
          usageIntent: "default",
        };
        const result = await runPipeline(ctx);
        updateStep(verifyId, {
          status: result.overallStatus === "fail" ? "error" : "done",
          output: `${result.overallScore}/100 (${result.overallStatus.toUpperCase()})`,
          durationMs: Math.round(performance.now() - newTask.startedAt),
        });
      } else {
        updateStep(verifyId, { status: "done", output: "검증 대상 파일 없음", durationMs: 0 });
      }

      update({
        mode: "complete",
        completedAt: Date.now(),
        summary: `작업 완료: ${steps.length + 2}개 단계 실행됨`,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        update({ mode: "paused" });
      } else {
        // Offer rollback on failure if agent made changes
        update({
          mode: "error",
          completedAt: Date.now(),
          summary: `오류: ${(err as Error).message}. 에이전트가 변경한 파일이 있다면 롤백할 수 있습니다.`,
          estimatedRemainingMs: 0,
        });
      }
    } finally {
      abortRef.current = null;
    }
  }, [openFiles, allFiles, onOpenFile, onEditFile]);

  // Orchestration mode: uses multi-agent feedback loop (coder -> reviewer -> rewrite)
  const runOrchestration = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    abortRef.current = new AbortController();
    const newTask: AgentTask = {
      id: crypto.randomUUID(),
      prompt,
      mode: "planning",
      steps: [],
      startedAt: Date.now(),
    };
    setTask(newTask);

    try {
      setTask((prev) => prev ? { ...prev, mode: "executing" } : null);
      const result: OrchestrationResult = await orchestrateTask(
        prompt,
        { maxIterations: 3, requiredApprovals: 1, autoFixOnReject: true },
        abortRef.current.signal,
        (msg) => {
          setTask((prev) => prev ? {
            ...prev,
            steps: [...prev.steps, {
              id: crypto.randomUUID(),
              action: msg.type === "code" ? "create" : msg.type === "review" ? "verify" : "think",
              label: `[${msg.from}] ${msg.type}`,
              detail: msg.content.slice(0, 200),
              status: "done",
            }],
          } : null);
        },
      );

      if (result.finalCode && onOpenFile) {
        onOpenFile("orchestrated.ts", result.finalCode);
      }

      setTask((prev) => prev ? {
        ...prev,
        mode: "complete",
        completedAt: Date.now(),
        summary: `오케스트레이션 완료: ${result.iterations}회 반복, ${result.approved ? "승인됨" : "미승인"}`,
      } : null);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setTask((prev) => prev ? { ...prev, mode: "paused" } : null);
      } else {
        setTask((prev) => prev ? { ...prev, mode: "error", completedAt: Date.now(), summary: `오류: ${(err as Error).message}` } : null);
      }
    } finally {
      abortRef.current = null;
    }
  }, [onOpenFile]);

  return { task, runAgent, stopAgent, resetAgent, rollbackAgent, runOrchestration };
}
