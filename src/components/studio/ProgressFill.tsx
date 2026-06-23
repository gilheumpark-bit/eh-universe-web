"use client";

import React, { useCallback } from "react";

interface ProgressFillProps {
  value: number;
  max?: number;
  className?: string;
  title?: string;
  role?: React.AriaRole;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

function clampProgress(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function ProgressFill({
  value,
  max = 100,
  className = "",
  title,
  role,
  ariaLabel,
  ariaHidden,
}: ProgressFillProps) {
  const percent = clampProgress(value, max);
  const bindProgressRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    node.style.setProperty("--studio-progress-fill", `${percent}%`);
  }, [percent]);

  return (
    <div
      ref={bindProgressRef}
      className={`studio-progress-fill ${className}`}
      title={title}
      role={role}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
}
