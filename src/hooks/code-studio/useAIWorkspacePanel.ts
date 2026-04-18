// ============================================================
// Code Studio — AI Workspace Panel Sub-hook
// Multi-persona thread workspace backed by streamChat.
// ============================================================

import { useState, useCallback, useRef } from "react";
import { streamChat, type ChatMsg } from "@/lib/ai-providers";
import type { AgentRole } from "@/lib/code-studio/ai/agents";
import type { WorkspaceThread, WorkspaceMessage } from "@/components/code-studio/AIWorkspace";

/** AI Workspace — per-persona thread state + streaming send. */
export function useAIWorkspacePanel() {
  const [wsThreads, setWsThreads] = useState<WorkspaceThread[]>([]);
  const [wsSharedMemory, _setWsSharedMemory] = useState<Array<{ key: string; value: string; source: AgentRole; timestamp: number }>>([]);
  const wsAbortRef = useRef<AbortController | null>(null);

  const createWsThread = useCallback((persona: AgentRole) => {
    const thread: WorkspaceThread = {
      id: `thread-${Date.now()}`,
      title: `${persona.charAt(0).toUpperCase() + persona.slice(1)} Thread`,
      persona,
      messages: [],
      createdAt: Date.now(),
    };
    setWsThreads((prev) => [...prev, thread]);
  }, []);

  const deleteWsThread = useCallback((threadId: string) => {
    setWsThreads((prev) => prev.filter((t) => t.id !== threadId));
  }, []);

  const sendWsMessage = useCallback(async (threadId: string, content: string): Promise<string> => {
    const userMsg: WorkspaceMessage = { id: `msg-${Date.now()}`, role: "user", content, timestamp: Date.now() };
    setWsThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, messages: [...t.messages, userMsg] } : t));

    const thread = wsThreads.find((t) => t.id === threadId);
    const systemPrompt = `You are a ${thread?.persona ?? "developer"} agent in an AI workspace. Be concise and focused on your role.`;

    try {
      wsAbortRef.current = new AbortController();
      let _accumulated = '';
      const response = await streamChat({
        systemInstruction: systemPrompt,
        messages: [
          ...(thread?.messages.map((m): ChatMsg => ({ role: m.role, content: m.content })) ?? []),
          { role: "user", content } as ChatMsg,
        ],
        temperature: 0.7,
        maxTokens: 2048,
        signal: wsAbortRef.current.signal,
        onChunk: (text: string) => { _accumulated += text; },
      });

      const assistantMsg: WorkspaceMessage = { id: `msg-${Date.now()}-resp`, role: "assistant", content: response, timestamp: Date.now() };
      setWsThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, messages: [...t.messages, assistantMsg] } : t));

      return response;
    } catch {
      const errorMsg: WorkspaceMessage = { id: `msg-${Date.now()}-err`, role: "assistant", content: "[Error] Failed to get response. Check API key configuration.", timestamp: Date.now() };
      setWsThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, messages: [...t.messages, errorMsg] } : t));
      return errorMsg.content;
    }
  }, [wsThreads]);

  return {
    wsThreads,
    wsSharedMemory,
    createWsThread,
    deleteWsThread,
    sendWsMessage,
  };
}
