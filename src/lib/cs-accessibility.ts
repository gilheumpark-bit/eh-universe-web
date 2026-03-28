// ============================================================
// Accessibility — ARIA helpers, focus management, zoom
// ============================================================

// ── Zoom Control ──

const ZOOM_KEY = "csl_zoom_level";
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export function getZoomLevel(): number {
  if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem(ZOOM_KEY);
  return stored ? parseFloat(stored) : 1;
}

export function setZoomLevel(level: number): void {
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
  localStorage.setItem(ZOOM_KEY, String(clamped));
  document.documentElement.style.fontSize = `${clamped * 16}px`;
}

export function zoomIn(): void { setZoomLevel(getZoomLevel() + ZOOM_STEP); }
export function zoomOut(): void { setZoomLevel(getZoomLevel() - ZOOM_STEP); }
export function zoomReset(): void { setZoomLevel(1); }

export function initZoom(): void {
  const level = getZoomLevel();
  if (level !== 1) document.documentElement.style.fontSize = `${level * 16}px`;
}

// ── Focus Management ──

export function focusElement(selector: string): void {
  const el = document.querySelector<HTMLElement>(selector);
  el?.focus();
}

export function trapFocus(container: HTMLElement): () => void {
  const focusables = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  const handler = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  };

  container.addEventListener("keydown", handler);
  first?.focus();

  return () => container.removeEventListener("keydown", handler);
}

// ── ARIA Live Region ──

let liveRegion: HTMLElement | null = null;

export function announce(message: string, priority: "polite" | "assertive" = "polite"): void {
  if (typeof document === "undefined") return;

  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", priority);
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    liveRegion.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
    document.body.appendChild(liveRegion);
  }

  liveRegion.setAttribute("aria-live", priority);
  liveRegion.textContent = "";
  requestAnimationFrame(() => { if (liveRegion) liveRegion.textContent = message; });
}

// ── Reduced Motion ──

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ── High Contrast ──

export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(forced-colors: active)").matches;
}
