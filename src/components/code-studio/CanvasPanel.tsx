"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { ZoomIn, ZoomOut, Maximize2, Download, Plus, Trash2, Move } from "lucide-react";

export interface CanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: "component" | "file" | "module" | "service";
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface CanvasPanelProps {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  onNodesChange: (nodes: CanvasNode[]) => void;
  onConnectionsChange: (connections: CanvasConnection[]) => void;
  onExportImage?: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=CanvasNode,CanvasConnection

// ============================================================
// PART 2 — Canvas State & Zoom/Pan
// ============================================================

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const GRID_SIZE = 20;

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

// IDENTITY_SEAL: PART-2 | role=ZoomPan | inputs=zoom,offset | outputs=transform

// ============================================================
// PART 3 — Connection Renderer
// ============================================================

function ConnectionLine({
  from,
  to,
  label,
  nodes,
}: {
  from: string;
  to: string;
  label?: string;
  nodes: CanvasNode[];
}) {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + fromNode.height / 2;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y + toNode.height / 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4b5563" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
      {label && (
        <text x={mx} y={my - 6} textAnchor="middle" className="fill-gray-500 text-[10px]">
          {label}
        </text>
      )}
    </g>
  );
}

// IDENTITY_SEAL: PART-3 | role=ConnectionRenderer | inputs=from,to,nodes | outputs=SVG

// ============================================================
// PART 4 — Node Renderer
// ============================================================

const TYPE_COLORS: Record<CanvasNode["type"], string> = {
  component: "#3b82f6",
  file: "#10b981",
  module: "#8b5cf6",
  service: "#f59e0b",
};

function NodeBox({
  node,
  selected,
  onSelect,
  onDrag,
}: {
  node: CanvasNode;
  selected: boolean;
  onSelect: () => void;
  onDrag: (dx: number, dy: number) => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const handleMouseDown = (e: ReactMouseEvent) => {
    e.stopPropagation();
    onSelect();
    dragRef.current = { startX: e.clientX, startY: e.clientY };

    const handleMove = (me: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = me.clientX - dragRef.current.startX;
      const dy = me.clientY - dragRef.current.startY;
      dragRef.current = { startX: me.clientX, startY: me.clientY };
      onDrag(dx, dy);
    };
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const color = node.color || TYPE_COLORS[node.type] || "#6b7280";

  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={6}
        fill="#1e1e2e"
        stroke={selected ? "#60a5fa" : color}
        strokeWidth={selected ? 2 : 1}
        className="cursor-move"
        onMouseDown={handleMouseDown}
      />
      <rect x={node.x} y={node.y} width={node.width} height={4} rx={2} fill={color} />
      <text
        x={node.x + node.width / 2}
        y={node.y + node.height / 2 + 4}
        textAnchor="middle"
        className="fill-white text-xs pointer-events-none select-none"
      >
        {node.label}
      </text>
    </g>
  );
}

// IDENTITY_SEAL: PART-4 | role=NodeRenderer | inputs=CanvasNode | outputs=SVG

// ============================================================
// PART 5 — Mini-map
// ============================================================

function MiniMap({
  nodes,
  viewBox,
  zoom,
}: {
  nodes: CanvasNode[];
  viewBox: { x: number; y: number; w: number; h: number };
  zoom: number;
}) {
  if (nodes.length === 0) return null;
  const minX = Math.min(...nodes.map((n) => n.x)) - 50;
  const minY = Math.min(...nodes.map((n) => n.y)) - 50;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + 50;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + 50;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;

  return (
    <div className="absolute bottom-2 right-2 w-32 h-24 rounded border border-white/10 bg-[#12121a] overflow-hidden">
      <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full h-full">
        {nodes.map((n) => (
          <rect
            key={n.id}
            x={n.x}
            y={n.y}
            width={n.width}
            height={n.height}
            fill={TYPE_COLORS[n.type] ?? "#6b7280"}
            opacity={0.6}
            rx={2}
          />
        ))}
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w / zoom}
          height={viewBox.h / zoom}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=MiniMap | inputs=nodes,viewBox,zoom | outputs=SVG

// ============================================================
// PART 6 — Main Canvas Component
// ============================================================

export default function CanvasPanel({
  nodes,
  connections,
  onNodesChange,
  onConnectionsChange,
  onExportImage,
}: CanvasPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
  }, []);

  const handlePanStart = (e: ReactMouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      panRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  useEffect(() => {
    const handleMove = (e: globalThis.MouseEvent) => {
      if (!isPanning || !panRef.current) return;
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      panRef.current = { x: e.clientX, y: e.clientY };
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    };
    const handleUp = () => {
      setIsPanning(false);
      panRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isPanning]);

  const handleNodeDrag = (id: string, dx: number, dy: number) => {
    onNodesChange(
      nodes.map((n) =>
        n.id === id ? { ...n, x: snapToGrid(n.x + dx / zoom), y: snapToGrid(n.y + dy / zoom) } : n,
      ),
    );
  };

  const addNode = () => {
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      label: "New Node",
      x: snapToGrid(-offset.x / zoom + 200),
      y: snapToGrid(-offset.y / zoom + 200),
      width: 140,
      height: 60,
      color: "",
      type: "component",
    };
    onNodesChange([...nodes, newNode]);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    onNodesChange(nodes.filter((n) => n.id !== selectedId));
    onConnectionsChange(connections.filter((c) => c.from !== selectedId && c.to !== selectedId));
    setSelectedId(null);
  };

  const rect = containerRef.current?.getBoundingClientRect();
  const viewBox = {
    x: -offset.x / zoom,
    y: -offset.y / zoom,
    w: (rect?.width ?? 800),
    h: (rect?.height ?? 600),
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#12121a]">
      {/* Toolbar */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-white/10 bg-[#1e1e2e] p-1">
        <button onClick={() => setZoom((z) => Math.min(z + 0.2, MAX_ZOOM))} className="p-1 text-gray-400 hover:text-white" title="Zoom in">
          <ZoomIn size={14} />
        </button>
        <span className="px-1 text-[10px] text-gray-500">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(z - 0.2, MIN_ZOOM))} className="p-1 text-gray-400 hover:text-white" title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <div className="mx-1 h-4 w-px bg-white/10" />
        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-1 text-gray-400 hover:text-white" title="Reset view">
          <Maximize2 size={14} />
        </button>
        <button onClick={addNode} className="p-1 text-gray-400 hover:text-white" title="Add node">
          <Plus size={14} />
        </button>
        {selectedId && (
          <button onClick={deleteSelected} className="p-1 text-gray-400 hover:text-red-400" title="Delete node">
            <Trash2 size={14} />
          </button>
        )}
        {onExportImage && (
          <button onClick={onExportImage} className="p-1 text-gray-400 hover:text-white" title="Export image">
            <Download size={14} />
          </button>
        )}
      </div>

      {/* Canvas SVG */}
      <svg
        className="h-full w-full"
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onClick={() => setSelectedId(null)}
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
          </marker>
          <pattern id="grid" width={GRID_SIZE * zoom} height={GRID_SIZE * zoom} patternUnits="userSpaceOnUse"
            x={offset.x % (GRID_SIZE * zoom)} y={offset.y % (GRID_SIZE * zoom)}>
            <circle cx={1} cy={1} r={0.5} fill="#ffffff08" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g transform={`translate(${offset.x},${offset.y}) scale(${zoom})`}>
          {connections.map((c) => (
            <ConnectionLine key={c.id} from={c.from} to={c.to} label={c.label} nodes={nodes} />
          ))}
          {nodes.map((n) => (
            <NodeBox
              key={n.id}
              node={n}
              selected={n.id === selectedId}
              onSelect={() => setSelectedId(n.id)}
              onDrag={(dx, dy) => handleNodeDrag(n.id, dx, dy)}
            />
          ))}
        </g>
      </svg>

      <MiniMap nodes={nodes} viewBox={viewBox} zoom={zoom} />
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=CanvasPanelUI | inputs=nodes,connections | outputs=JSX
