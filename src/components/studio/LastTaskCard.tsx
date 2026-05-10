"use client";
// ============================================================
// LastTaskCard — 휴식 후 복귀 30초 자동 floating card.
// 인체공학 분석 §"마지막 작업 카드" 본질 구현.
// ============================================================

import React from 'react';
import { Sparkles, X, Clock } from 'lucide-react';
import type { SessionSnapshot } from '@/hooks/useSessionSnapshot';

export interface LastTaskCardProps {
  snapshot: SessionSnapshot | null;
  visible: boolean;
  onDismiss: () => void;
  language?: 'ko' | 'en' | 'ja' | 'zh';
}

function formatRelativeTime(savedAt: number, lang: 'ko' | 'en' | 'ja' | 'zh'): string {
  const elapsed = Date.now() - savedAt;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (lang === 'ko') {
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function LastTaskCard({ snapshot, visible, onDismiss, language = 'ko' }: LastTaskCardProps) {
  // [refactor — 2026-05-10] hidden state 제거 — visible prop 직접 사용 (derived state).
  // 이전: setHidden(!visible) in useEffect (set-state-in-effect 위반).
  if (!snapshot || !visible) return null;
  if (typeof snapshot.savedAt !== 'number') return null;

  const isKo = language === 'ko';
  const relative = formatRelativeTime(snapshot.savedAt, language);

  return (
    <div
      className="fixed top-4 left-4 z-[var(--z-tooltip)] max-w-md rounded-xl bg-bg-secondary/95 backdrop-blur-xl border border-accent-purple/30 shadow-2xl p-4 animate-in fade-in slide-in-from-top-4 duration-300"
      role="status"
      aria-label={isKo ? '마지막 작업 복귀 카드' : 'Last task return card'}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent-purple" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-accent-purple font-bold">
              {isKo ? '돌아오셨군요' : 'Welcome back'}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
              <Clock className="w-3 h-3" />
              {relative}
            </span>
          </div>
          {snapshot.lastTask ? (
            <p className="text-[12px] text-text-primary leading-relaxed">{snapshot.lastTask}</p>
          ) : (
            <p className="text-[12px] text-text-secondary italic">
              {isKo
                ? '직전 작업 컨텍스트 자동 복구.'
                : 'Last context restored automatically.'}
            </p>
          )}
          {snapshot.futureNote && (
            <div className="mt-2 px-2 py-1.5 rounded-md bg-accent-amber/10 border border-accent-amber/30">
              <span className="text-[10px] font-mono uppercase text-accent-amber font-bold mr-1.5">
                {isKo ? '미래의 나에게:' : 'Note to future me:'}
              </span>
              <span className="text-[11px] text-text-primary">{snapshot.futureNote}</span>
            </div>
          )}
          {snapshot.activeEpisodeId && (
            <p className="text-[10px] text-text-tertiary mt-1.5">
              {isKo ? '활성 에피소드:' : 'Active episode:'} {snapshot.activeEpisodeId}
            </p>
          )}
          {snapshot.activeBranch && (
            <p className="text-[10px] text-text-tertiary">
              {isKo ? '평행우주 분기:' : 'Branch:'} {snapshot.activeBranch}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
          aria-label={isKo ? '닫기' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default LastTaskCard;
