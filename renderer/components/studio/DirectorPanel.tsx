"use client";

import React from 'react';
import { Film, ChevronDown } from 'lucide-react';
import { DirectorReport, gradeFromScore } from '@/engine/director';
import { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

interface DirectorPanelProps {
  report: DirectorReport | null;
  language: AppLanguage;
}

const SEV_COLORS: Record<number, string> = {
  5: 'text-red-400',
  4: 'text-red-400',
  3: 'text-amber-400',
  2: 'text-blue-400',
  1: 'text-text-tertiary',
};

const SEV_DOTS: Record<number, string> = {
  5: '🔴',
  4: '🔴',
  3: '🟡',
  2: '🔵',
  1: '⚪',
};

const KIND_LABELS: Record<string, Record<AppLanguage, string>> = {
  BLUR: { KO: '인과 흐림', EN: 'Causal Blur', JP: '因果のぼかし', CN: '因果模糊' },
  GAIN_NO_COST: { KO: '이득 vs 대가', EN: 'Gain w/o Cost', JP: '対価なし', CN: '无代价获益' },
  SIMILAR_CONTEXT: { KO: '맥락 반복', EN: 'Context Repeat', JP: '文脈の繰り返し', CN: '上下文重复' },
  AI_TONE: { KO: 'AI 톤', EN: 'AI Tone', JP: 'AIトーン', CN: 'AI腔调' },
  TYPO: { KO: '오타', EN: 'Typo', JP: '誤字', CN: '错字' },
  ENDING_MONO: { KO: '종결 단조', EN: 'Ending Monotone', JP: '語尾単調', CN: '结尾单调' },
};

const DirectorPanel: React.FC<DirectorPanelProps> = ({ report, language }) => {
  const t = createT(language);

  if (!report) {
    return (
      <details className="group">
        <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">
          <Film className="w-3 h-3" /> {t('director.nodDirector')}
        </summary>
        <p className="mt-1.5 text-[10px] text-text-tertiary pl-4 italic">
          {t('director.autoAnalysis')}
        </p>
      </details>
    );
  }

  const grade = gradeFromScore(report.score);
  const gradeColor = report.score >= 80 ? 'text-accent-green' : report.score >= 60 ? 'text-accent-amber' : 'text-accent-red';
  const findingsToShow = report.findings.slice(0, 6);

  return (
    <details className="group">
      <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Film className="w-3 h-3" /> {t('director.nodDirector')}
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
          <div className="flex-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
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
            {t('director.noIssues')}
          </p>
        ) : (
          <div className="space-y-1.5">
            {findingsToShow.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[9px] shrink-0 mt-0.5">{SEV_DOTS[f.severity] || '⚪'}</span>
                <div className="min-w-0">
                  <div className={`text-[10px] font-bold ${SEV_COLORS[f.severity] || 'text-text-tertiary'}`}>
                    {KIND_LABELS[f.kind]?.[language] || f.kind}
                    {f.lineNo ? ` L${f.lineNo}` : ''}
                  </div>
                  <div className="text-[9px] text-text-tertiary wrap-break-word">{f.message}</div>
                  {f.excerpt && (
                    <div className="text-[9px] text-text-tertiary italic truncate">&quot;{f.excerpt}&quot;</div>
                  )}
                </div>
              </div>
            ))}
            {report.findings.length > 6 && (
              <div className="text-[9px] text-text-tertiary">
                +{report.findings.length - 6}{t('director.more')}
              </div>
            )}
          </div>
        )}

        {/* Stats summary */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-border/50 text-[10px] text-text-tertiary font-mono">
          {report.stats.ending_mono > 0 && <span>{({KO:'종결',EN:'End',JP:'語尾',CN:'结尾'}[language])}{report.stats.ending_mono}%</span>}
          {report.stats.blur > 0 && <span>{({KO:'흐림',EN:'Blur',JP:'ぼかし',CN:'模糊'}[language])}{report.stats.blur}</span>}
          {report.stats.gain_no_cost > 0 && <span>{({KO:'무대가',EN:'NoCost',JP:'無対価',CN:'无代价'}[language])}{report.stats.gain_no_cost}</span>}
          {report.stats.ai_tone > 0 && <span>{({KO:'AI톤',EN:'AI',JP:'AI',CN:'AI'}[language])}{report.stats.ai_tone}</span>}
          {report.stats.typo > 0 && <span>{({KO:'오타',EN:'Typo',JP:'誤字',CN:'错字'}[language])}{report.stats.typo}</span>}
          {report.stats.similar_context > 0 && <span>{({KO:'반복',EN:'Repeat',JP:'繰返',CN:'重复'}[language])}{report.stats.similar_context}</span>}
        </div>
      </div>
    </details>
  );
};

export default DirectorPanel;
