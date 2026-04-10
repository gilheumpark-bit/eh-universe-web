"use client";

import React, { useState } from 'react';
import type { ParagraphScore } from '@/hooks/useQualityAnalysis';

// ============================================================
// PART 1 — 타입
// ============================================================

interface QualityGutterProps {
  paragraphs: ParagraphScore[];
  averageScore: number;
  weakCount: number;
  language: string;
  onSelectWeak?: (index: number) => void;
}

// ============================================================
// PART 2 — 점수 색상 유틸
// ============================================================

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-accent-green/80';
  if (score >= 50) return 'bg-accent-amber/80';
  return 'bg-accent-red/80';
}

function scoreBorder(score: number): string {
  if (score >= 75) return 'border-accent-green/30';
  if (score >= 50) return 'border-accent-amber/30';
  return 'border-accent-red/30';
}

function scoreTextColor(score: number): string {
  if (score >= 75) return 'text-accent-green';
  if (score >= 50) return 'text-accent-amber';
  return 'text-accent-red';
}

// ============================================================
// PART 3 — 메인 컴포넌트
// ============================================================

const QualityGutter: React.FC<QualityGutterProps> = ({
  paragraphs,
  averageScore,
  weakCount,
  language,
  onSelectWeak,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isKO = language === 'KO';

  if (paragraphs.length === 0) return null;

  return (
    <div className="border border-border/50 rounded-xl bg-bg-secondary/50 overflow-hidden">
      {/* 요약 바 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-secondary transition-colors"
      >
        {/* 평균 점수 배지 */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${scoreBorder(averageScore)} bg-bg-primary`}>
          <div className={`w-2 h-2 rounded-full ${scoreColor(averageScore)}`} />
          <span className={`text-xs font-bold font-mono ${scoreTextColor(averageScore)}`}>
            {averageScore}
          </span>
        </div>

        <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          {isKO ? 'NOD 품질 분석' : 'NOD Quality'}
        </span>

        {/* 문단 미니 바 차트 */}
        <div className="flex-1 flex items-center gap-px mx-2">
          {paragraphs.slice(0, 20).map((p, i) => (
            <div
              key={i}
              className={`h-3 flex-1 rounded-sm ${scoreColor(p.score)} opacity-60 hover:opacity-100 transition-opacity cursor-pointer`}
              title={`P${i + 1}: ${p.score}`}
              onClick={(e) => { e.stopPropagation(); onSelectWeak?.(p.index); }}
            />
          ))}
        </div>

        {/* 약한 문단 카운트 */}
        {weakCount > 0 && (
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red">
            {weakCount} {isKO ? '개선 필요' : 'weak'}
          </span>
        )}

        <span className={`text-[11px] text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* 상세 목록 */}
      {expanded && (
        <div className="border-t border-border/40 px-4 py-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {paragraphs.map((p, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg ${
                p.score < 50 ? 'bg-accent-red/5 border border-accent-red/20' : 'bg-bg-primary/50'
              } cursor-pointer hover:bg-bg-secondary transition-colors`}
              onClick={() => onSelectWeak?.(p.index)}
            >
              {/* 점수 */}
              <span className={`text-xs font-bold font-mono shrink-0 w-8 ${scoreTextColor(p.score)}`}>
                {p.score}
              </span>

              {/* 문단 미리보기 + 이슈 */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-secondary truncate">
                  {p.text.slice(0, 60)}...
                </p>
                {p.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.issues.map((issue, j) => (
                      <span
                        key={j}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          issue.severity === 'warning'
                            ? 'bg-accent-amber/10 text-accent-amber'
                            : 'bg-bg-tertiary text-text-tertiary'
                        }`}
                      >
                        {isKO ? issue.messageKO : issue.messageEN}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 지표 미니 게이지 */}
              <div className="hidden sm:flex flex-col gap-0.5 text-[8px] font-mono text-text-tertiary shrink-0">
                <span>S/T {Math.round(p.metrics.showTellRatio * 100)}%</span>
                <span>VAR {Math.round(p.metrics.sentenceVariety * 100)}%</span>
                <span>REP {Math.round(p.metrics.repetition * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QualityGutter;
