"use client";

/* ===========================================================
   IdeResizablePanel — Loreguard 공통 IDE 패널 껍데기

   역할:
   - 좌/우 레일, 보드, 검수 패널의 접힘 상태와 폭을 저장한다.
   - 기존 탭 내부 콘텐츠는 그대로 두고 바깥 패널 동작만 통일한다.
   - localStorage 접근은 writing-workspace 순수 헬퍼를 재사용한다.
   =========================================================== */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { ChevronL, ChevronR } from "@/components/loreguard/icons";
import { LAYOUT_PROFILE_APPLIED_EVENT } from "@/lib/loreguard/layout-profile";
import { clampWidth, loadWidth, saveWidth } from "@/lib/writing-workspace/panel-resize";
import { loadCollapse, saveCollapse } from "@/lib/writing-workspace/collapse-state";

type IdePanelSide = "left" | "right";
type CollapsedSummaryTone = "green" | "amber" | "blue" | "red" | "gray";

const COLLAPSED_PANEL_WIDTH = 48;

export interface IdeCollapsedSummaryItem {
  label: string;
  value: string;
  tone?: CollapsedSummaryTone;
}

interface IdeResizablePanelProps {
  id: string;
  side: IdePanelSide;
  className: string;
  ariaLabel: string;
  stripLabel: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  defaultCollapsed?: boolean;
  collapsedSummary?: readonly IdeCollapsedSummaryItem[];
  children: ReactNode;
}

interface DragState {
  startX: number;
  startWidth: number;
  lastWidth: number;
}

function safeDomId(id: string): string {
  return `lg-ide-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function readCollapsed(key: string, fallback: boolean): boolean {
  const map = loadCollapse();
  if (Object.prototype.hasOwnProperty.call(map, key)) return map[key] === true;
  return fallback;
}

function readNarrowLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1179.98px)").matches;
}

export default function IdeResizablePanel({
  id,
  side,
  className,
  ariaLabel,
  stripLabel,
  defaultWidth,
  minWidth,
  maxWidth,
  defaultCollapsed = true,
  collapsedSummary = [],
  children,
}: IdeResizablePanelProps) {
  const panelId = useMemo(() => safeDomId(id), [id]);
  const widthKey = `loreguard-${id}`;
  const collapseKey = `loreguard:${id}`;
  const dragRef = useRef<DragState | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const [width, setWidth] = useState(() =>
    clampWidth(loadWidth(widthKey, defaultWidth), minWidth, maxWidth),
  );
  const [collapsed, setCollapsedState] = useState(() =>
    readCollapsed(collapseKey, defaultCollapsed),
  );
  const [dragging, setDragging] = useState(false);
  const [isNarrow, setIsNarrow] = useState(readNarrowLayout);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 1179.98px)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onProfileApplied = () => {
      setWidth(clampWidth(loadWidth(widthKey, defaultWidth), minWidth, maxWidth));
      setCollapsedState(readCollapsed(collapseKey, defaultCollapsed));
      setMobileOpen(false);
    };
    window.addEventListener(LAYOUT_PROFILE_APPLIED_EVENT, onProfileApplied);
    return () => window.removeEventListener(LAYOUT_PROFILE_APPLIED_EVENT, onProfileApplied);
  }, [collapseKey, defaultCollapsed, defaultWidth, maxWidth, minWidth, widthKey]);

  useEffect(() => {
    if (!isNarrow || !mobileOpen) return;
    document.body.setAttribute("data-lg-mobile-sheet-open", "1");
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.removeAttribute("data-lg-mobile-sheet-open");
    };
  }, [isNarrow, mobileOpen]);

  const persistCollapsed = useCallback(
    (next: boolean) => {
      const map = loadCollapse();
      saveCollapse({ ...map, [collapseKey]: next });
      setCollapsedState(next);
    },
    [collapseKey],
  );

  const toggleCollapsed = useCallback(() => {
    persistCollapsed(!collapsed);
  }, [collapsed, persistCollapsed]);

  const commitWidth = useCallback(
    (next: number) => {
      const safe = clampWidth(next, minWidth, maxWidth);
      setWidth(safe);
      saveWidth(widthKey, safe);
      return safe;
    },
    [maxWidth, minWidth, widthKey],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (collapsed) return;
      event.preventDefault();
      const start: DragState = { startX: event.clientX, startWidth: width, lastWidth: width };
      dragRef.current = start;
      setDragging(true);
      document.body.setAttribute("data-lg-resizing", "1");

      const onMove = (moveEvent: globalThis.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const delta =
          side === "right"
            ? drag.startX - moveEvent.clientX
            : moveEvent.clientX - drag.startX;
        const next = clampWidth(drag.startWidth + delta, minWidth, maxWidth);
        drag.lastWidth = next;
        setWidth(next);
      };

      const onUp = () => {
        const finalWidth = dragRef.current?.lastWidth ?? width;
        saveWidth(widthKey, finalWidth);
        dragRef.current = null;
        setDragging(false);
        document.body.removeAttribute("data-lg-resizing");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [collapsed, maxWidth, minWidth, side, width, widthKey],
  );

  const onResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const step = event.shiftKey ? 48 : 16;
      if (event.key === "Home") {
        event.preventDefault();
        commitWidth(minWidth);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        commitWidth(maxWidth);
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      const expand =
        (side === "left" && event.key === "ArrowRight") ||
        (side === "right" && event.key === "ArrowLeft");
      commitWidth(width + (expand ? step : -step));
    },
    [commitWidth, maxWidth, minWidth, side, width],
  );

  const Icon = side === "right" ? ChevronR : ChevronL;
  const OpenIcon = side === "right" ? ChevronL : ChevronR;
  const panelWidth = collapsed ? COLLAPSED_PANEL_WIDTH : width;
  const bindPanelRef = useCallback(
    (node: HTMLElement | null) => {
      panelRef.current = node;
      node?.style.setProperty("--lg-ide-panel-width", `${panelWidth}px`);
    },
    [panelWidth],
  );

  useEffect(() => {
    panelRef.current?.style.setProperty("--lg-ide-panel-width", `${panelWidth}px`);
  }, [panelWidth]);

  const visibleCollapsedSummary = collapsedSummary.slice(0, 3);
  const collapsedSummaryLabel = visibleCollapsedSummary
    .map((item) => `${item.label} ${item.value}`)
    .join(", ");
  const collapsedTitle = collapsedSummaryLabel
    ? `${ariaLabel} 펼치기 · ${collapsedSummaryLabel}`
    : `${ariaLabel} 펼치기`;
  const renderCollapsedSummary = () =>
    visibleCollapsedSummary.length > 0 ? (
      <span className="lg-ide-strip-summary" aria-label={collapsedSummaryLabel}>
        {visibleCollapsedSummary.map((item) => (
          <span key={`${item.label}:${item.value}`} className={`lg-ide-strip-chip ${item.tone ?? "gray"}`}>
            <small>{item.label}</small>
            <b>{item.value}</b>
          </span>
        ))}
      </span>
    ) : null;

  if (isNarrow) {
    return (
      <Fragment>
        <aside
          className={`${className} lg-ide-panel lg-ide-panel-${side} is-collapsed is-mobile-trigger`}
          aria-label={`${ariaLabel} 모바일 열기`}
        >
          <button
            type="button"
            className="lg-ide-strip-btn"
            aria-expanded={mobileOpen}
            aria-controls={panelId}
            aria-label={`${ariaLabel} 열기`}
            title={collapsedSummaryLabel ? `${ariaLabel} 열기 · ${collapsedSummaryLabel}` : `${ariaLabel} 열기`}
            onClick={() => setMobileOpen(true)}
          >
            <OpenIcon size={16} aria-hidden="true" />
          </button>
          <span className="lg-ide-vlabel" aria-hidden="true">
            {stripLabel}
          </span>
          {renderCollapsedSummary()}
        </aside>
        {mobileOpen ? (
          <Fragment>
            <button
              type="button"
              className="lg-ide-sheet-backdrop"
              aria-label={`${ariaLabel} 닫기`}
              onClick={() => setMobileOpen(false)}
            />
            <aside
              id={panelId}
              className={`${className} lg-ide-panel lg-ide-panel-${side} lg-ide-mobile-sheet`}
              aria-label={ariaLabel}
              aria-modal="true"
              role="dialog"
            >
              <div className="lg-ide-sheet-head">
                <span className="lg-ide-sheet-handle" aria-hidden="true" />
                <strong>{ariaLabel}</strong>
                <button
                  type="button"
                  className="lg-ide-sheet-close"
                  aria-label={`${ariaLabel} 닫기`}
                  title={`${ariaLabel} 닫기`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={16} aria-hidden="true" />
                </button>
              </div>
              {children}
            </aside>
          </Fragment>
        ) : null}
      </Fragment>
    );
  }

  if (collapsed) {
    return (
      <aside
        id={panelId}
        ref={bindPanelRef}
        className={`${className} lg-ide-panel lg-ide-panel-${side} is-collapsed`}
        aria-label={`${ariaLabel} 접힘`}
      >
        <button
          type="button"
          className="lg-ide-strip-btn"
          aria-expanded={false}
          aria-controls={panelId}
          aria-label={`${ariaLabel} 펼치기`}
          title={collapsedTitle}
          onClick={toggleCollapsed}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
        <span className="lg-ide-vlabel" aria-hidden="true">
          {stripLabel}
        </span>
        {renderCollapsedSummary()}
      </aside>
    );
  }

  return (
    <aside
      id={panelId}
      ref={bindPanelRef}
      className={`${className} lg-ide-panel lg-ide-panel-${side}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="lg-ide-collapse"
        aria-expanded={true}
        aria-controls={panelId}
        aria-label={`${ariaLabel} 접기`}
        title={`${ariaLabel} 접기`}
        onClick={toggleCollapsed}
      >
        <Icon size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`lg-ide-grip ${side}`}
        role="separator"
        aria-label={`${ariaLabel} 폭 조절`}
        aria-orientation="vertical"
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={width}
        data-dragging={dragging ? "1" : "0"}
        onPointerDown={onPointerDown}
        onKeyDown={onResizeKeyDown}
      />
      {children}
    </aside>
  );
}
