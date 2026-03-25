"use client";

// ============================================================
// PART 1 — Author Dashboard: 회차별 엔진 메트릭 추세 시각화
// ============================================================

import React, { useMemo } from 'react';
import { Message, AppLanguage } from '@/lib/studio-types';
import { EngineReport } from '@/engine/types';
import { createT } from '@/lib/i18n';

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
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] w-16 shrink-0 uppercase">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] w-8 text-right">{value}%</span>
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

export default function AuthorDashboard({ messages, language }: Props) {
  const t = createT(language);
  const metrics = useMemo(() => extractMetrics(messages), [messages]);

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
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-lg font-black text-text-primary">{metrics.length}</div>
          <div className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase">{language === 'KO' ? '생성 챕터' : 'Chapters'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-lg font-black text-text-primary">{(totalChars / 1000).toFixed(1)}K</div>
          <div className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase">{language === 'KO' ? '총 글자수' : 'Total chars'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className="text-lg font-black text-text-primary">{avg.charCount.toLocaleString()}</div>
          <div className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase">{language === 'KO' ? '평균 글자수' : 'Avg chars'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
          <div className={`text-lg font-black ${GRADE_COLORS[metrics[metrics.length - 1]?.grade] || 'text-text-primary'}`}>
            {metrics[metrics.length - 1]?.grade || '—'}
          </div>
          <div className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase">{language === 'KO' ? '최근 등급' : 'Last grade'}</div>
        </div>
      </div>

      {/* Average metrics */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-2">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)] mb-2">
          {language === 'KO' ? '평균 메트릭' : 'Average Metrics'}
        </h3>
        <MetricBar value={avg.tension} max={100} color="bg-red-500" label="Tension" />
        <MetricBar value={avg.pacing} max={100} color="bg-blue-500" label="Pacing" />
        <MetricBar value={avg.immersion} max={100} color="bg-green-500" label="Immerse" />
        <MetricBar value={avg.eos} max={100} color="bg-purple-500" label="EOS" />
      </div>

      {/* Per-chapter trend */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)] mb-3">
          {language === 'KO' ? '챕터별 추세' : 'Chapter Trend'}
        </h3>
        <div className="flex items-end gap-1 h-20">
          {metrics.map((m, i) => {
            const h = Math.max(4, (m.tension / 100) * 80);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`#${m.index} ${m.grade} T:${m.tension}%`}>
                <div className={`w-full rounded-t ${GRADE_COLORS[m.grade]?.replace('text-', 'bg-') || 'bg-zinc-600'}`} style={{ height: `${h}px` }} />
                <span className="text-[7px] text-text-tertiary">{m.index}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-text-tertiary">{language === 'KO' ? '← 처음' : '← Start'}</span>
          <span className="text-[8px] text-text-tertiary">{language === 'KO' ? '최근 →' : 'Recent →'}</span>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=dashboard UI | inputs=messages+language | outputs=JSX
