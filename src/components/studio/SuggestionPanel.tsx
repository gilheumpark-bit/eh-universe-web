"use client";

// ============================================================
// PART 1 — Proactive Suggestions Panel
// ============================================================

import React, { useState, useCallback } from 'react';
import { AlertTriangle, Info, XCircle, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ProactiveSuggestion, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface SuggestionPanelProps {
  suggestions: ProactiveSuggestion[];
  onDismiss: (id: string) => void;
  onNavigate?: (category: string, episode: number) => void;
  language: AppLanguage;
}

const PRIORITY_STYLES = {
  critical: { border: 'border-accent-red/30', leftBorder: 'border-l-red-500', bg: 'bg-accent-red/5', icon: XCircle, color: 'text-accent-red' },
  warning: { border: 'border-amber-500/30', leftBorder: 'border-l-amber-500', bg: 'bg-amber-500/5', icon: AlertTriangle, color: 'text-amber-400' },
  info: { border: 'border-accent-blue/30', leftBorder: 'border-l-blue-500', bg: 'bg-accent-blue/5', icon: Info, color: 'text-accent-blue' },
};

const CATEGORY_LABELS: Record<string, { ko: string; en: string; ja?: string; zh?: string }> = {
  character_drift: { ko: '캐릭터 이탈', en: 'Character Drift' },
  world_inconsistency: { ko: '세계관 불일치', en: 'World Inconsistency' },
  tension_mismatch: { ko: '긴장도 편차', en: 'Tension Mismatch' },
  thread_overdue: { ko: '복선 방치', en: 'Thread Overdue' },
  pacing_anomaly: { ko: '페이싱 이상', en: 'Pacing Anomaly' },
  emotion_flat: { ko: '감정 평탄', en: 'Emotion Flat' },
  ai_tone_creep: { ko: '기계적 톤 누적', en: 'Mechanical Tone Creep' },
  hallucination_risk: { ko: '환각 위험', en: 'Hallucination Risk' },
  foreshadow_urgent: { ko: '복선 회수 시급', en: 'Foreshadow Urgent' },
};

// IDENTITY_SEAL: PART-1 | role=imports and constants | inputs=none | outputs=styles,labels

// ============================================================
// PART 2 — Component
// ============================================================

export default function SuggestionPanel({ suggestions, onDismiss, onNavigate, language }: SuggestionPanelProps) {
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const visible = suggestions.filter(s => !s.dismissed && !dismissing.has(s.id));

  const handleDismiss = useCallback((id: string) => {
    setDismissing(prev => new Set(prev).add(id));
    setTimeout(() => {
      onDismiss(id);
      setDismissing(prev => { const next = new Set(prev); next.delete(id); return next; });
    }, 300);
  }, [onDismiss]);

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 text-center">
        <CheckCircle2 className="w-5 h-5 text-green-400/60 mx-auto mb-2" />
        <p className="text-[11px] text-text-tertiary font-medium">
          {L4(language, { ko: '모든 것이 순조롭습니다', en: 'Everything looks good', ja: '問題は見つかりません', zh: '一切顺利' })}
        </p>
        <p className="text-[9px] text-text-tertiary/60 mt-1">
          {L4(language, { ko: '서사 감독이 이상 징후를 감지하면 여기에 표시됩니다', en: 'Narrative Director will alert you here if issues arise', ja: 'サーバーディレクターが問題を検知するとここに表示されます', zh: '叙事总监发现问题时将在此显示' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60" />
        <span className="font-mono text-[10px] font-bold tracking-[0.15em] text-text-tertiary uppercase">
          {L4(language, { ko: '서사 감독 경고', en: 'Narrative Director Alerts', ja: 'ナラティブディレクター警告', zh: '叙事总监警告' })}
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">
          {visible.length}
        </span>
      </div>
      {visible.map(sg => {
        const style = PRIORITY_STYLES[sg.priority];
        const Icon = style.icon;
        const catLabel = CATEGORY_LABELS[sg.category];
        const isDismissing = dismissing.has(sg.id);
        return (
          <div
            key={sg.id}
            className={`rounded-xl border ${style.border} ${style.bg} border-l-[3px] ${style.leftBorder} p-3 transition-opacity duration-300 ${isDismissing ? 'opacity-0 translate-x-4 max-h-0 p-0 overflow-hidden' : 'opacity-100 translate-x-0'}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 ${style.color} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[9px] font-bold tracking-wider uppercase ${style.color}`}>
                    {catLabel ? L4(language, catLabel) : sg.category}
                  </span>
                  <span className="font-mono text-[9px] text-text-tertiary">
                    EP.{sg.episode}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-snug">{sg.message}</p>
                {sg.actionHint && (
                  <p className="text-[10px] text-text-tertiary mt-1.5 italic">{sg.actionHint}</p>
                )}
                {onNavigate && (
                  <button
                    onClick={() => onNavigate(sg.category, sg.episode)}
                    className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold ${style.color} hover:underline transition-colors`}
                  >
                    {L4(language, { ko: '적용', en: 'Apply', ja: '適用', zh: '应用' })}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={() => handleDismiss(sg.id)}
                className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
                title={L4(language, { ko: '닫기', en: 'Dismiss', ja: '閉じる', zh: '关闭' })}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=suggestion panel UI | inputs=suggestions | outputs=rendered alerts
