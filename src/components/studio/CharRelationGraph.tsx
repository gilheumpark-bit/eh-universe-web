// ============================================================
// PART 1 — Types, Constants, Imports
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Character, CharRelation, CharRelationType, AppLanguage } from '@/lib/studio-types';
import { ForceNode, ForceEdge, simulateForceLayout, initializePositions, tickForceLayout } from '@/lib/force-graph';
import { Maximize2, Minimize2, RotateCcw, Search, X } from 'lucide-react';

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

const ALL_REL_TYPES: CharRelationType[] = Object.keys(REL_STYLES) as CharRelationType[];

const SVG_W = 600;
const SVG_H = 450;
const NODE_R = 24;

// Zoom limits
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1;

interface Props {
  characters: Character[];
  relations: CharRelation[];
  language: AppLanguage;
  onSelectCharacter?: (id: string) => void;
}

// IDENTITY_SEAL: PART-1 | role=types-constants | inputs=none | outputs=Props,REL_STYLES,ALL_REL_TYPES,ZOOM_*

// ============================================================
// PART 2 — Drag, Pan & Zoom Handlers
// ============================================================

interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

function useDragAndPan(
  nodesRef: React.MutableRefObject<ForceNode[]>,
  edges: ForceEdge[],
  setNodes: (n: ForceNode[]) => void,
  transform: ViewTransform,
  setTransform: React.Dispatch<React.SetStateAction<ViewTransform>>
) {
  const dragging = useRef<string | null>(null);
  const panning = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Convert client coords to SVG user-space coords accounting for zoom/pan
  const toSVGCoord = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vbW = SVG_W / transform.zoom;
    const vbH = SVG_H / transform.zoom;
    const vbX = -transform.panX;
    const vbY = -transform.panY;
    return {
      x: vbX + ((clientX - rect.left) / rect.width) * vbW,
      y: vbY + ((clientY - rect.top) / rect.height) * vbH,
    };
  }, [transform]);

  const onPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging.current = id;
    panning.current = null;
    nodesRef.current = nodesRef.current.map(n =>
      n.id === id ? { ...n, pinned: true } : n
    );
  }, [nodesRef]);

  // Pan start: triggered from empty SVG area
  const onSvgPointerDown = useCallback((e: React.PointerEvent) => {
    // Only start pan if clicking on empty space (not a node)
    if (dragging.current) return;
    panning.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: transform.panX,
      startPanY: transform.panY,
    };
  }, [transform.panX, transform.panY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    // Node drag
    if (dragging.current) {
      const { x, y } = toSVGCoord(e.clientX, e.clientY);
      nodesRef.current = nodesRef.current.map(n =>
        n.id === dragging.current ? { ...n, x, y, vx: 0, vy: 0 } : n
      );
      const updated = tickForceLayout(nodesRef.current, edges, { width: SVG_W, height: SVG_H });
      nodesRef.current = updated;
      setNodes([...updated]);
      return;
    }
    // Pan drag
    if (panning.current) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = (e.clientX - panning.current.startX) / rect.width * (SVG_W / transform.zoom);
      const dy = (e.clientY - panning.current.startY) / rect.height * (SVG_H / transform.zoom);
      setTransform(prev => ({
        ...prev,
        panX: panning.current!.startPanX + dx,
        panY: panning.current!.startPanY + dy,
      }));
    }
  }, [edges, nodesRef, setNodes, toSVGCoord, transform.zoom, setTransform]);

  const onPointerUp = useCallback(() => {
    if (dragging.current) {
      nodesRef.current = nodesRef.current.map(n =>
        n.id === dragging.current ? { ...n, pinned: false } : n
      );
      dragging.current = null;
    }
    panning.current = null;
  }, [nodesRef]);

  // Scroll-wheel zoom centered on cursor
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    // Cursor position as fraction [0,1] within SVG element
    const fracX = (e.clientX - rect.left) / rect.width;
    const fracY = (e.clientY - rect.top) / rect.height;

    setTransform(prev => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.zoom + direction * ZOOM_STEP));
      if (newZoom === prev.zoom) return prev;

      // Keep the point under cursor stationary
      const oldVBW = SVG_W / prev.zoom;
      const oldVBH = SVG_H / prev.zoom;
      const newVBW = SVG_W / newZoom;
      const newVBH = SVG_H / newZoom;

      // Point in SVG space under cursor before zoom
      const cursorSvgX = -prev.panX + fracX * oldVBW;
      const cursorSvgY = -prev.panY + fracY * oldVBH;

      // After zoom, we want the same SVG point at the same screen fraction
      const newPanX = -(cursorSvgX - fracX * newVBW);
      const newPanY = -(cursorSvgY - fracY * newVBH);

      return { zoom: newZoom, panX: newPanX, panY: newPanY };
    });
  }, [setTransform]);

  return { svgRef, onPointerDown, onSvgPointerDown, onPointerMove, onPointerUp, onWheel };
}

// IDENTITY_SEAL: PART-2 | role=drag-pan-zoom-handlers | inputs=ForceNode[],ForceEdge[],ViewTransform | outputs=svgRef,handlers

// ============================================================
// PART 3 — SVG Rendering (Edges & Nodes)
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
          {rel.desc.length > 20 ? rel.desc.slice(0, 20) + '...' : rel.desc}
        </text>
      )}
    </g>
  );
}

function CharNode({ node, character, selected, dimmed, glowing, onPointerDown, onClick }: {
  node: ForceNode;
  character: Character;
  selected: boolean;
  dimmed: boolean;
  glowing: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onClick: () => void;
}) {
  const roleColor = ROLE_COLORS[character.role] || '#6b7280';
  const initial = character.name.slice(0, 2);

  // Determine which filter to apply: search glow > selected glow > none
  let filterAttr: string | undefined;
  if (glowing) filterAttr = 'url(#searchGlow)';
  else if (selected) filterAttr = 'url(#glow)';

  const nodeOpacity = dimmed ? 0.3 : 1;

  return (
    <g
      style={{ cursor: 'grab', transition: 'filter 0.2s, opacity 0.3s' }}
      filter={filterAttr}
      opacity={nodeOpacity}
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
        {character.name.length > 6 ? character.name.slice(0, 6) + '...' : character.name}
      </text>
    </g>
  );
}

// IDENTITY_SEAL: PART-3 | role=svg-rendering | inputs=ForceNode,Character,CharRelation | outputs=JSX

// ============================================================
// PART 4 — Search Bar Component
// ============================================================

function GraphSearchBar({ value, onChange, onClear, isKO }: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  isKO: boolean;
}) {
  return (
    <div className="relative mb-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={isKO ? '캐릭터 검색...' : 'Search characters...'}
        className="w-full pl-8 pr-8 py-1.5 text-xs bg-bg-secondary/50 border border-border/50 rounded-lg text-white placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-white/30 transition-colors"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=search-bar | inputs=value,onChange,isKO | outputs=JSX

// ============================================================
// PART 5 — Legend with Relationship Type Filter
// ============================================================

function FilterableLegend({ visibleTypes, onToggle, isKO, zoomLevel, onResetZoom }: {
  visibleTypes: Set<CharRelationType>;
  onToggle: (type: CharRelationType) => void;
  isKO: boolean;
  zoomLevel: number;
  onResetZoom: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 text-[9px]">
      {ALL_REL_TYPES.map(rt => {
        const active = visibleTypes.has(rt);
        return (
          <button
            key={rt}
            onClick={() => onToggle(rt)}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all border ${
              active
                ? 'border-border/50 opacity-100'
                : 'border-transparent opacity-40 line-through'
            } hover:opacity-100`}
            title={isKO
              ? (active ? `${REL_STYLES[rt].ko} 숨기기` : `${REL_STYLES[rt].ko} 표시`)
              : (active ? `Hide ${REL_STYLES[rt].en}` : `Show ${REL_STYLES[rt].en}`)
            }
          >
            <span
              className="w-4 h-0.5 inline-block rounded"
              style={{ background: REL_STYLES[rt].color }}
            />
            <span className="text-text-tertiary">
              {isKO ? REL_STYLES[rt].ko : REL_STYLES[rt].en}
            </span>
          </button>
        );
      })}

      {/* Zoom indicator + reset */}
      <span className="ml-auto flex items-center gap-2">
        {zoomLevel !== 1.0 && (
          <button
            onClick={onResetZoom}
            className="flex items-center gap-1 text-text-tertiary hover:text-white transition-colors"
            title={isKO ? '줌 초기화' : 'Reset zoom'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{Math.round(zoomLevel * 100)}%</span>
          </button>
        )}
        <span className="text-text-tertiary italic">
          {isKO ? '드래그로 이동 · 스크롤로 확대/축소' : 'Drag to move · Scroll to zoom'}
        </span>
      </span>
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=filterable-legend | inputs=visibleTypes,zoomLevel,isKO | outputs=JSX

// ============================================================
// PART 6 — Main Component + Detail Panel
// ============================================================

/** Helper to safely read an optional introducedEpisode from a relation */
function getIntroducedEpisode(rel: CharRelation): number | undefined {
  return (rel as CharRelation & { introducedEpisode?: number }).introducedEpisode;
}

const CharRelationGraph: React.FC<Props> = ({ characters, relations, language, onSelectCharacter }) => {
  const isKO = language === 'KO';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // --- Zoom & Pan state ---
  const [transform, setTransform] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });

  // --- Relationship type filter state ---
  const [visibleTypes, setVisibleTypes] = useState<Set<CharRelationType>>(() => new Set(ALL_REL_TYPES));

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- Episode filter state ---
  const maxEpisode = useMemo(() => {
    let max = 1;
    for (const r of relations) {
      const ep = getIntroducedEpisode(r);
      if (ep != null && ep > max) max = ep;
    }
    return max;
  }, [relations]);
  const [episodeFilter, setEpisodeFilter] = useState<number>(maxEpisode);

  // Keep episodeFilter in sync when maxEpisode changes
  useEffect(() => {
    setEpisodeFilter(maxEpisode);
  }, [maxEpisode]);

  // Compute viewBox from transform
  const viewBox = useMemo(() => {
    const vbW = SVG_W / transform.zoom;
    const vbH = SVG_H / transform.zoom;
    const vbX = -transform.panX;
    const vbY = -transform.panY;
    return `${vbX} ${vbY} ${vbW} ${vbH}`;
  }, [transform]);

  // Search matching: lowercase comparison on character name
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return null; // null = no active search
    const q = searchQuery.trim().toLowerCase();
    const matched = new Set<string>();
    for (const c of characters) {
      if (c.name.toLowerCase().includes(q)) {
        matched.add(c.id);
      }
    }
    return matched;
  }, [searchQuery, characters]);

  // Build force edges from relations
  const forceEdges: ForceEdge[] = useMemo(() =>
    relations.map(r => ({ source: r.from, target: r.to })),
    [relations]
  );

  // Stable key to detect when characters/forceEdges change
  const layoutKey = useMemo(() =>
    characters.map(c => c.id).join(',') + '|' + forceEdges.map(e => `${e.source}-${e.target}`).join(','),
    [characters, forceEdges]
  );

  // Initialize positions and run simulation
  const initialNodes = useMemo(() => {
    const positions = initializePositions(characters.map(c => c.id), SVG_W, SVG_H);
    return simulateForceLayout(positions, forceEdges, { width: SVG_W, height: SVG_H });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  const [nodes, setNodes] = useState<ForceNode[]>(initialNodes);
  const nodesRef = useRef(nodes);

  // Wrapper that keeps ref in sync through event handlers
  const setNodesAndRef = useCallback((next: ForceNode[]) => {
    nodesRef.current = next;
    setNodes(next);
  }, []);

  // Resync when layout inputs change externally
  useEffect(() => {
    nodesRef.current = initialNodes;
    setNodes(initialNodes);
  }, [initialNodes]);

  const { svgRef, onPointerDown, onSvgPointerDown, onPointerMove, onPointerUp, onWheel } =
    useDragAndPan(nodesRef, forceEdges, setNodesAndRef, transform, setTransform);

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

  // Filter toggle handler
  const handleToggleType = useCallback((type: CharRelationType) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow hiding all types
        if (next.size <= 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Zoom reset handler
  const handleResetZoom = useCallback(() => {
    setTransform({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  // Filtered relations based on visible types + episode filter
  const filteredRelations = useMemo(
    () => relations.filter(r => {
      if (!visibleTypes.has(r.type)) return false;
      const ep = getIntroducedEpisode(r);
      // Show if no introducedEpisode set, or if within filter range
      if (ep != null && ep > episodeFilter) return false;
      return true;
    }),
    [relations, visibleTypes, episodeFilter]
  );

  // Relations newly introduced at exactly the selected episode
  const newAtEpisode = useMemo(() => {
    const set = new Set<number>();
    filteredRelations.forEach((r, i) => {
      const ep = getIntroducedEpisode(r);
      if (ep != null && ep === episodeFilter) set.add(i);
    });
    return set;
  }, [filteredRelations, episodeFilter]);

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

      {/* 캐릭터 검색 입력 */}
      <GraphSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
        isKO={isKO}
      />

      <div className={`flex ${expanded ? 'h-[calc(100%-6rem)]' : ''} flex-col lg:flex-row gap-4`}>
        {/* SVG Graph */}
        <div className={`${expanded ? 'flex-1' : 'w-full'}`}>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className={`w-full ${expanded ? 'h-full' : 'max-h-[400px]'}`}
            style={{ fontFamily: 'var(--font-mono, monospace)', touchAction: 'none' }}
            role="img"
            aria-label={isKO ? '캐릭터 관계 그래프' : 'Character relationship graph'}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerDown={onSvgPointerDown}
            onWheel={onWheel}
            onClick={() => setSelectedId(null)}
          >
            <defs>
              {/* Selection glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Search highlight glow filter */}
              <filter id="searchGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
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
            <rect x={-transform.panX} y={-transform.panY} width={SVG_W / transform.zoom} height={SVG_H / transform.zoom} fill="url(#grid)" rx="12" />

            {/* Edges — only visible types */}
            {filteredRelations.map((rel, i) => {
              const from = getNodeById(rel.from);
              const to = getNodeById(rel.to);
              if (!from || !to) return null;
              const isNew = newAtEpisode.has(i);
              return (
                <g key={`e-${i}`}>
                  <EdgeLine from={from} to={to} rel={rel} isKO={isKO} highlight={isHighlighted(rel)} />
                  {isNew && (
                    <g>
                      <rect
                        x={(from.x + to.x) / 2 - 14}
                        y={(from.y + to.y) / 2 - 16}
                        width="28" height="12" rx="3"
                        fill="#22c55e" opacity="0.9"
                      />
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 - 8}
                        fill="white" fontSize="7" textAnchor="middle" fontWeight="bold"
                      >
                        NEW
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const char = characters.find(c => c.id === node.id);
              if (!char) return null;

              // Search-based dimming/glowing
              const isSearchActive = searchMatches !== null;
              const isMatch = isSearchActive && searchMatches.has(node.id);
              const dimmed = isSearchActive && !isMatch;
              const glowing = isSearchActive && isMatch;

              return (
                <CharNode
                  key={node.id}
                  node={node}
                  character={char}
                  selected={selectedId === node.id}
                  dimmed={dimmed}
                  glowing={glowing}
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
                <h4 className="text-sm font-black text-text-primary truncate">{selectedChar.name}</h4>
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
                      <span className="text-[10px] font-bold text-text-primary truncate">{other?.name}</span>
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

      {/* 범례 + 관계 유형 필터 + 줌 표시 */}
      <FilterableLegend
        visibleTypes={visibleTypes}
        onToggle={handleToggleType}
        isKO={isKO}
        zoomLevel={transform.zoom}
        onResetZoom={handleResetZoom}
      />

      {/* Instruction bar */}
      <p className="text-[9px] text-text-tertiary text-center mt-2">
        {isKO
          ? '마우스 휠: 확대/축소 | 드래그: 이동 | 노드 클릭: 선택'
          : 'Scroll: Zoom | Drag: Pan | Click node: Select'}
      </p>

      {/* 에피소드 범위 슬라이더 */}
      {maxEpisode > 1 && (
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-[9px] font-mono text-text-tertiary shrink-0">
            {isKO ? '에피소드' : 'Episode'}
          </span>
          <input
            type="range"
            min={1}
            max={maxEpisode}
            value={episodeFilter}
            onChange={e => setEpisodeFilter(Number(e.target.value))}
            className="flex-1 h-1 accent-accent-blue cursor-pointer"
            aria-label={isKO ? '에피소드 필터' : 'Episode filter'}
          />
          <span className="text-[10px] font-mono font-bold text-text-secondary w-10 text-right">
            {episodeFilter}/{maxEpisode}
          </span>
        </div>
      )}
    </div>
  );
};

export default React.memo(CharRelationGraph);

// IDENTITY_SEAL: PART-6 | role=main-component+detail+state | inputs=characters,relations,language | outputs=JSX
