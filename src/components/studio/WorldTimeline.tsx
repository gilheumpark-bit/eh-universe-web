"use client";

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useMemo, memo, useState, useCallback } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import type { WorldSimData, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface Props {
  simData: WorldSimData;
  language: AppLanguage;
  selectedEra?: string;
  onSelectEra?: (era: string) => void;
  /** Callback to reorder civilizations in the timeline */
  onReorderCiv?: (fromIndex: number, toIndex: number) => void;
  /** Current episode number for badge display */
  currentEpisode?: number;
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

function WorldTimeline({ simData, language, selectedEra, onSelectEra, onReorderCiv, currentEpisode }: Props) {
  const isKO = language === 'KO';
  const { tracks, allEras } = useMemo(() => buildTracks(simData), [simData]);

  const handleMoveUp = useCallback((idx: number) => {
    if (idx > 0 && onReorderCiv) onReorderCiv(idx, idx - 1);
  }, [onReorderCiv]);

  const handleMoveDown = useCallback((idx: number) => {
    if (idx < tracks.length - 1 && onReorderCiv) onReorderCiv(idx, idx + 1);
  }, [onReorderCiv, tracks.length]);

  if (tracks.length === 0) {
    return (
      <div className="ds-empty-state py-16 border border-border bg-bg-secondary rounded-2xl">
        <div className="ds-empty-state-icon">
          <Clock className="w-7 h-7" />
        </div>
        <p className="ds-empty-state-title">
          {isKO ? '타임라인 없음' : 'No Timeline'}
        </p>
        <p className="ds-empty-state-desc">
          {isKO
            ? '시뮬레이터에서 문명을 추가하면 타임라인이 표기됩니다.'
            : 'Add civilizations in the Simulator to initialize the timeline visualization.'}
        </p>
        <button
          onClick={() => onSelectEra?.('')}
          className="mt-4 px-4 py-2 bg-accent-amber/15 border border-accent-amber/30 rounded-xl text-[10px] font-bold text-accent-amber hover:bg-accent-amber/25 transition-colors font-mono uppercase tracking-wider"
        >
          {isKO ? '타임라인 이벤트 추가' : 'Add Timeline Event'}
        </button>
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
      <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono drop-shadow-[0_0_5px_rgba(255,200,50,0.3)] flex items-center gap-2">
        <Clock className="w-3 h-3 text-amber-400" />
        {L4(language, { ko: '문명 타임라인', en: 'Civilization Timeline', ja: '文明タイムライン', zh: '文明时间线' })}
      </h3>

      <div className="overflow-x-auto bg-bg-secondary rounded-2xl border border-border p-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[500px] h-auto" style={{ fontFamily: 'var(--font-mono, monospace)' }}
          role="img" aria-label={isKO ? '문명 타임라인' : 'Civilization timeline'}>

          {/* Background — transparent so parent bg shows through */}
          <rect width={w} height={h} fill="transparent" rx="8" />
          <rect width={w} height={h} fill="url(#grid)" rx="8" />

          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border, #2f2c26)" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>

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
                    fill="rgba(255,200,50,0.1)" rx="4" />
                )}
                <line x1={PAD.left + i * ERA_W} y1={PAD.top - 10} x2={PAD.left + i * ERA_W} y2={h - PAD.bottom}
                  stroke={isSelected ? 'var(--color-accent-amber, #b8955c)' : 'var(--color-border, #2f2c26)'} strokeWidth={isSelected ? "1" : "0.5"} />
                <text x={eraX(era)} y={PAD.top - 18}
                  fill={isSelected ? 'var(--color-accent-amber, #b8955c)' : 'var(--color-text-secondary, #b5ac9d)'}
                  fontSize="9" textAnchor="middle" fontWeight="bold">
                  {era.length > 12 ? era.slice(0, 12) + '…' : era}
                </text>
              </g>
            );
          })}

          {/* Track labels with reorder arrows */}
          {tracks.map((track, i) => (
            <g key={`label-${track.civName}`}>
              <text x={PAD.left - 10} y={trackY(i) + 4}
                fill="var(--color-text-primary, #f4f0ea)" fontSize="10" textAnchor="end" fontWeight="bold">
                {track.civName.length > 8 ? track.civName.slice(0, 8) + '…' : track.civName}
              </text>
              {/* Episode badge */}
              {currentEpisode != null && (
                <g>
                  <rect x={PAD.left - 70} y={trackY(i) - 7} width={22} height={14} rx="4"
                    fill="var(--color-accent-amber, #b8955c)" opacity="0.25" />
                  <text x={PAD.left - 59} y={trackY(i) + 4} fontSize="7" textAnchor="middle"
                    fill="var(--color-accent-amber, #b8955c)" fontWeight="bold">
                    E{currentEpisode}
                  </text>
                </g>
              )}
              {/* Reorder arrows (up/down) */}
              {onReorderCiv && (
                <foreignObject x={2} y={trackY(i) - 10} width="20" height="22">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                    {i > 0 && (
                      <button onClick={() => handleMoveUp(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: '10px', color: 'var(--color-text-tertiary, #888)' }} aria-label="Move up">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6"/></svg>
                      </button>
                    )}
                    {i < tracks.length - 1 && (
                      <button onClick={() => handleMoveDown(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: '10px', color: 'var(--color-text-tertiary, #888)' }} aria-label="Move down">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                    )}
                  </div>
                </foreignObject>
              )}
            </g>
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

          {/* Causal connection lines (cross-track links for shared eras) */}
          {tracks.map((trackA, idxA) =>
            tracks.slice(idxA + 1).map((trackB, offsetB) => {
              const idxB = idxA + 1 + offsetB;
              // Find shared eras between the two tracks
              const shared = trackA.eras.filter(era => trackB.eras.includes(era));
              return shared.map(era => {
                const x = eraX(era);
                const y1 = trackY(idxA);
                const y2 = trackY(idxB);
                return (
                  <line key={`causal-${idxA}-${idxB}-${era}`}
                    x1={x} y1={y1 + 6} x2={x} y2={y2 - 6}
                    stroke="var(--color-text-tertiary, #888)"
                    strokeWidth="1" strokeDasharray="3,3" opacity="0.35" />
                );
              });
            })
          )}

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
      <div className="flex flex-wrap gap-3 text-[9px] mt-4 p-3 border border-[rgba(255,200,50,0.15)] bg-[rgba(255,200,50,0.02)] rounded-xl backdrop-blur-sm">
        {tracks.map(track => (
          <span key={track.civName} className="flex items-center gap-1.5 px-2 py-1 bg-bg-tertiary rounded-md border border-[rgba(255,255,255,0.05)]">
            <span className="w-2.5 h-2.5 rounded-full inline-block shadow-[0_0_5px_currentColor]" style={{ background: track.color, color: track.color }} />
            <span className="text-text-secondary font-mono">{track.civName}</span>
            <span className="text-text-tertiary font-mono">({track.eras.length}{isKO ? '시대' : 'Era'})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(WorldTimeline);

// IDENTITY_SEAL: PART-3 | role=svg-timeline | inputs=WorldSimData,language | outputs=JSX
