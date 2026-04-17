"use client";

// ============================================================
// PART 1 — Types & State
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import { Message, AppLanguage } from '@/lib/studio-types';
import { EngineReport } from '@/engine/types';

import { BarChart3, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Eye } from 'lucide-react';

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

/** Paragraph-level analysis for drilldown */
interface ParaAnalysis {
  text: string;
  tension: number;   // 0–100 estimated from sentence length variance
  pacing: number;     // 0–100 estimated from dialogue density
  isDialogue: boolean;
}

/** Full drilldown data for a single episode */
interface DrilldownData {
  index: number;
  fullText: string;
  paragraphs: ParaAnalysis[];
  longestSentence: string;
  shortestSentence: string;
  highDialogueParagraphIdx: number;
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

const METRIC_LABELS: Record<MetricKey, string> = {
  tension: 'TEN',
  pacing: 'PAC',
  immersion: 'IMM',
  eos: 'EOS',
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

/** Extract drilldown data for a specific episode index */
function extractDrilldown(messages: Message[], targetIdx: number): DrilldownData | null {
  let idx = 0;
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue;
    idx++;
    if (idx !== targetIdx) continue;

    const text = msg.content;
    const rawParas = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    // Paragraph-level analysis
    const paragraphs: ParaAnalysis[] = rawParas.map(p => {
      const lines = p.split('\n').filter(l => l.trim());
      const dialogueLines = lines.filter(l => /^[\s]*["「『—]/.test(l));
      const isDialogue = dialogueLines.length > lines.length * 0.5;
      const sents = p.split(/[.!?。！？]+/).filter(s => s.trim().length > 2);
      const lengths = sents.map(s => s.trim().length);
      const avgLen = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
      const variance = lengths.length > 1
        ? Math.sqrt(lengths.reduce((s, l) => s + (l - avgLen) ** 2, 0) / lengths.length)
        : 0;
      // Tension heuristic: higher variance = higher tension
      const tension = Math.min(100, Math.round((variance / Math.max(avgLen, 1)) * 100));
      // Pacing heuristic: dialogue-heavy = faster pacing
      const pacing = isDialogue ? Math.min(100, 60 + dialogueLines.length * 10) : Math.min(100, Math.round(30 + lines.length * 5));
      return { text: p, tension, pacing, isDialogue };
    });

    // Key sentences
    const allSentences = text.split(/[.!?。！？]+/).map(s => s.trim()).filter(s => s.length > 5);
    const longestSentence = allSentences.length > 0
      ? allSentences.reduce((a, b) => a.length >= b.length ? a : b)
      : '';
    const shortestSentence = allSentences.length > 0
      ? allSentences.reduce((a, b) => a.length <= b.length ? a : b)
      : '';

    // Highest dialogue density paragraph
    let highDialogueParagraphIdx = 0;
    let maxDialogueRatio = 0;
    paragraphs.forEach((p, i) => {
      const lines = p.text.split('\n').filter(l => l.trim());
      const dlg = lines.filter(l => /^[\s]*["「『—]/.test(l));
      const ratio = lines.length > 0 ? dlg.length / lines.length : 0;
      if (ratio > maxDialogueRatio) {
        maxDialogueRatio = ratio;
        highDialogueParagraphIdx = i;
      }
    });

    return { index: targetIdx, fullText: text, paragraphs, longestSentence, shortestSentence, highDialogueParagraphIdx };
  }
  return null;
}

// IDENTITY_SEAL: PART-2 | role=extraction | inputs=Message[] | outputs=EpMetric[],DrilldownData

// ============================================================
// PART 3 — Full Trend Sparkline
// ============================================================

function FullTrendSparkline({ metrics, language }: { metrics: EpMetric[]; language: AppLanguage }) {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<MetricKey, boolean>>({
    tension: true,
    pacing: true,
    immersion: true,
    eos: true,
  });

  if (metrics.length < 2) return null;

  const isKO = language === 'KO';
  const w = 600;
  const h = 100;
  const padX = 24;
  const padY = 12;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const toggleMetric = (key: MetricKey) => {
    setVisibleMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-black/20 border border-border/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          {isKO ? '전체 에피소드 추이' : 'Full Series Trajectory'}
        </h4>
        {/* Metric legend toggles */}
        <div className="flex gap-2">
          {METRIC_KEYS.map(key => (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              className={`flex items-center gap-1 text-[8px] font-bold uppercase transition-opacity ${
                visibleMetrics[key] ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: METRIC_COLORS[key] }} />
              {METRIC_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" role="img" aria-label="Full trend sparkline">
        {/* Subtle horizontal grid */}
        {[25, 50, 75].map(v => (
          <line key={v} x1={padX} y1={padY + chartH - (v / 100) * chartH} x2={w - padX} y2={padY + chartH - (v / 100) * chartH}
            stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        ))}

        {/* One line per metric */}
        {METRIC_KEYS.filter(key => visibleMetrics[key]).map(key => {
          const color = METRIC_COLORS[key];
          const points = metrics.map((m, i) => {
            const x = padX + (metrics.length > 1 ? (i / (metrics.length - 1)) * chartW : chartW / 2);
            const y = padY + chartH - (m[key] / 100) * chartH;
            return `${x},${y}`;
          }).join(' ');

          // Gradient fill area
          const areaPoints = [
            `${padX},${padY + chartH}`,
            ...metrics.map((m, i) => {
              const x = padX + (metrics.length > 1 ? (i / (metrics.length - 1)) * chartW : chartW / 2);
              const y = padY + chartH - (m[key] / 100) * chartH;
              return `${x},${y}`;
            }),
            `${padX + (metrics.length > 1 ? ((metrics.length - 1) / (metrics.length - 1)) * chartW : chartW / 2)},${padY + chartH}`,
          ].join(' ');

          return (
            <g key={key}>
              <polygon fill={`${color}08`} points={areaPoints} />
              <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
                points={points} opacity="0.8" />
            </g>
          );
        })}

        {/* Episode index labels at bottom (sparse) */}
        {metrics.reduce<Array<{ m: EpMetric; i: number }>>((acc, m, i) => {
          if (i === 0 || i === metrics.length - 1 || (i + 1) % Math.max(1, Math.ceil(metrics.length / 10)) === 0) {
            acc.push({ m, i });
          }
          return acc;
        }, []).map(({ m, i }) => {
          const x = padX + (metrics.length > 1 ? (i / (metrics.length - 1)) * chartW : chartW / 2);
          return (
            <text key={m.index} x={x} y={h - 1} fill="rgba(255,255,255,0.2)" fontSize="6" textAnchor="middle">
              {m.index}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=full-trend-sparkline | inputs=EpMetric[] | outputs=JSX

// ============================================================
// PART 4 — Episode Selector (with delta badges)
// ============================================================

function EpisodeSelector({ metrics, selected, onToggle, language }: {
  metrics: EpMetric[];
  selected: number[];
  onToggle: (idx: number) => void;
  language: AppLanguage;
}) {
  const isKO = language === 'KO';

  // Pre-compute delta map: index -> tension delta vs predecessor
  const deltaMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 1; i < metrics.length; i++) {
      map.set(metrics[i].index, metrics[i].tension - metrics[i - 1].tension);
    }
    return map;
  }, [metrics]);

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
          const delta = deltaMap.get(m.index);
          return (
            <button
              key={m.index}
              onClick={() => onToggle(m.index)}
              disabled={!isSelected && selected.length >= MAX_COMPARE}
              className={`relative p-2 rounded-lg border text-center transition-[transform,opacity,background-color,border-color,color] ${
                isSelected
                  ? 'border-white/30 text-white'
                  : 'border-border/50 text-text-tertiary hover:border-white/20 disabled:opacity-30'
              }`}
              style={isSelected ? { background: `${color}15`, borderColor: color } : undefined}
            >
              {/* Delta badge */}
              {delta != null && delta !== 0 && (
                <span className={`absolute -top-1.5 -right-1.5 text-[7px] font-black px-1 py-px rounded-full leading-none ${
                  delta > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {delta > 0 ? `▲+${delta}` : `▼${delta}`}
                </span>
              )}
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

// IDENTITY_SEAL: PART-4 | role=episode-selector | inputs=metrics,selected | outputs=JSX

// ============================================================
// PART 5 — Overlay Chart & Comparison Table (with click-to-drill)
// ============================================================

function OverlayChart({ episodes, language, onEpisodeClick }: {
  episodes: EpMetric[];
  language: AppLanguage;
  onEpisodeClick?: (idx: number) => void;
}) {
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
              {/* Episode label (clickable) */}
              <text x={w - padX + 5} y={padY + chartH - (ep[metricLabels[metricLabels.length - 1]] / 100) * chartH + 3}
                fill={color} fontSize="8" fontWeight="bold" className="cursor-pointer"
                onClick={() => onEpisodeClick?.(ep.index)}>
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
                <th key={ep.index} className="text-center py-1 px-2 cursor-pointer hover:underline"
                  style={{ color: COMPARE_PALETTE[i] }}
                  onClick={() => onEpisodeClick?.(ep.index)}>
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
                  {episodes.map((ep, _i) => {
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

// IDENTITY_SEAL: PART-5 | role=overlay-chart-table | inputs=EpMetric[],onEpisodeClick | outputs=JSX

// ============================================================
// PART 6 — Drilldown Panel
// ============================================================

function DrilldownPanel({ data, language, onClose }: {
  data: DrilldownData;
  language: AppLanguage;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isKO = language === 'KO';
  const previewLen = 500;
  const textPreview = data.fullText.slice(0, previewLen);
  const hasMore = data.fullText.length > previewLen;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-text-tertiary" />
          {isKO ? `에피소드 #${data.index} 상세` : `Episode #${data.index} Drilldown`}
        </h3>
        <button onClick={onClose} className="text-[9px] text-text-tertiary hover:text-white transition-colors uppercase tracking-wider font-bold">
          {isKO ? '닫기' : 'Close'}
        </button>
      </div>

      {/* Text preview */}
      <div className="space-y-1">
        <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
          {isKO ? '본문 미리보기' : 'Text Preview'}
        </p>
        <div className="bg-black/20 rounded-lg p-3 text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
          {expanded ? data.fullText : textPreview}
          {hasMore && !expanded && '...'}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[8px] text-text-tertiary hover:text-white transition-colors font-bold uppercase"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? (isKO ? '접기' : 'Show less') : (isKO ? '더 보기' : 'Show more')}
          </button>
        )}
      </div>

      {/* Per-paragraph tension/pacing bars */}
      <div className="space-y-1">
        <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
          {isKO ? '문단별 긴장감 / 호흡' : 'Per-Paragraph Tension / Pacing'}
        </p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {data.paragraphs.map((p, i) => (
            <div key={i} className={`flex items-center gap-2 p-1.5 rounded-md text-[8px] ${
              i === data.highDialogueParagraphIdx ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-black/10'
            }`}>
              <span className="text-text-tertiary font-mono w-5 shrink-0 text-right">P{i + 1}</span>
              {/* Tension bar */}
              <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden" title={`Tension: ${p.tension}`}>
                <div className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color]" style={{ width: `${p.tension}%`, background: METRIC_COLORS.tension }} />
              </div>
              {/* Pacing bar */}
              <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden" title={`Pacing: ${p.pacing}`}>
                <div className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color]" style={{ width: `${p.pacing}%`, background: METRIC_COLORS.pacing }} />
              </div>
              {p.isDialogue && <span className="text-[7px] text-purple-400 font-bold shrink-0">DLG</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-[7px] text-text-tertiary">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-1 rounded-full" style={{ background: METRIC_COLORS.tension }} /> {isKO ? '긴장감' : 'Tension'}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-1 rounded-full" style={{ background: METRIC_COLORS.pacing }} /> {isKO ? '호흡' : 'Pacing'}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-1 rounded-sm bg-purple-500/30" /> {isKO ? '최다대화 문단' : 'Top dialogue para'}</span>
        </div>
      </div>

      {/* Key sentences */}
      <div className="space-y-1">
        <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">
          {isKO ? '주요 문장' : 'Key Sentences'}
        </p>
        <div className="space-y-1.5">
          {data.longestSentence && (
            <div className="bg-black/10 rounded-lg p-2">
              <span className="text-[7px] text-text-tertiary uppercase font-bold block mb-0.5">{isKO ? '최장 문장' : 'Longest'}</span>
              <p className="text-[9px] text-text-secondary leading-relaxed">{data.longestSentence.slice(0, 200)}{data.longestSentence.length > 200 ? '...' : ''}</p>
            </div>
          )}
          {data.shortestSentence && (
            <div className="bg-black/10 rounded-lg p-2">
              <span className="text-[7px] text-text-tertiary uppercase font-bold block mb-0.5">{isKO ? '최단 문장' : 'Shortest'}</span>
              <p className="text-[9px] text-text-secondary leading-relaxed">{data.shortestSentence}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=drilldown-panel | inputs=DrilldownData,language | outputs=JSX

// ============================================================
// PART 7 — Trend Analysis + Main Component
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
  const [drilldownIdx, setDrilldownIdx] = useState<number | null>(null);

  const toggleEpisode = (idx: number) => {
    setSelected(prev =>
      prev.includes(idx)
        ? prev.filter(i => i !== idx)
        : prev.length < MAX_COMPARE ? [...prev, idx] : prev
    );
  };

  const handleDrilldown = useCallback((idx: number) => {
    setDrilldownIdx(prev => prev === idx ? null : idx);
  }, []);

  const selectedEpisodes = useMemo(
    () => selected.map(idx => metrics.find(m => m.index === idx)).filter((m): m is EpMetric => !!m),
    [selected, metrics]
  );

  const drilldownData = useMemo(() => {
    if (drilldownIdx == null) return null;
    return extractDrilldown(messages, drilldownIdx);
  }, [drilldownIdx, messages]);

  if (metrics.length < 2) {
    return (
      <div className="text-center py-8 text-text-tertiary text-xs">
        {isKO ? '비교하려면 최소 2개 챕터가 필요합니다.' : 'Need at least 2 chapters to compare.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Full trend sparkline — series-wide trajectory */}
      <FullTrendSparkline metrics={metrics} language={language} />

      {/* Trend overview (moving averages) */}
      <TrendSection metrics={metrics} language={language} />

      {/* Episode selector with delta badges */}
      <EpisodeSelector metrics={metrics} selected={selected} onToggle={toggleEpisode} language={language} />

      {/* Overlay chart + table */}
      {selectedEpisodes.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
            {isKO ? '에피소드 비교' : 'Episode Comparison'}
            <span className="ml-2 text-[8px] text-text-tertiary font-normal">
              {isKO ? '(헤더 클릭 시 상세 분석)' : '(click header to drill down)'}
            </span>
          </h3>
          <OverlayChart episodes={selectedEpisodes} language={language} onEpisodeClick={handleDrilldown} />
        </div>
      )}

      {selectedEpisodes.length === 0 && (
        <div className="text-center py-6 text-text-tertiary text-[10px] border border-border/30 border-dashed rounded-xl">
          {isKO ? '위에서 에피소드를 선택하면 비교 차트가 표시됩니다' : 'Select episodes above to see comparison chart'}
        </div>
      )}

      {/* Drilldown panel */}
      {drilldownData && (
        <DrilldownPanel data={drilldownData} language={language} onClose={() => setDrilldownIdx(null)} />
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-7 | role=trend-analysis+main | inputs=messages,language | outputs=JSX
