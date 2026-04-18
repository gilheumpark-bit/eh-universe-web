"use client";

// ============================================================
// WorkProfilerView.tsx — Whole-work profiler (tension / quality /
// characters / scene density) rendered as pure SVG + HTML, no chart
// libraries. Consumes ChatSession[] through work-profiler-engine.
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import { X, Download } from 'lucide-react';
import type { AppLanguage, ChatSession, Character } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import {
  buildProfile,
  profileToCsv,
  type CurvePoint,
  type WorkProfile,
} from '@/lib/work-profiler-engine';

// ============================================================
// PART 1 — public props + filter types
// ============================================================

export type ProfilerRange = 'all' | 'last10' | 'last30';

export interface WorkProfilerViewProps {
  sessions: ChatSession[];
  characters?: Character[];
  language: AppLanguage;
  onEpisodeClick?: (sessionId: string) => void;
  onClose?: () => void;
  className?: string;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 120;
const CHART_PADDING = 24;
const MAX_POINTS = 50;

// ============================================================
// PART 2 — SVG helpers (pure)
// ============================================================

/** Project a curve point into SVG coordinates. */
function pointsAttr(points: CurvePoint[], maxY: number): string {
  if (points.length === 0) return '';
  const usableW = CHART_WIDTH - CHART_PADDING * 2;
  const usableH = CHART_HEIGHT - CHART_PADDING * 2;
  const denomX = Math.max(1, points.length - 1);
  const safeMaxY = maxY > 0 ? maxY : 1;
  return points
    .map((p, i) => {
      const x = CHART_PADDING + (i / denomX) * usableW;
      const clampedY = Math.max(0, Math.min(p.y, safeMaxY));
      const y = CHART_PADDING + usableH - (clampedY / safeMaxY) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Downsample to <= MAX_POINTS for SVG perf without losing endpoints. */
function sampleCurve(points: CurvePoint[]): CurvePoint[] {
  if (points.length <= MAX_POINTS) return points;
  const out: CurvePoint[] = [];
  const step = (points.length - 1) / (MAX_POINTS - 1);
  for (let i = 0; i < MAX_POINTS; i += 1) {
    const idx = Math.min(points.length - 1, Math.round(i * step));
    out.push(points[idx]);
  }
  return out;
}

/** Map 0..maxVal to a monochrome alpha (0.08..0.95). */
function heatAlpha(value: number, maxVal: number): number {
  if (maxVal <= 0 || value <= 0) return 0.08;
  const ratio = Math.min(1, value / maxVal);
  return 0.08 + ratio * 0.87;
}

// ============================================================
// PART 3 — subcomponent: LineChart (pure presentational)
// ============================================================

interface LineChartProps {
  points: CurvePoint[];
  color: string;
  maxY: number;
  ariaLabel: string;
  onPointClick?: (index: number) => void;
}

const LineChart: React.FC<LineChartProps> = ({ points, color, maxY, ariaLabel, onPointClick }) => {
  const [hover, setHover] = useState<number | null>(null);
  const sampled = useMemo(() => sampleCurve(points), [points]);
  const poly = useMemo(() => pointsAttr(sampled, maxY), [sampled, maxY]);

  if (sampled.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-text-tertiary text-xs font-mono">
        —
      </div>
    );
  }

  const usableW = CHART_WIDTH - CHART_PADDING * 2;
  const usableH = CHART_HEIGHT - CHART_PADDING * 2;
  const denomX = Math.max(1, sampled.length - 1);
  const safeMaxY = maxY > 0 ? maxY : 1;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="w-full h-auto max-h-28"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* baseline + midline */}
      <line
        x1={CHART_PADDING}
        y1={CHART_HEIGHT - CHART_PADDING}
        x2={CHART_WIDTH - CHART_PADDING}
        y2={CHART_HEIGHT - CHART_PADDING}
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={1}
      />
      <line
        x1={CHART_PADDING}
        y1={CHART_HEIGHT / 2}
        x2={CHART_WIDTH - CHART_PADDING}
        y2={CHART_HEIGHT / 2}
        stroke="currentColor"
        strokeOpacity={0.08}
        strokeDasharray="2 4"
        strokeWidth={1}
      />
      <polyline fill="none" stroke={color} strokeWidth={2} points={poly} />
      {sampled.map((p, i) => {
        const cx = CHART_PADDING + (i / denomX) * usableW;
        const clampedY = Math.max(0, Math.min(p.y, safeMaxY));
        const cy = CHART_PADDING + usableH - (clampedY / safeMaxY) * usableH;
        return (
          <circle
            key={`pt-${i}`}
            cx={cx}
            cy={cy}
            r={hover === i ? 4 : 2}
            fill={color}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPointClick?.(i)}
            style={{ cursor: onPointClick ? 'pointer' : 'default' }}
          />
        );
      })}
      {hover !== null && sampled[hover] && (
        <g pointerEvents="none">
          <rect
            x={Math.min(
              CHART_WIDTH - 90,
              Math.max(0, CHART_PADDING + (hover / denomX) * usableW - 45),
            )}
            y={4}
            width={90}
            height={24}
            rx={4}
            fill="currentColor"
            fillOpacity={0.85}
          />
          <text
            x={Math.min(
              CHART_WIDTH - 45,
              Math.max(45, CHART_PADDING + (hover / denomX) * usableW),
            )}
            y={20}
            textAnchor="middle"
            fontSize={11}
            fill="var(--bg-primary, #0b0b0b)"
          >
            {`EP ${sampled[hover].x} · ${Math.round(sampled[hover].y)}`}
          </text>
        </g>
      )}
    </svg>
  );
};

// ============================================================
// PART 4 — main component
// ============================================================

const WorkProfilerView: React.FC<WorkProfilerViewProps> = ({
  sessions,
  characters,
  language,
  onEpisodeClick,
  onClose,
  className,
}) => {
  const [range, setRange] = useState<ProfilerRange>('all');

  // [G] slice before profile — avoids aggregating discarded episodes.
  const scopedSessions = useMemo(() => {
    if (!sessions?.length || range === 'all') return sessions ?? [];
    const sorted = [...sessions].sort(
      (a, b) => (a.config?.episode ?? 0) - (b.config?.episode ?? 0),
    );
    const n = range === 'last10' ? 10 : 30;
    return sorted.slice(-n);
  }, [sessions, range]);

  const profile: WorkProfile = useMemo(() => {
    try {
      return buildProfile(scopedSessions, {
        characterNames: characters?.map((c) => c.name).filter(Boolean),
      });
    } catch (err) {
      logger.warn('WorkProfilerView', 'buildProfile failed', err);
      return {
        totalEpisodes: 0,
        totalCharCount: 0,
        avgQualityAcrossWork: 0,
        tensionCurve: [],
        qualityCurve: [],
        pacingCurve: [],
        characterHeatmap: [],
        sceneDensity: [],
        metrics: [],
      };
    }
  }, [scopedSessions, characters]);

  const handleExport = useCallback(() => {
    try {
      const csv = profileToCsv(profile);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work-profile-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.warn('WorkProfilerView', 'export failed', err);
    }
  }, [profile]);

  const handleChartPoint = useCallback(
    (index: number) => {
      const m = profile.metrics[index];
      if (m && onEpisodeClick) onEpisodeClick(m.episodeId);
    },
    [profile.metrics, onEpisodeClick],
  );

  const maxSceneCount = useMemo(
    () => profile.sceneDensity.reduce((acc, p) => Math.max(acc, p.y), 0),
    [profile.sceneDensity],
  );
  const maxCharMentions = useMemo(() => {
    let m = 0;
    for (const row of profile.characterHeatmap) {
      for (const v of row.series) if (v > m) m = v;
    }
    return m;
  }, [profile.characterHeatmap]);

  // Static label packs — no runtime i18n fetch.
  const L = {
    title: L4(language, {
      ko: '작품 프로파일러',
      en: 'Work Profiler',
      ja: '作品プロファイラー',
      zh: '作品分析器',
    }),
    summary: L4(language, {
      ko: '요약',
      en: 'Summary',
      ja: '概要',
      zh: '概览',
    }),
    episodes: L4(language, { ko: '에피소드', en: 'Episodes', ja: 'エピソード', zh: '集数' }),
    chars: L4(language, { ko: '글자', en: 'Chars', ja: '文字', zh: '字数' }),
    quality: L4(language, { ko: '품질', en: 'Quality', ja: '品質', zh: '质量' }),
    tension: L4(language, {
      ko: '긴장도 곡선',
      en: 'Tension Curve',
      ja: '緊張度カーブ',
      zh: '紧张度曲线',
    }),
    qualityCurve: L4(language, {
      ko: '품질 곡선',
      en: 'Quality Curve',
      ja: '品質カーブ',
      zh: '质量曲线',
    }),
    heatmap: L4(language, {
      ko: '캐릭터 등장 히트맵',
      en: 'Character Heatmap',
      ja: 'キャラ登場ヒートマップ',
      zh: '角色出场热图',
    }),
    sceneDensity: L4(language, {
      ko: '씬 밀도',
      en: 'Scene Density',
      ja: 'シーン密度',
      zh: '场景密度',
    }),
    all: L4(language, { ko: '전체', en: 'All', ja: '全体', zh: '全部' }),
    last10: L4(language, { ko: '최근 10', en: 'Last 10', ja: '最近10', zh: '最近10' }),
    last30: L4(language, { ko: '최근 30', en: 'Last 30', ja: '最近30', zh: '最近30' }),
    export: L4(language, { ko: 'CSV 내보내기', en: 'Export CSV', ja: 'CSV出力', zh: '导出 CSV' }),
    close: L4(language, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' }),
    empty: L4(language, {
      ko: '아직 에피소드가 없습니다.',
      en: 'No episodes yet.',
      ja: 'エピソードがありません。',
      zh: '暂无集数。',
    }),
  };

  const hasData = profile.totalEpisodes > 0;

  // ============================================================
  // PART 5 — render
  // ============================================================
  return (
    <div
      role="region"
      aria-label={L.title}
      className={`bg-bg-primary border border-border rounded-2xl p-4 md:p-6 space-y-6 text-text-primary ${className ?? ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest font-mono">{L.title}</h2>
          <p className="text-xs text-text-tertiary mt-1">
            {L.summary}: {profile.totalEpisodes} {L.episodes} · {profile.totalCharCount.toLocaleString()} {L.chars} · {L.quality} {profile.avgQualityAcrossWork}
          </p>
        </div>
        <div className="flex gap-1 items-center flex-wrap">
          {/* Mobile: range dropdown */}
          <select
            className="sm:hidden min-h-[32px] px-2 py-1 text-[11px] font-bold rounded-md border border-border bg-bg-secondary text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            value={range}
            onChange={(e) => setRange(e.target.value as ProfilerRange)}
            aria-label={L.summary}
            data-testid="profiler-range-select"
          >
            <option value="all">{L.all}</option>
            <option value="last10">{L.last10}</option>
            <option value="last30">{L.last30}</option>
          </select>
          {/* Desktop: range button group */}
          <div className="hidden sm:flex gap-1 items-center">
            {(['all', 'last10', 'last30'] as ProfilerRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest font-mono border transition-colors ${
                  range === r
                    ? 'bg-accent-purple/20 border-accent-purple/40 text-accent-purple'
                    : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'
                }`}
              >
                {r === 'all' ? L.all : r === 'last10' ? L.last10 : L.last30}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!hasData}
            aria-label={L.export}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest font-mono border border-border bg-bg-secondary text-text-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3 h-3" /> {L.export}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={L.close}
              className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="py-16 text-center text-text-tertiary text-xs font-mono uppercase tracking-widest">
          {L.empty}
        </div>
      ) : (
        <>
          {/* Tension curve */}
          <section aria-label={L.tension} className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest font-mono text-text-secondary">
              {L.tension}
            </h3>
            <div className="text-accent-orange">
              <LineChart
                points={profile.tensionCurve}
                color="currentColor"
                maxY={100}
                ariaLabel={L.tension}
                onPointClick={onEpisodeClick ? handleChartPoint : undefined}
              />
            </div>
          </section>

          {/* Quality curve */}
          <section aria-label={L.qualityCurve} className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest font-mono text-text-secondary">
              {L.qualityCurve}
            </h3>
            <div className="text-accent-blue">
              <LineChart
                points={profile.qualityCurve}
                color="currentColor"
                maxY={100}
                ariaLabel={L.qualityCurve}
                onPointClick={onEpisodeClick ? handleChartPoint : undefined}
              />
            </div>
          </section>

          {/* Character heatmap */}
          <section aria-label={L.heatmap} className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest font-mono text-text-secondary">
              {L.heatmap}
            </h3>
            {profile.characterHeatmap.length === 0 ? (
              <div className="text-xs text-text-tertiary">—</div>
            ) : (
              <div className="space-y-1 overflow-x-auto -mx-2 px-2" data-testid="profiler-heatmap-scroll">
                {profile.characterHeatmap.map((row) => (
                  <div key={row.name} className="flex items-center gap-2 text-xs min-w-[320px]">
                    <span className="w-16 md:w-24 truncate font-mono text-text-secondary shrink-0" title={row.name}>
                      {row.name}
                    </span>
                    <div
                      className="flex-1 grid gap-0.5 min-w-[240px]"
                      style={{
                        gridTemplateColumns: `repeat(${row.series.length}, minmax(0, 1fr))`,
                      }}
                      role="row"
                    >
                      {row.series.map((v, i) => (
                        <div
                          key={`${row.name}-${i}`}
                          role="cell"
                          aria-label={`EP ${i + 1}: ${v}`}
                          title={`EP ${i + 1} · ${v}`}
                          className="h-4 rounded-sm"
                          style={{
                            backgroundColor: `rgba(139, 92, 246, ${heatAlpha(v, maxCharMentions)})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Scene density bar chart */}
          <section aria-label={L.sceneDensity} className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest font-mono text-text-secondary">
              {L.sceneDensity}
            </h3>
            <div
              className="flex items-end gap-0.5 h-20"
              role="img"
              aria-label={L.sceneDensity}
            >
              {profile.sceneDensity.map((p, i) => {
                const h = maxSceneCount > 0 ? (p.y / maxSceneCount) * 100 : 0;
                return (
                  <button
                    key={`scene-${i}`}
                    type="button"
                    onClick={
                      onEpisodeClick
                        ? () => {
                            const m = profile.metrics[i];
                            if (m) onEpisodeClick(m.episodeId);
                          }
                        : undefined
                    }
                    title={`EP ${p.x} · ${p.y}`}
                    className="flex-1 min-w-[2px] bg-accent-purple/70 hover:bg-accent-purple rounded-sm focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                    style={{ height: `${Math.max(2, h)}%` }}
                    aria-label={`EP ${p.x}: ${p.y}`}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default WorkProfilerView;
