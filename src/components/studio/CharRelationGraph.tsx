// ============================================================
// Character Relationship Graph — main state and composition
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Character, CharRelation, CharRelationType, AppLanguage } from '@/lib/studio-types';
import type { ForceEdge, ForceNode } from '@/lib/force-graph';
import { initializePositions, simulateForceLayout } from '@/lib/force-graph';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useDragAndPan } from './CharRelationGraph.interactions';
import {
  ALL_REL_TYPES,
  SVG_H,
  SVG_W,
  getIntroducedEpisode,
  type ViewTransform,
} from './CharRelationGraph.shared';
import {
  CharacterDetailPanel,
  CharNode,
  EdgeLine,
  FilterableLegend,
  GraphSearchBar,
} from './CharRelationGraph.parts';

interface Props {
  characters: Character[];
  relations: CharRelation[];
  language: AppLanguage;
  onSelectCharacter?: (id: string) => void;
}

const CharRelationGraph: React.FC<Props> = ({ characters, relations, language, onSelectCharacter }) => {
  const isKO = language === 'KO';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [transform, setTransform] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const [visibleTypes, setVisibleTypes] = useState<Set<CharRelationType>>(() => new Set(ALL_REL_TYPES));
  const [searchQuery, setSearchQuery] = useState('');

  const maxEpisode = useMemo(() => {
    let max = 1;
    for (const relation of relations) {
      const episode = getIntroducedEpisode(relation);
      if (episode != null && episode > max) max = episode;
    }
    return max;
  }, [relations]);
  const [episodeFilter, setEpisodeFilter] = useState<number>(maxEpisode);

  useEffect(() => {
    setEpisodeFilter(maxEpisode);
  }, [maxEpisode]);

  const viewBox = useMemo(() => {
    const vbW = SVG_W / transform.zoom;
    const vbH = SVG_H / transform.zoom;
    const vbX = -transform.panX;
    const vbY = -transform.panY;
    return `${vbX} ${vbY} ${vbW} ${vbH}`;
  }, [transform]);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim().toLowerCase();
    const matched = new Set<string>();
    for (const character of characters) {
      if (character.name.toLowerCase().includes(query)) {
        matched.add(character.id);
      }
    }
    return matched;
  }, [characters, searchQuery]);

  const forceEdges: ForceEdge[] = useMemo(
    () => relations.map(relation => ({ source: relation.from, target: relation.to })),
    [relations]
  );

  const layoutKey = useMemo(
    () => characters.map(character => character.id).join(',') + '|' + forceEdges.map(edge => `${edge.source}-${edge.target}`).join(','),
    [characters, forceEdges]
  );

  const initialNodes = useMemo(() => {
    const positions = initializePositions(characters.map(character => character.id), SVG_W, SVG_H);
    return simulateForceLayout(positions, forceEdges, { width: SVG_W, height: SVG_H });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  const [nodes, setNodes] = useState<ForceNode[]>(initialNodes);
  const nodesRef = useRef(nodes);

  const setNodesAndRef = useCallback((next: ForceNode[]) => {
    nodesRef.current = next;
    setNodes(next);
  }, []);

  useEffect(() => {
    nodesRef.current = initialNodes;
    setNodes(initialNodes);
  }, [initialNodes]);

  const { svgRef, onPointerDown, onSvgPointerDown, onPointerMove, onPointerUp, onWheel } =
    useDragAndPan(nodesRef, forceEdges, setNodesAndRef, transform, setTransform);

  const selectedChar = selectedId ? characters.find(character => character.id === selectedId) : null;
  const selectedRelations = selectedId
    ? relations.filter(relation => relation.from === selectedId || relation.to === selectedId)
    : [];

  const isHighlighted = (relation: CharRelation) => {
    if (!selectedId) return true;
    return relation.from === selectedId || relation.to === selectedId;
  };

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
    onSelectCharacter?.(id);
  };

  const getNodeById = (id: string) => nodes.find(node => node.id === id);

  const handleToggleType = useCallback((type: CharRelationType) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size <= 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setTransform({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  const filteredRelations = useMemo(
    () => relations.filter(relation => {
      if (!visibleTypes.has(relation.type)) return false;
      const episode = getIntroducedEpisode(relation);
      return !(episode != null && episode > episodeFilter);
    }),
    [episodeFilter, relations, visibleTypes]
  );

  const newAtEpisode = useMemo(() => {
    const set = new Set<number>();
    filteredRelations.forEach((relation, index) => {
      const episode = getIntroducedEpisode(relation);
      if (episode != null && episode === episodeFilter) set.add(index);
    });
    return set;
  }, [episodeFilter, filteredRelations]);

  return (
    <div className={`relative transition-[transform,opacity,background-color,border-color,color] duration-300 ${expanded ? 'fixed inset-4 z-50 bg-bg-primary/95 backdrop-blur-xl rounded-3xl border border-border p-4' : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute top-2 right-2 z-10 p-2 text-text-tertiary hover:text-white transition-colors"
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      <GraphSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
        isKO={isKO}
      />

      <div className={`flex ${expanded ? 'h-[calc(100%-6rem)]' : ''} flex-col lg:flex-row gap-4`}>
        <div className={`${expanded ? 'flex-1' : 'w-full'}`}>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className={`w-full studio-mono-svg studio-touch-none ${expanded ? 'h-full' : 'max-h-[400px]'}`}
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
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="searchGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border, #1e2530)" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>

            <rect x={-transform.panX} y={-transform.panY} width={SVG_W / transform.zoom} height={SVG_H / transform.zoom} fill="url(#grid)" rx="12" />

            {filteredRelations.map((relation, index) => {
              const from = getNodeById(relation.from);
              const to = getNodeById(relation.to);
              if (!from || !to) return null;
              const isNew = newAtEpisode.has(index);
              return (
                <g key={`e-${index}`}>
                  <EdgeLine from={from} to={to} rel={relation} isKO={isKO} highlight={isHighlighted(relation)} />
                  {isNew && (
                    <g>
                      <rect
                        x={(from.x + to.x) / 2 - 14}
                        y={(from.y + to.y) / 2 - 16}
                        width="28"
                        height="12"
                        rx="3"
                        fill="#22c55e"
                        opacity="0.9"
                      />
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 - 8}
                        fill="white"
                        fontSize="7"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        NEW
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {nodes.map(node => {
              const character = characters.find(candidate => candidate.id === node.id);
              if (!character) return null;
              const isSearchActive = searchMatches !== null;
              const isMatch = isSearchActive && searchMatches.has(node.id);
              const dimmed = isSearchActive && !isMatch;
              const glowing = isSearchActive && isMatch;

              return (
                <CharNode
                  key={node.id}
                  node={node}
                  character={character}
                  selected={selectedId === node.id}
                  dimmed={dimmed}
                  glowing={glowing}
                  onPointerDown={onPointerDown}
                  onClick={() => handleNodeClick(node.id)}
                />
              );
            })}

            {characters.length === 0 && (
              <text x={SVG_W / 2} y={SVG_H / 2} fill="var(--color-text-tertiary)" fontSize="12" textAnchor="middle">
                {isKO ? '캐릭터를 추가하면 관계 그래프가 표시됩니다' : 'Add characters to see the relationship graph'}
              </text>
            )}
          </svg>
        </div>

        {selectedChar && selectedId && (
          <CharacterDetailPanel
            selectedChar={selectedChar}
            selectedId={selectedId}
            selectedRelations={selectedRelations}
            characters={characters}
            expanded={expanded}
            isKO={isKO}
            onSelectRelated={setSelectedId}
          />
        )}
      </div>

      <FilterableLegend
        visibleTypes={visibleTypes}
        onToggle={handleToggleType}
        isKO={isKO}
        zoomLevel={transform.zoom}
        onResetZoom={handleResetZoom}
      />

      <p className="text-[9px] text-text-tertiary text-center mt-2">
        {isKO
          ? '마우스 휠: 확대/축소 | 드래그: 이동 | 노드 클릭: 선택'
          : 'Scroll: Zoom | Drag: Pan | Click node: Select'}
      </p>

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
            onChange={event => setEpisodeFilter(Number(event.target.value))}
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
