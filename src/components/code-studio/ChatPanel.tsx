"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Sparkles, Shield, Square, AtSign, History,
  Trash2, Plus, Check, Zap,
} from "lucide-react";
import { useCodeStudioChat } from "@/hooks/useCodeStudioChat";
import { useLang } from "@/lib/LangContext";
import { getServers, addServer, connectServer, callTool } from "@/lib/code-studio/features/mcp-client";

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
    systemInstruction: `You are EH Code Studio AI assistant. Help with code in ${activeFileName ?? 'the current file'}. Be concise.${mcpToolsDoc}`,
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

    await chat.sendMessage(text);
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
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Sparkles size={14} className="text-purple-400" />
        <span className="text-xs font-semibold text-text-primary">EH Assistant</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Pipeline</span>
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite">
        {chat.messages.length === 0 && !chat.isStreaming && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
            <Sparkles size={24} className="text-purple-400 opacity-60" />
            <p className="text-xs text-text-tertiary leading-relaxed max-w-[240px]">Ask about your code, request reviews, or generate implementations.</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-[280px]">
              {["Review this file", "Find bugs", "Refactor", "Add tests"].map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 text-[10px] rounded-full border border-border text-text-tertiary hover:text-text-primary hover:border-purple-500 hover:bg-purple-500/10 transition-all">
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
                  <span className="text-purple-400 font-semibold flex items-center gap-1"><Shield size={10} /> EH</span>
                )}
              </div>
              <div className="text-text-primary whitespace-pre-wrap">{msg.content}</div>
              {codeBlocks.map((block, idx) => (
                <div key={idx} className="mt-1 flex items-center gap-1">
                  <button onClick={() => onApplyCode?.(block.code, block.fileName)}
                    className="text-[9px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">
                    Apply
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(block.code)}
                    className="text-[9px] px-2 py-0.5 rounded bg-bg-tertiary text-text-tertiary hover:bg-border transition-colors">
                    Copy
                  </button>
                </div>
              ))}
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
        <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg px-3 py-2">
          <button onClick={() => { setShowMentions(!showMentions); setMentionQuery(""); }}
            className="text-text-tertiary hover:text-blue-400 transition-colors" title="Add context">
            <AtSign size={14} />
          </button>
          <input ref={inputRef} value={input} onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !showMentions) handleSend(); if (e.key === "Escape") setShowMentions(false); }}
            placeholder="Ask about your code..." aria-label="Chat input"
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
