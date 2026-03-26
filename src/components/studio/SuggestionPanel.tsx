"use client";

// ============================================================
// PART 1 — Proactive Suggestions Panel
// ============================================================

import React from 'react';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';
import type { ProactiveSuggestion, AppLanguage } from '@/lib/studio-types';

interface SuggestionPanelProps {
  suggestions: ProactiveSuggestion[];
  onDismiss: (id: string) => void;
  language: AppLanguage;
}

const PRIORITY_STYLES = {
  critical: { border: 'border-red-500/30', bg: 'bg-red-500/5', icon: XCircle, color: 'text-red-400' },
  warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', icon: AlertTriangle, color: 'text-amber-400' },
  info: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', icon: Info, color: 'text-blue-400' },
};

const CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  character_drift: { ko: '캐릭터 이탈', en: 'Character Drift' },
  world_inconsistency: { ko: '세계관 불일치', en: 'World Inconsistency' },
  tension_mismatch: { ko: '긴장도 편차', en: 'Tension Mismatch' },
  thread_overdue: { ko: '복선 방치', en: 'Thread Overdue' },
  pacing_anomaly: { ko: '페이싱 이상', en: 'Pacing Anomaly' },
  emotion_flat: { ko: '감정 평탄', en: 'Emotion Flat' },
  ai_tone_creep: { ko: 'AI톤 누적', en: 'AI Tone Creep' },
  hallucination_risk: { ko: '환각 위험', en: 'Hallucination Risk' },
  foreshadow_urgent: { ko: '복선 회수 시급', en: 'Foreshadow Urgent' },
};

// IDENTITY_SEAL: PART-1 | role=imports and constants | inputs=none | outputs=styles,labels

// ============================================================
// PART 2 — Component
// ============================================================

export default function SuggestionPanel({ suggestions, onDismiss, language }: SuggestionPanelProps) {
  const isKO = language === 'KO';
  const visible = suggestions.filter(s => !s.dismissed);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60" />
        <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.15em] text-text-tertiary uppercase">
          {isKO ? '서사 감독 경고' : 'Narrative Director Alerts'}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
          {visible.length}
        </span>
      </div>
      {visible.map(sg => {
        const style = PRIORITY_STYLES[sg.priority];
        const Icon = style.icon;
        const catLabel = CATEGORY_LABELS[sg.category];
        return (
          <div key={sg.id} className={`rounded-xl border ${style.border} ${style.bg} p-3 transition-all`}>
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 ${style.color} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-[family-name:var(--font-mono)] text-[9px] font-bold tracking-wider uppercase ${style.color}`}>
                    {catLabel ? (isKO ? catLabel.ko : catLabel.en) : sg.category}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-text-tertiary">
                    EP.{sg.episode}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-snug">{sg.message}</p>
                {sg.actionHint && (
                  <p className="text-[10px] text-text-tertiary mt-1 italic">{sg.actionHint}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss(sg.id)}
                className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
                title={isKO ? '닫기' : 'Dismiss'}
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
