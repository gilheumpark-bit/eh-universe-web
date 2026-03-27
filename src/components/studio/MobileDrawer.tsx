"use client";

// ============================================================
// Mobile Bottom Drawer — swipe-up panel for right-side content
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SNAP_POINTS = [0, 0.5, 1.0]; // closed, half, full
const DRAG_THRESHOLD = 30;

export default function MobileDrawer({ open, onClose, title, children }: Props) {
  const [snap, setSnap] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSnap(0.5);
  }, [open]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startY.current = e.clientY;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientY - startY.current;
    setDragOffset(delta);
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    if (dragOffset > DRAG_THRESHOLD * 3) {
      // Swipe down hard → close
      onClose();
    } else if (dragOffset > DRAG_THRESHOLD) {
      // Swipe down → snap lower
      setSnap(prev => {
        const idx = SNAP_POINTS.indexOf(prev);
        return idx > 0 ? SNAP_POINTS[idx - 1] : SNAP_POINTS[0];
      });
    } else if (dragOffset < -DRAG_THRESHOLD) {
      // Swipe up → snap higher
      setSnap(prev => {
        const idx = SNAP_POINTS.indexOf(prev);
        return idx < SNAP_POINTS.length - 1 ? SNAP_POINTS[idx + 1] : SNAP_POINTS[SNAP_POINTS.length - 1];
      });
    }

    setDragOffset(0);
  }, [dragging, dragOffset, onClose]);

  if (!open) return null;

  const heightPercent = snap * 100;
  const adjustedHeight = dragging
    ? Math.max(10, heightPercent - (dragOffset / window.innerHeight) * 100)
    : heightPercent;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={containerRef}
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-bg-primary border-t border-border rounded-t-2xl overflow-hidden flex flex-col"
        style={{
          height: `${adjustedHeight}vh`,
          transition: dragging ? 'none' : 'height 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing shrink-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none' }}
        >
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{title}</span>
            <button onClick={onClose} className="p-1 text-text-tertiary hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </div>
    </>
  );
}
