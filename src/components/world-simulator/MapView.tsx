"use client";

import React, { useState, useMemo, useRef } from "react";
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
// PART 1 — HEX Map View (territory painting with Pan, Zoom, Minimap)
// ============================================================

export function HexMapView({ lang, civs, hexMap, setHexMap }: {
  lang: Lang;
  civs: Civilization[];
  hexMap: Record<string, string>;
  setHexMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [selectedCiv, setSelectedCiv] = useState<string | null>(null);
  const [paintCiv, setPaintCiv] = useState<string | null>(null);

  const mapWidth = HEX_COLS * HEX_SIZE * 1.74 + HEX_SIZE * 2 + 20;
  const mapHeight = HEX_ROWS * HEX_SIZE * 1.5 + HEX_SIZE * 2 + 20;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0, moved: false });

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

  const hexPath = (cx: number, cy: number, sFactor: number = 0.85) => {
    const s = HEX_SIZE * sFactor;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
    });
    return pts.join(" ");
  };

  const [hexHint, setHexHint] = useState('');
  
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only drag on left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    
    // Calculate SVG container dimensions to scale movement correctly
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = (mapWidth / zoom) / rect.width;
    const scaleY = (mapHeight / zoom) / rect.height;

    setPan({
      x: dragRef.current.startPanX - dx * scaleX,
      y: dragRef.current.startPanY - dy * scaleY
    });
  };
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Wheel zoom logic
    e.preventDefault();
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    setZoom(z => Math.max(0.5, Math.min(5, z * (1 + delta))));
  };

  const handleHexClick = (key: string) => {
    if (dragRef.current.moved) return;
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
      const ownerId = hexMap[key];
      if (ownerId) {
        setSelectedCiv(ownerId);
      } else {
        setHexHint(L4(lang, { ko: '먼저 세력을 선택하세요. (드래그로 배경 이동 가능)', en: 'Select a faction first to paint. (Drag to pan)' }));
        setTimeout(() => setHexHint(''), 2000);
      }
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(5, z * 1.2));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z / 1.2));
  const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const civFromHex = (key: string) => civs.find(c => c.id === hexMap[key]);

  return (
    <div className="space-y-4">
      {/* Container */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
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
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="w-6 h-6 rounded bg-bg-secondary text-text-secondary hover:text-text-primary text-xs font-bold leading-none">-</button>
          <button onClick={handleResetView} className="w-6 h-6 rounded bg-bg-secondary text-text-secondary hover:text-text-primary text-[9px] font-bold leading-none">R</button>
          <button onClick={handleZoomIn} className="w-6 h-6 rounded bg-bg-secondary text-text-secondary hover:text-text-primary text-xs font-bold leading-none">+</button>
        </div>
      </div>

      {civs.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-xs italic">
          {L4(lang, { ko: "문명을 추가하면 영역을 칠할 수 있습니다", en: "Add civilizations to paint territories" })}
        </div>
      ) : (
        <div 
          className="relative bg-black/20 border border-border rounded-xl overflow-hidden w-full h-[500px]"
          onWheel={handleWheel}
        >
          <svg
            viewBox={`${pan.x} ${pan.y} ${mapWidth / zoom} ${mapHeight / zoom}`}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {hexCenters.map(h => {
              const owner = civFromHex(h.key);
              return (
                <g key={h.key} onClick={(e) => { e.stopPropagation(); handleHexClick(h.key); }}>
                  <polygon
                    points={hexPath(h.x, h.y)}
                    fill={owner ? owner.color : "var(--color-bg-secondary)"}
                    fillOpacity={owner ? 0.3 : 1}
                    stroke={owner ? owner.color : "var(--color-border)"}
                    strokeWidth={owner ? 1.5 : 0.5}
                    className="transition-all hover:opacity-80 cursor-pointer"
                  />
                  {owner && zoom > 0.6 && (
                    <text x={h.x} y={h.y + 3} fill={owner.color} fontSize="7" textAnchor="middle" fontWeight="bold" opacity="0.8" className="pointer-events-none select-none">
                      {owner.name.slice(0, 2)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Minimap */}
          <div className="absolute right-4 bottom-4 w-[120px] aspect-auto bg-bg-primary/90 border border-border/50 rounded-lg shadow-lg overflow-hidden pointer-events-none">
            <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} width="100%" height="100%" className="opacity-80">
              {hexCenters.map(h => {
                const owner = civFromHex(h.key);
                return (
                  <polygon
                    key={`mini-${h.key}`}
                    points={hexPath(h.x, h.y, 1)}
                    fill={owner ? owner.color : "transparent"}
                    stroke={owner ? owner.color : "var(--color-border)"}
                    strokeOpacity={owner ? 0.5 : 0.1}
                    strokeWidth="2"
                  />
                );
              })}
              {/* Camera view rect */}
              <rect
                x={pan.x} y={pan.y}
                width={mapWidth / zoom} height={mapHeight / zoom}
                stroke="white" strokeWidth="6" fill="white" fillOpacity="0.1"
              />
            </svg>
          </div>

          {hexHint && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-accent-purple/90 text-white text-[11px] rounded-lg font-[family-name:var(--font-mono)] shadow-xl z-10 pointer-events-none animate-pulse">
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
