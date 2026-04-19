"use client";

import React, { useMemo } from 'react';
import { Save, Circle, Loader2, Cpu, Zap, Timer, Coffee, AlertCircle, HardDrive } from 'lucide-react';
import type { AppLanguage, ChatSession } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { SPARK_SERVER_URL } from '@/services/sparkService';
import WordCountBadge from '@/components/studio/WordCountBadge';
import { useSessionTimer, formatSessionTime, formatDailyTime } from '@/hooks/useSessionTimer';
import { useSparkHealth } from '@/hooks/useSparkHealth';
import { useStorageQuota, formatBytes } from '@/hooks/useStorageQuota';

interface StudioStatusBarProps {
  editDraft: string;
  writingMode: string;
  activeTab: string;
  saveFlash: boolean;
  isSaving?: boolean;
  isGenerating: boolean;
  language: AppLanguage;
  currentSession: ChatSession | null;
  lastSaveTime?: number;
  isDirty?: boolean;
  /** Character count at session start — for session delta display */
  sessionStartChars?: number;
  editorFontSize?: number;
}

const MODE_LABELS: Record<string, { ko: string; en: string }> = {
  ai: { ko: '초안 생성', en: 'Draft Gen' },
  edit: { ko: '글쓰기', en: 'Writing' },
  canvas: { ko: '3단계', en: '3-Step' },
  refine: { ko: '자동 30%', en: 'Auto 30%' },
  advanced: { ko: '정밀', en: 'Precision' },
};

export function StudioStatusBar({
  editDraft, writingMode, activeTab, saveFlash, isSaving, isGenerating, language, currentSession, lastSaveTime, isDirty, sessionStartChars = 0, editorFontSize,
}: StudioStatusBarProps) {
  const isKO = language === 'KO';

  // TODO: Extract to useTextStats(text) hook
  const stats = useMemo(() => {
    const text = activeTab === 'writing' ? editDraft : '';
    const chars = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [editDraft, activeTab]);

  const modeLabel = MODE_LABELS[writingMode] || { ko: writingMode, en: writingMode };
  const episodeNum = currentSession?.config?.episode ?? 1;
  const guardrailMin = currentSession?.config?.guardrails?.min ?? 0;
  const guardrailMax = currentSession?.config?.guardrails?.max ?? Infinity;

  // 작가 피로도 관리: 세션 타이머 + 일일 누적 + 포모도로
  const { state: session, config: sessionCfg, progress } = useSessionTimer({
    totalChars: stats.chars,
  });
  // DGX Spark 헬스 — 다운 감지 시 BYOK 폴백 배지
  const { state: sparkState, canFallback, activeEngine } = useSparkHealth();
  const showDgxDownBadge = SPARK_SERVER_URL && sparkState.status === 'down';
  // IndexedDB 용량 — 70%+ 배지, hover 상세
  const { state: quotaState } = useStorageQuota();
  const showQuotaBadge = quotaState.supported && quotaState.percentUsed !== null && quotaState.percentUsed >= 70;
  const sessionActive = session.startedAt > 0;
  const pomodoroActive = session.pomodoroPhase !== 'off';
  const pomodoroLabel = session.pomodoroPhase === 'work'
    ? (isKO ? '작업' : 'Work')
    : session.pomodoroPhase === 'long-break'
      ? (isKO ? '긴 휴식' : 'Long Break')
      : session.pomodoroPhase === 'short-break'
        ? (isKO ? '휴식' : 'Break')
        : '';
  const progressPct = Math.round(progress * 100);
  const goalLabel = isKO
    ? `${stats.chars.toLocaleString()} / ${sessionCfg.dailyGoalChars.toLocaleString()}자`
    : `${stats.chars.toLocaleString()} / ${sessionCfg.dailyGoalChars.toLocaleString()} ch`;
  const sessionTooltip = isKO
    ? `세션 ${formatSessionTime(session.elapsed)} · 오늘 ${formatDailyTime(session.dailyTotal)} · 목표 ${progressPct}%`
    : `Session ${formatSessionTime(session.elapsed)} · Today ${formatDailyTime(session.dailyTotal)} · Goal ${progressPct}%`;

  return (
    <>
      {/* P0-3: Mobile compact status bar — always visible */}
      <div
        data-zen-hide
        className="flex md:hidden fixed bottom-0 left-0 w-full h-7 z-40 items-center justify-between px-3 bg-bg-secondary/90 backdrop-blur-sm border-t border-border/40 font-mono text-[11px] text-text-tertiary select-none"
      >
        <span className={guardrailMin > 0 && stats.chars < guardrailMin ? 'text-accent-red' : stats.chars > guardrailMax ? 'text-accent-amber' : stats.chars >= guardrailMin ? 'text-accent-green' : 'text-text-tertiary'}>
          {stats.chars.toLocaleString()}{isKO ? '자' : 'ch'}
        </span>
        {sessionActive && activeTab === 'writing' && (
          <span
            className="flex items-center gap-0.5 text-text-tertiary"
            title={sessionTooltip}
            data-testid="status-session-mobile"
          >
            <Timer className="w-2.5 h-2.5" />
            <span>{formatSessionTime(session.elapsed)}</span>
            {pomodoroActive && <Coffee className="w-2.5 h-2.5 ml-0.5 text-accent-amber" />}
          </span>
        )}
        {isGenerating ? (
          <span className="flex items-center gap-1 text-accent-amber">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            {isKO ? '생성 중' : 'Gen...'}
          </span>
        ) : isSaving ? (
          <span className="flex items-center gap-1 text-accent-amber">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            {isKO ? '저장 중' : 'Saving'}
          </span>
        ) : saveFlash ? (
          <span className="flex items-center gap-1 text-accent-green">
            <Save className="w-2.5 h-2.5" />
            {isKO ? '저장됨' : 'Saved'}
          </span>
        ) : isDirty ? (
          <span className="flex items-center gap-1 text-accent-amber">
            <Circle className="w-1.5 h-1.5 fill-accent-amber text-accent-amber" />
            {isKO ? '미저장' : 'Unsaved'}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Circle className="w-1.5 h-1.5 fill-accent-green text-accent-green" />
            {isKO ? '저장' : 'Saved'}
          </span>
        )}
      </div>

      {/* Desktop full status bar */}
      <div
        data-zen-hide
        className="hidden md:flex fixed bottom-0 left-0 w-full h-7 z-40 items-center justify-between px-4 bg-bg-secondary/80 backdrop-blur-sm border-t border-border/40 font-mono text-[12px] text-text-tertiary select-none"
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          {activeTab === 'writing' && (
            <>
              <span className={guardrailMin > 0 && stats.chars < guardrailMin ? 'text-accent-red' : stats.chars > guardrailMax ? 'text-accent-amber' : stats.chars >= guardrailMin ? 'text-accent-green' : 'text-text-tertiary'}>{stats.chars.toLocaleString()}{isKO ? '자' : 'ch'}</span>
              <span className="text-border">|</span>
              <span>{stats.words.toLocaleString()}{isKO ? '어' : 'w'}</span>
              <span className="text-border">|</span>
              <span>{isKO ? modeLabel.ko : modeLabel.en}</span>
              {stats.chars > sessionStartChars && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-accent-green">+{(stats.chars - sessionStartChars).toLocaleString()}{isKO ? '자' : 'ch'}</span>
                </>
              )}
              {editorFontSize && editorFontSize !== 16 && (
                <>
                  <span className="text-border">|</span>
                  <span>{editorFontSize}px</span>
                </>
              )}
              {/* Plugin slot — renders only when word-count-badge plugin is enabled. */}
              <WordCountBadge text={editDraft} isKO={isKO} testId="status-word-count-badge" />

              {/* Session timer + daily goal — writer fatigue management */}
              {sessionActive && (
                <>
                  <span className="text-border">|</span>
                  <span
                    className="flex items-center gap-1 cursor-help"
                    title={sessionTooltip}
                    data-testid="status-session-timer"
                  >
                    <Timer className="w-2.5 h-2.5 text-accent-blue" />
                    <span>{formatSessionTime(session.elapsed)}</span>
                  </span>
                  <span className="text-border">|</span>
                  <span
                    className="flex items-center gap-1 cursor-help"
                    title={goalLabel}
                    data-testid="status-session-daily"
                  >
                    <span className="text-text-tertiary">
                      {isKO ? '오늘' : 'Today'} {formatDailyTime(session.dailyTotal)}
                    </span>
                    <span
                      className="inline-block w-10 h-1.5 rounded-full bg-bg-tertiary overflow-hidden"
                      role="progressbar"
                      aria-valuenow={progressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={isKO ? '일일 목표 진행률' : 'Daily goal progress'}
                    >
                      <span
                        className="block h-full bg-accent-green transition-[width] duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </span>
                    <span className="text-[12px] text-text-tertiary">{progressPct}%</span>
                  </span>
                </>
              )}
            </>
          )}
          {activeTab !== 'writing' && (
            <span className="uppercase tracking-wider">{activeTab}</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {pomodoroActive && (
            <>
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                  session.pomodoroPhase === 'work'
                    ? 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
                    : 'bg-accent-green/10 border-accent-green/30 text-accent-green'
                }`}
                data-testid="status-pomodoro"
                title={`${pomodoroLabel} · ${formatSessionTime(session.pomodoroRemaining)}`}
              >
                <Coffee className="w-2.5 h-2.5" />
                <span className="font-bold">{pomodoroLabel}</span>
                <span className="font-mono">{formatSessionTime(session.pomodoroRemaining)}</span>
              </span>
              <span className="text-border">|</span>
            </>
          )}
          <span>{isKO ? `${episodeNum}화` : `Ep.${episodeNum}`}</span>
          <span className="text-border">|</span>
          {isGenerating ? (
            <span className="flex items-center gap-1 text-accent-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isKO ? '생성 중' : 'Generating'}
            </span>
          ) : isSaving ? (
            <span className="flex items-center gap-1 text-accent-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isKO ? '저장 중...' : 'Saving...'}
            </span>
          ) : saveFlash ? (
            <span className="flex items-center gap-1 text-accent-green">
              <Save className="w-3 h-3" />
              {isKO ? '저장됨' : 'Saved'}
              {lastSaveTime ? <span className="text-text-quaternary ml-1">{new Date(lastSaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : null}
            </span>
          ) : isDirty ? (
            <span className="flex items-center gap-1 text-accent-amber">
              <Circle className="w-2 h-2 fill-accent-amber text-accent-amber" />
              {isKO ? '미저장' : 'Unsaved'}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 fill-accent-green text-accent-green" />
              {isKO ? '자동 저장' : 'Auto-saved'}
            </span>
          )}
          {/* 저장 공간 배지 — 70%+ 경고 */}
          {showQuotaBadge && quotaState.percentUsed !== null && (
            <>
              <span className="text-border">|</span>
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                  quotaState.level === 'critical'
                    ? 'bg-accent-red/10 border-accent-red/30 text-accent-red'
                    : 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
                }`}
                title={`${formatBytes(quotaState.usage)} / ${formatBytes(quotaState.quota)} (${quotaState.percentUsed.toFixed(1)}%)`}
                data-testid="status-storage-quota"
              >
                <HardDrive className="w-2.5 h-2.5" />
                <span className="font-bold">{Math.round(quotaState.percentUsed)}%</span>
              </span>
            </>
          )}
          <span className="text-border">|</span>
          {/* AI 엔진 뱃지 — DGX 우선, 다운 시 BYOK 자동 표시 */}
          {showDgxDownBadge ? (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-amber/10 border border-accent-amber/30 text-accent-amber"
              title={sparkState.message || ''}
              data-testid="status-spark-down"
            >
              <AlertCircle className="w-2.5 h-2.5" />
              <span className="font-bold">
                {activeEngine === 'byok' && canFallback
                  ? (isKO ? '로컬 다운 — BYOK' : 'DGX down — BYOK')
                  : (isKO ? '로컬 엔진 다운' : 'DGX down')}
              </span>
            </span>
          ) : SPARK_SERVER_URL ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-purple/10 border border-accent-purple/20">
              <Zap className="w-2.5 h-2.5 text-accent-purple" />
              <span className="text-accent-purple font-bold">DGX 128GB</span>
              {isGenerating && <span className="text-accent-amber animate-pulse">Qwen-32B</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" />
              BYOK
            </span>
          )}
          <span className="text-border">|</span>
          <span>ANS {ENGINE_VERSION}</span>
        </div>
      </div>
    </>
  );
}
