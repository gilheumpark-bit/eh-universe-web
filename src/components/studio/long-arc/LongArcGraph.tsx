"use client";
// ============================================================
// LongArcGraph — 텐션 궤적 SVG. 계획 vs 실제 두 곡선 + 꺾임 빨강.
// [C] points 0개 → null / [G] 단일 path 빌드 / [K] 외부 차트 lib X
// ============================================================

import React from 'react';
import type { TensionTrajectory } from '@/lib/long-arc-verifier/types';

export interface LongArcGraphProps {
  trajectory: TensionTrajectory;
  /** 계획 텐션 (있으면 두 번째 곡선) */
  plannedPoints?: Array<{ episodeId: number; tension: number }>;
  width?: number;
  height?: number;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const LongArcGraph: React.FC<LongArcGraphProps> = ({
  trajectory,
  plannedPoints,
  width = 600,
  height = 200,
  language = 'KO',
}) => {
  const isKO = language === 'KO';

  if (trajectory.points.length === 0) {
    return (
      <div className="text-xs text-text-tertiary text-center py-4">
        {isKO ? '데이터 없음' : 'No data'}
      </div>
    );
  }

  const pad = 30;
  const max = trajectory.points.length;
  const stepX = (width - pad * 2) / Math.max(1, max - 1);

  const buildPath = (vals: number[]): string =>
    vals
      .map((v, i) => {
        const x = pad + i * stepX;
        const y = height - pad - (v / 100) * (height - pad * 2);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

  const actualPath = buildPath(trajectory.points.map((p) => p.tension));
  const plannedPath = plannedPoints && plannedPoints.length > 0
    ? buildPath(plannedPoints.map((p) => p.tension))
    : null;

  return (
    <figure
      className="bg-bg-tertiary/30 border border-border rounded-md p-2"
      aria-label={isKO ? '텐션 궤적 그래프' : 'Tension trajectory'}
    >
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {/* Y axis grid */}
        {[0, 25, 50, 75, 100].map((y) => {
          const py = height - pad - (y / 100) * (height - pad * 2);
          return (
            <g key={y}>
              <line x1={pad} y1={py} x2={width - pad} y2={py} stroke="#2a2a2a" strokeDasharray="2,3" />
              <text x={pad - 5} y={py + 3} fill="#666" fontSize="9" textAnchor="end">
                {y}
              </text>
            </g>
          );
        })}

        {/* Planned (dashed) */}
        {plannedPath && (
          <path d={plannedPath} fill="none" stroke="#888" strokeWidth="1" strokeDasharray="4,3" />
        )}

        {/* Actual */}
        <path d={actualPath} fill="none" stroke="#8b5cf6" strokeWidth="1.5" />

        {/* Inflection dots */}
        {trajectory.points.map((p, i) => {
          const x = pad + i * stepX;
          const y = height - pad - (p.tension / 100) * (height - pad * 2);
          return (
            <circle
              key={p.episodeId}
              cx={x}
              cy={y}
              r={p.isInflection ? 4 : 2}
              fill={p.isInflection ? '#ef4444' : '#8b5cf6'}
            >
              <title>
                EP{p.episodeId}: {p.tension}{p.isInflection ? ' ★' : ''}
              </title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="text-[10px] text-text-tertiary mt-1 flex justify-between">
        <span>{isKO ? '실선=실제' : 'solid=actual'}{plannedPath ? `, ${isKO ? '점선=계획' : 'dashed=planned'}` : ''}</span>
        <span>
          {isKO ? '꺾임' : 'inflections'} {trajectory.inflectionCount} · {isKO ? '편차' : 'avg dev'} {trajectory.avgDeviation.toFixed(1)}
        </span>
      </figcaption>
    </figure>
  );
};

export default LongArcGraph;
