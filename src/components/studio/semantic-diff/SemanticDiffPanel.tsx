"use client";
// ============================================================
// SemanticDiffPanel — 두 버전 의미 비교 (5축 카드).
// BranchDiffView 보강 — 텍스트 라인 diff 와 분리된 의미 단위 표시.
// ============================================================

import React from 'react';
import { GitCompare, AlertCircle } from 'lucide-react';
import type { SemanticDiffResult, SemanticAxis } from '@/lib/semantic-diff/types';

const AXIS_LABEL_KO: Record<SemanticAxis, string> = {
  tone: '톤',
  tension: '텐션',
  emotion: '감정',
  character: '캐릭터',
  foreshadow: '떡밥',
};

const AXIS_LABEL_EN: Record<SemanticAxis, string> = {
  tone: 'Tone',
  tension: 'Tension',
  emotion: 'Emotion',
  character: 'Character',
  foreshadow: 'Foreshadow',
};

function intensityColor(intensity: number): string {
  if (intensity >= 60) return 'text-accent-red';
  if (intensity >= 30) return 'text-accent-amber';
  if (intensity >= 10) return 'text-accent-blue';
  return 'text-text-tertiary';
}

export interface SemanticDiffPanelProps {
  result: SemanticDiffResult | null;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  beforeLabel?: string;
  afterLabel?: string;
}

export const SemanticDiffPanel: React.FC<SemanticDiffPanelProps> = ({
  result,
  language = 'KO',
  beforeLabel,
  afterLabel,
}) => {
  const isKO = language === 'KO';
  const labels = isKO ? AXIS_LABEL_KO : AXIS_LABEL_EN;
  const lang = language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh';

  if (!result) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-6 text-center">
        <p className="text-xs text-text-tertiary">
          {isKO ? '비교할 두 버전 선택' : 'Select two versions to compare'}
        </p>
      </div>
    );
  }

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <GitCompare className="w-4 h-4 text-accent-purple" />
        <h3 className="text-sm font-bold text-text-primary">
          {isKO ? '의미 단위 비교' : 'Semantic Diff'}
        </h3>
        <span className={`ml-auto text-xs font-mono ${intensityColor(result.overallChange)}`}>
          {result.overallChange}%
        </span>
      </div>

      {(beforeLabel || afterLabel) && (
        <div className="flex items-center gap-2 px-4 py-2 text-[10px] text-text-tertiary border-b border-border">
          <span className="font-mono">{beforeLabel ?? 'before'}</span>
          <span className="text-text-tertiary">→</span>
          <span className="font-mono">{afterLabel ?? 'after'}</span>
        </div>
      )}

      <div className="p-3 space-y-2">
        {result.axes.map((a) => (
          <div
            key={a.axis}
            className={`flex items-start gap-3 px-3 py-2 rounded-md ${
              a.axis === result.primaryAxis ? 'bg-accent-purple/10 border border-accent-purple/30' : 'bg-bg-tertiary/30'
            }`}
          >
            <div className="w-16 flex-shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                {labels[a.axis]}
              </div>
              <div className={`text-base font-bold ${intensityColor(a.changeIntensity)}`}>
                {a.changeIntensity}%
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-secondary leading-relaxed">
                {a.summary[lang] ?? a.summary.ko}
              </p>
            </div>
            {a.axis === result.primaryAxis && (
              <AlertCircle className="w-3.5 h-3.5 text-accent-purple flex-shrink-0 mt-1" />
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-border text-[10px] text-text-tertiary text-right font-mono">
        {result.durationMs}ms
      </div>
    </section>
  );
};

export default SemanticDiffPanel;
