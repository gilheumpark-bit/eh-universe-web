// ============================================================
// Code Studio — Chat Hook
// Send message, receive streaming response, chat history,
// @mention resolution, abort in-flight requests.
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { streamChat, type ChatMsg } from '@/lib/ai-providers';
import { saveChatSession, loadChatSession, type StoredChatSession } from '@/lib/code-studio/core/store';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mentions?: string[]; // resolved @mentions
}

interface UseCodeStudioChatOptions {
  sessionId?: string;
  systemInstruction?: string;
  onMentionResolve?: (mention: string) => string | null;
}

interface UseCodeStudioChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
  abort: () => void;
  clearHistory: () => void;
  loadSession: (id: string) => Promise<void>;
  saveSession: () => Promise<void>;
  currentSessionId: string;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ChatMessage,UseCodeStudioChatReturn

// ============================================================
// PART 2 — Mention Parser
// ============================================================

const MENTION_PATTERN = /@(\S+)/g;

function extractMentions(content: string): string[] {
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_PATTERN.source, MENTION_PATTERN.flags);
  while ((match = re.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

function resolveMentions(
  content: string,
  resolver?: (mention: string) => string | null,
): { resolved: string; mentions: string[] } {
  const mentions = extractMentions(content);
  if (!resolver || mentions.length === 0) return { resolved: content, mentions };

  let resolved = content;
  for (const m of mentions) {
    const replacement = resolver(m);
    if (replacement) {
      resolved = resolved.replace(`@${m}`, replacement);
    }
  }
  return { resolved, mentions };
}

// IDENTITY_SEAL: PART-2 | role=MentionParser | inputs=content | outputs=mentions,resolvedContent

// ============================================================
// PART 3 — Hook
// ============================================================

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Chat hook for Code Studio: streaming AI responses, @mention resolution, session persistence, and abort support */
export function useCodeStudioChat(options: UseCodeStudioChatOptions = {}): UseCodeStudioChatReturn {
  const {
    sessionId = `session-${Date.now()}`,
    systemInstruction = 'You are an expert software engineer assistant integrated into Code Studio.',
    onMentionResolve,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const { resolved, mentions } = resolveMentions(content, onMentionResolve);

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      mentions,
    };

    setMessages((prev) => [...prev, userMsg]);

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const chatHistory: ChatMsg[] = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      chatHistory.push({ role: 'user', content: resolved });

      await streamChat({
        systemInstruction,
        messages: chatHistory,
        signal: controller.signal,
        onChunk: (chunk) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
            }
            return prev;
          });
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User aborted - mark the partial response
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            return prev.slice(0, -1); // Remove empty assistant message
          }
          return prev;
        });
      } else {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            const errText = err instanceof Error ? err.message : 'Unknown error';
            return [...prev.slice(0, -1), { ...last, content: `[Error] ${errText}` }];
          }
          return prev;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, systemInstruction, onMentionResolve]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  const loadSession = useCallback(async (id: string) => {
    const session = await loadChatSession(id);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(
        session.messages.map((m) => ({
          id: generateId(),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        })),
      );
    }
  }, []);

  const saveSession = useCallback(async () => {
    const session: StoredChatSession = {
      id: currentSessionId,
      title: messages[0]?.content.slice(0, 50) || 'New Chat',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      createdAt: messages[0]?.timestamp ?? Date.now(),
      updatedAt: Date.now(),
    };
    await saveChatSession(session);
  }, [messages, currentSessionId]);

  return {
    messages,
    sendMessage,
    isStreaming,
    abort,
    clearHistory,
    loadSession,
    saveSession,
    currentSessionId,
  };
}

// IDENTITY_SEAL: PART-3 | role=ChatHook | inputs=options | outputs=messages,sendMessage,abort
