"use client";

// ============================================================
// PART 1 — Author Dashboard: 회차별 엔진 메트릭 추세 시각화
// ============================================================

import { useState, useMemo, memo, useEffect } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Message, AppLanguage } from '@/lib/studio-types';
import { EngineReport } from '@/engine/types';
import { L4 } from '@/lib/i18n';
import EpisodeCompare from './EpisodeCompare';

interface Props {
  messages: Message[];
  language: AppLanguage;
}

interface EpisodeMetric {
  index: number;
  grade: string;
  tension: number;
  pacing: number;
  immersion: number;
  eos: number;
  charCount: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=messages | outputs=EpisodeMetric[]

// ============================================================
// PART 2 — Metric extraction from messages
// ============================================================

function extractMetrics(messages: Message[]): EpisodeMetric[] {
  const metrics: EpisodeMetric[] = [];
  let idx = 0;

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue;
    idx++;
    const report = msg.meta?.engineReport as EngineReport | undefined;
    metrics.push({
      index: idx,
      grade: report?.grade || '—',
      tension: report?.metrics?.tension ?? 0,
      pacing: report?.metrics?.pacing ?? 0,
      immersion: report?.metrics?.immersion ?? 0,
      eos: report?.eosScore ?? 0,
      charCount: msg.content.length,
    });
  }

  return metrics;
}

// IDENTITY_SEAL: PART-2 | role=extraction | inputs=Message[] | outputs=EpisodeMetric[]

// ============================================================
// PART 3 — Bar chart component (CSS-only, no external lib)
// ============================================================

function MetricBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2" title={`${label}: ${value}% (max ${max}%)`}>
      <span className="text-[9px] text-text-tertiary font-mono w-16 shrink-0 uppercase">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden" title={`${pct.toFixed(0)}%`}>
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-text-tertiary font-mono w-8 text-right">{value}%</span>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=bar chart | inputs=value/max/color | outputs=JSX

// ============================================================
// PART 4 — Dashboard component
// ============================================================

const GRADE_COLORS: Record<string, string> = {
  S: 'text-yellow-400', A: 'text-green-400', B: 'text-blue-400',
  C: 'text-purple-400', D: 'text-orange-400', F: 'text-red-400',
};

type DashSubTab = 'overview' | 'compare';

function AuthorDashboard({ messages, language }: Props) {
  const isKO = language === 'KO';
  const flags = useFeatureFlags();
  const metrics = useMemo(() => extractMetrics(messages), [messages]);
  const [subTab, setSubTab] = useState<DashSubTab>('overview');

  useEffect(() => {
    if (!flags.EPISODE_COMPARE && subTab === 'compare') setSubTab('overview');
  }, [flags.EPISODE_COMPARE, subTab]);

  const subTabEntries = useMemo(() => {
    const rows: [DashSubTab, string][] = [['overview', isKO ? '개요' : 'Overview']];
    if (flags.EPISODE_COMPARE && metrics.length >= 2) {
      rows.push(['compare', isKO ? '비교 분석' : 'Compare']);
    }
    return rows;
  }, [isKO, flags.EPISODE_COMPARE, metrics.length]);

  if (metrics.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-xs">
        {language === 'KO' ? '아직 생성된 챕터가 없습니다.' : 'No chapters generated yet.'}
      </div>
    );
  }

  const avg = {
    tension: Math.round(metrics.reduce((s, m) => s + m.tension, 0) / metrics.length),
    pacing: Math.round(metrics.reduce((s, m) => s + m.pacing, 0) / metrics.length),
    immersion: Math.round(metrics.reduce((s, m) => s + m.immersion, 0) / metrics.length),
    eos: Math.round(metrics.reduce((s, m) => s + m.eos, 0) / metrics.length),
    charCount: Math.round(metrics.reduce((s, m) => s + m.charCount, 0) / metrics.length),
  };

  const totalChars = metrics.reduce((s, m) => s + m.charCount, 0);

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      {subTabEntries.length > 1 && (
        <div className="flex gap-1 bg-bg-secondary/50 border border-border rounded-xl p-1">
          {subTabEntries.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                subTab === key ? 'bg-white/10 text-white' : 'text-text-tertiary hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Compare tab */}
      {subTab === 'compare' && flags.EPISODE_COMPARE && metrics.length >= 2 && (
        <EpisodeCompare messages={messages} language={language} />
      )}

      {/* Overview tab (original dashboard content) */}
      {subTab === 'overview' && (
      <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-lg font-black text-text-primary">{metrics.length}</div>
          <div className="text-[9px] text-text-tertiary font-mono uppercase">{language === 'KO' ? '생성 챕터' : 'Chapters'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-lg font-black text-text-primary">{(totalChars / 1000).toFixed(1)}K</div>
          <div className="text-[9px] text-text-tertiary font-mono uppercase">{language === 'KO' ? '총 글자수' : 'Total chars'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-lg font-black text-text-primary">{avg.charCount.toLocaleString()}</div>
          <div className="text-[9px] text-text-tertiary font-mono uppercase">{language === 'KO' ? '평균 글자수' : 'Avg chars'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className={`text-lg font-black ${GRADE_COLORS[metrics[metrics.length - 1]?.grade] || 'text-text-primary'}`}>
            {metrics[metrics.length - 1]?.grade || '—'}
          </div>
          <div className="text-[9px] text-text-tertiary font-mono uppercase">{language === 'KO' ? '최근 등급' : 'Last grade'}</div>
        </div>
      </div>

      {/* Average metrics */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-2">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono mb-2">
          {language === 'KO' ? '평균 메트릭' : 'Average Metrics'}
        </h3>
        <MetricBar value={avg.tension} max={100} color="bg-red-500" label={L4(language, { ko: "긴장감", en: "Tension", jp: "緊張感", cn: "紧张感" })} />
        <MetricBar value={avg.pacing} max={100} color="bg-blue-500" label={L4(language, { ko: "호흡", en: "Pacing", jp: "テンポ", cn: "节奏" })} />
        <MetricBar value={avg.immersion} max={100} color="bg-green-500" label={L4(language, { ko: "몰입도", en: "Immerse", jp: "没入度", cn: "沉浸度" })} />
        <MetricBar value={avg.eos} max={100} color="bg-purple-500" label={L4(language, { ko: "분량", en: "Volume", jp: "分量", cn: "篇幅" })} />
      </div>

      {/* Per-chapter SVG trend chart */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono mb-3">
          {language === 'KO' ? '챕터별 추세' : 'Chapter Trend'}
        </h3>
        {metrics.length >= 2 ? (
          <svg viewBox={`0 0 ${Math.max(200, metrics.length * 30)} 100`} className="w-full h-24" preserveAspectRatio="none" role="img" aria-label={language === 'KO' ? '챕터별 메트릭 추세 차트' : 'Per-chapter metric trend chart'}>
            {/* Grid lines */}
            {[25, 50, 75].map(y => (
              <line key={y} x1="0" y1={100 - y} x2={metrics.length * 30} y2={100 - y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            ))}
            {/* Tension line (red) */}
            <polyline fill="none" stroke="#ef4444" strokeWidth="1.5"
              points={metrics.map((m, i) => `${i * 30 + 15},${100 - m.tension}`).join(' ')} />
            {/* Pacing line (blue) */}
            <polyline fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3"
              points={metrics.map((m, i) => `${i * 30 + 15},${100 - m.pacing}`).join(' ')} />
            {/* Immersion line (green) */}
            <polyline fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3"
              points={metrics.map((m, i) => `${i * 30 + 15},${100 - m.immersion}`).join(' ')} />
            {/* Grade dots */}
            {metrics.map((m, i) => (
              <circle key={i} cx={i * 30 + 15} cy={100 - m.tension} r="3"
                fill={GRADE_COLORS[m.grade]?.replace('text-', '').replace('-400', '') === 'yellow' ? '#facc15' : GRADE_COLORS[m.grade]?.includes('green') ? '#22c55e' : GRADE_COLORS[m.grade]?.includes('blue') ? '#3b82f6' : GRADE_COLORS[m.grade]?.includes('red') ? '#ef4444' : '#a855f7'}>
                <title>#{m.index} {m.grade} T:{m.tension}% P:{m.pacing}% I:{m.immersion}%</title>
              </circle>
            ))}
          </svg>
        ) : (
          <div className="flex items-end gap-1 h-20">
            {metrics.map((m, i) => {
              const h = Math.max(4, (m.tension / 100) * 80);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`#${m.index} ${m.grade} T:${m.tension}%`}>
                  <div className={`w-full rounded-t ${GRADE_COLORS[m.grade]?.replace('text-', 'bg-') || 'bg-text-tertiary'}`} style={{ height: `${h}px` }} />
                  <span className="text-[7px] text-text-tertiary">{m.index}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-between mt-1">
          <div className="flex gap-3">
            <span className="text-[8px] text-red-400">● Tension</span>
            <span className="text-[8px] text-blue-400">● Pacing</span>
            <span className="text-[8px] text-green-400">● Immersion</span>
          </div>
          <span className="text-[8px] text-text-tertiary">{metrics.length} {language === 'KO' ? '챕터' : 'chapters'}</span>
        </div>
      </div>

      </>
      )}

      {/* Export as Markdown */}
      <button
        onClick={() => {
          const lines = [
            `# ${language === 'KO' ? '작가 대시보드 리포트' : 'Author Dashboard Report'}`,
            `> ${new Date().toISOString().slice(0, 10)}`,
            '',
            `## ${language === 'KO' ? '요약' : 'Summary'}`,
            `- ${language === 'KO' ? '생성 챕터' : 'Chapters'}: ${metrics.length}`,
            `- ${language === 'KO' ? '총 글자수' : 'Total chars'}: ${totalChars.toLocaleString()}`,
            `- ${language === 'KO' ? '평균 글자수' : 'Avg chars'}: ${avg.charCount.toLocaleString()}`,
            '',
            `## ${language === 'KO' ? '평균 메트릭' : 'Average Metrics'}`,
            `| Metric | Value |`,
            `|--------|-------|`,
            `| ${L4(language, { ko: "긴장감", en: "Tension", jp: "緊張感", cn: "紧张感" })} | ${avg.tension}% |`,
            `| ${L4(language, { ko: "호흡", en: "Pacing", jp: "テンポ", cn: "节奏" })} | ${avg.pacing}% |`,
            `| ${L4(language, { ko: "몰입도", en: "Immersion", jp: "没入度", cn: "沉浸度" })} | ${avg.immersion}% |`,
            `| ${L4(language, { ko: "분량", en: "Volume", jp: "分量", cn: "篇幅" })} | ${avg.eos}% |`,
            '',
            `## ${language === 'KO' ? '챕터별 상세' : 'Per-Chapter Detail'}`,
            `| # | Grade | Tension | Pacing | Immersion | Chars |`,
            `|---|-------|---------|--------|-----------|-------|`,
            ...metrics.map(m => `| ${m.index} | ${m.grade} | ${m.tension}% | ${m.pacing}% | ${m.immersion}% | ${m.charCount.toLocaleString()} |`),
          ];
          const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        className="w-full py-2 bg-bg-secondary border border-border rounded-xl text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono hover:bg-white/5 transition-colors"
      >
        📊 {language === 'KO' ? '마크다운 리포트 내보내기' : 'Export Markdown Report'}
      </button>
    </div>
  );
}

export default memo(AuthorDashboard);

// IDENTITY_SEAL: PART-4 | role=dashboard UI | inputs=messages+language | outputs=JSX
