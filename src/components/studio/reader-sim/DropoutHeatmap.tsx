"use client";
// ============================================================
// DropoutHeatmap — 화별 이탈 히트맵.
// X축 = episode, 컬럼당 페르소나 5개 색상 표시.
// ============================================================

import React from 'react';
import type { EngagementProfile } from '@/lib/reader-sim/types';
import { PERSONAS, PERSONA_IDS } from '@/lib/reader-sim/personas';

const PERSONA_COLORS: Record<string, string> = {
  'genre-fan': '#8b5cf6',
  general: '#3b82f6',
  critical: '#ef4444',
  casual: '#10b981',
  expert: '#f59e0b',
};

export interface DropoutHeatmapProps {
  profile: EngagementProfile | null;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const DropoutHeatmap: React.FC<DropoutHeatmapProps> = ({ profile, language = 'KO' }) => {
  const isKO = language === 'KO';
  const lang = language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh';

  if (!profile || profile.predictions.length === 0) {
    return (
      <div className="text-xs text-text-tertiary text-center py-4">
        {isKO ? '데이터 없음' : 'No data'}
      </div>
    );
  }

  return (
    <figure className="bg-bg-tertiary/30 border border-border rounded-md p-3">
      <figcaption className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
        {isKO ? '화별 페르소나 이탈 히트맵' : 'Per-episode dropout heatmap'}
      </figcaption>
      <div className="space-y-1">
        {PERSONA_IDS.map((pid) => {
          const persona = PERSONAS[pid];
          return (
            <div key={pid} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: PERSONA_COLORS[pid] }}
              />
              <span className="text-[10px] text-text-secondary w-20 truncate">{persona.label[lang]}</span>
              <div className="flex-1 flex items-center gap-px">
                {profile.predictions.map((pred) => (
                  <div
                    key={pred.episodeId}
                    className="flex-1 h-3 rounded-sm"
                    style={{
                      background: pred.perPersona[pid] ? '#ef4444' : '#1a1a1a',
                      opacity: pred.perPersona[pid] ? 1 : 0.4,
                    }}
                    title={`EP${pred.episodeId}: ${pred.perPersona[pid] ? (isKO ? '이탈' : 'out') : (isKO ? '유지' : 'kept')}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[9px] text-text-tertiary mt-2 text-right">
        {isKO ? '빨강 = 이탈 / 어두운 회색 = 유지' : 'red = dropped / dark = kept'}
      </div>
    </figure>
  );
};

export default DropoutHeatmap;
