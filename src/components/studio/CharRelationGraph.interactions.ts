import { useCallback, useRef } from 'react';
import type React from 'react';
import type { ForceEdge, ForceNode } from '@/lib/force-graph';
import { tickForceLayout } from '@/lib/force-graph';
import {
  SVG_H,
  SVG_W,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type ViewTransform,
} from './CharRelationGraph.shared';

export function useDragAndPan(
  nodesRef: React.MutableRefObject<ForceNode[]>,
  edges: ForceEdge[],
  setNodes: (n: ForceNode[]) => void,
  transform: ViewTransform,
  setTransform: React.Dispatch<React.SetStateAction<ViewTransform>>
) {
  const dragging = useRef<string | null>(null);
  const panning = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const onSvgPointerDown = useCallback((e: React.PointerEvent) => {
    if (dragging.current) return;
    panning.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: transform.panX,
      startPanY: transform.panY,
    };
  }, [transform.panX, transform.panY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
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
    const pan = panning.current;
    if (pan) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = (e.clientX - pan.startX) / rect.width * (SVG_W / transform.zoom);
      const dy = (e.clientY - pan.startY) / rect.height * (SVG_H / transform.zoom);
      setTransform(prev => ({
        ...prev,
        panX: pan.startPanX + dx,
        panY: pan.startPanY + dy,
      }));
    }
  }, [edges, nodesRef, setNodes, setTransform, toSVGCoord, transform.zoom]);

  const onPointerUp = useCallback(() => {
    if (dragging.current) {
      nodesRef.current = nodesRef.current.map(n =>
        n.id === dragging.current ? { ...n, pinned: false } : n
      );
      dragging.current = null;
    }
    panning.current = null;
  }, [nodesRef]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const fracX = (e.clientX - rect.left) / rect.width;
    const fracY = (e.clientY - rect.top) / rect.height;

    setTransform(prev => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.zoom + direction * ZOOM_STEP));
      if (newZoom === prev.zoom) return prev;

      const oldVBW = SVG_W / prev.zoom;
      const oldVBH = SVG_H / prev.zoom;
      const newVBW = SVG_W / newZoom;
      const newVBH = SVG_H / newZoom;
      const cursorSvgX = -prev.panX + fracX * oldVBW;
      const cursorSvgY = -prev.panY + fracY * oldVBH;
      const newPanX = -(cursorSvgX - fracX * newVBW);
      const newPanY = -(cursorSvgY - fracY * newVBH);

      return { zoom: newZoom, panX: newPanX, panY: newPanY };
    });
  }, [setTransform]);

  return { svgRef, onPointerDown, onSvgPointerDown, onPointerMove, onPointerUp, onWheel };
}
