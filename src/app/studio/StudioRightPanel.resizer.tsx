"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

const RPANEL_MIN = 280;
const RPANEL_MAX = 880;
const RPANEL_DEFAULT = 360;
const RPANEL_STORAGE_KEY = "noa-lg-rpanel-w";
const RPANEL_KEY_STEP = 16;

function getRpanelViewportMax(): number {
  if (typeof window === "undefined") return RPANEL_MAX;
  const viewport = window.innerWidth;
  if (viewport <= 1179) return RPANEL_MIN;
  if (viewport <= 1440) return Math.min(520, Math.max(RPANEL_MIN, Math.floor(viewport * 0.4)));
  if (viewport < 1920) return Math.min(720, Math.max(RPANEL_MIN, Math.floor(viewport * 0.38)));
  return RPANEL_MAX;
}

function clampRpanelWidth(px: number, maxWidth = getRpanelViewportMax()): number {
  if (!Number.isFinite(px)) return RPANEL_DEFAULT;
  return Math.round(Math.min(maxWidth, Math.max(RPANEL_MIN, px)));
}

function readRpanelWidth(): number {
  if (typeof window === "undefined") return RPANEL_DEFAULT;
  try {
    const raw = window.localStorage.getItem(RPANEL_STORAGE_KEY);
    if (!raw) return RPANEL_DEFAULT;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? RPANEL_DEFAULT : clampRpanelWidth(n);
  } catch {
    return RPANEL_DEFAULT;
  }
}

export interface RightPanelResizerProps {
  language?: AppLanguage;
}

export function RightPanelResizer({ language = "KO" }: RightPanelResizerProps) {
  const [width, setWidth] = useState<number>(readRpanelWidth);
  const [viewportMax, setViewportMax] = useState(RPANEL_MAX);
  const [panelPresent, setPanelPresent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gripRef = useRef<HTMLButtonElement | null>(null);
  const ehAppRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewportMax = () => {
      const nextMax = getRpanelViewportMax();
      setViewportMax(nextMax);
      setWidth((current) => clampRpanelWidth(current, nextMax));
    };
    updateViewportMax();
    window.addEventListener("resize", updateViewportMax);
    return () => window.removeEventListener("resize", updateViewportMax);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const ehApp = (ehAppRef.current ??= document.querySelector<HTMLElement>(".eh-app"));
    if (ehApp) ehApp.style.setProperty("--lg-rpanel-w", `${width}px`);
    try {
      window.localStorage.setItem(RPANEL_STORAGE_KEY, String(width));
    } catch {
      // Keep the in-session width even if storage is unavailable.
    }
  }, [width]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => {
      ehAppRef.current = document.querySelector<HTMLElement>(".eh-app");
      const panel = document.querySelector<HTMLElement>(".eh-app .wr-panel");
      const present = !!panel && !panel.classList.contains("is-collapsed");
      setPanelPresent(present);
      if (ehAppRef.current) ehAppRef.current.style.setProperty("--lg-rpanel-w", `${readRpanelWidth()}px`);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (dragging) document.body.dataset.lgResizing = "1";
    else delete document.body.dataset.lgResizing;
    return () => {
      if (typeof document !== "undefined") delete document.body.dataset.lgResizing;
    };
  }, [dragging]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const applyFromClientX = useCallback((clientX: number) => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = clampRpanelWidth(window.innerWidth - clientX, viewportMax);
      setWidth(next);
    });
  }, [viewportMax]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is progressive enhancement here.
    }
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    applyFromClientX(event.clientX);
  }, [dragging, applyFromClientX]);

  const endDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // No-op for environments without pointer capture.
    }
  }, [dragging]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    let next: number | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = width + RPANEL_KEY_STEP;
        break;
      case "ArrowRight":
        next = width - RPANEL_KEY_STEP;
        break;
      case "Home":
        next = viewportMax;
        break;
      case "End":
        next = RPANEL_MIN;
        break;
      default:
        return;
    }
    event.preventDefault();
    setWidth(clampRpanelWidth(next, viewportMax));
  }, [viewportMax, width]);

  if (!panelPresent) return null;

  const label = L4(language, {
    ko: "우측 패널 너비 조절",
    en: "Resize right panel",
    ja: "右パネルの幅を調整",
    zh: "调整右面板宽度",
  });
  const regionLabel = L4(language, {
    ko: "우측 패널 크기 조절 영역",
    en: "Right panel resize controls",
    ja: "右パネル幅調整コントロール",
    zh: "右侧面板宽度调整控件",
  });

  return (
    <aside aria-label={regionLabel}>
      <button
        ref={gripRef}
        type="button"
        className="lg-rpanel-grip"
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={width}
        aria-valuemin={RPANEL_MIN}
        aria-valuemax={viewportMax}
        data-dragging={dragging ? "1" : "0"}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      />
    </aside>
  );
}
