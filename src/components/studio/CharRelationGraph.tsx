// ============================================================
// PART 1 — Types, Constants, Imports
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Character, CharRelation, CharRelationType, AppLanguage } from '@/lib/studio-types';
import { ForceNode, ForceEdge, simulateForceLayout, initializePositions, tickForceLayout } from '@/lib/force-graph';
import { Maximize2, Minimize2 } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  hero: '#3b82f6', villain: '#ef4444', ally: '#22c55e', extra: '#6b7280',
};

const REL_STYLES: Record<CharRelationType, { ko: string; en: string; color: string; dash?: string }> = {
  lover:       { ko: '연인', en: 'Lover', color: '#ec4899' },
  rival:       { ko: '라이벌', en: 'Rival', color: '#f59e0b', dash: '6,3' },
  friend:      { ko: '친구', en: 'Friend', color: '#22c55e' },
  enemy:       { ko: '적', en: 'Enemy', color: '#ef4444', dash: '4,4' },
  family:      { ko: '가족', en: 'Family', color: '#8b5cf6' },
  mentor:      { ko: '사제', en: 'Mentor', color: '#06b6d4', dash: '8,3' },
  subordinate: { ko: '상하', en: 'Sub', color: '#6b7280', dash: '2,4' },
};

const SVG_W = 600;
const SVG_H = 450;
const NODE_R = 24;

interface Props {
  characters: Character[];
  relations: CharRelation[];
  language: AppLanguage;
  onSelectCharacter?: (id: string) => void;
}

// IDENTITY_SEAL: PART-1 | role=types-constants | inputs=none | outputs=Props,REL_STYLES

// ============================================================
// PART 2 — Drag & Zoom Handlers
// ============================================================

function useDrag(
  nodesRef: React.MutableRefObject<ForceNode[]>,
  edges: ForceEdge[],
  setNodes: (n: ForceNode[]) => void
) {
  const dragging = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toSVGCoord = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * SVG_W,
      y: ((clientY - rect.top) / rect.height) * SVG_H,
    };
  }, []);

  const onPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging.current = id;
    nodesRef.current = nodesRef.current.map(n =>
      n.id === id ? { ...n, pinned: true } : n
    );
  }, [nodesRef]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const { x, y } = toSVGCoord(e.clientX, e.clientY);
    nodesRef.current = nodesRef.current.map(n =>
      n.id === dragging.current ? { ...n, x, y, vx: 0, vy: 0 } : n
    );
    // Single tick for live feedback
    const updated = tickForceLayout(nodesRef.current, edges, { width: SVG_W, height: SVG_H });
    nodesRef.current = updated;
    setNodes([...updated]);
  }, [edges, nodesRef, setNodes, toSVGCoord]);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    nodesRef.current = nodesRef.current.map(n =>
      n.id === dragging.current ? { ...n, pinned: false } : n
    );
    dragging.current = null;
  }, [nodesRef]);

  return { svgRef, onPointerDown, onPointerMove, onPointerUp };
}

// IDENTITY_SEAL: PART-2 | role=drag-handlers | inputs=ForceNode[],ForceEdge[] | outputs=svgRef,handlers

// ============================================================
// PART 3 — SVG Rendering
// ============================================================

function EdgeLine({ from, to, rel, isKO, highlight }: {
  from: ForceNode; to: ForceNode; rel: CharRelation; isKO: boolean; highlight: boolean;
}) {
  const style = REL_STYLES[rel.type];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return null;

  // Curved edge using quadratic bezier for visual clarity
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const curvature = 20;
  const cx = mx + nx * curvature;
  const cy = my + ny * curvature;

  const opacity = highlight ? 1 : 0.35;
  const labelX = mx + nx * (curvature * 0.6);
  const labelY = my + ny * (curvature * 0.6);

  return (
    <g style={{ transition: 'opacity 0.3s' }} opacity={opacity}>
      <path
        d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
        fill="none"
        stroke={style.color}
        strokeWidth={highlight ? 2.5 : 1.5}
        strokeDasharray={style.dash}
        strokeLinecap="round"
      />
      {highlight && (
        <text x={labelX} y={labelY - 4} fill={style.color} fontSize="9" textAnchor="middle" fontWeight="bold">
          {isKO ? style.ko : style.en}
        </text>
      )}
      {highlight && rel.desc && (
        <text x={labelX} y={labelY + 7} fill={style.color} fontSize="7" textAnchor="middle" opacity="0.8">
          {rel.desc.length > 20 ? rel.desc.slice(0, 20) + '…' : rel.desc}
        </text>
      )}
    </g>
  );
}

function CharNode({ node, character, selected, onPointerDown, onClick }: {
  node: ForceNode;
  character: Character;
  selected: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onClick: () => void;
}) {
  const roleColor = ROLE_COLORS[character.role] || '#6b7280';
  const initial = character.name.slice(0, 2);

  return (
    <g
      style={{ cursor: 'grab', transition: 'filter 0.2s' }}
      filter={selected ? 'url(#glow)' : undefined}
      onPointerDown={e => onPointerDown(node.id, e)}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      {/* Outer ring for selected */}
      {selected && (
        <circle cx={node.x} cy={node.y} r={NODE_R + 4} fill="none" stroke={roleColor} strokeWidth="2" opacity="0.5" />
      )}
      {/* Main circle */}
      <circle cx={node.x} cy={node.y} r={NODE_R} fill={roleColor} opacity="0.15" stroke={roleColor} strokeWidth="2" />
      {/* Initial text */}
      <text x={node.x} y={node.y + 1} fill="white" fontSize="12" textAnchor="middle" dominantBaseline="central" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {initial}
      </text>
      {/* Name label below */}
      <text x={node.x} y={node.y + NODE_R + 12} fill="var(--color-text-secondary, #b5b0a8)" fontSize="8" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {character.name.length > 6 ? character.name.slice(0, 6) + '…' : character.name}
      </text>
    </g>
  );
}

// IDENTITY_SEAL: PART-3 | role=svg-rendering | inputs=ForceNode,Character,CharRelation | outputs=JSX

// ============================================================
// PART 4 — Main Component + Detail Panel
// ============================================================

const CharRelationGraph: React.FC<Props> = ({ characters, relations, language, onSelectCharacter }) => {
  const isKO = language === 'KO';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Build force edges from relations
  const forceEdges: ForceEdge[] = useMemo(() =>
    relations.map(r => ({ source: r.from, target: r.to })),
    [relations]
  );

  // Initialize positions and run simulation
  const initialNodes = useMemo(() => {
    const positions = initializePositions(characters.map(c => c.id), SVG_W, SVG_H);
    return simulateForceLayout(positions, forceEdges, { width: SVG_W, height: SVG_H });
  }, [characters, forceEdges]);

  const [nodes, setNodes] = useState<ForceNode[]>(initialNodes);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Resync when characters/relations change externally
  useEffect(() => {
    const positions = initializePositions(characters.map(c => c.id), SVG_W, SVG_H);
    const simulated = simulateForceLayout(positions, forceEdges, { width: SVG_W, height: SVG_H });
    setNodes(simulated);
    nodesRef.current = simulated;
  }, [characters.length, forceEdges]);

  const { svgRef, onPointerDown, onPointerMove, onPointerUp } = useDrag(nodesRef, forceEdges, setNodes);

  // Selected character info
  const selectedChar = selectedId ? characters.find(c => c.id === selectedId) : null;
  const selectedRelations = selectedId
    ? relations.filter(r => r.from === selectedId || r.to === selectedId)
    : [];

  const isHighlighted = (rel: CharRelation) => {
    if (!selectedId) return true;
    return rel.from === selectedId || rel.to === selectedId;
  };

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
    onSelectCharacter?.(id);
  };

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  return (
    <div className={`relative transition-all duration-300 ${expanded ? 'fixed inset-4 z-50 bg-bg-primary/95 backdrop-blur-xl rounded-3xl border border-border p-4' : ''}`}>
      {/* Expand/collapse button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute top-2 right-2 z-10 p-2 text-text-tertiary hover:text-white transition-colors"
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      <div className={`flex ${expanded ? 'h-full' : ''} flex-col lg:flex-row gap-4`}>
        {/* SVG Graph */}
        <div className={`${expanded ? 'flex-1' : 'w-full'}`}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={`w-full ${expanded ? 'h-full' : 'max-h-[400px]'}`}
            style={{ fontFamily: 'var(--font-mono, monospace)', touchAction: 'none' }}
            role="img"
            aria-label={isKO ? '캐릭터 관계 그래프' : 'Character relationship graph'}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onClick={() => setSelectedId(null)}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border, #1e2530)" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#grid)" rx="12" />

            {/* Edges */}
            {relations.map((rel, i) => {
              const from = getNodeById(rel.from);
              const to = getNodeById(rel.to);
              if (!from || !to) return null;
              return (
                <EdgeLine key={`e-${i}`} from={from} to={to} rel={rel} isKO={isKO} highlight={isHighlighted(rel)} />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const char = characters.find(c => c.id === node.id);
              if (!char) return null;
              return (
                <CharNode
                  key={node.id}
                  node={node}
                  character={char}
                  selected={selectedId === node.id}
                  onPointerDown={onPointerDown}
                  onClick={() => handleNodeClick(node.id)}
                />
              );
            })}

            {/* Empty state */}
            {characters.length === 0 && (
              <text x={SVG_W / 2} y={SVG_H / 2} fill="var(--color-text-tertiary)" fontSize="12" textAnchor="middle">
                {isKO ? '캐릭터를 추가하면 관계 그래프가 표시됩니다' : 'Add characters to see the relationship graph'}
              </text>
            )}
          </svg>
        </div>

        {/* Detail Panel — shows when a character is selected */}
        {selectedChar && (
          <div className={`${expanded ? 'w-72' : 'w-full lg:w-64'} bg-bg-secondary/30 border border-border/50 rounded-2xl p-4 space-y-3 animate-in slide-in-from-right-2 duration-200`}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                style={{ background: ROLE_COLORS[selectedChar.role] || '#6b7280' }}
              >
                {selectedChar.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-white truncate">{selectedChar.name}</h4>
                <p className="text-[9px] text-text-tertiary uppercase font-bold tracking-wider">{selectedChar.role}</p>
              </div>
            </div>

            {selectedChar.traits && (
              <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-3">{selectedChar.traits}</p>
            )}

            {/* Connections */}
            {selectedRelations.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">
                  {isKO ? '관계' : 'Relations'} ({selectedRelations.length})
                </h5>
                {selectedRelations.map((rel, i) => {
                  const otherId = rel.from === selectedId ? rel.to : rel.from;
                  const other = characters.find(c => c.id === otherId);
                  const style = REL_STYLES[rel.type];
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedId(otherId)}
                      className="w-full flex items-center gap-2 bg-black/20 border border-border/30 rounded-lg px-3 py-1.5 text-left hover:border-white/20 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style.color }} />
                      <span className="text-[10px] font-bold text-white truncate">{other?.name}</span>
                      <span className="text-[9px] font-bold ml-auto shrink-0" style={{ color: style.color }}>
                        {isKO ? style.ko : style.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedRelations.length === 0 && (
              <p className="text-[10px] text-text-tertiary italic">
                {isKO ? '아직 관계가 설정되지 않았습니다' : 'No relations set yet'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[9px]">
        {(Object.keys(REL_STYLES) as CharRelationType[]).map(rt => (
          <span key={rt} className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 inline-block rounded" style={{ background: REL_STYLES[rt].color }} />
            <span className="text-text-tertiary">{isKO ? REL_STYLES[rt].ko : REL_STYLES[rt].en}</span>
          </span>
        ))}
        <span className="ml-auto text-text-tertiary italic">
          {isKO ? '드래그로 이동 · 클릭으로 선택' : 'Drag to move · Click to select'}
        </span>
      </div>
    </div>
  );
};

export default CharRelationGraph;

// IDENTITY_SEAL: PART-4 | role=main-component+detail | inputs=characters,relations,language | outputs=JSX
