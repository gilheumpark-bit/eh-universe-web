"use client";

/* ===========================================================
   RelationGraph — 공용 xyflow 그래프 래퍼 (loreguard 토큰 스타일)
   [X1-xyflow 2026-06-11]

   · @xyflow/react@12 ReactFlow 캔버스 + 미니맵 + 컨트롤 + 도트 배경.
   · 노드/엣지 스타일은 loreguard CSS 토큰(--card·--ink-1·--line·--c-…)
     인라인 — [data-theme="dark"] 토큰 플립으로 다크 모드 자동 대응.
   · 소비자(TabCharacter 관계도 / TabPlot 비트 흐름)는 next/dynamic
     (ssr:false) 로만 이 모듈을 import — xyflow 번들은 토글 진입 시 로드.
     (GraphNodeSpec/GraphEdgeSpec 는 `import type` — 런타임 의존 0)
   · 구 셸 src/components/studio/CharacterRelationGraph.tsx 의 SVG 렌더를
     xyflow 로 대체하는 후속 뷰 — 원형 배치·관계색 개념은 소비자가 재사용.
   · 데이터 날조 없음 — 전달받은 노드/엣지만 그대로 렌더.
   =========================================================== */

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Position,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ============================================================
// PART 1 — 공개 스펙 타입 (소비자는 type-only import)
// ============================================================

export type GraphHandleSide = "left" | "right" | "top" | "bottom";

export interface GraphNodeSpec {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  /** 노드 좌측 액센트 색 — loreguard 토큰 권장 (예: var(--c-blue)) */
  accent?: string;
  /** true = 보조(작은) 노드 — 비트 흐름의 장면 노드 등 */
  minor?: boolean;
  /** 엣지가 나가는 핸들 방향 (기본 bottom — xyflow default) */
  sourceSide?: GraphHandleSide;
  /** 엣지가 들어오는 핸들 방향 (기본 top — xyflow default) */
  targetSide?: GraphHandleSide;
}

export interface GraphEdgeSpec {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** 엣지 선 색 — loreguard 토큰 권장 */
  color?: string;
  animated?: boolean;
}

export interface RelationGraphProps {
  nodes: GraphNodeSpec[];
  edges: GraphEdgeSpec[];
  /** 캔버스 접근성 이름 (필수 — axe "region must have accessible name" 예방) */
  ariaLabel: string;
  /** 캔버스 높이(px). 기본 480. */
  height?: number;
  /** 노드 드래그 허용 여부 (기본 false — 자동 레이아웃 뷰) */
  draggable?: boolean;
  onNodeClick?: (id: string) => void;
  /** 드래그 종료 좌표 — 영속(디바운스)은 소비자 책임 */
  onNodeDragStop?: (id: string, x: number, y: number) => void;
}

// ============================================================
// PART 2 — 스펙 → xyflow Node/Edge 변환 (loreguard 토큰 스타일)
// ============================================================

const HANDLE_POS: Record<GraphHandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function graphToneClass(color: string | undefined): string {
  const normalized = (color ?? "").replace(/\s+/g, "").toLowerCase();
  switch (normalized) {
    case "var(--c-blue)":
      return "blue";
    case "var(--c-purple)":
      return "purple";
    case "var(--c-green)":
      return "green";
    case "var(--c-amber)":
      return "amber";
    case "var(--c-red)":
      return "red";
    case "var(--c-teal)":
      return "teal";
    case "var(--primary)":
      return "primary";
    case "var(--ink-3)":
      return "muted";
    case "var(--line)":
      return "line";
    default:
      return "primary";
  }
}

function graphHeightClass(height: number): string {
  if (height <= 440) return "lg-graph-h-440";
  if (height >= 520) return "lg-graph-h-520";
  return "lg-graph-h-480";
}

function GraphNodeLabel({
  label,
  sublabel,
  minor,
}: {
  label: string;
  sublabel?: string;
  minor?: boolean;
}) {
  return (
    <div className={`lg-graph-node-label${minor ? " is-minor" : ""}`}>
      <div className="lg-graph-node-title">{label}</div>
      {sublabel ? <div className="lg-graph-node-subtitle">{sublabel}</div> : null}
    </div>
  );
}

function toNode(spec: GraphNodeSpec, draggable: boolean): Node {
  return {
    id: spec.id,
    position: { x: spec.x, y: spec.y },
    draggable,
    connectable: false,
    sourcePosition: spec.sourceSide ? HANDLE_POS[spec.sourceSide] : undefined,
    targetPosition: spec.targetSide ? HANDLE_POS[spec.targetSide] : undefined,
    data: {
      label: (
        <GraphNodeLabel label={spec.label} sublabel={spec.sublabel} minor={spec.minor} />
      ),
    },
    className: `lg-graph-node lg-graph-tone-${graphToneClass(spec.accent)}${spec.minor ? " is-minor" : ""}`,
  };
}

function toEdge(spec: GraphEdgeSpec): Edge {
  return {
    id: spec.id,
    source: spec.source,
    target: spec.target,
    label: spec.label ? <span className="lg-graph-edge-label">{spec.label}</span> : undefined,
    animated: spec.animated,
    className: `lg-graph-edge lg-graph-tone-${graphToneClass(spec.color)}`,
  };
}

// ============================================================
// PART 3 — 본체
// ============================================================

export default function RelationGraph({
  nodes: nodeSpecs,
  edges: edgeSpecs,
  ariaLabel,
  height = 480,
  draggable = false,
  onNodeClick,
  onNodeDragStop,
}: RelationGraphProps) {
  const initialNodes = useMemo(() => nodeSpecs.map((s) => toNode(s, draggable)), [nodeSpecs, draggable]);
  const initialEdges = useMemo(() => edgeSpecs.map(toEdge), [edgeSpecs]);

  // 드래그를 위한 controlled state — props(실데이터) 변경 시 동기화.
  // 드래그 중에는 props 가 안 바뀌므로 위치가 리셋되지 않고, 디바운스 영속이
  // 완료되면 props 재구성 좌표 = 드래그 좌표라 시각적 점프 없음.
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  const handleNodeDragStop = useCallback<OnNodeDrag>(
    (_event, node) => {
      onNodeDragStop?.(node.id, node.position.x, node.position.y);
    },
    [onNodeDragStop],
  );

  return (
    <div className={`lg-graph ${graphHeightClass(height)}`}>
      <ReactFlow
        className="lg-graph-flow"
        aria-label={ariaLabel}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick ? handleNodeClick : undefined}
        onNodeDragStop={onNodeDragStop ? handleNodeDragStop : undefined}
        nodesDraggable={draggable}
        nodesConnectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--line)" />
        <MiniMap
          className="lg-graph-minimap"
          pannable
          zoomable
          bgColor="var(--card-2)"
          maskColor="color-mix(in srgb, var(--card-2) 75%, transparent)"
          nodeColor="var(--line)"
          nodeStrokeColor="var(--ink-3)"
        />
        <Controls className="lg-graph-controls" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
