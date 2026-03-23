"use client";

import React from 'react';
import { Film, AlertCircle, ChevronDown } from 'lucide-react';
import { DirectorReport, gradeFromScore } from '@/engine/director';
import { AppLanguage } from '@/lib/studio-types';

interface DirectorPanelProps {
  report: DirectorReport | null;
  language: AppLanguage;
}

const SEV_COLORS: Record<number, string> = {
  5: 'text-red-400',
  4: 'text-red-400',
  3: 'text-amber-400',
  2: 'text-blue-400',
  1: 'text-zinc-500',
};

const SEV_DOTS: Record<number, string> = {
  5: '🔴',
  4: '🔴',
  3: '🟡',
  2: '🔵',
  1: '⚪',
};

const KIND_LABELS: Record<string, { ko: string; en: string }> = {
  BLUR: { ko: '인과 흐림', en: 'Causal Blur' },
  GAIN_NO_COST: { ko: '이득 vs 대가', en: 'Gain w/o Cost' },
  SIMILAR_CONTEXT: { ko: '맥락 반복', en: 'Context Repeat' },
  AI_TONE: { ko: 'AI 톤', en: 'AI Tone' },
  TYPO: { ko: '오타', en: 'Typo' },
  ENDING_MONO: { ko: '종결 단조', en: 'Ending Monotone' },
};

const DirectorPanel: React.FC<DirectorPanelProps> = ({ report, language }) => {
  const isKO = language === 'KO';

  if (!report) {
    return (
      <details className="group">
        <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">
          <Film className="w-3 h-3" /> {isKO ? 'NOD 감독' : 'NOD Director'}
        </summary>
        <p className="mt-1.5 text-[10px] text-text-tertiary pl-4 italic">
          {isKO ? 'AI 응답 후 자동 분석됩니다' : 'Auto-analyzed after AI response'}
        </p>
      </details>
    );
  }

  const grade = gradeFromScore(report.score);
  const gradeColor = report.score >= 80 ? 'text-accent-green' : report.score >= 60 ? 'text-accent-amber' : 'text-accent-red';
  const findingsToShow = report.findings.slice(0, 6);

  return (
    <details className="group" open={report.findings.length > 0}>
      <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Film className="w-3 h-3" /> {isKO ? 'NOD 감독' : 'NOD Director'}
        </span>
        <span className="flex items-center gap-2">
          <span className={`text-[9px] font-black ${gradeColor}`}>{grade}</span>
          {report.findings.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-400">
              {report.findings.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="mt-2 pl-1 space-y-2">
        {/* Score bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${report.score >= 80 ? 'bg-green-500' : report.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${report.score}%` }}
            />
          </div>
          <span className={`text-[9px] font-black ${gradeColor}`}>{report.score}</span>
        </div>

        {/* Findings */}
        {findingsToShow.length === 0 ? (
          <p className="text-[10px] text-accent-green italic">
            {isKO ? '이슈 없음' : 'No issues'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {findingsToShow.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[9px] shrink-0 mt-0.5">{SEV_DOTS[f.severity] || '⚪'}</span>
                <div className="min-w-0">
                  <div className={`text-[10px] font-bold ${SEV_COLORS[f.severity] || 'text-zinc-500'}`}>
                    {KIND_LABELS[f.kind]?.[isKO ? 'ko' : 'en'] || f.kind}
                    {f.lineNo ? ` L${f.lineNo}` : ''}
                  </div>
                  <div className="text-[9px] text-text-tertiary break-words">{f.message}</div>
                  {f.excerpt && (
                    <div className="text-[9px] text-zinc-600 italic truncate">&quot;{f.excerpt}&quot;</div>
                  )}
                </div>
              </div>
            ))}
            {report.findings.length > 6 && (
              <div className="text-[9px] text-text-tertiary">
                +{report.findings.length - 6} {isKO ? '건 더' : ' more'}
              </div>
            )}
          </div>
        )}

        {/* Stats summary */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-zinc-800/50 text-[10px] text-zinc-600 font-[family-name:var(--font-mono)]">
          {report.stats.ending_mono > 0 && <span>종결{report.stats.ending_mono}%</span>}
          {report.stats.blur > 0 && <span>흐림{report.stats.blur}</span>}
          {report.stats.gain_no_cost > 0 && <span>무대가{report.stats.gain_no_cost}</span>}
          {report.stats.ai_tone > 0 && <span>AI톤{report.stats.ai_tone}</span>}
          {report.stats.typo > 0 && <span>오타{report.stats.typo}</span>}
          {report.stats.similar_context > 0 && <span>반복{report.stats.similar_context}</span>}
        </div>
      </div>
    </details>
  );
};

export default DirectorPanel;
