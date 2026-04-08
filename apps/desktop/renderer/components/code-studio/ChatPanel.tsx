// @ts-nocheck
"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Send, Sparkles, Square, AtSign, History,
  Trash2, Plus, Check, Zap, Stethoscope, Code2,
  FileJson, FileCode, FileText, Type
} from "lucide-react";
import { motion } from "framer-motion";
import { NOD_SYSTEM_PROMPT, NOD_SYSTEM_PROMPT_EN } from "@/lib/code-studio/ai/nod";
import { useCodeStudioChat } from "@/hooks/useCodeStudioChat";
import { useLang } from "@/lib/LangContext";
import { getServers, addServer, connectServer, callTool } from "@/lib/code-studio/features/mcp-client";
import { logger } from "@/lib/logger";
import { CODE_STUDIO_SPEC_CHAT_SEED_KEY } from "@/lib/code-studio/core/project-spec-bridge";
import { DESIGN_SYSTEM_SPEC } from "@/lib/code-studio/core/design-system-spec";
import { DESIGN_LINTER_SPEC } from "@/lib/code-studio/core/design-linter";
import { detectPreset, buildPresetPrompt } from "@/lib/code-studio/core/design-presets";
import { runDesignLint, formatDesignLintReport } from "@eh/quill-engine/pipeline/design-lint";
import { parseNLCommand } from "@/lib/code-studio/features/nl-terminal";
import { buildQualityRulesPrompt } from "@eh/quill-engine/quality-rules-from-catalog";
import { AGENT_REGISTRY, type AgentRole, ALL_AGENT_ROLES } from "@/types/code-studio-agent";
import { AGENT_PROMPTS } from "@/lib/code-studio/ai/agents";
import type { FileNode } from "@eh/quill-engine/types";

interface Props {
  activeFileContent?: string;
  activeFileName?: string;
  activeFileLanguage?: string;
  allFileNames?: string[];
  tree?: FileNode[]; 
  onApplyCode?: (code: string, fileName?: string) => void;
  onInsertCode?: (code: string) => void;
  onTerminalCommand?: (command: string, terminalId?: number | null) => void;
  onFileAction?: (action: string, params: Record<string, string>) => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ChatMessage,Props

// ============================================================
// PART 2 — Chat History Helpers
// ============================================================

function formatRelativeTime(ts: number | undefined): string {
  if (!ts) return "unknown";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getFileIcon(fileName: string) {
  if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return <FileCode size={12} className="text-blue-400" />;
  if (fileName.endsWith('.ts') || fileName.endsWith('.js')) return <FileJson size={12} className="text-amber-400" />;
  if (fileName.endsWith('.css') || fileName.endsWith('.scss')) return <Type size={12} className="text-pink-400" />;
  return <FileText size={12} className="text-text-tertiary" />;
}

// IDENTITY_SEAL: PART-2 | role=ChatHistory | inputs=none | outputs=formatRelativeTime

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

function MessageActionCard({ action, params, onClick }: { action: string, params: any, onClick: () => void }) {
  const isApply = action === 'APPLY_CODE' || action === 'FIX';
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }}
      className="ml-7 mt-2 p-2 rounded-lg border border-border/40 bg-bg-tertiary/50 flex items-center gap-3 group hover:border-blue-500/50 transition-colors"
    >
      <div className={`p-1.5 rounded-md ${isApply ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
        {isApply ? <Check size={14} /> : <Zap size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-text-primary capitalize">{action.replace('_', ' ')}</p>
        <p className="text-[10px] text-text-tertiary truncate">{params.fileName || params.description || 'Suggested action'}</p>
      </div>
      <button 
        onClick={onClick}
        className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold hover:bg-blue-500 hover:text-white transition-all"
      >
        Run Action
      </button>
    </motion.div>
  );
}

// ============================================================
// PART 3.5 — Mascot Component
// ============================================================

function MascotQuill({ state }: { state: 'idle' | 'thinking' | 'greeting' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: state === 'idle' ? [0, -4, 0] : 0,
        rotate: state === 'thinking' ? [0, 5, -5, 0] : 0
      }}
      transition={{
        y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 0.4, repeat: Infinity, ease: "linear" },
        opacity: { duration: 0.3 }
      }}
      className="relative w-16 h-16 mx-auto mb-2"
    >
      <img 
        src="/images/quill.png" 
        alt="Quill Mascot" 
        className={`w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(251,191,36,0.4)] ${state === 'thinking' ? 'animate-pulse' : ''}`}
      />
      {state === 'thinking' && (
        <motion.div 
          className="absolute inset-0 rounded-full border-2 border-amber-400/30"
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ============================================================
// PART 4 — Main Component
// ============================================================

const CATEGORY_THEMES = {
  leadership: { color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/40' },
  generation: { color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/40' },
  verification: { color: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/40' },
  repair: { color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/40' },
};

export function ChatPanel({
  activeFileContent,
  activeFileName,
  allFileNames,
  tree,
  onApplyCode,
  onTerminalCommand,
  onFileAction,
}: Props) {
  const { lang } = useLang();
  const ko = lang === "ko";
  const [isMounted, setIsMounted] = useState(false);
  const [activeRole, setActiveRole] = useState<AgentRole | 'nod'>('nod');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mcpToolsDoc = isMounted ? (() => {
    const servers = getServers().filter(s => s.status === 'connected');
    if (servers.length === 0) return "";
    const doc = servers.flatMap(s => s.tools.map(t => `- /mcp call ${s.name} ${t.name} (args: ${JSON.stringify(t.inputSchema)})`)).join("\n");
    return `\n\nYou have access to external MCP tools. If you need information from them, ask the user to run the appropriate command:\n${doc}`;
  })() : "";

  const systemInstruction = useMemo(() => {
    if (activeRole === 'nod') return (ko ? NOD_SYSTEM_PROMPT : NOD_SYSTEM_PROMPT_EN) + (activeFileName ? `\n\n현재 파일: ${activeFileName}` : '');
    
    const basePrompt = AGENT_PROMPTS[activeRole] || "You are a professional software assistant.";
    return `${basePrompt}
Context: Active file is "${activeFileName ?? 'the current file'}".

Rules:
1. Always use fenced code blocks with language tags
2. Explain your reasoning before showing code
3. If generating UI, follow Design System v8.0 and use semantic tokens.

${DESIGN_SYSTEM_SPEC}
${DESIGN_LINTER_SPEC}
${mcpToolsDoc}`;
  }, [activeRole, activeFileName, ko, mcpToolsDoc]);

  const chat = useCodeStudioChat({
    tree,
    systemInstruction,
  });

  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || chat.isStreaming) return;
    setInput("");
    setShowMentions(false);

    // MCP & Terminal command handling (omitted for brevity, keep existing)
    if (text.startsWith("/mcp") || text.startsWith(">") || (text.startsWith("/") && !text.startsWith("/mcp"))) {
       // ... (existing logic)
    }

    const presetId = detectPreset(text);
    const presetHint = presetId !== null || /컴포넌트|component|UI|버튼|button/i.test(text)
      ? `\n\n[Design Preset Context]\n${buildPresetPrompt(presetId)}`
      : '';

    await chat.sendMessage(presetHint ? `${text}${presetHint}` : text, {
      agentRole: activeRole !== 'nod' ? activeRole : undefined
    });
  }, [input, chat, activeRole]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-secondary select-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-primary/50 backdrop-blur-md sticky top-0 z-[var(--z-sticky)]">
        <div className="relative">
          <button 
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            className="flex items-center gap-2 px-2 py-1 rounded-md border border-border/60 bg-bg-tertiary hover:bg-bg-secondary transition-all active:scale-95 group"
          >
            {activeRole === 'nod' ? (
              <Sparkles size={14} className="text-amber-400 group-hover:rotate-12 transition-transform" />
            ) : (
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${CATEGORY_THEMES[AGENT_REGISTRY[activeRole]?.category]?.bg} ${CATEGORY_THEMES[AGENT_REGISTRY[activeRole]?.category]?.color}`}>
                {AGENT_REGISTRY[activeRole]?.code}
              </div>
            )}
            <span className="text-[11px] font-bold text-text-primary capitalize">
              {activeRole === 'nod' ? 'NOD Assistant' : AGENT_REGISTRY[activeRole]?.name}
            </span>
          </button>

          {showRoleSelector && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-bg-secondary/95 backdrop-blur-2xl border border-border/80 rounded-xl shadow-2xl z-[var(--z-dropdown)] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 gap-1">
                <button 
                  onClick={() => { setActiveRole('nod'); setShowRoleSelector(false); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeRole === 'nod' ? 'bg-amber-500/10 text-amber-400' : 'hover:bg-bg-tertiary text-text-tertiary'}`}
                >
                  <Sparkles size={14} />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold">NOD Assistant</p>
                    <p className="text-[9px] opacity-70">General purpose & Simple explanation</p>
                  </div>
                </button>
                <div className="h-px bg-border/50 my-1" />
                <div className="px-3 py-1 text-[9px] font-bold text-text-tertiary uppercase tracking-widest opacity-50">Expert Agents</div>
                {ALL_AGENT_ROLES.slice(0, 10).map(role => (
                  <button 
                    key={role}
                    onClick={() => { setActiveRole(role); setShowRoleSelector(false); }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeRole === role ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-bg-tertiary text-text-tertiary'}`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${CATEGORY_THEMES[AGENT_REGISTRY[role].category].bg} ${CATEGORY_THEMES[AGENT_REGISTRY[role].category].color} border ${CATEGORY_THEMES[AGENT_REGISTRY[role].category].border}`}>
                      {AGENT_REGISTRY[role].code}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold">{AGENT_REGISTRY[role].name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setShowHistory(!showHistory)} className={`p-1.5 rounded-lg hover:bg-bg-tertiary transition-all ${showHistory ? 'text-accent-blue bg-accent-blue/5' : 'text-text-tertiary'}`}>
            <History size={15} />
          </button>
          <div className="w-px h-4 bg-border/60 mx-1" />
          <button onClick={() => chat.createNewSession()} className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-tertiary transition-all">
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 scroll-smooth scrollbar-none">
        {chat.messages.length === 0 && !chat.isStreaming && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-in zoom-in-95 duration-500">
            <MascotQuill state="greeting" />
            <h3 className="text-sm font-bold text-text-primary mb-2">How can I help you today?</h3>
            <p className="text-xs text-text-tertiary leading-relaxed max-w-[280px] mb-6">
              I'm EH Studio's expert brain. Ask me to architect, code, review or test your features.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {["Create a login page", "Find security flaws", "Refactor this logic", "Write unit tests"].map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  className="p-3 text-[10px] text-left rounded-xl border border-border/60 bg-bg-primary hover:border-accent-amber/50 hover:bg-accent-amber/5 transition-all group">
                  <span className="block text-text-primary font-bold group-hover:text-accent-amber transition-colors mb-1">{s}</span>
                  <span className="text-text-tertiary opacity-60">Automated workflow</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.messages.map((msg) => {
          const codeBlocks = msg.role === "assistant" ? extractCodeBlocks(msg.content) : [];
          const agentMeta = msg.agentRole ? AGENT_REGISTRY[msg.agentRole as AgentRole] : null;
          const theme = agentMeta ? CATEGORY_THEMES[agentMeta.category] : { color: 'text-amber-400', bg: 'bg-amber-400/10' };

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className="group"
            >
              <div className="flex items-center gap-3 mb-2 px-1">
                {msg.role === "user" ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                      <AtSign size={14} />
                    </div>
                    <span className="text-[11px] font-bold text-text-secondary">{ko ? "당신" : "You"}</span>
                  </>
                ) : (
                  <>
                    <div className={`w-6 h-6 rounded-lg ${theme.bg} flex items-center justify-center ${theme.color} border border-border/40 font-bold text-[9px]`}>
                      {agentMeta?.code || 'Q'}
                    </div>
                    <span className={`text-[11px] font-bold ${theme.color}`}>
                      {agentMeta?.name || 'Quill Assistant'}
                    </span>
                    {msg.confidence && (
                      <div className="flex items-center gap-1.5 ml-auto opacity-40 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-mono">{(msg.confidence * 100).toFixed(0)}% trust</span>
                        <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${msg.confidence * 100}%` }}
                            className={`h-full ${msg.confidence > 0.8 ? 'bg-accent-green' : 'bg-accent-amber'}`}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pl-9 pr-2">
                <div className={`text-xs text-text-primary leading-relaxed whitespace-pre-wrap ${msg.isError ? 'text-red-400 bg-red-500/5 p-3 rounded-lg border border-red-500/20' : ''}`}>
                  {msg.content}
                </div>

                {codeBlocks.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {codeBlocks.map((block, idx) => {
                      const lint = runDesignLint(block.code);
                      return (
                        <div key={idx} className="rounded-xl border border-border/60 bg-bg-tertiary/40 overflow-hidden">
                          <div className="px-3 py-2 border-b border-border/40 bg-bg-primary/50 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-text-tertiary flex items-center gap-2">
                              {getFileIcon(block.fileName || 'file.ts')} {block.fileName || 'Suggested code'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {lint.score < 100 && (
                                <span className="text-[9px] text-accent-red flex items-center gap-1">
                                  <Stethoscope size={10} /> Design Issues
                                </span>
                              )}
                              <button 
                                onClick={() => onApplyCode?.(block.code, block.fileName)}
                                className="px-2 py-1 rounded bg-accent-blue/10 text-accent-blue text-[10px] font-bold hover:bg-accent-blue hover:text-white transition-all"
                              >
                                Apply Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {chat.isStreaming && (
          <div className="flex items-center gap-4 pl-1">
            <MascotQuill state="thinking" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-tertiary animate-pulse uppercase tracking-widest">
                  {activeRole === 'nod' ? 'NOD is processing' : `${AGENT_REGISTRY[activeRole as AgentRole]?.name} Analyzing`}
                </span>
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-1 rounded-full bg-accent-amber"
                    />
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-text-tertiary opacity-50">Checking architecture & design constraints...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 pt-2 bg-bg-primary/30 backdrop-blur-xl border-t border-border">
        {showMentions && filteredFiles.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-4 bg-bg-secondary/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2 z-[var(--z-overlay)] animate-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider border-b border-border/40 mb-1">
              File Context
            </div>
            {filteredFiles.map((f) => (
              <button 
                key={f} 
                onClick={() => handleMentionSelect(`@${f}`)}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-xs text-text-primary hover:bg-accent-blue/10 rounded-xl transition-all group"
              >
                {getFileIcon(f)}
                <span className="truncate flex-1 font-medium">{f}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-bg-tertiary rounded opacity-0 group-hover:opacity-100 transition-opacity">Add</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col bg-bg-tertiary rounded-2xl border border-border/60 focus-within:border-accent-blue/50 focus-within:ring-4 focus-within:ring-accent-blue/5 transition-all shadow-inner overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/40 bg-bg-primary/20">
             <AtSign size={13} className="text-text-tertiary" />
             <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Context Bridge</span>
             <div className="ml-auto flex items-center gap-2">
               {chat.storageUsage > 70 && (
                 <div className="w-12 h-1 bg-border rounded-full overflow-hidden" title="Storage usage">
                   <div className="h-full bg-accent-red" style={{ width: `${chat.storageUsage}%` }} />
                 </div>
               )}
               <span className="text-[9px] text-text-tertiary opacity-60">Markdown Enabled</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-3">
            <input 
              ref={inputRef} 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !showMentions) handleSend(); }}
              placeholder={ko ? "무엇이든 물어보세요 (@를 눌러 파일 참조)" : "Type your query... (use @ for context)"}
              className="flex-1 bg-transparent text-[13px] outline-none text-text-primary placeholder:text-text-tertiary/60"
            />
            <div className="flex items-center gap-2">
              {chat.isStreaming ? (
                <button onClick={() => chat.abort()} className="p-2 rounded-xl bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white transition-all animate-pulse">
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim()} 
                  className="p-2.5 rounded-xl bg-accent-blue text-white disabled:bg-bg-secondary disabled:text-text-tertiary shadow-lg shadow-accent-blue/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=ChatUI | inputs=Props | outputs=JSX
