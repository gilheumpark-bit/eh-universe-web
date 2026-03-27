"use client";

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import React, { useState, useCallback, useRef, useMemo } from 'react';
import type { WorldSimData, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { Plus, Link, Trash2 } from 'lucide-react';

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

export default function WorldMap({ simData, language, onChange, highlightEra }: Props) {
  const isKO = language === 'KO';
  const territories = simData.territories || [];
  const links = simData.territoryLinks || [];

  const [dragging, setDragging] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<TerritoryLink['type']>('border');
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
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
          {L4(language, { ko: '영토 지도', en: 'Territory Map', jp: '領土マップ', cn: '领土地图' })}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setLinkMode(!linkMode); setLinkFrom(null); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
              linkMode ? 'bg-blue-600 text-white border-blue-500' : 'text-text-tertiary border-border hover:border-white/20'
            }`}
          >
            <Link className="w-3 h-3" />
            {isKO ? '연결 모드' : 'Link Mode'}
          </button>
          <button onClick={addTerritory}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold bg-accent-purple text-white">
            <Plus className="w-3 h-3" />
            {isKO ? '영역 추가' : 'Add Region'}
          </button>
        </div>
      </div>

      {linkMode && (
        <div className="flex gap-1 items-center">
          <span className="text-[9px] text-text-tertiary">{isKO ? '연결 유형:' : 'Link type:'}</span>
          {(Object.keys(LINK_COLORS) as TerritoryLink['type'][]).map(type => (
            <button key={type} onClick={() => setLinkType(type)}
              className={`px-2 py-1 rounded text-[8px] font-bold border transition-all ${
                linkType === type ? 'text-white' : 'text-text-tertiary border-border'
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
      <svg ref={svgRef} viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full border border-border/30 rounded-xl"
        style={{ touchAction: 'none', background: 'var(--color-bg-secondary, #0f141c)', fontFamily: 'var(--font-mono, monospace)' }}
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

        {/* Empty state */}
        {territories.length === 0 && (
          <text x={MAP_W / 2} y={MAP_H / 2} fill="rgba(255,255,255,0.2)" fontSize="11" textAnchor="middle">
            {isKO ? '"영역 추가" 버튼을 눌러 지도를 구성하세요' : 'Click "Add Region" to build your map'}
          </text>
        )}
      </svg>

      {/* Territory list (editable) */}
      {territories.length > 0 && (
        <div className="space-y-1">
          {territories.map(t => (
            <div key={t.id} className="flex items-center gap-2 bg-black/20 border border-border/30 rounded-lg px-3 py-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color || civColors[t.civName] || '#6b7280' }} />
              <input
                value={t.name}
                onChange={e => updateTerritory(t.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-[10px] font-bold text-white outline-none"
                maxLength={30}
              />
              <select
                value={t.civName}
                onChange={e => updateTerritory(t.id, { civName: e.target.value, color: civColors[e.target.value] })}
                className="bg-black border border-border rounded px-2 py-0.5 text-[9px] outline-none"
              >
                <option value="">{isKO ? '소속 없음' : 'Unassigned'}</option>
                {civNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button onClick={() => removeTerritory(t.id)} className="text-text-tertiary hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link legend */}
      <div className="flex flex-wrap gap-3 text-[9px]">
        {(Object.entries(LINK_COLORS) as [TerritoryLink['type'], string][]).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-4 h-0.5 inline-block rounded" style={{ background: color }} />
            <span className="text-text-tertiary">{type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=map-canvas | inputs=WorldSimData,language | outputs=JSX
