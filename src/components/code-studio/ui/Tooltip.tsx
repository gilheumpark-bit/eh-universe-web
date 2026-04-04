"use client";

// ============================================================
// Tooltip — Styled tooltip with z-token & reduced-motion support
// ============================================================
// Replaces native `title` attribute with themed, accessible tooltip.
// Uses existing keyframe `tooltip-in` from globals-components.css.

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Placement relative to trigger */
  side?: "top" | "bottom" | "left" | "right";
  /** Delay before showing (ms) */
  delay?: number;
  /** Additional className for tooltip bubble */
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delay = 400,
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses[side]} pointer-events-none whitespace-nowrap
            px-2 py-1 text-[11px] font-medium rounded-[var(--radius-sm)]
            bg-bg-primary text-text-primary border border-border
            shadow-panel tooltip-animate
            ${className}`}
          style={{ zIndex: "var(--z-tooltip)" }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
