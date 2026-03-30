"use client";

import React, { useState, useMemo } from "react";
import {
  type Lang,
  type Civilization,
  ERAS,
  HEX_SIZE,
  HEX_COLS,
  HEX_ROWS,
  L4,
} from "./types";

// ============================================================
// PART 1 — HEX Map View (territory painting)
// ============================================================

export function HexMapView({ lang, civs }: {
  lang: Lang;
  civs: Civilization[];
}) {
  const [selectedCiv, setSelectedCiv] = useState<string | null>(null);
  const [paintCiv, setPaintCiv] = useState<string | null>(null);
  const [hexMap, setHexMap] = useState<Record<string, string>>({});

  const hexCenters = useMemo(() => {
    const centers: { col: number; row: number; x: number; y: number; key: string }[] = [];
    for (let row = 0; row < HEX_ROWS; row++) {
      for (let col = 0; col < HEX_COLS; col++) {
        const offsetX = row % 2 === 1 ? HEX_SIZE * 0.87 : 0;
        const x = col * HEX_SIZE * 1.74 + offsetX + HEX_SIZE + 10;
        const y = row * HEX_SIZE * 1.5 + HEX_SIZE + 10;
        centers.push({ col, row, x, y, key: `${col}-${row}` });
      }
    }
    return centers;
  }, []);

  const hexPath = (cx: number, cy: number) => {
    const s = HEX_SIZE * 0.85;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
    });
    return pts.join(" ");
  };

  const [hexHint, setHexHint] = useState('');
  const handleHexClick = (key: string) => {
    if (paintCiv) {
      setHexMap(prev => {
        const next = { ...prev };
        if (next[key] === paintCiv) {
          delete next[key];
        } else {
          next[key] = paintCiv;
        }
        return next;
      });
      setHexHint('');
    } else {
      setHexHint(L4(lang, { ko: '먼저 세력을 선택하세요', en: 'Select a faction first' }));
      setTimeout(() => setHexHint(''), 2000);
    }
  };

  const civFromHex = (key: string) => civs.find(c => c.id === hexMap[key]);

  return (
    <div className="space-y-4">
      {/* Paint selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
          {L4(lang, { ko: "세력 페인트:", en: "Paint faction:" })}
        </span>
        {civs.map(c => (
          <button key={c.id} onClick={() => { setPaintCiv(paintCiv === c.id ? null : c.id); setSelectedCiv(c.id); }}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
              paintCiv === c.id ? "text-white" : "text-text-tertiary border-border"
            }`}
            style={paintCiv === c.id ? { background: c.color, borderColor: c.color } : undefined}
          >
            {c.name}
          </button>
        ))}
        {paintCiv && (
          <button onClick={() => setPaintCiv(null)} className="text-[10px] text-text-tertiary hover:text-accent-red">
            {L4(lang, { ko: "해제", en: "Clear" })}
          </button>
        )}
      </div>

      {civs.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-xs italic">
          {L4(lang, { ko: "문명을 추가하면 영역을 칠할 수 있습니다", en: "Add civilizations to paint territories" })}
        </div>
      ) : (
        <div className="flex justify-center overflow-x-auto">
          <svg
            viewBox={`0 0 ${HEX_COLS * HEX_SIZE * 1.74 + HEX_SIZE * 2 + 20} ${HEX_ROWS * HEX_SIZE * 1.5 + HEX_SIZE * 2 + 20}`}
            className="w-full max-w-[700px]"
          >
            {hexCenters.map(h => {
              const owner = civFromHex(h.key);
              return (
                <g key={h.key} onClick={() => handleHexClick(h.key)} className="cursor-pointer">
                  <polygon
                    points={hexPath(h.x, h.y)}
                    fill={owner ? owner.color : "var(--color-bg-secondary)"}
                    fillOpacity={owner ? 0.3 : 1}
                    stroke={owner ? owner.color : "var(--color-border)"}
                    strokeWidth={owner ? 1.5 : 0.5}
                    className="transition-all hover:opacity-80"
                  />
                  {owner && (
                    <text x={h.x} y={h.y + 3} fill={owner.color} fontSize="7" textAnchor="middle" fontWeight="bold" opacity="0.8">
                      {owner.name.slice(0, 2)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hexHint && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-900/80 text-amber-200 text-[11px] rounded-lg font-[family-name:var(--font-mono)] animate-pulse z-10">
              {hexHint}
            </div>
          )}
        </div>
      )}

      {/* Hex info panel */}
      {selectedCiv && (() => {
        const civ = civs.find(c => c.id === selectedCiv);
        if (!civ) return null;
        const era = ERAS.find(e => e.id === civ.era);
        return (
          <div className="border border-border rounded-lg p-3" style={{ borderLeftWidth: 3, borderLeftColor: civ.color }}>
            <div className="font-bold text-sm" style={{ color: civ.color }}>{civ.name}</div>
            <div className="text-[10px] text-text-tertiary">{era ? L4(lang, era) : ''} | TL{era?.techLevel}</div>
            <div className="text-[10px] text-text-secondary mt-1">{civ.traits.join(", ") || (L4(lang, { ko: "특성 없음", en: "No traits" }))}</div>
          </div>
        );
      })()}
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=hex-map-view | inputs=lang,civs | outputs=JSX
