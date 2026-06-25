"use client";

import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import {
  CATEGORY_COLOR,
  DEFAULT_COLOR,
  NODE_H,
  NODE_W,
  VIEW_H,
  VIEW_W,
  truncate,
  type GraphEdge,
  type GraphNode,
} from "./WorldGraphEditor.model";

type WorldGraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  perNode: ReadonlyMap<string, number>;
  selectedId: string | null;
  linkFromId: string | null;
  svgRef: RefObject<SVGSVGElement | null>;
  onRemoveEdge: (fromId: string, toId: string) => void;
  onPointerDown: (event: PointerEvent<SVGGElement>, id: string) => void;
  onPointerMove: (event: PointerEvent<SVGGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGGElement>) => void;
  onNodeKeyDown: (event: KeyboardEvent<SVGGElement>, id: string) => void;
  onSelectNode: (id: string) => void;
};

export function WorldGraphCanvas({
  nodes,
  edges,
  perNode,
  selectedId,
  linkFromId,
  svgRef,
  onRemoveEdge,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onNodeKeyDown,
  onSelectNode,
}: WorldGraphCanvasProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-bg-primary">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-label="세계관 fact 그래프 (화살표키: 노드 이동 · e: 관계 · Delete: 삭제)"
        tabIndex={-1}
        className="block h-[400px] w-full focus-visible:outline-none"
        data-testid="worldgraph-svg"
      >
        <defs>
          <pattern id="wg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,200,50,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="url(#wg-grid)" />

        {edges.map((edge) => {
          const from = nodes.find((node) => node.entry.frontMatter.id === edge.from);
          const to = nodes.find((node) => node.entry.frontMatter.id === edge.to);
          if (!from || !to) return null;
          const fx = from.pos.x * VIEW_W;
          const fy = from.pos.y * VIEW_H;
          const tx = to.pos.x * VIEW_W;
          const ty = to.pos.y * VIEW_H;
          return (
            <g
              key={`edge-${edge.from}-${edge.to}`}
              className="cursor-pointer"
              onClick={() => onRemoveEdge(edge.from, edge.to)}
              role="button"
              aria-label={`모순 엣지 ${edge.from} ↔ ${edge.to} (클릭으로 제거)`}
            >
              <line
                x1={fx}
                y1={fy}
                x2={tx}
                y2={ty}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.85}
              />
              <circle cx={(fx + tx) / 2} cy={(fy + ty) / 2} r={10} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={1} />
            </g>
          );
        })}

        {nodes.map((node) => {
          const id = node.entry.frontMatter.id;
          const frontMatter = node.entry.frontMatter;
          const violations = perNode.get(id) ?? 0;
          const isSelected = id === selectedId;
          const isLinkFrom = id === linkFromId;
          const color = CATEGORY_COLOR[frontMatter.category] ?? DEFAULT_COLOR;
          const x = node.pos.x * VIEW_W - NODE_W / 2;
          const y = node.pos.y * VIEW_H - NODE_H / 2;
          return (
            <g
              key={id}
              onPointerDown={(event) => onPointerDown(event, id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              tabIndex={0}
              role="button"
              aria-label={`노드 ${frontMatter.category} ${truncate(frontMatter.fact, 40)}${violations > 0 ? ` (${violations}개 위반)` : ""}${isSelected ? " (선택됨)" : ""}${isLinkFrom ? " (관계 from)" : ""}`}
              aria-pressed={isSelected}
              onKeyDown={(event) => onNodeKeyDown(event, id)}
              onFocus={() => onSelectNode(id)}
              className={`${linkFromId ? "studio-crosshair-node" : "studio-grab-node"} studio-touch-none outline-none`}
              data-testid={`worldgraph-node-${id}`}
            >
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="rgba(15,23,42,0.85)"
                stroke={isLinkFrom ? "#fbbf24" : isSelected ? "#38bdf8" : violations > 0 ? "#ef4444" : color}
                strokeWidth={isSelected || isLinkFrom ? 3 : 2}
                className="transition-[stroke-width] focus-visible:[stroke-width:4]"
              />
              <text x={x + 10} y={y + 20} fill={color} fontSize={11} fontWeight={700} className="studio-svg-no-pointer">
                {frontMatter.category.toUpperCase()}
              </text>
              <text x={x + 10} y={y + 40} fill="#e2e8f0" fontSize={11} className="studio-svg-no-pointer">
                {truncate(frontMatter.fact, 22)}
              </text>
              <text x={x + 10} y={y + 56} fill="#94a3b8" fontSize={9} className="studio-svg-no-pointer">
                tier {frontMatter.tier} · {node.entry.provenance?.origin ?? "USER"}
              </text>
              {violations > 0 && (
                <g className="studio-svg-no-pointer">
                  <circle cx={x + NODE_W - 12} cy={y + 12} r={9} fill="#ef4444" />
                  <text x={x + NODE_W - 12} y={y + 15} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
                    {violations}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {nodes.length === 0 && (
          <text x={VIEW_W / 2} y={VIEW_H / 2} textAnchor="middle" fill="#64748b" fontSize={13}>
            위 입력으로 세계관 fact 를 추가하세요
          </text>
        )}
      </svg>
    </div>
  );
}
