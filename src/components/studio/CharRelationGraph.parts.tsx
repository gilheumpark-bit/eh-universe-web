import type React from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import type { Character, CharRelation, CharRelationType } from '@/lib/studio-types';
import type { ForceNode } from '@/lib/force-graph';
import {
  ALL_REL_TYPES,
  NODE_R,
  REL_STYLES,
  ROLE_COLORS,
  bindStudioTone,
} from './CharRelationGraph.shared';

export function EdgeLine({ from, to, rel, isKO, highlight }: {
  from: ForceNode;
  to: ForceNode;
  rel: CharRelation;
  isKO: boolean;
  highlight: boolean;
}) {
  const style = REL_STYLES[rel.type];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return null;

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
    <g className="studio-edge-fade" opacity={opacity}>
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

export function CharNode({ node, character, selected, dimmed, glowing, onPointerDown, onClick }: {
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
  let filterAttr: string | undefined;
  if (glowing) filterAttr = 'url(#searchGlow)';
  else if (selected) filterAttr = 'url(#glow)';
  const nodeOpacity = dimmed ? 0.3 : 1;

  return (
    <g
      className="studio-grab-node"
      filter={filterAttr}
      opacity={nodeOpacity}
      onPointerDown={e => onPointerDown(node.id, e)}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      {selected && (
        <circle cx={node.x} cy={node.y} r={NODE_R + 4} fill="none" stroke={roleColor} strokeWidth="2" opacity="0.5" />
      )}
      <circle cx={node.x} cy={node.y} r={NODE_R} fill={roleColor} opacity="0.15" stroke={roleColor} strokeWidth="2" />
      <text x={node.x} y={node.y + 1} fill="white" fontSize="12" textAnchor="middle" dominantBaseline="central" fontWeight="bold" className="studio-svg-static">
        {initial}
      </text>
      <text x={node.x} y={node.y + NODE_R + 12} fill="var(--color-text-secondary, #b5b0a8)" fontSize="8" textAnchor="middle" className="studio-svg-static">
        {character.name.length > 6 ? character.name.slice(0, 6) + '...' : character.name}
      </text>
    </g>
  );
}

export function GraphSearchBar({ value, onChange, onClear, isKO }: {
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

export function FilterableLegend({ visibleTypes, onToggle, isKO, zoomLevel, onResetZoom }: {
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
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-[transform,opacity,background-color,border-color,color] border ${
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
              ref={(node) => bindStudioTone(node, REL_STYLES[rt].color)}
              className="w-4 h-0.5 inline-block rounded studio-tone-swatch"
            />
            <span className="text-text-tertiary">
              {isKO ? REL_STYLES[rt].ko : REL_STYLES[rt].en}
            </span>
          </button>
        );
      })}

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

export function CharacterDetailPanel({
  selectedChar,
  selectedId,
  selectedRelations,
  characters,
  expanded,
  isKO,
  onSelectRelated,
}: {
  selectedChar: Character;
  selectedId: string;
  selectedRelations: CharRelation[];
  characters: Character[];
  expanded: boolean;
  isKO: boolean;
  onSelectRelated: (id: string) => void;
}) {
  return (
    <div className={`${expanded ? 'w-72' : 'w-full lg:w-64'} bg-bg-secondary/30 border border-border/50 rounded-2xl p-4 space-y-3 animate-in slide-in-from-right-2 duration-200`}>
      <div className="flex items-center gap-3">
        <div
          ref={(node) => bindStudioTone(node, ROLE_COLORS[selectedChar.role] || '#6b7280')}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm studio-tone-swatch"
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
                onClick={() => onSelectRelated(otherId)}
                className="w-full flex items-center gap-2 bg-black/20 border border-border/30 rounded-lg px-3 py-1.5 text-left hover:border-white/20 transition-colors"
              >
                <span
                  ref={(node) => bindStudioTone(node, style.color)}
                  className="w-2 h-2 rounded-full shrink-0 studio-tone-swatch"
                />
                <span className="text-[10px] font-bold text-text-primary truncate">{other?.name}</span>
                <span
                  ref={(node) => bindStudioTone(node, style.color)}
                  className="text-[9px] font-bold ml-auto shrink-0 studio-tone-text"
                >
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
  );
}
