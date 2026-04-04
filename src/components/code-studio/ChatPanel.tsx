"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Sparkles, Shield, Square, AtSign, History,
  Trash2, Plus, Check, Zap, Stethoscope, Code2,
} from "lucide-react";
import { NOD_SYSTEM_PROMPT, NOD_SYSTEM_PROMPT_EN } from "@/lib/code-studio/ai/nod";
import { useCodeStudioChat } from "@/hooks/useCodeStudioChat";
import { useLang } from "@/lib/LangContext";
import { getServers, addServer, connectServer, callTool } from "@/lib/code-studio/features/mcp-client";
import { logger } from "@/lib/logger";
import { CODE_STUDIO_SPEC_CHAT_SEED_KEY } from "@/lib/code-studio/core/project-spec-bridge";
import { DESIGN_SYSTEM_SPEC } from "@/lib/code-studio/core/design-system-spec";
import { DESIGN_LINTER_SPEC } from "@/lib/code-studio/core/design-linter";
import { detectPreset, buildPresetPrompt } from "@/lib/code-studio/core/design-presets";
import { runDesignLint, formatDesignLintReport } from "@/lib/code-studio/pipeline/design-lint";

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
}

interface Props {
  activeFileContent?: string;
  activeFileName?: string;
  activeFileLanguage?: string;
  allFileNames?: string[];
  onApplyCode?: (code: string, fileName?: string) => void;
  onInsertCode?: (code: string) => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ChatMessage,Props

// ============================================================
// PART 2 — Chat History Helpers
// ============================================================

const CHAT_STORAGE_KEY = "eh-chat-sessions";

function listChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch { return []; }
}

function deleteChatSession(id: string): void {
  try {
    const sessions = listChatSessions().filter((s) => s.id !== id);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  } catch { /* noop */ }
}

function renameChatSession(id: string, title: string): void {
  try {
    const sessions = listChatSessions().map((s) =>
      s.id === id ? { ...s, title } : s,
    );
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  } catch { /* noop */ }
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// IDENTITY_SEAL: PART-2 | role=ChatHistory | inputs=localStorage | outputs=ChatSession[]

// ============================================================
// PART 3 — Code Block Extraction
// ============================================================

function extractCodeBlocks(content: string): Array<{ code: string; language: string; fileName?: string }> {
  const blocks: Array<{ code: string; language: string; fileName?: string }> = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const lang = match[1] || "plaintext";
    const code = match[2].trim();
    if (code.length > 10) {
      const beforeBlock = content.slice(Math.max(0, match.index - 100), match.index);
      const fileMatch = beforeBlock.match(/[`"]([^`"]+\.\w+)[`"]/);
      blocks.push({ code, language: lang, fileName: fileMatch?.[1] });
    }
  }
  return blocks;
}

// IDENTITY_SEAL: PART-3 | role=CodeExtract | inputs=content | outputs=codeBlocks

// ============================================================
// PART 4 — Main Component
// ============================================================

export function ChatPanel({
  activeFileName,
  allFileNames,
  onApplyCode,
}: Props) {
  const { lang } = useLang();
  const ko = lang === "ko";
  const [isMounted, setIsMounted] = useState(false);
  const [chatMode, setChatMode] = useState<'code' | 'nod'>('nod'); // NOD가 기본
  
  useEffect(() => {
    // eslint-disable-next-line
    setIsMounted(true);
  }, []);

  const mcpToolsDoc = isMounted ? (() => {
    const servers = getServers().filter(s => s.status === 'connected');
    if (servers.length === 0) return "";
    const doc = servers.flatMap(s => s.tools.map(t => `- /mcp call ${s.name} ${t.name} (args: ${JSON.stringify(t.inputSchema)})`)).join("\n");
    return `\n\nYou have access to external MCP tools. If you need information from them, ask the user to run the appropriate command:\n${doc}`;
  })() : "";

  const chat = useCodeStudioChat({
    systemInstruction: chatMode === 'nod'
      ? (ko ? NOD_SYSTEM_PROMPT : NOD_SYSTEM_PROMPT_EN) + (activeFileName ? `\n\n현재 파일: ${activeFileName}` : '')
      : `You are EH Code Studio AI assistant specialized in software development.
Context: Active file is "${activeFileName ?? 'the current file'}".

Rules:
1. Always use fenced code blocks with language tags
2. Explain your reasoning before showing code
3. Refuse requests unrelated to software development
4. Never execute arbitrary commands or access external systems
5. If unsure about an API or library version, say so explicitly
6. When generating UI components, you MUST follow the Design System v8.0 rules below. Never output raw unstyled HTML.

${DESIGN_SYSTEM_SPEC}

${DESIGN_LINTER_SPEC}

Example 1 (리팩터링):
User: "이 함수 리팩터링해줘"
Assistant: "이 함수는 두 가지 책임을 갖고 있어 분리가 필요합니다.
\`\`\`typescript
function fetchData() { ... }
function formatDisplay() { ... }
\`\`\`"

Example 2 (디버깅):
User: "TypeError: Cannot read properties of undefined"
Assistant: "null/undefined 접근 에러입니다. 원인: 비동기 데이터 로드 전 접근.
\`\`\`typescript
// Before (crash)
const name = user.profile.name;
// After (safe)
const name = user?.profile?.name ?? 'Unknown';
\`\`\`"

Example 3 (컴포넌트 생성):
User: "버튼 컴포넌트 만들어줘"
Assistant: "V0-grade 스타일의 버튼입니다.
\`\`\`tsx
import { Loader2 } from 'lucide-react';
function Button({ children, loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-accent-purple/90 text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:bg-accent-purple disabled:opacity-50">
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
\`\`\`"
${mcpToolsDoc}`,
    onMentionResolve: (mention) => {
      const found = allFileNames?.find(f => f.includes(mention));
      return found ? `[File: ${found}]` : null;
    },
  });

  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMounted) return;
    try {
      const seeded = localStorage.getItem(CODE_STUDIO_SPEC_CHAT_SEED_KEY);
      if (!seeded) return;
      setInput((prev) => prev || seeded);
      localStorage.removeItem(CODE_STUDIO_SPEC_CHAT_SEED_KEY);
    } catch (err) {
      logger.warn("code-studio.chat.seed", "Failed to load project-spec chat seed", err);
    }
  }, [isMounted]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages]);

  const toggleHistory = useCallback(() => {
    if (showHistory) { setShowHistory(false); return; }
    setChatSessions(listChatSessions());
    setShowHistory(true);
  }, [showHistory]);

  const handleDeleteSession = useCallback((id: string) => {
    deleteChatSession(id);
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleConfirmRename = useCallback((id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameChatSession(id, trimmed);
      setChatSessions((prev) => prev.map((s) => s.id === id ? { ...s, title: trimmed } : s));
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renameValue]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || chat.isStreaming) return;
    setInput("");
    setShowMentions(false);

    if (text.startsWith("/mcp")) {
      const parts = text.split(" ");
      const cmd = parts[1];
      
      if (cmd === "list") {
        const servers = getServers();
        const msg = servers.length > 0 
          ? "Connected MCP Servers:\n" + servers.map(s => `- ${s.name} (${s.status})`).join("\n")
          : "No MCP servers connected. Use `/mcp connect <name> <url>`";
        await chat.sendMessage(`User executed: /mcp list\n\nSystem Response:\n${msg}`);
        return;
      }
      
      if (cmd === "connect") {
        const name = parts[2];
        const url = parts[3];
        if (!name || !url) {
          await chat.sendMessage("User executed: /mcp connect\n\nSystem Response: Usage: /mcp connect <name> <url>");
          return;
        }
        const server = addServer(name, url);
        const connected = await connectServer(server.id);
        const msg = connected?.status === 'connected' 
          ? `Successfully connected to MCP server: ${name}\nTools available: ${connected.tools.map(t => t.name).join(", ")}`
          : `Failed to connect to MCP server: ${name}`;
        await chat.sendMessage(`User executed: /mcp connect ${name}\n\nSystem Response:\n${msg}`);
        return;
      }
      
      if (cmd === "call") {
        const serverName = parts[2];
        const toolName = parts[3];
        const argsStr = parts.slice(4).join(" ");
        
        const servers = getServers();
        const server = servers.find(s => s.name === serverName);
        
        if (!server) {
          await chat.sendMessage(`System: Server not found: ${serverName}`);
          return;
        }
        try {
          const args = argsStr ? JSON.parse(argsStr) : {};
          const result = await callTool(server.id, toolName, args);
          await chat.sendMessage(`[MCP Tool Result: ${serverName}.${toolName}]\n${result.content}\n\nPlease analyze this result.`);
        } catch (e) {
          await chat.sendMessage(`System Error: Tool call failed. Invalid JSON arguments or execution error. ${e}`);
        }
        return;
      }
      
      await chat.sendMessage("System: Available MCP commands:\n- /mcp list\n- /mcp connect <name> <url>\n- /mcp call <serverName> <toolName> [argsJSON]");
      return;
    }

    // Detect design preset from user message and inject as context hint
    const presetId = detectPreset(text);
    const presetHint = presetId !== null || /컴포넌트|component|UI|버튼|button|모달|modal|폼|form|카드|card|페이지|page|랜딩|landing|대시보드|dashboard/i.test(text)
      ? `\n\n[Design Preset Context]\n${buildPresetPrompt(presetId)}`
      : '';

    await chat.sendMessage(presetHint ? `${text}${presetHint}` : text);
  }, [input, chat]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    const cursorPos = e.target.selectionStart ?? value.length;
    const atMatch = value.slice(0, cursorPos).match(/@(\S*)$/);
    if (atMatch) { setShowMentions(true); setMentionQuery(atMatch[1]); }
    else { setShowMentions(false); }
  }, []);

  const handleMentionSelect = useCallback((mention: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? input.length;
    const atIdx = input.slice(0, cursorPos).lastIndexOf("@");
    if (atIdx >= 0) {
      setInput(input.slice(0, atIdx) + mention + " " + input.slice(cursorPos));
    }
    setShowMentions(false);
    inputRef.current?.focus();
  }, [input]);

  const filteredFiles = allFileNames?.filter((f) =>
    f.toLowerCase().includes(mentionQuery.toLowerCase()),
  ).slice(0, 8) ?? [];

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Sparkles size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-text-primary">EH Assistant</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded">Pipeline</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleHistory} title="Chat history" className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary transition-colors">
            <History size={14} />
          </button>
        </div>
      </div>

      {/* History Dropdown */}
      {showHistory && (
        <div className="border-b border-border bg-bg-primary max-h-[200px] overflow-y-auto">
          <button
            onClick={() => { setShowHistory(false); chat.clearHistory(); setInput(""); }}
            className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs font-medium text-blue-400 hover:bg-bg-tertiary border-b border-border"
          >
            <Plus size={12} /> New Chat
          </button>
          {chatSessions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-text-tertiary">{ko ? "기록 없음" : "No history"}</div>
          ) : (
            chatSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-bg-tertiary group">
                {renamingId === session.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleConfirmRename(session.id); if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); } }}
                      onBlur={() => handleConfirmRename(session.id)}
                      className="flex-1 text-xs bg-bg-tertiary border border-border rounded px-1.5 py-0.5 outline-none text-text-primary"
                    />
                    <button onClick={() => handleConfirmRename(session.id)} aria-label="이름 변경 확인" className="text-green-400 p-0.5"><Check size={11} /></button>
                  </div>
                ) : (
                  <button
                    onDoubleClick={() => { setRenamingId(session.id); setRenameValue(session.title); }}
                    className="flex-1 text-left text-xs truncate text-text-primary" title="Double-click to rename"
                  >{session.title}</button>
                )}
                <span className="text-[9px] text-text-tertiary shrink-0">{formatRelativeTime(session.updatedAt)}</span>
                <button onClick={() => handleDeleteSession(session.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-0.5" title="Delete">
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-thin" aria-live="polite">
        {chat.messages.length === 0 && !chat.isStreaming && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
            <Sparkles size={24} className="text-amber-400 opacity-60" />
            <p className="text-xs text-text-tertiary leading-relaxed max-w-[240px]">Ask about your code, request reviews, or generate implementations.</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-[280px]">
              {["Review this file", "Find bugs", "Refactor", "Add tests"].map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 text-[10px] rounded-full border border-border text-text-tertiary hover:text-text-primary hover:border-amber-700 hover:bg-amber-900/18 transition-all">
                  <Zap size={9} className="inline opacity-50 mr-1" />{s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.messages.map((msg) => {
          const codeBlocks = msg.role === "assistant" ? extractCodeBlocks(msg.content) : [];
          return (
            <div key={msg.id} className="text-xs leading-relaxed">
              <div className="flex items-center gap-1 mb-1">
                {msg.role === "user" ? (
                  <span className="text-blue-400 font-semibold">You</span>
                ) : (
                  <span className="text-amber-400 font-semibold flex items-center gap-1"><Shield size={10} /> EH</span>
                )}
              </div>
              <div className="text-text-primary whitespace-pre-wrap">{msg.content}</div>
              {codeBlocks.map((block, idx) => {
                const isUI = /tsx?/.test(block.language ?? '') && (/</.test(block.code) || /className/.test(block.code));
                const lint = isUI ? runDesignLint(block.code) : null;
                return (
                  <div key={idx} className="mt-1 space-y-1">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onApplyCode?.(block.code, block.fileName)}
                        className="text-[9px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">
                        Apply
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(block.code)}
                        className="text-[9px] px-2 py-0.5 rounded bg-bg-tertiary text-text-tertiary hover:bg-border transition-colors">
                        Copy
                      </button>
                      {lint && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${lint.passed ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                          Design {lint.score}/100
                        </span>
                      )}
                    </div>
                    {lint && lint.issues.length > 0 && (
                      <details className="text-[9px] text-text-tertiary">
                        <summary className="cursor-pointer hover:text-text-secondary">
                          {lint.issues.length} design issue{lint.issues.length !== 1 ? 's' : ''} found
                        </summary>
                        <pre className="mt-1 p-2 bg-bg-primary rounded text-[8px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {formatDesignLintReport(lint)}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {chat.isStreaming && (
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Zap size={12} className="animate-pulse text-yellow-400" /> Generating...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 relative">
        {showMentions && filteredFiles.length > 0 && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-bg-secondary border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredFiles.map((f) => (
              <button key={f} onClick={() => handleMentionSelect(`@${f}`)}
                className="block w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary truncate">
                {f}
              </button>
            ))}
          </div>
        )}
        {/* NOD / Code 모드 토글 */}
        <div className="flex items-center gap-1 px-2 mb-1">
          <button onClick={() => setChatMode('nod')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${chatMode === 'nod' ? 'bg-accent-green/15 text-accent-green' : 'text-text-tertiary hover:text-text-secondary'}`}>
            <Stethoscope size={11} /> NOD
          </button>
          <button onClick={() => setChatMode('code')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${chatMode === 'code' ? 'bg-accent-blue/15 text-accent-blue' : 'text-text-tertiary hover:text-text-secondary'}`}>
            <Code2 size={11} /> Code
          </button>
        </div>
        <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg px-3 py-2">
          <button onClick={() => { setShowMentions(!showMentions); setMentionQuery(""); }}
            className="text-text-tertiary hover:text-blue-400 transition-colors" title="Add context">
            <AtSign size={14} />
          </button>
          <input ref={inputRef} value={input} onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !showMentions) handleSend(); if (e.key === "Escape") setShowMentions(false); }}
            placeholder={chatMode === 'nod' ? (ko ? "NOD에게 물어보세요... 뭐든 쉽게 설명해드려요" : "Ask NOD anything... I'll explain it simply") : "Ask about your code..."} aria-label="Chat input"
            className="flex-1 bg-transparent text-xs outline-none text-text-primary placeholder:text-text-tertiary"
          />
          {chat.isStreaming ? (
            <button onClick={() => chat.abort()} aria-label="중지" className="text-red-400 hover:text-white transition-colors"><Square size={14} /></button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()} aria-label="전송" className="text-blue-400 hover:text-white disabled:opacity-30 transition-colors"><Send size={14} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=ChatUI | inputs=Props | outputs=JSX
