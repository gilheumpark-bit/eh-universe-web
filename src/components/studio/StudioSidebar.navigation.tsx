"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Edit3,
  FileText,
  Globe,
  Hash,
  History,
  PenTool,
  UserCircle,
  Zap,
} from "lucide-react";
import { createT, L4 } from "@/lib/i18n";
import type { AppLanguage, AppTab, ChatSession } from "@/lib/studio-types";
import type { StudioSidebarConfirmOpts } from "./StudioSidebarFooter";

type StudioMode = "guided" | "free";

const NAV_COLORS = {
  amber: {
    active: "border-accent-amber/30 bg-gradient-to-r from-accent-amber/15 to-accent-amber/5 shadow-[0_0_20px_rgba(202,161,92,0.1)]",
    icon: "border-accent-amber/25 bg-accent-amber/15 text-accent-amber",
    text: "text-accent-amber",
    glow: "from-accent-amber/10",
    indicator: "bg-accent-amber shadow-[0_0_8px_rgba(202,161,92,0.8)]",
  },
  purple: {
    active: "border-accent-purple/30 bg-gradient-to-r from-accent-purple/15 to-accent-purple/5 shadow-[0_0_20px_rgba(141,123,195,0.1)]",
    icon: "border-accent-purple/25 bg-accent-purple/15 text-accent-purple",
    text: "text-accent-purple",
    glow: "from-accent-purple/10",
    indicator: "bg-accent-purple shadow-[0_0_8px_rgba(141,123,195,0.8)]",
  },
  blue: {
    active: "border-accent-blue/30 bg-gradient-to-r from-accent-blue/15 to-accent-blue/5 shadow-[0_0_20px_rgba(92,143,214,0.1)]",
    icon: "border-accent-blue/25 bg-accent-blue/15 text-accent-blue",
    text: "text-accent-blue",
    glow: "from-accent-blue/10",
    indicator: "bg-accent-blue shadow-[0_0_8px_rgba(92,143,214,0.8)]",
  },
  green: {
    active: "border-accent-green/30 bg-gradient-to-r from-accent-green/15 to-accent-green/5 shadow-[0_0_20px_rgba(47,155,131,0.1)]",
    icon: "border-accent-green/25 bg-accent-green/15 text-accent-green",
    text: "text-accent-green",
    glow: "from-accent-green/10",
    indicator: "bg-accent-green shadow-[0_0_8px_rgba(47,155,131,0.8)]",
  },
} as const;

export function StudioSidebarNavigation({
  activeTab,
  closeConfirm,
  currentSessionId,
  handleTabChange,
  hydrated,
  language,
  onReorderSessions,
  orderedSessions,
  setCurrentSessionId,
  setStudioMode,
  showConfirm,
  studioMode,
}: {
  activeTab: AppTab;
  closeConfirm: () => void;
  currentSessionId: string | null;
  handleTabChange: (tab: AppTab) => void;
  hydrated: boolean;
  language: AppLanguage;
  onReorderSessions?: (fromIndex: number, toIndex: number) => void;
  orderedSessions: ChatSession[];
  setCurrentSessionId: (id: string | null) => void;
  setStudioMode: (mode: StudioMode) => void;
  showConfirm: (opts: StudioSidebarConfirmOpts) => void;
  studioMode: StudioMode;
}) {
  const t = createT(language);
  const [showSessionList, setShowSessionList] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState(false);

  function handleEpisodeJump() {
    const idx = parseInt(jumpValue, 10) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx >= orderedSessions.length) return;
    setCurrentSessionId(orderedSessions[idx].id);
    setShowSessionList(false);
    setJumpValue("");
  }

  const navItems = [
    { tab: "world" as AppTab, icon: Globe, label: t("sidebar.worldStudio"), guided: true, color: "amber", primary: true },
    { tab: "characters" as AppTab, icon: UserCircle, label: t("sidebar.characterStudio"), guided: true, color: "purple", primary: true },
    { tab: "direction" as AppTab, icon: FileText, label: L4(language, { ko: "연출", en: "Direction", ja: "演出", zh: "演出" }), guided: true, color: "blue", primary: true },
    { tab: "writing" as AppTab, icon: PenTool, label: t("sidebar.writingMode"), guided: false, color: "green", primary: true },
    { tab: "style" as AppTab, icon: Edit3, label: t("sidebar.styleStudio"), guided: false, color: "amber", primary: false },
    { tab: "manuscript" as AppTab, icon: FileText, label: t("ui.manuscript"), guided: false, color: "purple", primary: false },
    { tab: "visual" as AppTab, icon: Zap, label: language === "KO" ? "비주얼 설계" : "Visual Design", guided: false, color: "green", primary: false },
    { tab: "history" as AppTab, icon: History, label: t("sidebar.archives"), guided: false, color: "blue", primary: false },
    { tab: "docs" as AppTab, icon: BookOpen, label: language === "KO" ? "사용설명서" : "User Guide", guided: true, color: "amber", primary: true },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {!hydrated ? (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary min-w-[80px]">
            {language === "KO" ? "로딩..." : "Loading..."}
          </span>
          <div className="w-[44px] h-[24px] rounded-full bg-white/15" />
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary min-w-[80px]">
            {studioMode === "guided"
              ? (language === "KO" ? "가이드 모드" : "Guided Mode")
              : (language === "KO" ? "자유 모드" : "Free Mode")}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = studioMode === "guided" ? "free" : "guided";
              setStudioMode(next);
              localStorage.setItem("noa_studio_mode", next);
            }}
            className={`relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              studioMode === "free" ? "bg-accent-purple" : "bg-white/15"
            } studio-mode-switch`}
            aria-label={language === "KO" ? "모드 전환" : "Toggle mode"}
          >
            <span
              className={`pointer-events-none absolute top-[2px] rounded-full bg-white shadow-md transition-transform duration-200 ${
                studioMode === "free" ? "translate-x-[22px]" : "translate-x-[2px]"
              } studio-mode-thumb`}
            />
          </button>
        </div>
      )}

      <nav className="space-y-1.5" role="tablist" aria-label="Studio navigation">
        {studioMode === "free" && (
          <div className="px-3 pt-1 pb-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary">{language === "KO" ? "주요" : "PRIMARY"}</span>
          </div>
        )}
        {navItems
          .filter((item) => studioMode === "free" || item.guided)
          .map(({ tab, icon: Icon, label, color, primary }, idx, arr) => {
            const prevItem = idx > 0 ? arr[idx - 1] : null;
            const showDivider = studioMode === "free" && !primary && prevItem?.primary;
            const isActive = activeTab === tab;
            const c = NAV_COLORS[color];

            return (
              <React.Fragment key={tab}>
                {showDivider && (
                  <div className="px-3 pt-3 pb-1">
                    <div className="h-px bg-border/30 mb-2" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary">{language === "KO" ? "고급" : "ADVANCED"}</span>
                  </div>
                )}
                <button
                  data-testid={`tab-${tab}`}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab)}
                  className={`
                    group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left overflow-hidden
                    transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out
                    ${isActive
                      ? `border ${c.active} backdrop-blur-sm`
                      : "border border-transparent text-text-secondary hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary active:scale-[0.98]"
                    }
                  `}
                >
                  {isActive && (
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${c.indicator} studio-scale-in-x`}
                    />
                  )}
                  <span
                    className={`
                      flex h-9 w-9 items-center justify-center rounded-xl border
                      transition-[background-color,border-color,color] duration-200
                      ${isActive ? c.icon : "border-white/8 bg-black/20 text-text-tertiary group-hover:border-white/12 group-hover:text-text-secondary"}
                    `}
                  >
                    <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span className={`
                    font-mono text-[11px] font-semibold uppercase tracking-[0.1em]
                    transition-colors duration-200
                    ${isActive ? c.text : ""}
                  `}>
                    {label}
                  </span>
                  {!isActive && (
                    <span className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r ${c.glow} to-transparent`} />
                  )}
                </button>
              </React.Fragment>
            );
          })}
      </nav>

      {orderedSessions.length > 0 && (
        <div className="mt-5 rounded-3xl border border-white/8 bg-black/20 p-4">
          <div className="mb-3 flex w-full items-center justify-between gap-2">
            <button
              onClick={() => setShowSessionList((prev) => !prev)}
              aria-expanded={showSessionList}
              aria-label={L4(language, { ko: `에피소드 목록 ${showSessionList ? "접기" : "펼치기"}`, en: `${showSessionList ? "Collapse" : "Expand"} episode list`, ja: `エピソード一覧を${showSessionList ? "折りたたむ" : "展開"}`, zh: `${showSessionList ? "收起" : "展开"}剧集列表` })}
              className="flex items-center gap-2 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
            >
              <span className="flex items-center gap-2 site-kicker text-[0.58rem]">
                <Hash className="h-3 w-3" />
                {language === "KO" ? `에피소드 (${orderedSessions.length})` : `Episodes (${orderedSessions.length})`}
              </span>
              <span className="text-[10px] text-text-tertiary">{showSessionList ? "▲" : "▼"}</span>
            </button>
            {showSessionList && orderedSessions.length > 1 && (
              <button
                onClick={() => { setBatchMode((prev) => !prev); setSelectedSessionIds(new Set()); }}
                aria-pressed={batchMode}
                aria-label={language === "KO" ? `일괄 선택 모드 ${batchMode ? "끄기" : "켜기"}` : `Turn batch select mode ${batchMode ? "off" : "on"}`}
                className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                  batchMode ? "bg-accent-purple/20 text-accent-purple border-accent-purple/30" : "text-text-tertiary border-white/8 hover:text-text-secondary"
                }`}
                title={language === "KO" ? "일괄 선택 모드" : "Batch select mode"}
              >
                {language === "KO" ? "일괄" : "Batch"}
              </button>
            )}
          </div>

          {showSessionList && batchMode && orderedSessions.length > 1 && (
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSessionIds.size === orderedSessions.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSessionIds(new Set(orderedSessions.map((session) => session.id)));
                    } else {
                      setSelectedSessionIds(new Set());
                    }
                  }}
                  className="accent-[rgba(202,161,92,0.8)]"
                />
                {language === "KO" ? "전체 선택" : "Select All"}
              </label>
              {selectedSessionIds.size > 0 && (
                <>
                  <span className="text-[9px] text-text-tertiary font-mono">
                    ({selectedSessionIds.size})
                  </span>
                  <button
                    onClick={() => {
                      showConfirm({
                        title: language === "KO" ? "일괄 삭제" : "Batch Delete",
                        message: language === "KO"
                          ? `${selectedSessionIds.size}개 에피소드를 삭제하시겠습니까?`
                          : `Delete ${selectedSessionIds.size} episodes?`,
                        variant: "danger",
                        confirmLabel: language === "KO" ? "삭제" : "Delete",
                        cancelLabel: language === "KO" ? "취소" : "Cancel",
                        onConfirm: () => {
                          closeConfirm();
                          window.dispatchEvent(new CustomEvent("noa:batch-delete", {
                            detail: { ids: Array.from(selectedSessionIds) },
                          }));
                          setSelectedSessionIds(new Set());
                          setBatchMode(false);
                        },
                      });
                    }}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider text-accent-red hover:text-accent-red hover:bg-accent-red/10 active:animate-delete-warning transition-[background-color,color] duration-200"
                    title={language === "KO" ? "선택 삭제" : "Delete selected"}
                  >
                    {language === "KO" ? "삭제" : "Del"}
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("noa:batch-export", {
                        detail: { ids: Array.from(selectedSessionIds) },
                      }));
                      setSelectedSessionIds(new Set());
                      setBatchMode(false);
                    }}
                    className="text-[9px] font-bold font-mono uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
                    title={language === "KO" ? "선택 내보내기" : "Export selected"}
                  >
                    {language === "KO" ? "내보내기" : "Export"}
                  </button>
                </>
              )}
            </div>
          )}

          {showSessionList && (
            <div className="mb-3 max-h-36 overflow-y-auto space-y-1 pr-1">
              {(orderedSessions.length > 50 ? orderedSessions.slice(0, 50) : orderedSessions).map((session, i) => (
                <button
                  key={session.id}
                  draggable={!!onReorderSessions && !batchMode}
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null && dragIdx !== i && onReorderSessions) {
                      onReorderSessions(dragIdx, i);
                    }
                    setDragIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  onClick={(e) => {
                    if (batchMode) {
                      if (e.shiftKey && lastClickedIdx !== null) {
                        const start = Math.min(lastClickedIdx, i);
                        const end = Math.max(lastClickedIdx, i);
                        const range = orderedSessions.slice(start, end + 1).map((selectedSession) => selectedSession.id);
                        setSelectedSessionIds((prev) => {
                          const next = new Set(prev);
                          for (const id of range) next.add(id);
                          return next;
                        });
                      } else {
                        setSelectedSessionIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(session.id)) next.delete(session.id);
                          else next.add(session.id);
                          return next;
                        });
                      }
                      setLastClickedIdx(i);
                    } else {
                      setCurrentSessionId(session.id);
                      setShowSessionList(false);
                    }
                  }}
                  className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-[background-color,border-color,box-shadow,color] border overflow-hidden ${
                    batchMode && selectedSessionIds.has(session.id)
                      ? "border-accent-purple/30 bg-accent-purple/15 text-accent-purple shadow-[0_0_15px_rgba(141,123,195,0.1)]"
                      : currentSessionId === session.id
                        ? "border-[rgba(202,161,92,0.3)] bg-gradient-to-r from-[rgba(202,161,92,0.15)] to-[rgba(202,161,92,0.05)] text-text-primary shadow-[0_0_15px_rgba(202,161,92,0.1)] backdrop-blur-md"
                        : "border-transparent text-text-tertiary hover:border-white/10 hover:bg-white/[0.04] hover:text-text-secondary hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                  } ${dragIdx === i ? "opacity-40" : ""} ${dragOverIdx === i && dragIdx !== i ? "border-t-2 border-accent-purple" : ""}`}
                  title={batchMode ? (language === "KO" ? "Shift+클릭으로 범위 선택" : "Shift+click for range select") : (language === "KO" ? "드래그하여 순서 변경" : "Drag to reorder")}
                >
                  {currentSessionId !== session.id && !batchMode && (
                    <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-[rgba(202,161,92,0.08)] to-transparent" />
                  )}
                  {currentSessionId === session.id && (
                    <span
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent-amber shadow-[0_0_8px_rgba(202,161,92,0.8)] studio-scale-in-y"
                    />
                  )}
                  {batchMode && (
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.has(session.id)}
                      readOnly
                      className="accent-[rgba(202,161,92,0.8)] shrink-0 pointer-events-none z-10"
                    />
                  )}
                  {!batchMode && onReorderSessions && (
                    <span className="text-[10px] text-text-tertiary cursor-grab shrink-0 z-10 hover:text-text-secondary" title={language === "KO" ? "드래그 핸들" : "Drag handle"}>⠿</span>
                  )}
                  <span className="font-mono text-[10px] font-black w-5 text-right shrink-0 text-text-tertiary z-10">
                    {i + 1}
                  </span>
                  <span className="flex flex-col min-w-0 z-10 relative">
                    <span className="truncate font-mono text-[11px] font-semibold">
                      {session.title}
                    </span>
                    {(() => {
                      const ms = session.config?.manuscripts?.find((manuscript) => manuscript.episode === session.config.episode);
                      const summary = ms?.summary;
                      return (
                        <span className="truncate text-[10px] text-text-tertiary leading-tight mt-0.5 line-clamp-2">
                          {summary || (language === "KO" ? "요약 생성 중..." : "Generating summary...")}
                        </span>
                      );
                    })()}
                  </span>
                </button>
              ))}
              {orderedSessions.length > 50 && (
                <p className="text-center text-[9px] text-text-tertiary py-1">
                  +{orderedSessions.length - 50} {language === "KO" ? "개 더 — 아래 점프 사용" : "more — use jump below"}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={orderedSessions.length}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleEpisodeJump(); }}
              placeholder={`1–${orderedSessions.length}`}
              className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/4 px-3 py-2 font-mono text-[11px] font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors hover:border-[rgba(202,161,92,0.2)] focus:border-[rgba(92,143,214,0.4)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              onClick={handleEpisodeJump}
              aria-label={language === "KO" ? "에피소드로 이동" : "Jump to episode"}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-text-secondary transition-[border-color,color] hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              title={language === "KO" ? "이동" : "Jump"}
            >
              <span className="text-[12px] font-black">↵</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
