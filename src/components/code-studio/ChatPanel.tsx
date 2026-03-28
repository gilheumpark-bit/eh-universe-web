"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Zap, Sparkles, Shield, Square, AtSign, History, Trash2, ImageIcon, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { useCSLChat } from "@/hooks/useCSLChat";
import { CodeBlockActions } from "./CodeBlockActions";
import { MentionPopup } from "./MentionPopup";
import { ModelSwitcher } from "./ModelSwitcher";
import { listChatSessions, loadChatSession, deleteChatSession, renameChatSession, formatRelativeTime, type ChatSession } from "@/lib/chat-history";
import { Plus, Check } from "lucide-react";
import { extractImageFromPaste, processImage, formatImageForContext, type ChatImage } from "@/lib/image-input";
import { runPipeline } from "@/lib/pipeline";
import { voiceInput } from "@/lib/voice-input";
import { useLocale } from "@/lib/i18n";
import type { FileNode, OpenFile, PipelineResult } from "@/lib/types";
import type { PipelineContext } from "@/lib/pipeline";

interface Props {
  activeFile: OpenFile | null;
  allFiles?: FileNode[];
  editorSelection?: string;
  onSuggestion: (original: string, modified: string) => void;
  onPipelineRun: (result: PipelineResult) => void;
  onApplyCode?: (code: string, fileName?: string) => void;
  onInsertCode?: (code: string) => void;
}

export function ChatPanel({ activeFile, allFiles, editorSelection, onSuggestion, onPipelineRun, onApplyCode, onInsertCode }: Props) {
  const { t } = useLocale();
  const { messages, isGenerating, sendMessage, cancelGeneration } = useCSLChat({
    activeFile,
    allFiles,
    editorSelection,
    onSuggestion,
    onPipelineRun,
  });
  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [pastedImage, setPastedImage] = useState<ChatImage | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      voiceInput.stop();
      setIsListening(false);
    } else {
      voiceInput.start(
        (transcript) => {
          setInput((prev) => prev + transcript);
        },
        () => {
          setIsListening(false);
        },
      );
      setIsListening(true);
    }
  }, [isListening]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const toggleHistory = useCallback(async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    const sessions = await listChatSessions();
    setChatSessions(sessions);
    setShowHistory(true);
  }, [showHistory]);

  const handleLoadSession = useCallback(async (id: string) => {
    const session = await loadChatSession(id);
    if (session) {
      // Replace current messages via sendMessage workaround — load into chat
      // We re-initialize by reloading; for now just close the dropdown
      setShowHistory(false);
    }
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteChatSession(id);
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleNewChat = useCallback(() => {
    setShowHistory(false);
    setInput("");
    // Trigger a page reload to start fresh session
    window.location.reload();
  }, []);

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
  }, []);

  const handleConfirmRename = useCallback(async (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      await renameChatSession(id, trimmed);
      setChatSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s))
      );
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renameValue]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const imageFile = extractImageFromPaste(e.nativeEvent);
    if (imageFile) {
      e.preventDefault();
      const image = await processImage(imageFile);
      if (image) setPastedImage(image);
    }
  }, []);

  const handleSend = useCallback(async () => {
    let text = input.trim();
    if (!text) return;
    if (pastedImage) {
      text = formatImageForContext(pastedImage) + "\n" + text;
      setPastedImage(null);
    }
    setInput("");
    setShowMentions(false);

    // Local command: /pipeline
    if (text.startsWith("/pipeline") && activeFile) {
      const ctx: PipelineContext = {
        code: activeFile.content,
        language: activeFile.language,
        fileName: activeFile.name,
        intent: "review",
        usageIntent: "default",
      };
      const result = await runPipeline(ctx);
      onPipelineRun(result);
      return;
    }

    // Otherwise: real AI
    await sendMessage(text);
  }, [input, activeFile, sendMessage, onPipelineRun, pastedImage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Detect @ mention trigger
    const cursorPos = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
    } else {
      setShowMentions(false);
    }
  }, []);

  const handleMentionSelect = useCallback((mention: string) => {
    // Replace the @query with the selected mention
    const cursorPos = inputRef.current?.selectionStart ?? input.length;
    const textBeforeCursor = input.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf("@");
    if (atIdx >= 0) {
      const newInput = input.slice(0, atIdx) + mention + " " + input.slice(cursorPos);
      setInput(newInput);
    }
    setShowMentions(false);
    inputRef.current?.focus();
  }, [input]);

  // Extract code blocks from message for CodeBlockActions
  const extractCodeBlocks = (content: string): { code: string; language: string; fileName?: string }[] => {
    const blocks: { code: string; language: string; fileName?: string }[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lang = match[1] || "plaintext";
      const code = match[2].trim();
      if (code.length > 10) {
        // Try to detect filename from surrounding text
        const beforeBlock = content.slice(Math.max(0, match.index - 100), match.index);
        const fileMatch = beforeBlock.match(/[`"]([^`"]+\.\w+)[`"]/);
        blocks.push({ code, language: lang, fileName: fileMatch?.[1] });
      }
    }
    return blocks;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <Sparkles size={14} className="text-[var(--accent-purple)]" />
        <span className="text-xs font-semibold">CSL Assistant</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded">
          {t('chat.pipelineLabel')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ModelSwitcher compact />
          <button
            onClick={toggleHistory}
            title={t('chat.history')}
            className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
          >
            <History size={14} />
          </button>
        </div>
      </div>

      {/* Chat History Dropdown — uses virtual list for long session lists */}
      {showHistory && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-primary)] max-h-[200px] overflow-y-auto">
          {/* New Chat button */}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs font-medium text-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)] border-b border-[var(--border)]"
          >
            <Plus size={12} />
            {t('chat.newChat')}
          </button>
          {chatSessions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--text-secondary)]">{t('chat.noHistory')}</div>
          ) : (
            chatSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-tertiary)] group">
                {renamingId === session.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmRename(session.id);
                        if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                      }}
                      onBlur={() => handleConfirmRename(session.id)}
                      className="flex-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-1.5 py-0.5 outline-none"
                    />
                    <button onClick={() => handleConfirmRename(session.id)} className="text-[var(--accent-green)] p-0.5">
                      <Check size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleLoadSession(session.id)}
                    onDoubleClick={() => handleStartRename(session.id, session.title)}
                    className="flex-1 text-left text-xs truncate text-[var(--text-primary)]"
                    title={t('chat.doubleClickRename')}
                  >
                    {session.title}
                  </button>
                )}
                <span className="text-[9px] text-[var(--text-secondary)] flex-shrink-0">
                  {formatRelativeTime(session.updatedAt)}
                </span>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--accent-red)] hover:text-red-300 transition-opacity p-0.5"
                  title={t('common.delete')}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center ds-animate-fade-in">
            <Sparkles size={24} className="text-[var(--accent-purple)] opacity-60" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-[240px]">
              {t('chat.emptyState')}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-[280px]">
              {(["chat.suggest1", "chat.suggest2", "chat.suggest3", "chat.suggest4"] as const).map((key, idx) => (
                <button
                  key={key}
                  onClick={() => { setInput(t(key)); inputRef.current?.focus(); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 hover:shadow-sm transition-all duration-150 ds-animate-fade-in ds-delay-${idx + 1}`}
                >
                  <Zap size={9} className="opacity-50" />
                  {t(key)}
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
                  <span className="text-[var(--accent-blue)] font-semibold">You</span>
                ) : (
                  <span className="text-[var(--accent-purple)] font-semibold flex items-center gap-1">
                    <Shield size={10} /> CSL
                  </span>
                )}
              </div>
              <div className="prose prose-invert prose-xs max-w-none [&_pre]:bg-[var(--bg-primary)] [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-[10px] [&_code]:text-[var(--accent-green)]">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
              </div>
              {/* Code block action buttons */}
              {codeBlocks.map((block, idx) => (
                <CodeBlockActions
                  key={idx}
                  code={block.code}
                  language={block.language}
                  fileName={block.fileName}
                  activeFileContent={activeFile?.content ?? ""}
                  onApply={(code, fileName) => onApplyCode?.(code, fileName)}
                  onDiff={(original, modified) => onSuggestion(original, modified)}
                  onInsert={(code) => onInsertCode?.(code)}
                />
              ))}
              {/* Legacy diff suggestion button */}
              {msg.codeBlock && codeBlocks.length === 0 && (
                <CodeBlockActions
                  code={msg.codeBlock.modified}
                  language={msg.codeBlock.language}
                  activeFileContent={activeFile?.content ?? ""}
                  onApply={(code) => onApplyCode?.(code)}
                  onDiff={() => onSuggestion(msg.codeBlock!.original, msg.codeBlock!.modified)}
                  onInsert={(code) => onInsertCode?.(code)}
                />
              )}
            </div>
          );
        })}
        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Zap size={12} className="animate-pulse text-[var(--accent-yellow)]" />
            {t('chat.generating')}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] p-2 relative">
        {/* @mention popup */}
        {showMentions && allFiles && (
          <div className="absolute bottom-full left-0 right-0 mb-1 px-2">
            <MentionPopup
              query={mentionQuery}
              files={allFiles}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentions(false)}
            />
          </div>
        )}
        {/* Image thumbnail preview */}
        {pastedImage && (
          <div className="flex items-center gap-2 mb-1 px-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pastedImage.thumbnail ?? pastedImage.dataUrl}
              alt={t('chat.attachedImage')}
              className="w-10 h-10 object-cover rounded border border-[var(--border)]"
            />
            <span className="text-[10px] text-[var(--text-secondary)]">
              {pastedImage.width && pastedImage.height ? `${pastedImage.width}x${pastedImage.height}` : t('chat.image')} · {Math.round(pastedImage.sizeBytes / 1024)}KB
            </span>
            <button onClick={() => setPastedImage(null)} className="text-[var(--accent-red)] hover:text-red-300 text-xs ml-auto">✕</button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
          <button
            onClick={() => { setShowMentions(!showMentions); setMentionQuery(""); }}
            className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
            title={t('chat.addContext')}
          >
            <AtSign size={14} />
          </button>
          <button
            onClick={() => {
              const fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.accept = "image/*";
              fileInput.onchange = async (ev) => {
                const file = (ev.target as HTMLInputElement).files?.[0];
                if (file) {
                  const image = await processImage(file);
                  if (image) setPastedImage(image);
                }
              };
              fileInput.click();
            }}
            className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
            title={t('chat.attachImage')}
          >
            <ImageIcon size={14} />
          </button>
          {voiceInput.isSupported() && (
            <button
              onClick={toggleVoiceInput}
              className={`transition-colors ${isListening ? "text-[var(--accent-red)] animate-pulse" : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)]"}`}
              title={isListening ? t('chat.voiceStop') : t('chat.voice')}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !showMentions) handleSend();
              if (e.key === "Escape") setShowMentions(false);
            }}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.inputLabel')}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-secondary)]"
          />
          {isGenerating ? (
            <button onClick={cancelGeneration} className="text-[var(--accent-red)] hover:text-white transition-colors">
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label={input.trim() ? `${t('chat.sendMessage')}: ${input.trim().slice(0, 30)}${input.trim().length > 30 ? '…' : ''}` : t('chat.sendMessage')}
              className="text-[var(--accent-blue)] hover:text-white disabled:opacity-30 transition-colors"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
