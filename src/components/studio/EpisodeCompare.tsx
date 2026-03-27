"use client";

// ============================================================
// PART 1 — Types & State
// ============================================================

import React, { useState, useMemo } from 'react';
import { Message, AppLanguage } from '@/lib/studio-types';
import { EngineReport } from '@/engine/types';
import { L4 } from '@/lib/i18n';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  messages: Message[];
  language: AppLanguage;
}

interface EpMetric {
  index: number;
  grade: string;
  tension: number;
  pacing: number;
  immersion: number;
  eos: number;
  charCount: number;
  dialogueRatio: number;
  avgSentenceLen: number;
}

const MAX_COMPARE = 4;

const METRIC_KEYS = ['tension', 'pacing', 'immersion', 'eos'] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const METRIC_COLORS: Record<MetricKey, string> = {
  tension: '#ef4444',
  pacing: '#3b82f6',
  immersion: '#22c55e',
  eos: '#a855f7',
};

const COMPARE_PALETTE = ['#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

// IDENTITY_SEAL: PART-1 | role=types-state | inputs=none | outputs=interfaces

// ============================================================
// PART 2 — Data Extraction
// ============================================================

function extractEpMetrics(messages: Message[]): EpMetric[] {
  const metrics: EpMetric[] = [];
  let idx = 0;

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue;
    idx++;
    const report = msg.meta?.engineReport as EngineReport | undefined;
    const text = msg.content;

    // Dialogue ratio: lines starting with " or 「 or —
    const lines = text.split('\n').filter(l => l.trim());
    const dialogueLines = lines.filter(l => /^[\s]*["「『—]/.test(l));
    const dialogueRatio = lines.length > 0 ? Math.round((dialogueLines.length / lines.length) * 100) : 0;

    // Average sentence length
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 2);
    const avgSentenceLen = sentences.length > 0
      ? Math.round(sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length)
      : 0;

    metrics.push({
      index: idx,
      grade: report?.grade || '—',
      tension: report?.metrics?.tension ?? 0,
      pacing: report?.metrics?.pacing ?? 0,
      immersion: report?.metrics?.immersion ?? 0,
      eos: report?.eosScore ?? 0,
      charCount: text.length,
      dialogueRatio,
      avgSentenceLen,
    });
  }

  return metrics;
}

// IDENTITY_SEAL: PART-2 | role=extraction | inputs=Message[] | outputs=EpMetric[]

// ============================================================
// PART 3 — Episode Selector
// ============================================================

function EpisodeSelector({ metrics, selected, onToggle, language }: {
  metrics: EpMetric[];
  selected: number[];
  onToggle: (idx: number) => void;
  language: AppLanguage;
}) {
  const isKO = language === 'KO';

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
        {isKO ? `비교할 에피소드 선택 (최대 ${MAX_COMPARE})` : `Select episodes to compare (max ${MAX_COMPARE})`}
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
        {metrics.map(m => {
          const selIdx = selected.indexOf(m.index);
          const isSelected = selIdx >= 0;
          const color = isSelected ? COMPARE_PALETTE[selIdx % COMPARE_PALETTE.length] : undefined;
          return (
            <button
              key={m.index}
              onClick={() => onToggle(m.index)}
              disabled={!isSelected && selected.length >= MAX_COMPARE}
              className={`relative p-2 rounded-lg border text-center transition-all ${
                isSelected
                  ? 'border-white/30 text-white'
                  : 'border-border/50 text-text-tertiary hover:border-white/20 disabled:opacity-30'
              }`}
              style={isSelected ? { background: `${color}15`, borderColor: color } : undefined}
            >
              <div className="text-xs font-black">#{m.index}</div>
              <div className="text-[8px] opacity-60">{m.grade}</div>
              {/* Mini sparkline bar */}
              <div className="flex gap-px mt-1 h-1.5">
                <div className="flex-1 rounded-sm bg-red-500/40" style={{ height: `${m.tension * 1.5}%` }} />
                <div className="flex-1 rounded-sm bg-blue-500/40" style={{ height: `${m.pacing * 1.5}%` }} />
                <div className="flex-1 rounded-sm bg-green-500/40" style={{ height: `${m.immersion * 1.5}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=episode-selector | inputs=metrics,selected | outputs=JSX

// ============================================================
// PART 4 — Overlay Chart & Comparison Table
// ============================================================

function OverlayChart({ episodes, language }: { episodes: EpMetric[]; language: AppLanguage }) {
  if (episodes.length === 0) return null;

  const w = 400;
  const h = 160;
  const padX = 30;
  const padY = 15;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  // Normalize all episodes to same X axis (metric keys)
  const metricLabels = METRIC_KEYS;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" role="img" aria-label="Episode comparison chart">
        {/* Y-axis grid */}
        {[25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={padX} y1={padY + chartH - (v / 100) * chartH} x2={w - padX} y2={padY + chartH - (v / 100) * chartH}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <text x={padX - 4} y={padY + chartH - (v / 100) * chartH + 3} fill="rgba(255,255,255,0.2)" fontSize="7" textAnchor="end">
              {v}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {metricLabels.map((key, i) => {
          const x = padX + (i / (metricLabels.length - 1)) * chartW;
          return (
            <text key={key} x={x} y={h - 2} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="middle" style={{ textTransform: 'uppercase' }}>
              {key.slice(0, 3).toUpperCase()}
            </text>
          );
        })}

        {/* One line per selected episode */}
        {episodes.map((ep, epIdx) => {
          const color = COMPARE_PALETTE[epIdx % COMPARE_PALETTE.length];
          const points = metricLabels.map((key, i) => {
            const x = padX + (i / (metricLabels.length - 1)) * chartW;
            const y = padY + chartH - (ep[key] / 100) * chartH;
            return `${x},${y}`;
          }).join(' ');

          return (
            <g key={ep.index}>
              <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={points} />
              {metricLabels.map((key, i) => {
                const x = padX + (i / (metricLabels.length - 1)) * chartW;
                const y = padY + chartH - (ep[key] / 100) * chartH;
                return (
                  <g key={`${ep.index}-${key}`}>
                    <circle cx={x} cy={y} r="3.5" fill={color} />
                    <text x={x} y={y - 7} fill={color} fontSize="7" textAnchor="middle" fontWeight="bold">
                      {ep[key]}
                    </text>
                  </g>
                );
              })}
              {/* Episode label */}
              <text x={w - padX + 5} y={padY + chartH - (ep[metricLabels[metricLabels.length - 1]] / 100) * chartH + 3}
                fill={color} fontSize="8" fontWeight="bold">
                #{ep.index}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-text-tertiary uppercase tracking-wider">
              <th className="text-left py-1 px-2">{language === 'KO' ? '지표' : 'Metric'}</th>
              {episodes.map((ep, i) => (
                <th key={ep.index} className="text-center py-1 px-2" style={{ color: COMPARE_PALETTE[i] }}>
                  #{ep.index} ({ep.grade})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([
              ['tension', language === 'KO' ? '긴장감' : 'Tension'],
              ['pacing', language === 'KO' ? '호흡' : 'Pacing'],
              ['immersion', language === 'KO' ? '몰입도' : 'Immersion'],
              ['eos', language === 'KO' ? '분량' : 'Volume'],
              ['charCount', language === 'KO' ? '글자수' : 'Chars'],
              ['dialogueRatio', language === 'KO' ? '대화비율' : 'Dialogue%'],
              ['avgSentenceLen', language === 'KO' ? '평균문장길이' : 'Avg Sent Len'],
            ] as [keyof EpMetric, string][]).map(([key, label]) => {
              const values = episodes.map(ep => ep[key] as number);
              const max = Math.max(...values);
              const min = Math.min(...values);
              return (
                <tr key={key} className="border-t border-border/30">
                  <td className="py-1.5 px-2 text-text-tertiary font-bold">{label}</td>
                  {episodes.map((ep, i) => {
                    const val = ep[key] as number;
                    const isMax = val === max && episodes.length > 1;
                    const isMin = val === min && episodes.length > 1;
                    return (
                      <td key={ep.index} className={`py-1.5 px-2 text-center font-bold ${isMax ? 'text-green-400' : isMin ? 'text-red-400' : 'text-text-secondary'}`}>
                        {key === 'charCount' ? val.toLocaleString() : key === 'dialogueRatio' || key === 'avgSentenceLen' ? val : `${val}%`}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=overlay-chart-table | inputs=EpMetric[] | outputs=JSX

// ============================================================
// PART 5 — Trend Analysis + Main Component
// ============================================================

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 3) return <Minus className="w-3 h-3 text-text-tertiary" />;
  if (diff > 0) return <TrendingUp className="w-3 h-3 text-green-400" />;
  return <TrendingDown className="w-3 h-3 text-red-400" />;
}

function TrendSection({ metrics, language }: { metrics: EpMetric[]; language: AppLanguage }) {
  if (metrics.length < 3) return null;

  const isKO = language === 'KO';
  const windowSize = Math.min(5, Math.floor(metrics.length / 2));

  // Moving average for last `windowSize` vs previous `windowSize`
  const recent = metrics.slice(-windowSize);
  const previous = metrics.slice(-windowSize * 2, -windowSize);

  if (previous.length === 0) return null;

  const avgOf = (arr: EpMetric[], key: MetricKey) =>
    Math.round(arr.reduce((s, m) => s + m[key], 0) / arr.length);

  return (
    <div className="bg-black/20 border border-border/30 rounded-xl p-3 space-y-2">
      <h4 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5" />
        {isKO ? `최근 ${windowSize}화 vs 이전 ${previous.length}화` : `Last ${windowSize} vs prev ${previous.length}`}
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {METRIC_KEYS.map(key => {
          const curr = avgOf(recent, key);
          const prev = avgOf(previous, key);
          const diff = curr - prev;
          return (
            <div key={key} className="flex items-center gap-2 bg-bg-secondary/50 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: METRIC_COLORS[key] }} />
              <div className="min-w-0">
                <div className="text-[9px] text-text-tertiary uppercase">{key.slice(0, 3)}</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-white">{curr}%</span>
                  <TrendIndicator current={curr} previous={prev} />
                  <span className={`text-[8px] font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-text-tertiary'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EpisodeCompare({ messages, language }: Props) {
  const isKO = language === 'KO';
  const metrics = useMemo(() => extractEpMetrics(messages), [messages]);
  const [selected, setSelected] = useState<number[]>([]);

  const toggleEpisode = (idx: number) => {
    setSelected(prev =>
      prev.includes(idx)
        ? prev.filter(i => i !== idx)
        : prev.length < MAX_COMPARE ? [...prev, idx] : prev
    );
  };

  const selectedEpisodes = useMemo(
    () => selected.map(idx => metrics.find(m => m.index === idx)).filter((m): m is EpMetric => !!m),
    [selected, metrics]
  );

  if (metrics.length < 2) {
    return (
      <div className="text-center py-8 text-text-tertiary text-xs">
        {isKO ? '비교하려면 최소 2개 챕터가 필요합니다.' : 'Need at least 2 chapters to compare.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trend overview */}
      <TrendSection metrics={metrics} language={language} />

      {/* Episode selector */}
      <EpisodeSelector metrics={metrics} selected={selected} onToggle={toggleEpisode} language={language} />

      {/* Overlay chart + table */}
      {selectedEpisodes.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
            {isKO ? '에피소드 비교' : 'Episode Comparison'}
          </h3>
          <OverlayChart episodes={selectedEpisodes} language={language} />
        </div>
      )}

      {selectedEpisodes.length === 0 && (
        <div className="text-center py-6 text-text-tertiary text-[10px] border border-border/30 border-dashed rounded-xl">
          {isKO ? '위에서 에피소드를 선택하면 비교 차트가 표시됩니다' : 'Select episodes above to see comparison chart'}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=trend-analysis+main | inputs=messages,language | outputs=JSX
