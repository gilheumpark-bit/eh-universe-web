"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { throttle } from "@/lib/speed-optimizations";
import { streamChat, getActiveProvider, PROVIDERS } from "@/lib/ai-providers";
import { searchCodebase, formatSearchContext } from "@/lib/codebase-search";
import { runPipeline } from "@/lib/pipeline";
import { createHFCPState, buildTurnSignal, updateScore, getVerdictPromptModifier, getResponseConfig, type HFCPState } from "@/lib/hfcp";
import { checkCodeSafety, formatSafetyWarning } from "@/lib/hfcp/safety-gate";
import { runNoa } from "@/lib/noa";
import { parseMentionsAsync } from "@/lib/mentions";
import { getRelevantContext, updateIndexDebounced, type CodeIndex } from "@/lib/code-indexer";
import { getProjectRulesContext } from "@/lib/project-rules";
import { saveChatSession, generateSessionTitle, type ChatSession } from "@/lib/chat-history";
import { notifyError } from "@/lib/notifications";
import { createChatTree, forkBranch, getActiveBranch, switchBranch, type ChatTree } from "@/lib/chat-fork";
import { estimateTokens } from "@/lib/usage-tracker";
import type { PipelineContext } from "@/lib/pipeline";
import type { ChatMsg } from "@/lib/ai-providers";
import type { ChatMessage, OpenFile, FileNode, PipelineResult } from "@/lib/types";

const CSL_SYSTEM_PROMPT = `You are CSL (CodeSentinel™) — an elite AI coding assistant with an 8-team governance pipeline.

Your capabilities:
1. Code generation with quality validation
2. Code review and bug detection
3. Refactoring suggestions
4. Architecture advice
5. 8-team pipeline analysis (Simulation, Generation, Validation, Size/Density, Asset Trace, Stability, Release/IP, Governance)

Rules:
- When generating code, wrap it in markdown code blocks with the correct language tag.
- Always explain what changed and why.
- If you find issues, list them with severity (CRITICAL/MAJOR/MINOR).
- Respond in the same language the user uses.
- Be concise but thorough.
- When the user provides @file or @folder context, reference those files in your response.`;

interface UseCSLChatOptions {
  activeFile: OpenFile | null;
  allFiles?: FileNode[];
  editorSelection?: string;
  onSuggestion: (original: string, modified: string) => void;
  onPipelineRun: (result: PipelineResult) => void;
}

export function useCSLChat({ activeFile, allFiles, editorSelection, onSuggestion, onPipelineRun }: UseCSLChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "CSL IDE에 오신 걸 환영합니다! 코드 생성, 리뷰, 버그 수정을 요청하세요.\n\n**빠른 명령:**\n- `/generate` — 코드 생성\n- `/review` — 현재 파일 리뷰\n- `/fix` — 버그 수정\n- `/pipeline` — 8팀 파이프라인 실행\n- `@file:이름` — 파일 컨텍스트 추가\n- `@folder:경로` — 폴더 컨텍스트 추가",
      timestamp: Date.now(),
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hfcpRef = useRef<HFCPState>(createHFCPState("CODE"));
  const indexRef = useRef<CodeIndex | null>(null);
  const chatTreeRef = useRef<ChatTree>(createChatTree());
  const lastUserMessageRef = useRef<string>("");

  // ── Context window warning ──
  const checkContextWindow = useCallback((inputText: string): { warn: boolean; usage: number } => {
    const providerId = getActiveProvider();
    const provider = PROVIDERS[providerId];
    const maxTokens = provider.capabilities.maxContextTokens;
    const totalHistory = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const inputTokens = estimateTokens(inputText);
    const totalUsage = totalHistory + inputTokens;
    const ratio = totalUsage / maxTokens;
    return { warn: ratio >= 0.8, usage: Math.round(ratio * 100) };
  }, [messages]);

  // ── Retry last user message ──
  const retryMessage = useCallback(() => {
    const lastUserMsg = lastUserMessageRef.current;
    if (!lastUserMsg || isGenerating) return;
    // Remove the last assistant response so we can re-send
    setMessages((prev) => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].role === "assistant") {
        return prev.slice(0, lastIdx);
      }
      return prev;
    });
    // Re-send after state update
    setTimeout(() => sendMessage(lastUserMsg), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating]);

  // Fork the current conversation at a given message index
  const forkConversation = useCallback((atMessageIndex: number, label?: string) => {
    chatTreeRef.current = forkBranch(chatTreeRef.current, atMessageIndex, label);
    const branch = getActiveBranch(chatTreeRef.current);
    setMessages(branch.messages.length > 0 ? branch.messages : [messages[0]]);
  }, [messages]);

  // Switch to a different branch
  const switchChatBranch = useCallback((branchId: string) => {
    chatTreeRef.current = switchBranch(chatTreeRef.current, branchId);
    const branch = getActiveBranch(chatTreeRef.current);
    setMessages(branch.messages);
  }, []);

  // Auto-update code index when files change
  useEffect(() => {
    if (!allFiles || allFiles.length === 0) return;
    updateIndexDebounced(allFiles, 1000, (index) => {
      indexRef.current = index;
    });
  }, [allFiles]);

  // Auto-save chat history (debounced)
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (messages.length <= 1) return; // skip welcome-only
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const session: ChatSession = {
        id: sessionIdRef.current,
        title: generateSessionTitle(messages),
        messages,
        createdAt: messages[0]?.timestamp ?? Date.now(),
        updatedAt: Date.now(),
      };
      saveChatSession(session).catch(() => {});
    }, 2000);
  }, [messages]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    // NOA Security Framework — 7-Layer Defense
    const noaResult = await runNoa({ text: trimmed, domain: "code" });
    if (!noaResult.allowed) {
      const blockMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `🛡️ **NOA 보안 차단**\n\n경로: \`${noaResult.tactical.selectedPath}\`\n사유: ${noaResult.tactical.reason}\n등급: ${noaResult.judgment?.grade.label ?? "N/A"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: Date.now() }, blockMsg]);
      return;
    }
    const sanitizedInput = noaResult.sanitizedText;

    // Safety Gate check (HCRF) — uses NOA-sanitized text
    const safetyResult = checkCodeSafety(sanitizedInput);
    if (safetyResult.verdict === "REJECT") {
      const warningMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: formatSafetyWarning(safetyResult),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: Date.now() }, warningMsg]);
      return;
    }
    if (safetyResult.verdict === "HOLD") {
      const holdMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: formatSafetyWarning(safetyResult),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: Date.now() }, holdMsg]);
      return;
    }

    // HFCP engagement scoring
    const turnSignal = buildTurnSignal(trimmed);
    const { verdict } = updateScore(hfcpRef.current, turnSignal);
    const verdictModifier = getVerdictPromptModifier(verdict);
    const responseConfig = getResponseConfig(verdict);

    // Store for retry
    lastUserMessageRef.current = trimmed;

    // Context window warning — alert user if approaching limit
    const { warn: contextWarn, usage: contextUsage } = checkContextWindow(trimmed);
    if (contextWarn) {
      const warnMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `\u26a0\ufe0f **컨텍스트 창 경고**: 현재 사용량이 약 ${contextUsage}%입니다. 대화가 길어지면 이전 메시지가 잘릴 수 있습니다. 새 대화를 시작하는 것을 권장합니다.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, warnMsg]);
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
      tokenUsage: { inputTokens: estimateTokens(trimmed), outputTokens: 0 },
    };
    setMessages((prev) => [...prev, userMsg]);

    // ── @mentions 파싱 + 컨텍스트 구축 ──
    const currentSelection = editorSelection || undefined;
    const parsed = allFiles
      ? await parseMentionsAsync(sanitizedInput, allFiles, currentSelection)
      : { cleanedText: sanitizedInput, mentions: [], contextPrefix: "" };

    let contextPrefix = "";

    // 1) @mentions 컨텍스트 (최우선)
    if (parsed.contextPrefix) {
      contextPrefix += parsed.contextPrefix + "\n\n";
    }

    // 2) 코드 인덱싱 기반 자동 컨텍스트 (mentions가 없을 때)
    if (parsed.mentions.length === 0 && indexRef.current) {
      const indexContext = getRelevantContext(indexRef.current, parsed.cleanedText, 3000);
      if (indexContext) {
        contextPrefix += indexContext + "\n\n";
      }
    }

    // 3) 현재 열린 파일 컨텍스트
    if (activeFile) {
      contextPrefix += `[현재 파일: ${activeFile.name} (${activeFile.language})]\n\`\`\`${activeFile.language}\n${activeFile.content.slice(0, 3000)}\n\`\`\`\n\n`;
    }

    // 4) 레거시 @codebase 검색 (하위호환)
    const codebaseMatch = parsed.cleanedText.match(/@codebase\s+(.+)/i);
    if (codebaseMatch && allFiles) {
      const query = codebaseMatch[1];
      const results = searchCodebase(query, allFiles);
      const searchCtx = formatSearchContext(results, allFiles);
      if (searchCtx) contextPrefix += searchCtx + "\n\n";
    }

    // 5) Fuzzy filename fallback — when no @mentions and code-indexer found nothing useful
    if (parsed.mentions.length === 0 && !contextPrefix.includes("관련 코드") && allFiles) {
      const words = parsed.cleanedText.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const flatNames: { name: string; content: string }[] = [];
      const collectNames = (nodes: FileNode[], prefix = "") => {
        for (const n of nodes) {
          const p = prefix ? `${prefix}/${n.name}` : n.name;
          if (n.type === "file" && n.content) flatNames.push({ name: p, content: n.content });
          if (n.children) collectNames(n.children, p);
        }
      };
      collectNames(allFiles);
      const fuzzyMatches = flatNames.filter((f) =>
        words.some((w) => f.name.toLowerCase().includes(w))
      ).slice(0, 3);
      if (fuzzyMatches.length > 0) {
        const fuzzyCtx = fuzzyMatches.map((f) => `[${f.name}]\n${f.content.slice(0, 1500)}`).join("\n\n");
        contextPrefix += `[퍼지 매칭 파일]\n${fuzzyCtx}\n\n`;
      }
    }

    // ── 명령어 처리 ──
    let effectiveMessage = parsed.cleanedText;

    // /review command
    if (effectiveMessage.startsWith("/review") && activeFile) {
      const pCtx: PipelineContext = { code: activeFile.content, language: activeFile.language, fileName: activeFile.name, intent: "review", usageIntent: "default" };
      const pResult = await runPipeline(pCtx);
      const summary = pResult.stages.map((s) => `${s.team}: ${s.status} (${s.score}) — ${s.message}`).join("\n");
      effectiveMessage = `다음 파이프라인 결과를 기반으로 "${activeFile.name}" 코드를 리뷰하세요:\n${summary}\n\n구체적 개선 방안을 제시하세요.`;
    }

    // /fix command
    if (effectiveMessage.startsWith("/fix") && activeFile) {
      const pCtx: PipelineContext = { code: activeFile.content, language: activeFile.language, fileName: activeFile.name, intent: "repair", usageIntent: "default" };
      const pResult = await runPipeline(pCtx);
      const allFindings = pResult.stages.flatMap((s) => s.findings);
      if (allFindings.length > 0) {
        const findingsList = allFindings.map((f) => `- [${f.severity}] ${f.message}${f.line ? ` (L${f.line})` : ""}`).join("\n");
        effectiveMessage = `다음 문제들을 수정한 전체 코드를 출력하세요:\n${findingsList}\n\n수정된 코드만 출력. 설명은 코드 뒤에 간략히.`;
      }
    }

    // /generate command
    if (effectiveMessage.startsWith("/generate ")) {
      effectiveMessage = `다음 요청에 맞는 코드를 생성하세요: ${effectiveMessage.slice(10)}`;
    }

    setIsGenerating(true);
    abortRef.current = new AbortController();

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
    ]);

    try {
      const chatHistory: ChatMsg[] = messages
        .filter((m) => m.role !== "system")
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      chatHistory.push({ role: "user", content: contextPrefix + effectiveMessage });

      let accumulated = "";
      const streamingContentRef_ = { current: "" };
      let fenceCount = 0;

      // Throttled UI update: batch streaming updates to max once per 50ms
      const flushStreamToUI = throttle(() => {
        const content = streamingContentRef_.current;
        const isStreamingCode = fenceCount % 2 === 1;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content, isStreamingCode } : m)),
        );
      }, 50);

      // Inject .cslrules / .cursorrules into system prompt
      const projectRules = allFiles ? getProjectRulesContext(allFiles) : "";
      const fullSystemPrompt = [CSL_SYSTEM_PROMPT, verdictModifier, projectRules]
        .filter(Boolean)
        .join("\n\n");

      await streamChat({
        systemInstruction: fullSystemPrompt,
        messages: chatHistory,
        temperature: responseConfig.temperature,
        signal: abortRef.current.signal,
        onChunk: (chunk) => {
          accumulated += chunk;
          streamingContentRef_.current = accumulated;
          // Fast fence counting: only count fences in the new chunk
          const chunkFences = (chunk.match(/```/g) || []).length;
          fenceCount += chunkFences;
          // Defer UI update via throttle (skips intermediate renders)
          flushStreamToUI();
        },
      });

      // Final flush to ensure last chunk is rendered
      const isStreamingCodeFinal = fenceCount % 2 === 1;
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated, isStreamingCode: isStreamingCodeFinal } : m)),
      );

      // Store token counts on the completed assistant message
      const outputTokens = estimateTokens(accumulated);
      const inputTokens = estimateTokens(contextPrefix + effectiveMessage);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, isStreamingCode: false, tokenUsage: { inputTokens, outputTokens } }
            : m,
        ),
      );

      // Parse code blocks for diff suggestions (only after streaming completes)
      if (activeFile && accumulated.includes("```")) {
        const codeMatch = accumulated.match(/```\w*\n([\s\S]*?)```/);
        if (codeMatch?.[1] && codeMatch[1].trim().length > 20) {
          const modified = codeMatch[1].trim();
          if (modified !== activeFile.content.trim()) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, codeBlock: { original: activeFile.content, modified, language: activeFile.language } }
                  : m,
              ),
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + "\n\n[생성 중단됨]" } : m,
          ),
        );
      } else {
        const errorMsg = (err as Error).message || "알 수 없는 오류";
        notifyError("AI 오류", errorMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `오류: ${errorMsg}\n\nAPI 키 설정을 확인하세요.` }
              : m,
          ),
        );
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, messages, activeFile, allFiles, editorSelection, onSuggestion, onPipelineRun]);

  return { messages, isGenerating, sendMessage, cancelGeneration, retryMessage, forkConversation, switchChatBranch, chatTree: chatTreeRef.current };
}
