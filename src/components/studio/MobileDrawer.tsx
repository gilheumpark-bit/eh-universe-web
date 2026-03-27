"use client";

// ============================================================
// PART 1 — Mobile Bottom Drawer — swipe-up panel for right-side content
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
const VELOCITY_THRESHOLD = 0.5; // px/ms — fast swipe detection
const EDGE_SWIPE_ZONE = 20; // px from right edge for swipe-to-open

// IDENTITY_SEAL: PART-1 | role=types-constants | inputs=none | outputs=Props,SNAP_POINTS,thresholds

// ============================================================
// PART 2 — Edge swipe hook (right-edge swipe to open)
// ============================================================

function useEdgeSwipe(onOpen: () => void, enabled: boolean) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger from right edge of screen
      if (touch.clientX > window.innerWidth - EDGE_SWIPE_ZONE) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === 0) return;
      const touch = e.changedTouches[0];
      const dx = touchStartX.current - touch.clientX;
      const dy = Math.abs(touch.clientY - touchStartY.current);
      // Horizontal swipe left from right edge, with minimal vertical movement
      if (dx > 60 && dy < dx * 0.5) {
        onOpen();
      }
      touchStartX.current = 0;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onOpen, enabled]);
}

// IDENTITY_SEAL: PART-2 | role=edge-swipe-hook | inputs=onOpen,enabled | outputs=side-effect(touch listeners)

// ============================================================
// PART 3 — Drawer Component
// ============================================================

export default function MobileDrawer({ open, onClose, title, children }: Props) {
  const [snap, setSnap] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  // Derive visible from open prop + a brief RAF delay for enter animation
  const [animReady, setAnimReady] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Edge swipe to open (only when drawer is closed)
  // Note: parent must pass an `onOpen` callback for this; here we just track visibility
  useEdgeSwipe(() => {/* parent controls open state */}, false);

  // Enter animation: delay animReady to allow CSS transition from height:0
  useEffect(() => {
    if (open) {
      setSnap(0.5);
      const id = requestAnimationFrame(() => {
        setAnimReady(true);
      });
      return () => cancelAnimationFrame(id);
    } else {
      setAnimReady(false);
    }
  }, [open]);

  // Derive visible directly from props — no setState sync
  const visible = open && animReady;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startY.current = e.clientY;
    startTime.current = Date.now();
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

    // Velocity-based detection: fast swipe down → close immediately
    const elapsed = Math.max(1, Date.now() - startTime.current);
    const velocity = dragOffset / elapsed; // px/ms

    if (velocity > VELOCITY_THRESHOLD) {
      // Fast swipe down → close
      onClose();
    } else if (dragOffset > DRAG_THRESHOLD * 3) {
      // Slow but large swipe down → close
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

  // Close on snap to 0
  useEffect(() => {
    if (snap === 0 && !dragging) onClose();
  }, [snap, dragging, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  const heightPercent = snap * 100;
  const adjustedHeight = dragging
    ? Math.max(10, heightPercent - (dragOffset / window.innerHeight) * 100)
    : (visible ? heightPercent : 0);

  const backdropOpacity = visible ? 1 : 0;

  return (
    <>
      {/* Backdrop — tap to close, animated opacity */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
        style={{
          opacity: backdropOpacity,
          transition: 'opacity 0.3s ease-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={containerRef}
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-bg-primary border-t border-border rounded-t-2xl overflow-hidden flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
        style={{
          height: `${adjustedHeight}vh`,
          transition: dragging ? 'none' : 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          willChange: dragging ? 'height' : 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Drag handle — 44px min touch target */}
        <div
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing shrink-0 min-h-[44px]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none' }}
        >
          <div className="w-10 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{title}</span>
            <button
              onClick={onClose}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-tertiary hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content — overscroll-contain prevents pull-to-refresh interference */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 -webkit-overflow-scrolling-touch">
          {children}
        </div>
      </div>
    </>
  );
}

// IDENTITY_SEAL: PART-3 | role=drawer-component | inputs=open,onClose,title,children | outputs=UI(bottom drawer)
