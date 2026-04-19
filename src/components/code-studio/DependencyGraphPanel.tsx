'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { buildDependencyGraph } from '@/lib/code-studio/core/dependency-graph';
import type { DependencyGraphResult } from '@/lib/code-studio/core/dependency-graph';

// ============================================================
// PART 1 — Types, Constants & Helpers
// ============================================================

interface DependencyGraphPanelProps {
  files: Record<string, string>;
  onNodeClick?: (path: string) => void;
  className?: string;
}

interface SimNode {
  id: string; x: number; y: number;
  vx: number; vy: number;
  isCycle: boolean; isOrphan: boolean;
}

const W = 800, H = 600, R = 6;
const REPULSION = 400, SPRING = 0.04, IDEAL_LEN = 120, DAMP = 0.85, MAX_ITER = 200;

function truncLabel(path: string, max = 18): string {
  const name = path.split('/').pop() ?? path;
  return name.length > max ? name.slice(0, max - 1) + '\u2026' : name;
}

const COLOR_RED = 'var(--color-red-400, #f87171)';
const COLOR_GRAY = 'var(--color-gray-500, #6b7280)';
const COLOR_BLUE = 'var(--color-accent-blue, #3b82f6)';
const COLOR_TEXT = 'var(--color-text-secondary, #9ca3af)';

// ============================================================
// PART 2 — Force-Directed Layout Hook
// ============================================================

function useForceLayout(graph: DependencyGraphResult | null): SimNode[] {
  const [pos, setPos] = useState<SimNode[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (!graph || graph.nodes.size === 0) { setPos([]); return; }

    const cycleSet = new Set<string>();
    for (const c of graph.cycles) for (const n of c.nodes) cycleSet.add(n);
    const orphanSet = new Set(graph.orphanFiles);
    const ids = Array.from(graph.nodes.keys());
    const cx = W / 2, cy = H / 2, rad = Math.min(cx, cy) * 0.7;

    const nodes: SimNode[] = ids.map((id, i) => {
      const a = (2 * Math.PI * i) / ids.length;
      return { id, x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a),
        vx: 0, vy: 0, isCycle: cycleSet.has(id), isOrphan: orphanSet.has(id) };
    });
    const idx = new Map(ids.map((id, i) => [id, i]));
    const edgeList = graph.edges;
    let iter = 0;

    function tick() {
      if (iter >= MAX_ITER) { setPos([...nodes]); return; }
      iter++;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const f = REPULSION / (d * d);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          nodes[i].vx += fx; nodes[i].vy += fy;
          nodes[j].vx -= fx; nodes[j].vy -= fy;
        }
      }
      for (const e of edgeList) {
        const si = idx.get(e.source), ti = idx.get(e.target);
        if (si === undefined || ti === undefined) continue;
        const dx = nodes[ti].x - nodes[si].x, dy = nodes[ti].y - nodes[si].y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = SPRING * (d - IDEAL_LEN);
        const fx = (dx / d) * f, fy = (dy / d) * f;
        nodes[si].vx += fx; nodes[si].vy += fy;
        nodes[ti].vx -= fx; nodes[ti].vy -= fy;
      }
      for (const n of nodes) {
        n.vx *= DAMP; n.vy *= DAMP;
        n.x = Math.max(R, Math.min(W - R, n.x + n.vx));
        n.y = Math.max(R, Math.min(H - 40 - R, n.y + n.vy));
      }
      if (iter < MAX_ITER) raf.current = requestAnimationFrame(tick);
      else setPos([...nodes]);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [graph]);

  return pos;
}

// ============================================================
// PART 3 — Component Render
// ============================================================

export default function DependencyGraphPanel({ files, onNodeClick, className }: DependencyGraphPanelProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });

  const graph = useMemo(() => {
    if (Object.keys(files).length === 0) return null;
    return buildDependencyGraph(files);
  }, [files]);

  const nodes = useForceLayout(graph);

  const cycleEdges = useMemo(() => {
    if (!graph) return new Set<string>();
    const s = new Set<string>();
    for (const c of graph.cycles)
      for (let i = 0; i < c.nodes.length; i++)
        s.add(`${c.nodes[i]}|${c.nodes[(i + 1) % c.nodes.length]}`);
    return s;
  }, [graph]);

  const nMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const onEnter = useCallback((id: string, x: number, y: number) => {
    setHovered(id); setTip({ x, y });
  }, []);
  const onLeave = useCallback(() => setHovered(null), []);

  if (!graph) {
    return (
      <div className={`flex items-center justify-center h-full text-text-secondary ${className ?? ''}`}>
        <p className="text-sm">파일을 추가하면 의존성 그래프가 표시됩니다</p>
      </div>
    );
  }

  const fill = (n: SimNode) => n.isCycle ? COLOR_RED : n.isOrphan ? COLOR_GRAY : COLOR_BLUE;

  return (
    <div className={`relative flex flex-col bg-bg-primary text-text-primary ${className ?? ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="flex-1 w-full" aria-label="Dependency graph">
        {graph.edges.map((e, i) => {
          const s = nMap.get(e.source), t = nMap.get(e.target);
          if (!s || !t) return null;
          const cyc = cycleEdges.has(`${e.source}|${e.target}`);
          return (
            <line key={`e${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={cyc ? COLOR_RED : COLOR_GRAY}
              strokeOpacity={cyc ? 0.8 : 0.4} strokeWidth={1} />
          );
        })}
        {nodes.map(n => (
          <g key={n.id} className="cursor-pointer"
            onClick={() => onNodeClick?.(n.id)}
            onMouseEnter={() => onEnter(n.id, n.x, n.y)}
            onMouseLeave={onLeave}>
            <circle cx={n.x} cy={n.y} r={R} fill={fill(n)} />
            <text x={n.x} y={n.y + R + 12} textAnchor="middle" fontSize={9} fill={COLOR_TEXT}>
              {truncLabel(n.id)}
            </text>
          </g>
        ))}
      </svg>
      {hovered && (
        <div className="absolute px-2 py-1 text-xs rounded bg-bg-secondary text-text-primary border border-border shadow-lg pointer-events-none"
          style={{ left: tip.x + 12, top: tip.y - 8 }}>
          {hovered}
        </div>
      )}
      <div className="flex items-center gap-4 px-3 py-1.5 text-xs border-t border-border text-text-secondary shrink-0">
        <span>Files: {graph.stats.totalFiles}</span>
        <span>Edges: {graph.stats.totalEdges}</span>
        <span className={graph.stats.totalCycles > 0 ? 'text-accent-red' : ''}>Cycles: {graph.stats.totalCycles}</span>
        <span>Max Depth: {graph.stats.maxDepth}</span>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: DependencyGraphPanel | role=graph-visualization | inputs=files | outputs=SVG render
