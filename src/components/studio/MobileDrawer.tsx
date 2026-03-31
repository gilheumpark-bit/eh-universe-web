"use client";

// ============================================================
// PART 1 — Mobile Bottom Drawer — Premium swipe-up panel
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SNAP_POINTS = [0, 0.5, 0.85]; // closed, half, almost-full (not 100% to show peek of content behind)
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
    const id = requestAnimationFrame(() => {
      if (open) {
        setSnap(0.5);
        setAnimReady(true);
      } else {
        setAnimReady(false);
      }
    });
    return () => cancelAnimationFrame(id);
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

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }, []);

  const handleSnapToggle = useCallback(() => {
    triggerHaptic();
    setSnap(prev => {
      const idx = SNAP_POINTS.indexOf(prev);
      // Toggle between half and full
      return idx === 1 ? SNAP_POINTS[2] : SNAP_POINTS[1];
    });
  }, [triggerHaptic]);

  return (
    <>
      {/* Backdrop — tap to close, animated opacity with blur */}
      <div
        className="fixed inset-0 z-40 bg-black/60 md:hidden"
        style={{
          opacity: backdropOpacity,
          backdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
          transition: 'opacity 0.3s ease-out, backdrop-filter 0.3s ease-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — Premium glass morphism */}
      <div
        ref={containerRef}
        className="fixed bottom-0 inset-x-0 z-50 md:hidden overflow-hidden flex flex-col"
        style={{
          height: `${adjustedHeight}vh`,
          transition: dragging ? 'none' : 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          willChange: dragging ? 'height' : 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Glass panel with premium styling */}
        <div className="flex-1 flex flex-col bg-bg-primary/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.5),0_-4px_16px_rgba(0,0,0,0.3)]">
          {/* Top highlight line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-3xl" />
          
          {/* Drag handle — enhanced touch target with visual feedback */}
          <div
            className="relative flex items-center justify-center py-4 cursor-grab active:cursor-grabbing shrink-0 min-h-[48px]"
            onPointerDown={(e) => { triggerHaptic(); onPointerDown(e); }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ touchAction: 'none' }}
          >
            {/* Handle pill with glow on drag */}
            <div className={`
              w-12 h-1.5 rounded-full transition-all duration-200
              ${dragging ? 'bg-accent-purple scale-110 shadow-[0_0_12px_rgba(141,123,195,0.5)]' : 'bg-white/25'}
            `} />
            
            {/* Snap indicator arrows */}
            <button
              onClick={handleSnapToggle}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={snap === SNAP_POINTS[2] ? 'Minimize' : 'Maximize'}
            >
              {snap === SNAP_POINTS[2] ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Header — Premium styling */}
          {title && (
            <div className="flex items-center justify-between px-5 pb-3 shrink-0 border-b border-white/[0.06]">
              <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
                {title}
              </span>
              <button
                onClick={() => { triggerHaptic(); onClose(); }}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-tertiary hover:text-white hover:bg-white/5 transition-all active:scale-90"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Content — smooth scroll with fade edges */}
          <div className="relative flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto overscroll-contain px-5 py-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {children}
            </div>
            {/* Fade edge at bottom */}
            <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-bg-primary/95 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </>
  );
}

// IDENTITY_SEAL: PART-3 | role=drawer-component | inputs=open,onClose,title,children | outputs=UI(bottom drawer)
