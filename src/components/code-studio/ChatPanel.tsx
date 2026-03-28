"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Sparkles, Shield, Square, AtSign, History,
  Trash2, Plus, Check, Zap,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  codeBlock?: { original: string; modified: string; language: string };
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
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
  }, [messages]);

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
    if (!text || isGenerating) return;
    setInput("");
    setShowMentions(false);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    // Simulate AI response — real integration uses streamChat
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: `Analyzing your request regarding "${activeFileName ?? 'code'}"...\n\nI'll process: ${text.slice(0, 100)}`,
      timestamp: Date.now(),
    };
    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg]);
      setIsGenerating(false);
    }, 500);
  }, [input, isGenerating, activeFileName]);

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
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#30363d]">
        <Sparkles size={14} className="text-purple-400" />
        <span className="text-xs font-semibold text-[#e6edf3]">EH Assistant</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Pipeline</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleHistory} title="Chat history" className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] transition-colors">
            <History size={14} />
          </button>
        </div>
      </div>

      {/* History Dropdown */}
      {showHistory && (
        <div className="border-b border-[#30363d] bg-[#010409] max-h-[200px] overflow-y-auto">
          <button
            onClick={() => { setShowHistory(false); setMessages([]); setInput(""); }}
            className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs font-medium text-blue-400 hover:bg-[#21262d] border-b border-[#30363d]"
          >
            <Plus size={12} /> New Chat
          </button>
          {chatSessions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[#8b949e]">No history</div>
          ) : (
            chatSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#21262d] group">
                {renamingId === session.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleConfirmRename(session.id); if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); } }}
                      onBlur={() => handleConfirmRename(session.id)}
                      className="flex-1 text-xs bg-[#21262d] border border-[#30363d] rounded px-1.5 py-0.5 outline-none text-[#e6edf3]"
                    />
                    <button onClick={() => handleConfirmRename(session.id)} className="text-green-400 p-0.5"><Check size={11} /></button>
                  </div>
                ) : (
                  <button
                    onDoubleClick={() => { setRenamingId(session.id); setRenameValue(session.title); }}
                    className="flex-1 text-left text-xs truncate text-[#e6edf3]" title="Double-click to rename"
                  >{session.title}</button>
                )}
                <span className="text-[9px] text-[#8b949e] flex-shrink-0">{formatRelativeTime(session.updatedAt)}</span>
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
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
            <Sparkles size={24} className="text-purple-400 opacity-60" />
            <p className="text-xs text-[#8b949e] leading-relaxed max-w-[240px]">Ask about your code, request reviews, or generate implementations.</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-[280px]">
              {["Review this file", "Find bugs", "Refactor", "Add tests"].map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 text-[10px] rounded-full border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-purple-500 hover:bg-purple-500/10 transition-all">
                  <Zap size={9} className="inline opacity-50 mr-1" />{s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => {
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
              <div className="text-[#e6edf3] whitespace-pre-wrap">{msg.content}</div>
              {codeBlocks.map((block, idx) => (
                <div key={idx} className="mt-1 flex items-center gap-1">
                  <button onClick={() => onApplyCode?.(block.code, block.fileName)}
                    className="text-[9px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">
                    Apply
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(block.code)}
                    className="text-[9px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] transition-colors">
                    Copy
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <Zap size={12} className="animate-pulse text-yellow-400" /> Generating...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#30363d] p-2 relative">
        {showMentions && filteredFiles.length > 0 && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredFiles.map((f) => (
              <button key={f} onClick={() => handleMentionSelect(`@${f}`)}
                className="block w-full text-left px-3 py-1.5 text-xs text-[#e6edf3] hover:bg-[#21262d] truncate">
                {f}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 bg-[#21262d] rounded-lg px-3 py-2">
          <button onClick={() => { setShowMentions(!showMentions); setMentionQuery(""); }}
            className="text-[#8b949e] hover:text-blue-400 transition-colors" title="Add context">
            <AtSign size={14} />
          </button>
          <input ref={inputRef} value={input} onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !showMentions) handleSend(); if (e.key === "Escape") setShowMentions(false); }}
            placeholder="Ask about your code..." aria-label="Chat input"
            className="flex-1 bg-transparent text-xs outline-none text-[#e6edf3] placeholder:text-[#8b949e]"
          />
          {isGenerating ? (
            <button onClick={() => setIsGenerating(false)} className="text-red-400 hover:text-white transition-colors"><Square size={14} /></button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()} className="text-blue-400 hover:text-white disabled:opacity-30 transition-colors"><Send size={14} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=ChatUI | inputs=Props | outputs=JSX
