"use client";

import React, { useState } from 'react';
import { Film, ChevronDown, AlertTriangle, AlertCircle, Info, FileSearch } from 'lucide-react';
import { DirectorReport, gradeFromScore } from '@/engine/director';
import { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';

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
  AI_TONE: { KO: 'NOA 톤', EN: 'NOA Tone', JP: 'NOAトーン', CN: 'NOA腔调' },
  TYPO: { KO: '오타', EN: 'Typo', JP: '誤字', CN: '错字' },
  ENDING_MONO: { KO: '종결 단조', EN: 'Ending Monotone', JP: '語尾単調', CN: '结尾单调' },
};

const SEV_ICONS: Record<number, React.ElementType> = {
  5: AlertCircle,
  4: AlertCircle,
  3: AlertTriangle,
  2: Info,
  1: Info,
};

const GRADE_BADGE_COLORS: Record<string, string> = {
  'S++': 'bg-green-500/20 text-green-300 ring-green-500/30',
  'S+': 'bg-green-500/15 text-green-400 ring-green-500/20',
  'S': 'bg-green-500/10 text-green-400 ring-green-500/15',
  'A': 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  'B': 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  'C': 'bg-red-500/15 text-red-400 ring-red-500/20',
  'D': 'bg-red-500/20 text-red-300 ring-red-500/30',
};

const DirectorPanel: React.FC<DirectorPanelProps> = ({ report, language }) => {
  const t = createT(language);
  const [showAll, setShowAll] = useState(false);

  if (!report) {
    return (
      <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-tertiary">
          <Film className="w-3 h-3" /> {t('director.nodDirector')}
        </div>
        <div className="mt-3 flex flex-col items-center gap-2 py-4">
          <FileSearch className="w-8 h-8 text-text-tertiary/30" />
          <p className="text-[11px] text-text-tertiary text-center">
            {L4(language, { ko: '아직 분석 결과가 없습니다', en: 'No analysis results yet', ja: 'まだ分析結果がありません', zh: '暂无分析结果' })}
          </p>
          <p className="text-[9px] text-text-tertiary/60 text-center">
            {L4(language, { ko: 'AI 생성이 완료되면 자동으로 서사 품질을 분석합니다', en: 'Narrative quality will be analyzed automatically after AI generation', ja: 'AI生成後に自動的にナラティブ品質を分析します', zh: 'AI生成完成后将自动分析叙事质量' })}
          </p>
        </div>
      </div>
    );
  }

  const grade = gradeFromScore(report.score);
  const gradeColor = report.score >= 80 ? 'text-accent-green' : report.score >= 60 ? 'text-accent-amber' : 'text-accent-red';
  const gradeBadgeColor = GRADE_BADGE_COLORS[grade] ?? GRADE_BADGE_COLORS['C'];
  const findingsToShow = showAll ? report.findings : report.findings.slice(0, 6);

  return (
    <details className="group" open={report.findings.length > 0}>
      <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Film className="w-3 h-3" /> {t('director.nodDirector')}
        </span>
        <span className="flex items-center gap-2">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ring-1 ${gradeBadgeColor}`}>{grade}</span>
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
            {findingsToShow.map((f, i) => {
              const SevIcon = SEV_ICONS[f.severity] ?? Info;
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <SevIcon className={`w-3 h-3 shrink-0 mt-0.5 ${SEV_COLORS[f.severity] || 'text-text-tertiary'}`} />
                  <div className="min-w-0">
                    <div className={`text-[10px] font-bold ${SEV_COLORS[f.severity] || 'text-text-tertiary'}`}>
                      {KIND_LABELS[f.kind]?.[language] || f.kind}
                      {f.lineNo ? ` L${f.lineNo}` : ''}
                    </div>
                    <div className="text-[9px] text-text-tertiary break-words">{f.message}</div>
                    {f.excerpt && (
                      <div className="text-[9px] text-text-tertiary italic truncate">&quot;{f.excerpt}&quot;</div>
                    )}
                  </div>
                </div>
              );
            })}
            {report.findings.length > 6 && (
              <button
                onClick={() => setShowAll(prev => !prev)}
                className="text-[9px] text-accent-purple hover:underline font-medium mt-1"
              >
                {showAll
                  ? L4(language, { ko: '접기', en: 'Collapse', ja: '折りたたむ', zh: '收起' })
                  : `+${report.findings.length - 6} ${L4(language, { ko: '더 보기', en: 'more', ja: 'もっと見る', zh: '更多' })}`}
              </button>
            )}
          </div>
        )}

        {/* Stats summary */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-border/50 text-[10px] text-text-tertiary font-mono">
          {report.stats.ending_mono > 0 && <span>{L4(language, { ko: '종결', en: 'End', ja: '語尾', zh: '结尾' })}{report.stats.ending_mono}%</span>}
          {report.stats.blur > 0 && <span>{L4(language, { ko: '흐림', en: 'Blur', ja: 'ぼかし', zh: '模糊' })}{report.stats.blur}</span>}
          {report.stats.gain_no_cost > 0 && <span>{L4(language, { ko: '무대가', en: 'NoCost', ja: '無対価', zh: '无代价' })}{report.stats.gain_no_cost}</span>}
          {report.stats.ai_tone > 0 && <span>{L4(language, { ko: 'NOA톤', en: 'NOA', ja: 'NOA', zh: 'NOA' })}{report.stats.ai_tone}</span>}
          {report.stats.typo > 0 && <span>{L4(language, { ko: '오타', en: 'Typo', ja: '誤字', zh: '错字' })}{report.stats.typo}</span>}
          {report.stats.similar_context > 0 && <span>{L4(language, { ko: '반복', en: 'Repeat', ja: '繰返', zh: '重复' })}{report.stats.similar_context}</span>}
        </div>
      </div>
    </details>
  );
};

export default DirectorPanel;
