"use client";

import React, { useRef, useCallback, useState, useEffect } from 'react';

export interface TouchGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_TIME_LIMIT = 300;

/**
 * Hook for detecting touch gestures.
 * Returns props to spread on the target element.
 */
export function useTouchGesture(handlers: TouchGestureHandlers) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!startRef.current) return;
    const elapsed = Date.now() - startRef.current.t;
    if (elapsed > SWIPE_TIME_LIMIT) { startRef.current = null; return; }

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > SWIPE_THRESHOLD) handlers.onSwipeRight?.();
        else if (dx < -SWIPE_THRESHOLD) handlers.onSwipeLeft?.();
      } else {
        if (dy > SWIPE_THRESHOLD) handlers.onSwipeDown?.();
        else if (dy < -SWIPE_THRESHOLD) handlers.onSwipeUp?.();
      }
    }
    startRef.current = null;
  }, [handlers]);

  return { onTouchStart, onTouchEnd };
}

/**
 * Hook for responsive breakpoint detection.
 * Replaces raw window.innerWidth checks with SSR-safe reactive state.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
