"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, MessageSquare, FileText, Search, Filter } from "lucide-react";
import type { ChatSession, EpisodeSceneSheet, EpisodeSceneEntry, AppLanguage, Message } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export type OutlineFilterMode = "both" | "scenes" | "messages";

export interface OutlinePanelProps {
  currentSession: ChatSession | null;
  currentSceneSheet: EpisodeSceneSheet | null;
  language: AppLanguage;
  onSceneClick: (sceneIndex: number) => void;
  onMessageClick: (messageId: string) => void;
  className?: string;
}

interface TreeSceneNode {
  kind: "scene";
  sceneIndex: number;
  sceneId: string;
  title: string;
  tone: string;
  summary: string;
  characters: string;
  wordCount: number;
  emoji: string;
  toneColor: string;
}

interface TreeMessageNode {
  kind: "message";
  messageId: string;
  role: "user" | "assistant";
  preview: string;
  charCount: number;
  paragraphCount: number;
}

/** Tone → color mapping (semantic tokens only) */
const TONE_COLOR: Record<string, string> = {
  // KO tones
  "감동": "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
  "긴장": "bg-accent-red/15 text-accent-red border-accent-red/30",
  "개그": "bg-accent-green/15 text-accent-green border-accent-green/30",
  "액션": "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
  "일상": "bg-bg-tertiary text-text-secondary border-border",
  "반전": "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
  "공포": "bg-accent-red/15 text-accent-red border-accent-red/30",
  "서사": "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
  // EN tones
  touching: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
  tension: "bg-accent-red/15 text-accent-red border-accent-red/30",
  comedy: "bg-accent-green/15 text-accent-green border-accent-green/30",
  action: "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
  daily: "bg-bg-tertiary text-text-secondary border-border",
  twist: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
  horror: "bg-accent-red/15 text-accent-red border-accent-red/30",
  epic: "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
};

/** Tone → emoji (location/mood visualization) */
const TONE_EMOJI: Record<string, string> = {
  "감동": "\u{1F495}",
  "긴장": "\u{26A1}",
  "개그": "\u{1F923}",
  "액션": "\u{2694}\u{FE0F}",
  "일상": "\u{2615}",
  "반전": "\u{1F300}",
  "공포": "\u{1F47B}",
  "서사": "\u{1F4DC}",
  touching: "\u{1F495}",
  tension: "\u{26A1}",
  comedy: "\u{1F923}",
  action: "\u{2694}\u{FE0F}",
  daily: "\u{2615}",
  twist: "\u{1F300}",
  horror: "\u{1F47B}",
  epic: "\u{1F4DC}",
};

const DEFAULT_TONE_COLOR = "bg-bg-tertiary text-text-secondary border-border";
const DEFAULT_TONE_EMOJI = "\u{1F4D6}"; // book
const SEARCH_DEBOUNCE_MS = 300;

// IDENTITY_SEAL: PART-1 | role=types+constants | inputs=none | outputs=props,tree-node-types,tone-maps

// ============================================================
// PART 2 — Helpers (derivations / labels)
// ============================================================

/** Count "words" / chars safely (latin words OR CJK char-count fallback) */
function estimateWordCount(text: string | undefined | null): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // CJK detection: count characters if CJK-heavy
   
  const cjkMatches = trimmed.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g);
  if (cjkMatches && cjkMatches.length > trimmed.length * 0.3) {
    return cjkMatches.length;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Count paragraph blocks (non-empty lines separated by blank lines) */
function countParagraphs(text: string): number {
  if (!text) return 0;
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
}

/** Short preview (first 100 chars stripped of markdown fences/JSON blobs) */
function stripPreview(text: string, limit = 100): string {
  if (!text) return "";
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{\s*\n?\s*"(?:grade|metrics|tension|pacing|immersion|eos|critique)"[\s\S]*?\}/g, "")
    .trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}\u2026` : cleaned;
}

/** Build sceneEntry → TreeSceneNode */
function buildSceneNode(scene: EpisodeSceneEntry, idx: number, lang: AppLanguage): TreeSceneNode {
  const autoName = L4(lang, {
    ko: `\uC52C ${idx + 1}`,
    en: `Scene ${idx + 1}`,
    ja: `\u30B7\u30FC\u30F3 ${idx + 1}`,
    zh: `\u573A\u666F ${idx + 1}`,
  });
  const title = scene.sceneName?.trim() || autoName;
  const toneKey = (scene.tone || "").trim();
  return {
    kind: "scene",
    sceneIndex: idx,
    sceneId: scene.sceneId || `${idx + 1}`,
    title,
    tone: toneKey,
    summary: scene.summary || "",
    characters: scene.characters || "",
    wordCount: estimateWordCount(scene.summary) + estimateWordCount(scene.keyDialogue),
    emoji: TONE_EMOJI[toneKey] || DEFAULT_TONE_EMOJI,
    toneColor: TONE_COLOR[toneKey] || DEFAULT_TONE_COLOR,
  };
}

/** Build assistant message → TreeMessageNode */
function buildMessageNode(msg: Message): TreeMessageNode | null {
  if (msg.role !== "assistant") return null;
  const content = msg.content || "";
  if (!content.trim()) return null;
  return {
    kind: "message",
    messageId: msg.id,
    role: msg.role,
    preview: stripPreview(content, 80),
    charCount: content.length,
    paragraphCount: countParagraphs(content),
  };
}

/** Match query against any searchable field (case-insensitive) */
function matchesQuery(haystack: string, q: string): boolean {
  if (!q) return true;
  return haystack.toLowerCase().includes(q.toLowerCase());
}

// IDENTITY_SEAL: PART-2 | role=helpers | inputs=scene-entries,messages,query | outputs=tree-nodes,boolean

// ============================================================
// PART 3 — Component
// ============================================================

/**
 * OutlinePanel — VSCode-style outline tree for the current episode.
 * Shows scenes (depth 1) and optionally assistant messages (depth 2).
 * Click → onSceneClick/onMessageClick (parent handles scrolling).
 */
export default function OutlinePanel({
  currentSession,
  currentSceneSheet,
  language,
  onSceneClick,
  onMessageClick,
  className = "",
}: OutlinePanelProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<OutlineFilterMode>("both");
  const [expanded, setExpanded] = useState(true);
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Labels (4-language)
  const labels = useMemo(() => ({
    title: L4(language, { ko: "\uC544\uC6C3\uB77C\uC778", en: "Outline", ja: "\u30A2\u30A6\u30C8\u30E9\u30A4\u30F3", zh: "\u5927\u7EB2" }),
    searchPlaceholder: L4(language, { ko: "\uAC80\uC0C9\u2026", en: "Search\u2026", ja: "\u691C\u7D22\u2026", zh: "\u641C\u7D22\u2026" }),
    filterAll: L4(language, { ko: "\uC804\uCCB4", en: "All", ja: "\u5168\u3066", zh: "\u5168\u90E8" }),
    filterScenes: L4(language, { ko: "\uC52C\uB9CC", en: "Scenes", ja: "\u30B7\u30FC\u30F3\u306E\u307F", zh: "\u4EC5\u573A\u666F" }),
    filterMessages: L4(language, { ko: "\uBA54\uC2DC\uC9C0\uB9CC", en: "Messages", ja: "\u30E1\u30C3\u30BB\u30FC\u30B8\u306E\u307F", zh: "\u4EC5\u6D88\u606F" }),
    emptyNoSession: L4(language, { ko: "\uC5D0\uD53C\uC18C\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4", en: "No active episode", ja: "\u30A8\u30D4\u30BD\u30FC\u30C9\u304C\u3042\u308A\u307E\u305B\u3093", zh: "\u6CA1\u6709\u6D3B\u52A8\u7AE0\u8282" }),
    emptyNoScenes: L4(language, { ko: "\uC52C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4", en: "No scenes yet", ja: "\u30B7\u30FC\u30F3\u304C\u3042\u308A\u307E\u305B\u3093", zh: "\u6682\u65E0\u573A\u666F" }),
    emptyNoResults: L4(language, { ko: "\uAC80\uC0C9 \uACB0\uACFC \uC5C6\uC74C", en: "No matches", ja: "\u4E00\u81F4\u306A\u3057", zh: "\u65E0\u5339\u914D" }),
    scenesHeader: L4(language, { ko: "\uC52C", en: "Scenes", ja: "\u30B7\u30FC\u30F3", zh: "\u573A\u666F" }),
    messagesHeader: L4(language, { ko: "NOA \uBA54\uC2DC\uC9C0", en: "NOA Messages", ja: "NOA \u30E1\u30C3\u30BB\u30FC\u30B8", zh: "NOA \u6D88\u606F" }),
    episodeLabel: L4(language, { ko: "\uD654", en: "Ep.", ja: "\u8A71", zh: "\u8BDD" }),
    wordsLabel: L4(language, { ko: "\uC790", en: "chars", ja: "\u5B57", zh: "\u5B57" }),
    paraLabel: L4(language, { ko: "\uB2E8\uB77D", en: "para", ja: "\u6BB5\u843D", zh: "\u6BB5" }),
    toggleAria: L4(language, { ko: "\uD328\uB110 \uC811\uAE30/\uD3BC\uCE58\uAE30", en: "Toggle panel", ja: "\u30D1\u30CD\u30EB\u306E\u958B\u9589", zh: "\u5207\u6362\u9762\u677F" }),
  }), [language]);

  // Derived scene nodes (filtered by debounced search)
  const sceneNodes = useMemo<TreeSceneNode[]>(() => {
    if (!currentSceneSheet?.scenes?.length) return [];
    const all = currentSceneSheet.scenes.map((s, i) => buildSceneNode(s, i, language));
    if (!debouncedSearch) return all;
    return all.filter(n =>
      matchesQuery(n.title, debouncedSearch) ||
      matchesQuery(n.summary, debouncedSearch) ||
      matchesQuery(n.characters, debouncedSearch) ||
      matchesQuery(n.tone, debouncedSearch),
    );
  }, [currentSceneSheet, language, debouncedSearch]);

  // Derived message nodes (filtered)
  const messageNodes = useMemo<TreeMessageNode[]>(() => {
    if (!currentSession?.messages?.length) return [];
    const all = currentSession.messages
      .map(buildMessageNode)
      .filter((n): n is TreeMessageNode => n !== null);
    if (!debouncedSearch) return all;
    return all.filter(n => matchesQuery(n.preview, debouncedSearch));
  }, [currentSession, debouncedSearch]);

  // Flat focusable list (for ↑↓ nav)
  const flatNodes = useMemo(() => {
    const list: ({ type: "scene"; data: TreeSceneNode } | { type: "msg"; data: TreeMessageNode })[] = [];
    if (filter !== "messages") {
      for (const s of sceneNodes) list.push({ type: "scene", data: s });
    }
    if (filter !== "scenes") {
      for (const m of messageNodes) list.push({ type: "msg", data: m });
    }
    return list;
  }, [filter, sceneNodes, messageNodes]);

  // Click handlers (useCallback)
  const handleSceneClick = useCallback((idx: number) => {
    try {
      onSceneClick(idx);
    } catch (err) {
      logger.warn("OutlinePanel", "scene click handler threw", err);
    }
  }, [onSceneClick]);

  const handleMessageClick = useCallback((id: string) => {
    try {
      onMessageClick(id);
    } catch (err) {
      logger.warn("OutlinePanel", "message click handler threw", err);
    }
  }, [onMessageClick]);

  const toggleSceneExpand = useCallback((idx: number) => {
    setExpandedScenes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (flatNodes.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex(prev => Math.min(prev + 1, flatNodes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && focusIndex >= 0 && focusIndex < flatNodes.length) {
      e.preventDefault();
      const node = flatNodes[focusIndex];
      if (node.type === "scene") handleSceneClick(node.data.sceneIndex);
      else handleMessageClick(node.data.messageId);
    }
  }, [flatNodes, focusIndex, handleSceneClick, handleMessageClick]);

  // Mobile-only bottom-sheet responsive classes. Desktop (≥md) keeps
  // original sidebar; mobile slides up from the bottom with a drag handle.
  const asideClass =
    "flex flex-col bg-bg-secondary border-border " +
    "md:border-r md:relative md:w-[260px] md:h-auto md:max-h-none " +
    "fixed bottom-0 left-0 right-0 max-h-[60vh] border-t md:border-t-0 " +
    "shadow-lg md:shadow-none rounded-t-lg md:rounded-none " +
    `md:static ${className}`;
  const asideStyle: React.CSSProperties = {
    zIndex: "var(--z-modal, 50)" as unknown as number,
  };

  // Render — empty state
  if (!currentSession) {
    return (
      <aside
        className={asideClass}
        style={asideStyle}
        aria-label={labels.title}
        data-testid="outline-panel-root"
      >
        <div className="md:hidden h-1 w-12 mx-auto my-2 bg-border rounded-full" aria-hidden="true" />
        <div className="px-3 py-2 border-b border-border">
          <span className="text-[11px] font-black text-text-tertiary uppercase tracking-widest font-mono">
            {labels.title}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-[11px] text-text-tertiary italic text-center">{labels.emptyNoSession}</p>
        </div>
      </aside>
    );
  }

  const episodeTitle =
    currentSceneSheet?.title?.trim() ||
    currentSession.title?.trim() ||
    `${labels.episodeLabel} ${currentSession.config.episode ?? 1}`;
  const hasScenes = sceneNodes.length > 0;
  const hasMessages = messageNodes.length > 0;
  const showEmptyResults = debouncedSearch.length > 0 && !hasScenes && !hasMessages;

  return (
    <aside
      ref={rootRef}
      className={asideClass}
      style={asideStyle}
      aria-label={labels.title}
      data-testid="outline-panel-root"
    >
      {/* Drag handle — mobile only */}
      <div className="md:hidden h-1 w-12 mx-auto my-2 bg-border rounded-full" aria-hidden="true" />
      {/* Header + toggle */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(p => !p)}
          className="min-h-[20px] min-w-[20px] p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          aria-label={labels.toggleAria}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <FileText size={14} className="text-accent-purple shrink-0" />
        <span className="text-[11px] font-black text-text-primary uppercase tracking-widest font-mono truncate">
          {labels.title}
        </span>
      </div>

      {expanded && (
        <>
          {/* Search box */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchPlaceholder}
                className="w-full min-h-[32px] pl-7 pr-2 py-1 text-[11px] bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus:border-accent-purple"
              />
            </div>
          </div>

          {/* Filter toggle */}
          <div className="px-3 py-2 border-b border-border flex items-center gap-1" role="tablist" aria-label={labels.title}>
            <Filter size={11} className="text-text-tertiary shrink-0" />
            {(["both", "scenes", "messages"] as OutlineFilterMode[]).map(mode => {
              const label = mode === "both" ? labels.filterAll : mode === "scenes" ? labels.filterScenes : labels.filterMessages;
              const active = filter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(mode)}
                  className={`min-h-[24px] px-2 py-0.5 text-[10px] font-bold rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                    active
                      ? "bg-accent-purple text-white"
                      : "bg-bg-primary text-text-tertiary hover:text-text-primary border border-border"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tree body */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden outline-none"
            role="tree"
            aria-label={labels.title}
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            {/* Episode root */}
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-text-primary font-bold truncate" title={episodeTitle}>
                <span className="text-accent-purple" aria-hidden="true">{"\u{1F4D6}"}</span>
                <span className="truncate">{episodeTitle}</span>
                <span className="ml-auto text-[9px] text-text-tertiary font-mono shrink-0">
                  {labels.episodeLabel} {currentSession.config.episode ?? 1}
                </span>
              </div>
            </div>

            {/* Empty states */}
            {showEmptyResults && (
              <p className="px-3 py-4 text-[11px] text-text-tertiary italic text-center">{labels.emptyNoResults}</p>
            )}
            {!showEmptyResults && !hasScenes && !hasMessages && (
              <p className="px-3 py-4 text-[11px] text-text-tertiary italic text-center">{labels.emptyNoScenes}</p>
            )}

            {/* Scene group */}
            {filter !== "messages" && hasScenes && (
              <div className="py-1" role="group" aria-label={labels.scenesHeader}>
                <div className="px-3 py-1 text-[9px] font-black text-text-tertiary uppercase tracking-widest font-mono">
                  {labels.scenesHeader} ({sceneNodes.length})
                </div>
                <ul className="space-y-0.5" role="group">
                  {sceneNodes.map((node, idx) => {
                    const flatIdx = idx;
                    const isFocused = focusIndex === flatIdx;
                    const isOpen = expandedScenes.has(node.sceneIndex);
                    const relMessages = filter === "both" && isOpen
                      ? messageNodes.slice(0, Math.ceil(messageNodes.length / Math.max(sceneNodes.length, 1)))
                      : [];
                    return (
                      <li key={`${node.sceneId}-${node.sceneIndex}`} role="treeitem" aria-selected={isFocused} aria-expanded={filter === "both" ? isOpen : undefined}>
                        <div
                          className={`flex items-start gap-1 px-2 py-1.5 mx-1 min-h-[44px] rounded cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                            isFocused ? "bg-accent-purple/15 border border-accent-purple/30" : "hover:bg-bg-tertiary border border-transparent"
                          }`}
                          title={node.summary || node.title}
                          onClick={() => {
                            setFocusIndex(flatIdx);
                            handleSceneClick(node.sceneIndex);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSceneClick(node.sceneIndex);
                            }
                          }}
                          tabIndex={-1}
                        >
                          {filter === "both" ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleSceneExpand(node.sceneIndex); }}
                              className="shrink-0 mt-0.5 text-text-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                              aria-label={isOpen ? "Collapse" : "Expand"}
                              aria-expanded={isOpen}
                            >
                              {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </button>
                          ) : (
                            <span className="shrink-0 w-[11px]" />
                          )}
                          <span className="shrink-0 text-sm leading-none mt-0.5" aria-hidden="true">{node.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-text-tertiary font-mono shrink-0">#{node.sceneId}</span>
                              <span className="text-[11px] font-bold text-text-primary truncate">{node.title}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {node.tone && (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${node.toneColor}`}
                                  aria-label={`tone: ${node.tone}`}
                                >
                                  {node.tone}
                                </span>
                              )}
                              {node.wordCount > 0 && (
                                <span className="text-[9px] text-text-tertiary font-mono">
                                  {node.wordCount} {labels.wordsLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sub-tree: messages under scene (depth 2, simple first-N slice) */}
                        {filter === "both" && isOpen && relMessages.length > 0 && (
                          <ul className="ml-4 border-l border-border pl-2 space-y-0.5 my-1" role="group">
                            {relMessages.map(msg => (
                              <li key={msg.messageId} role="treeitem" aria-selected={false}>
                                <button
                                  type="button"
                                  onClick={() => handleMessageClick(msg.messageId)}
                                  className="w-full text-left flex items-start gap-1 px-2 py-1 min-h-[32px] rounded hover:bg-bg-tertiary text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                                  title={msg.preview}
                                >
                                  <MessageSquare size={10} className="shrink-0 mt-0.5 text-accent-blue" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] truncate">{msg.preview || "\u2014"}</div>
                                    <div className="text-[9px] text-text-tertiary font-mono mt-0.5">
                                      {msg.paragraphCount} {labels.paraLabel} {"\u00B7"} {msg.charCount} {labels.wordsLabel}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Standalone messages group (filter=messages only) */}
            {filter === "messages" && hasMessages && (
              <div className="py-1" role="group" aria-label={labels.messagesHeader}>
                <div className="px-3 py-1 text-[9px] font-black text-text-tertiary uppercase tracking-widest font-mono">
                  {labels.messagesHeader} ({messageNodes.length})
                </div>
                <ul className="space-y-0.5" role="group">
                  {messageNodes.map((msg, idx) => {
                    const flatIdx = idx;
                    const isFocused = focusIndex === flatIdx;
                    return (
                      <li key={msg.messageId} role="treeitem" aria-selected={isFocused}>
                        <button
                          type="button"
                          onClick={() => { setFocusIndex(flatIdx); handleMessageClick(msg.messageId); }}
                          className={`w-full text-left flex items-start gap-1 mx-1 px-2 py-1.5 min-h-[44px] rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                            isFocused ? "bg-accent-purple/15 border border-accent-purple/30" : "hover:bg-bg-tertiary border border-transparent"
                          }`}
                          title={msg.preview}
                        >
                          <MessageSquare size={11} className="shrink-0 mt-0.5 text-accent-blue" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-text-primary truncate">{msg.preview || "\u2014"}</div>
                            <div className="text-[9px] text-text-tertiary font-mono mt-0.5">
                              {msg.paragraphCount} {labels.paraLabel} {"\u00B7"} {msg.charCount} {labels.wordsLabel}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

// IDENTITY_SEAL: PART-3 | role=component | inputs=session,scene-sheet,language,callbacks | outputs=JSX

// ============================================================
// PART 4 — Exports (named helpers for tests)
// ============================================================

export { buildSceneNode, buildMessageNode, estimateWordCount, countParagraphs, stripPreview, matchesQuery };

// IDENTITY_SEAL: PART-4 | role=exports | inputs=none | outputs=helpers-for-tests
