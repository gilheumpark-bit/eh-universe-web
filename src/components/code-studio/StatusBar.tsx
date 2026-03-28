"use client";

import { useState, useEffect, useCallback } from "react";
import { GitBranch, CheckCircle, AlertTriangle, XCircle, Wifi, Plus, Minus, Cpu, Users, Zap, BarChart3, Bell } from "lucide-react";
import type { OpenFile, PipelineResult } from "@/lib/types";
import { getActiveProvider, getActiveModel, PROVIDERS } from "@/lib/ai-providers";
import { getUsageSummary } from "@/lib/usage-tracker";
import { useLocale } from "@/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

interface Props {
  activeFile: OpenFile | null;
  pipelineResult: PipelineResult | null;
  cursorLine?: number;
  cursorColumn?: number;
  fontSize?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onSwitchProvider?: () => void;
  connectedUsers?: number;
  pairProgramming?: boolean;
  gitBranch?: string;
  selectionInfo?: { characters: number; lines: number } | null;
  notifications?: Array<{ id: string; message: string; time: string }>;
  onChangeEncoding?: (encoding: string) => void;
  onToggleLineEnding?: () => void;
}

export function StatusBar({
  activeFile, pipelineResult, cursorLine, cursorColumn, fontSize,
  onZoomIn, onZoomOut, onZoomReset, onSwitchProvider,
  connectedUsers = 0, pairProgramming = false, gitBranch,
  selectionInfo, notifications = [],
  onChangeEncoding, onToggleLineEnding,
}: Props) {
  const { t } = useLocale();
  const [showNotifications, setShowNotifications] = useState(false);
  // AI provider & model info — initialize eagerly to avoid setState in effect
  const [providerInfo, setProviderInfo] = useState(() => {
    if (typeof window === "undefined") return { name: "", model: "", color: "" };
    const pid = getActiveProvider();
    const pDef = PROVIDERS[pid];
    const model = getActiveModel();
    return { name: pDef?.name ?? pid, model, color: pDef?.color ?? "#888" };
  });
  const [todayCost, setTodayCost] = useState(() => {
    if (typeof window === "undefined") return 0;
    return getUsageSummary().todayCost;
  });
  const [todayTokens, setTodayTokens] = useState(() => {
    if (typeof window === "undefined") return 0;
    const s = getUsageSummary();
    return s.totalInputTokens + s.totalOutputTokens;
  });

  const refreshProviderInfo = useCallback(() => {
    if (typeof window === "undefined") return;
    const pid = getActiveProvider();
    const pDef = PROVIDERS[pid];
    const model = getActiveModel();
    setProviderInfo({ name: pDef?.name ?? pid, model, color: pDef?.color ?? "#888" });
  }, []);

  const refreshUsage = useCallback(() => {
    if (typeof window === "undefined") return;
    const summary = getUsageSummary();
    setTodayCost(summary.todayCost);
    setTodayTokens(summary.totalInputTokens + summary.totalOutputTokens);
  }, []);

  useEffect(() => {
    // Refresh on provider changes and periodically
    const interval = setInterval(() => { refreshProviderInfo(); refreshUsage(); }, 15_000);
    const handleProviderChange = () => refreshProviderInfo();
    window.addEventListener("storage", handleProviderChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleProviderChange);
    };
  }, [refreshProviderInfo, refreshUsage]);

  // Resolve branch: prop > fallback "main"
  const branch = gitBranch || "main";

  const statusIcon = pipelineResult
    ? pipelineResult.overallStatus === "pass"
      ? <CheckCircle size={12} className="text-green-300" />
      : pipelineResult.overallStatus === "warn"
      ? <AlertTriangle size={12} className="text-yellow-300" />
      : <XCircle size={12} className="text-red-300" />
    : null;

  const fileSize = activeFile
    ? (new TextEncoder().encode(activeFile.content).length / 1024).toFixed(1) + " KB"
    : null;

  const scoreBadgeColor = pipelineResult
    ? pipelineResult.overallScore >= 80 ? "bg-green-500/30"
      : pipelineResult.overallScore >= 50 ? "bg-yellow-500/30"
      : "bg-red-500/30"
    : "";

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  /* Shared style for clickable status-bar items */
  const clickableItemClass = "hover:bg-white/20 rounded px-1.5 py-0.5 transition-colors duration-150";

  return (
    <div className="flex items-center justify-between px-3 bg-[var(--accent-blue)] text-white text-[11px] leading-[11px] select-none overflow-x-auto" style={{ height: 24 }}>
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Git branch (real, from prop) */}
        <span className="flex items-center gap-1">
          <GitBranch size={12} /> {branch}
        </span>

        {/* Separator */}
        <span className="w-px h-3 bg-white/20" />

        {/* AI provider + model (clickable to switch) */}
        <button
          onClick={onSwitchProvider}
          className={`flex items-center gap-1 ${clickableItemClass}`}
          title={t('status.modelChange')}
          aria-label={t('status.modelChange')}
        >
          <Cpu size={10} />
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: providerInfo.color }}
          />
          <span className="truncate max-w-[120px]" style={{ color: providerInfo.color }}>{providerInfo.model || providerInfo.name}</span>
        </button>

        {/* Separator */}
        <span className="w-px h-3 bg-white/20 hidden sm:block" />

        {/* Token usage today — hidden on small screens */}
        <span className="hidden sm:flex items-center gap-1 opacity-80" title={t('status.todayCost', { cost: todayCost.toFixed(4) })}>
          <BarChart3 size={10} />
          {formatTokens(todayTokens)} tok
          {todayCost > 0 && <span className="opacity-60">(${todayCost.toFixed(3)})</span>}
        </span>

        {/* Pipeline score badge */}
        {pipelineResult && (
          <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${scoreBadgeColor}`}>
            {statusIcon}
            {pipelineResult.overallScore}/100
          </span>
        )}

        {/* Pair programming indicator — hidden on small screens */}
        {pairProgramming && (
          <span className="hidden sm:flex items-center gap-1 bg-purple-500/30 rounded px-1.5 py-0.5" title={t('status.pairProgrammingActive')}>
            <Zap size={10} />
            Pair
          </span>
        )}

        {/* Collaboration status — hidden on small screens */}
        <span className="hidden sm:flex items-center gap-1 opacity-70">
          {connectedUsers > 0 ? (
            <>
              <Users size={10} />
              {t('status.usersOnline', { count: connectedUsers })}
            </>
          ) : (
            <>
              <Wifi size={10} /> {t('status.connected')}
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {activeFile && (
          <>
            {cursorLine != null && cursorColumn != null && (
              <span title={t('status.cursorPos', { line: cursorLine, col: cursorColumn })}>Ln {cursorLine}, Col {cursorColumn}</span>
            )}

            {/* Separator */}
            <span className="w-px h-3 bg-white/20" />

            {/* Selection count — hidden on small screens */}
            {selectionInfo && selectionInfo.characters > 0 && (
              <span className="hidden sm:inline bg-white/10 rounded px-1" title={t('status.selectionInfo')}>
                {t('status.selectedChars', { count: selectionInfo.characters, lines: selectionInfo.lines })}
              </span>
            )}
            <span title={t('status.language', { lang: activeFile.language })}>{activeFile.language}</span>
            {/* File encoding — hidden on small screens */}
            <button
              onClick={() => onChangeEncoding?.(prompt(t('status.encodingPrompt'), "UTF-8") || "UTF-8")}
              className={`hidden sm:inline ${clickableItemClass}`}
              title={t('status.changeEncoding')}
              aria-label={t('status.changeEncodingLabel')}
            >UTF-8</button>
            {/* Line ending indicator — hidden on small screens */}
            <button
              onClick={() => onToggleLineEnding?.()}
              className={`hidden sm:inline ${clickableItemClass}`}
              title={t('status.toggleLineEnding')}
              aria-label={t('status.toggleLineEndingLabel')}
            >{activeFile.content.includes("\r\n") ? "CRLF" : "LF"}</button>
            {/* Total line count — hidden on small screens */}
            <span className="hidden sm:inline" title={t('status.totalLinesTitle', { count: activeFile.content.split("\n").length })}>{activeFile.content.split("\n").length} lines</span>
            {fileSize && <span className="hidden sm:inline" title={t('status.fileSizeTitle', { size: fileSize })}>{fileSize}</span>}
          </>
        )}

        {/* Separator */}
        <span className="w-px h-3 bg-white/20" />

        {/* Notification bell */}
        <span className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className={`relative ${clickableItemClass}`}
            title={t('status.notifications')}
            aria-label={t('status.notifications')}
          >
            <Bell size={11} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent-red)] rounded-full text-[7px] flex items-center justify-center font-bold">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute bottom-full right-0 mb-1 w-64 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg z-50 max-h-48 overflow-y-auto">
              <div className="px-2 py-1 border-b border-[var(--border)] text-[10px] font-semibold text-[var(--text-secondary)]">
                {t('status.notifications')} ({notifications.length})
              </div>
              {notifications.length === 0 ? (
                <div className="px-2 py-3 text-[10px] text-[var(--text-secondary)] text-center">{t('status.noNotifications')}</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="px-2 py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors duration-150">
                    <div className="text-[10px] text-[var(--text-primary)]">{n.message}</div>
                    <div className="text-[8px] text-[var(--text-secondary)]">{n.time}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </span>
        {fontSize != null && (
          <span className="flex items-center gap-1">
            <button
              onClick={onZoomOut}
              className={clickableItemClass}
              title="Zoom Out (Ctrl+-)"
              aria-label={t('status.zoomOut')}
            >
              <Minus size={10} />
            </button>
            <button
              onClick={onZoomReset}
              className={clickableItemClass}
              title="Reset Zoom (Ctrl+0)"
              aria-label={t('status.zoomReset')}
            >
              {fontSize}px
            </button>
            <button
              onClick={onZoomIn}
              className={clickableItemClass}
              title="Zoom In (Ctrl+=)"
              aria-label={t('status.zoomIn')}
            >
              <Plus size={10} />
            </button>
          </span>
        )}
        <LanguageSwitch compact />
        <span>CSL v7.0</span>
      </div>
    </div>
  );
}
