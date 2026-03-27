"use client";

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { WorldSimData, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface Props {
  simData: WorldSimData;
  language: AppLanguage;
  selectedEra?: string;
  onSelectEra?: (era: string) => void;
}

interface TimelineTrack {
  civName: string;
  color: string;
  eras: string[];
  transitions: { fromEra: string; toEra: string; desc: string }[];
}

const CIV_FALLBACK_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=TimelineTrack

// ============================================================
// PART 2 — Data Transformation
// ============================================================

function buildTracks(simData: WorldSimData): { tracks: TimelineTrack[]; allEras: string[] } {
  const civs = simData.civs || [];
  const transitions = simData.transitions || [];

  // Collect all unique eras
  const eraSet = new Set<string>();
  civs.forEach(c => eraSet.add(c.era));
  transitions.forEach(t => { eraSet.add(t.fromEra); eraSet.add(t.toEra); });
  const allEras = Array.from(eraSet);

  // Group by civilization
  const civMap = new Map<string, TimelineTrack>();
  civs.forEach((c, i) => {
    if (!civMap.has(c.name)) {
      civMap.set(c.name, {
        civName: c.name,
        color: c.color || CIV_FALLBACK_COLORS[i % CIV_FALLBACK_COLORS.length],
        eras: [],
        transitions: [],
      });
    }
    civMap.get(c.name)!.eras.push(c.era);
  });

  // Assign transitions to tracks
  transitions.forEach(t => {
    // Find which civ this transition belongs to by era overlap
    for (const track of civMap.values()) {
      if (track.eras.includes(t.fromEra) || track.eras.includes(t.toEra)) {
        track.transitions.push({ fromEra: t.fromEra, toEra: t.toEra, desc: t.description });
        if (!track.eras.includes(t.toEra)) track.eras.push(t.toEra);
        break;
      }
    }
  });

  return { tracks: Array.from(civMap.values()), allEras };
}

// IDENTITY_SEAL: PART-2 | role=transform | inputs=WorldSimData | outputs=tracks,allEras

// ============================================================
// PART 3 — SVG Timeline Renderer
// ============================================================

const TRACK_H = 40;
const ERA_W = 120;
const PAD = { top: 40, left: 100, right: 20, bottom: 20 };

export default function WorldTimeline({ simData, language, selectedEra, onSelectEra }: Props) {
  const isKO = language === 'KO';
  const { tracks, allEras } = useMemo(() => buildTracks(simData), [simData]);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-2xl">
        <div className="w-14 h-14 bg-bg-secondary/60 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-7 h-7 text-text-tertiary opacity-30" />
        </div>
        <p className="text-xs font-black text-text-tertiary uppercase tracking-[0.3em] mb-2">
          {isKO ? '타임라인 없음' : 'No Timeline'}
        </p>
        <p className="text-[11px] text-text-tertiary max-w-[280px]">
          {isKO
            ? '시뮬레이터에서 문명을 추가하면 타임라인이 표시됩니다.'
            : 'Add civilizations in the Simulator to see the timeline.'}
        </p>
      </div>
    );
  }

  const w = PAD.left + allEras.length * ERA_W + PAD.right;
  const h = PAD.top + tracks.length * TRACK_H + PAD.bottom;

  const eraIndex = (era: string) => allEras.indexOf(era);
  const eraX = (era: string) => PAD.left + eraIndex(era) * ERA_W + ERA_W / 2;
  const trackY = (i: number) => PAD.top + i * TRACK_H + TRACK_H / 2;

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
        {L4(language, { ko: '문명 타임라인', en: 'Civilization Timeline', jp: '文明タイムライン', cn: '文明时间线' })}
      </h3>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[500px] h-auto" style={{ fontFamily: 'var(--font-mono, monospace)' }}
          role="img" aria-label={isKO ? '문명 타임라인' : 'Civilization timeline'}>

          {/* Background */}
          <rect width={w} height={h} fill="var(--color-bg-secondary, #0f141c)" rx="8" opacity="0.5" />

          {/* Era column headers (clickable) */}
          {allEras.map((era, i) => {
            const isSelected = selectedEra === era;
            return (
              <g key={era} style={{ cursor: onSelectEra ? 'pointer' : undefined }}
                onClick={() => onSelectEra?.(era)}>
                {/* Highlight background for selected era */}
                {isSelected && (
                  <rect x={PAD.left + i * ERA_W} y={PAD.top - 10}
                    width={ERA_W} height={h - PAD.top - PAD.bottom + 10}
                    fill="rgba(139,92,246,0.08)" rx="4" />
                )}
                <line x1={PAD.left + i * ERA_W} y1={PAD.top - 10} x2={PAD.left + i * ERA_W} y2={h - PAD.bottom}
                  stroke={isSelected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'} strokeWidth="0.5" />
                <text x={eraX(era)} y={PAD.top - 18}
                  fill={isSelected ? 'rgba(139,92,246,0.9)' : 'rgba(255,255,255,0.4)'}
                  fontSize="8" textAnchor="middle" fontWeight="bold">
                  {era.length > 12 ? era.slice(0, 12) + '…' : era}
                </text>
              </g>
            );
          })}

          {/* Track labels */}
          {tracks.map((track, i) => (
            <text key={track.civName} x={PAD.left - 10} y={trackY(i) + 4}
              fill={track.color} fontSize="9" textAnchor="end" fontWeight="bold">
              {track.civName.length > 8 ? track.civName.slice(0, 8) + '…' : track.civName}
            </text>
          ))}

          {/* Track bands */}
          {tracks.map((track, i) => {
            if (track.eras.length === 0) return null;
            const startX = eraX(track.eras[0]) - ERA_W / 3;
            const endX = eraX(track.eras[track.eras.length - 1]) + ERA_W / 3;
            return (
              <g key={`band-${track.civName}`}>
                <rect x={startX} y={trackY(i) - 12} width={Math.max(endX - startX, 20)} height={24}
                  rx="6" fill={track.color} opacity="0.12" stroke={track.color} strokeWidth="1" />
                {/* Era dots (clickable) */}
                {track.eras.map(era => (
                  <circle key={era} cx={eraX(era)} cy={trackY(i)} r="4"
                    fill={track.color} opacity={selectedEra && selectedEra !== era ? 0.3 : 0.8}
                    style={{ cursor: onSelectEra ? 'pointer' : undefined }}
                    onClick={e => { e.stopPropagation(); onSelectEra?.(era); }}>
                    <title>{track.civName} — {era}</title>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* Transitions */}
          {tracks.map((track, trackIdx) =>
            track.transitions.map((t, tIdx) => {
              const x1 = eraX(t.fromEra);
              const x2 = eraX(t.toEra);
              const y = trackY(trackIdx);
              if (isNaN(x1) || isNaN(x2)) return null;
              return (
                <g key={`trans-${trackIdx}-${tIdx}`}>
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke={track.color} strokeWidth="2" opacity="0.6" markerEnd="url(#arrow)" />
                  <text x={(x1 + x2) / 2} y={y - 8} fill={track.color} fontSize="6" textAnchor="middle" opacity="0.7">
                    {t.desc.length > 16 ? t.desc.slice(0, 16) + '…' : t.desc}
                  </text>
                </g>
              );
            })
          )}

          {/* Arrow marker */}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="rgba(255,255,255,0.4)" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[9px]">
        {tracks.map(track => (
          <span key={track.civName} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: track.color, opacity: 0.4 }} />
            <span className="text-text-tertiary">{track.civName}</span>
            <span className="text-text-tertiary opacity-50">({track.eras.length} {isKO ? '시대' : 'eras'})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=svg-timeline | inputs=WorldSimData,language | outputs=JSX
