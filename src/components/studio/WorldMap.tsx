"use client";

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import React, { useState, useCallback, useRef, useMemo, memo } from 'react';
import type { WorldSimData, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { Plus, Link, Trash2, Map as MapIcon } from 'lucide-react';

interface Props {
  simData: WorldSimData;
  language: AppLanguage;
  onChange: (updated: Partial<WorldSimData>) => void;
  highlightEra?: string;
}

type Territory = NonNullable<WorldSimData['territories']>[number];
type TerritoryLink = NonNullable<WorldSimData['territoryLinks']>[number];

const LINK_COLORS: Record<TerritoryLink['type'], string> = {
  trade: '#22c55e',
  conflict: '#ef4444',
  border: '#6b7280',
  alliance: '#3b82f6',
};

const MAP_W = 600;
const MAP_H = 400;

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=Territory,TerritoryLink

// ============================================================
// PART 2 — Territory Canvas (SVG-based draggable regions)
// ============================================================

function WorldMap({ simData, language, onChange, highlightEra }: Props) {
  const isKO = language === 'KO';
  const territories = simData.territories || [];
  const links = simData.territoryLinks || [];

  const [dragging, setDragging] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<TerritoryLink['type']>('border');
  // [UX 2026-04-25] 방금 추가된 영역 시각 강조 — 외부 평가에서 "추가 후 무반응" 지적 대응
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const civNames = Array.from(new Set((simData.civs || []).map(c => c.name)));
  const civColors = Object.fromEntries((simData.civs || []).map(c => [c.name, c.color || '#6b7280']));

  // Civs active in the highlighted era (for timeline sync)
  const activeCivNames = useMemo(() => {
    if (!highlightEra) return null;
    const names = new Set<string>();
    (simData.civs || []).forEach(c => { if (c.era === highlightEra) names.add(c.name); });
    return names;
  }, [highlightEra, simData.civs]);

  const toSVG = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * MAP_W,
      y: ((clientY - rect.top) / rect.height) * MAP_H,
    };
  }, []);

  const addTerritory = () => {
    const id = `t-${Date.now()}`;
    const name = isKO ? `영역 ${territories.length + 1}` : `Region ${territories.length + 1}`;
    const newT: Territory = {
      id,
      name,
      civName: civNames[0] || '',
      x: MAP_W / 2 + (Math.random() - 0.5) * 100,
      y: MAP_H / 2 + (Math.random() - 0.5) * 100,
      color: civColors[civNames[0]] || '#6b7280',
    };
    onChange({ territories: [...territories, newT] });
    // [UX 2026-04-25] 시각 피드백 — 1.8초 highlight ring + SVG 캔버스로 스크롤
    // 외부 코워크 평가 ("+ 영역 추가 후 무반응") 후속 수리
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1800);
    setTimeout(() => svgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const removeTerritory = (id: string) => {
    onChange({
      territories: territories.filter(t => t.id !== id),
      territoryLinks: links.filter(l => l.from !== id && l.to !== id),
    });
  };

  const updateTerritory = (id: string, updates: Partial<Territory>) => {
    onChange({
      territories: territories.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    if (linkMode) {
      if (!linkFrom) {
        setLinkFrom(id);
      } else if (linkFrom !== id) {
        const exists = links.some(l =>
          (l.from === linkFrom && l.to === id) || (l.from === id && l.to === linkFrom)
        );
        if (!exists) {
          onChange({ territoryLinks: [...links, { from: linkFrom, to: id, type: linkType }] });
        }
        setLinkFrom(null);
      }
      return;
    }
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const { x, y } = toSVG(e.clientX, e.clientY);
    const clamped = {
      x: Math.max(30, Math.min(MAP_W - 30, x)),
      y: Math.max(30, Math.min(MAP_H - 30, y)),
    };
    updateTerritory(dragging, clamped);
  };

  const handlePointerUp = () => setDragging(null);

  const getT = (id: string) => territories.find(t => t.id === id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono drop-shadow-[0_0_5px_rgba(255,200,50,0.3)] flex items-center gap-2">
          <MapIcon className="w-3 h-3 text-amber-400" />
          {L4(language, { ko: '영토 지도', en: 'Territory Map', ja: '領土マップ', zh: '领土地图' })}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setLinkMode(!linkMode); setLinkFrom(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-transform active:scale-95 ${
              linkMode ? 'bg-[linear-gradient(135deg,rgba(255,100,50,0.2),rgba(200,50,20,0.1))] text-orange-400 border-[rgba(255,100,50,0.5)] shadow-[0_0_15px_rgba(255,100,50,0.2)]' : 'bg-[rgba(255,200,50,0.05)] text-amber-400 border-[rgba(255,200,50,0.2)] hover:border-[rgba(255,200,50,0.5)] hover:text-amber-400'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            {isKO ? '연결 모드' : 'Link Mode'}
          </button>
          <button onClick={addTerritory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-[linear-gradient(45deg,rgba(180,120,20,0.6),rgba(255,200,50,0.8))] text-white border border-[rgba(255,220,100,0.6)] shadow-[0_5px_15px_rgba(255,200,50,0.2)] transition-transform active:scale-95 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,200,50,0.4)]">
            <Plus className="w-3.5 h-3.5" />
            {isKO ? '영역 추가' : 'Add Region'}
          </button>
        </div>
      </div>

      {linkMode && (
        <div className="flex flex-wrap gap-1 items-center bg-[rgba(255,200,50,0.02)] border border-[rgba(255,200,50,0.15)] rounded-xl p-2 backdrop-blur-sm">
          <span className="text-[9px] text-text-tertiary font-mono px-1">{isKO ? '연결 유형:' : 'Link type:'}</span>
          {(Object.keys(LINK_COLORS) as TerritoryLink['type'][]).map(type => (
            <button key={type} onClick={() => setLinkType(type)}
              className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-[transform,opacity,background-color,border-color,color] ${
                linkType === type ? 'text-white border-transparent' : 'text-text-tertiary border-[rgba(255,200,50,0.2)] hover:text-amber-400 hover:bg-[rgba(255,200,50,0.05)]'
              }`}
              style={linkType === type ? { background: LINK_COLORS[type], borderColor: LINK_COLORS[type] } : undefined}
            >
              {type}
            </button>
          ))}
          {linkFrom && (
            <span className="text-[9px] text-amber-400 ml-2">
              {isKO ? `"${getT(linkFrom)?.name}" 에서 → 대상 클릭` : `From "${getT(linkFrom)?.name}" → click target`}
            </span>
          )}
        </div>
      )}

      {/* SVG Map Canvas */}
      <svg ref={svgRef} viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full border border-[rgba(255,200,50,0.3)] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,200,50,0.05)]"
        style={{ touchAction: 'none', background: 'rgba(15,10,0,0.6)', fontFamily: 'var(--font-mono, monospace)' }}
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        role="img" aria-label={isKO ? '세계관 영토 지도' : 'World territory map'}
      >
        {/* Grid + Animations */}
        <defs>
          <pattern id="mapGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
          {highlightEra && (
            <style>{`
              @keyframes eraPulse {
                0%, 100% { stroke-opacity: 1; stroke-width: 3; }
                50% { stroke-opacity: 0.4; stroke-width: 1.5; }
              }
              .era-active-border { animation: eraPulse 1.5s ease-in-out infinite; }
            `}</style>
          )}
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#mapGrid)" />

        {/* Territory links */}
        {links.map((link, i) => {
          const from = getT(link.from);
          const to = getT(link.to);
          if (!from || !to) return null;
          return (
            <g key={`link-${i}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={LINK_COLORS[link.type]} strokeWidth="1.5" strokeDasharray={link.type === 'border' ? '4,4' : undefined} opacity="0.6" />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 5}
                fill={LINK_COLORS[link.type]} fontSize="7" textAnchor="middle" opacity="0.7">
                {link.type}
              </text>
            </g>
          );
        })}

        {/* Territory nodes */}
        {territories.map(t => {
          const color = t.color || civColors[t.civName] || '#6b7280';
          const isLinkTarget = linkMode && linkFrom === t.id;
          const isEraActive = activeCivNames == null || activeCivNames.has(t.civName);
          const dimmed = activeCivNames != null && !isEraActive;
          return (
            <g key={t.id}
              style={{ cursor: linkMode ? 'crosshair' : 'grab', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.3s ease' }}
              onPointerDown={e => handlePointerDown(t.id, e)}
            >
              {/* Territory circle */}
              <circle cx={t.x} cy={t.y} r="25" fill={color} opacity="0.1" stroke={color}
                strokeWidth={isLinkTarget ? 3 : 1.5} strokeDasharray={isLinkTarget ? '4,2' : undefined}
                className={isEraActive && activeCivNames != null ? 'era-active-border' : undefined} />
              <circle cx={t.x} cy={t.y} r="6" fill={color} opacity="0.7" />
              {/* Name */}
              <text x={t.x} y={t.y + 18} fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">
                {t.name.length > 8 ? t.name.slice(0, 8) + '…' : t.name}
              </text>
              {/* Civ label */}
              <text x={t.x} y={t.y + 27} fill={color} fontSize="6" textAnchor="middle" opacity="0.6">
                {t.civName}
              </text>
            </g>
          );
        })}

        {/* [UX 2026-04-25] 방금 추가된 영역 강조 ring — SMIL 애니메이션, 1.5초 후 자동 소멸 */}
        {highlightId && (() => {
          const t = territories.find((tt) => tt.id === highlightId);
          if (!t) return null;
          return (
            <circle
              cx={t.x}
              cy={t.y}
              r={15}
              fill="none"
              stroke="rgba(255,220,100,0.95)"
              strokeWidth={3}
              pointerEvents="none"
              aria-hidden="true"
            >
              <animate attributeName="r" from="15" to="55" dur="1.5s" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" dur="1.5s" fill="freeze" />
              <animate attributeName="stroke-width" from="3" to="0.5" dur="1.5s" fill="freeze" />
            </circle>
          );
        })()}

        {/* Empty state */}
        {territories.length === 0 && (
          <g>
            <rect x={MAP_W / 2 - 24} y={MAP_H / 2 - 50} width="48" height="48" rx="24" fill="rgba(255,200,50,0.05)" stroke="rgba(255,200,50,0.2)" strokeWidth="1" />
            <text x={MAP_W / 2} y={MAP_H / 2 - 20} fill="rgba(255,200,50,0.6)" fontSize="22" textAnchor="middle" dominantBaseline="middle">&#x1F5FA;</text>
            <text x={MAP_W / 2} y={MAP_H / 2 + 16} fill="rgba(255,200,50,0.8)" fontSize="10" textAnchor="middle" fontWeight="bold" letterSpacing="0.15em">
              {isKO ? '지도 없음' : 'NO REGIONS'}
            </text>
            <text x={MAP_W / 2} y={MAP_H / 2 + 34} fill="rgba(255,200,50,0.5)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono, monospace)">
              {isKO ? '"영역 추가" 버튼을 눌러 지도를 구성하세요' : 'Click "Add Region" to build your map'}
            </text>
          </g>
        )}
      </svg>

      {/* Territory list (editable) */}
      {territories.length > 0 && (
        <div className="space-y-1">
          {territories.map(t => (
            <div key={t.id} className="flex items-center gap-2 bg-[linear-gradient(135deg,rgba(255,200,50,0.02),rgba(0,0,0,0.3))] border border-[rgba(255,200,50,0.15)] rounded-lg px-3 py-1.5 backdrop-blur-sm transition-colors hover:bg-[rgba(255,200,50,0.05)] hover:border-[rgba(255,200,50,0.3)]">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_5px_currentColor]" style={{ background: t.color || civColors[t.civName] || '#6b7280', color: t.color || civColors[t.civName] || '#6b7280' }} />
              <input
                value={t.name}
                onChange={e => updateTerritory(t.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-[10px] font-bold text-amber-400 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 placeholder:text-[rgba(255,200,50,0.3)]"
                maxLength={30}
              />
              <select
                value={t.civName}
                onChange={e => updateTerritory(t.id, { civName: e.target.value, color: civColors[e.target.value] })}
                className="bg-bg-secondary border border-[rgba(255,200,50,0.2)] rounded px-2 py-0.5 text-[9px] text-amber-400 font-mono outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-[rgba(255,200,50,0.6)]"
              >
                <option value="">{isKO ? '소속 없음' : 'Unassigned'}</option>
                {civNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button onClick={() => removeTerritory(t.id)} className="text-text-tertiary hover:text-accent-red hover:drop-shadow-[0_0_5px_rgba(255,50,50,0.5)] transition-[background-color,border-color,box-shadow,color]">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link legend */}
      <div className="flex flex-wrap gap-3 text-[9px] bg-[rgba(255,200,50,0.02)] border border-[rgba(255,200,50,0.1)] p-2 rounded-lg backdrop-blur-sm">
        {(Object.entries(LINK_COLORS) as [TerritoryLink['type'], string][]).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 inline-block rounded shadow-[0_0_5px_currentColor]" style={{ background: color, color: color }} />
            <span className="text-text-secondary font-mono">{type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(WorldMap);

// IDENTITY_SEAL: PART-2 | role=map-canvas | inputs=WorldSimData,language | outputs=JSX
