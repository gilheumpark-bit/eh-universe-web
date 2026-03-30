// ============================================================
// Code Studio — Responsive
// ============================================================
// 브레이크포인트 감지, 모바일/태블릿/데스크톱 플래그, 리사이즈 리스너.

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

const BREAKPOINTS = { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 } as const;

/** Determine current breakpoint from width */
export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/** Get full responsive state */
export function getResponsiveState(): ResponsiveState {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const height = typeof window !== 'undefined' ? window.innerHeight : 800;
  const bp = getBreakpoint(width);
  return {
    breakpoint: bp,
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop' || bp === 'wide',
    width,
    height,
  };
}

/** Listen for resize changes with debounce */
export function onResize(callback: (state: ResponsiveState) => void, debounceMs = 150): () => void {
  if (typeof window === 'undefined') return () => {};

  let timer: ReturnType<typeof setTimeout>;
  const handler = () => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(getResponsiveState()), debounceMs);
  };

  window.addEventListener('resize', handler);
  return () => {
    clearTimeout(timer);
    window.removeEventListener('resize', handler);
  };
}

// IDENTITY_SEAL: role=Responsive | inputs=width | outputs=ResponsiveState,Breakpoint
