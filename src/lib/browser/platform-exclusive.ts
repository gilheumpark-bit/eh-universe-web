// ============================================================
// Platform-Exclusive APIs — 브라우저별 특화 기능
// ============================================================
// Chrome: File Handling, Window Controls Overlay, DocumentPiP, Compute Pressure, Ink
// All: Multi-Screen (Chrome lead)
// 미지원 브라우저: graceful fallback

// ── 1. File Handling API (Chrome PWA) ──
// PWA를 .md, .txt, .json, .xliff 등의 기본 앱으로 등록
// manifest.json에 "file_handlers" 추가 필요

export interface LaunchedFile {
  name: string;
  type: string;
  content: string;
}

/** PWA 파일 핸들링으로 열린 파일 수신 */
export async function consumeLaunchQueue(): Promise<LaunchedFile[]> {
  // @ts-expect-error — launchQueue is Chrome PWA only
  if (!window.launchQueue) return [];
  const files: LaunchedFile[] = [];
  // @ts-expect-error
  window.launchQueue.setConsumer(async (launchParams: { files: FileSystemFileHandle[] }) => {
    for (const handle of launchParams.files) {
      const file = await handle.getFile();
      const content = await file.text();
      files.push({ name: file.name, type: file.type, content });
    }
  });
  return files;
}

/** 파일 핸들러 등록 가능 여부 */
export function supportsFileHandling(): boolean {
  // @ts-expect-error
  return typeof window !== 'undefined' && !!window.launchQueue;
}

// ── 2. Window Controls Overlay (Chrome PWA) ──
// PWA 타이틀바를 커스텀 UI로 대체

export interface TitleBarArea {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

/** 타이틀바 오버레이 영역 가져오기 */
export function getTitleBarArea(): TitleBarArea {
  // @ts-expect-error
  const overlay = navigator.windowControlsOverlay;
  if (!overlay) return { x: 0, y: 0, width: 0, height: 0, visible: false };
  const rect = overlay.getTitlebarAreaRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: overlay.visible };
}

/** 타이틀바 오버레이 지원 여부 */
export function supportsWindowControlsOverlay(): boolean {
  // @ts-expect-error
  return typeof navigator !== 'undefined' && !!navigator.windowControlsOverlay;
}

/** 타이틀바 변경 리스너 */
export function onTitleBarChange(callback: (area: TitleBarArea) => void): () => void {
  // @ts-expect-error
  const overlay = navigator.windowControlsOverlay;
  if (!overlay) return () => {};
  const handler = () => callback(getTitleBarArea());
  overlay.addEventListener('geometrychange', handler);
  return () => overlay.removeEventListener('geometrychange', handler);
}

// ── 3. Document Picture-in-Picture (Chrome) ──
// 아무 DOM 요소를 떠있는 미니 창으로

export interface PiPWindow {
  window: Window;
  close: () => void;
}

/** DOM 요소를 PiP 창으로 분리 */
export async function openDocumentPiP(width: number = 400, height: number = 300): Promise<PiPWindow | null> {
  // @ts-expect-error — documentPictureInPicture is Chrome-only
  if (!window.documentPictureInPicture) return null;
  try {
    // @ts-expect-error
    const pipWindow = await window.documentPictureInPicture.requestWindow({ width, height });
    // 기본 스타일 복사
    for (const styleSheet of document.styleSheets) {
      try {
        const css = Array.from(styleSheet.cssRules).map(r => r.cssText).join('\n');
        const style = pipWindow.document.createElement('style');
        style.textContent = css;
        pipWindow.document.head.appendChild(style);
      } catch { /* cross-origin stylesheet */ }
    }
    return {
      window: pipWindow,
      close: () => pipWindow.close(),
    };
  } catch {
    return null;
  }
}

/** Document PiP 지원 여부 */
export function supportsDocumentPiP(): boolean {
  // @ts-expect-error
  return typeof window !== 'undefined' && !!window.documentPictureInPicture;
}

// ── 4. Compute Pressure API (Chrome) ──
// CPU/GPU 부하 감지 → 배치 작업 스로틀

export type PressureState = 'nominal' | 'fair' | 'serious' | 'critical';

/** CPU 부하 감시 시작 */
export function observeComputePressure(
  callback: (state: PressureState) => void,
  sampleInterval: number = 2000,
): (() => void) | null {
  // @ts-expect-error — PressureObserver is Chrome-only
  if (typeof PressureObserver === 'undefined') return null;
  try {
    // @ts-expect-error
    const observer = new PressureObserver((records: Array<{ state: PressureState }>) => {
      const latest = records[records.length - 1];
      if (latest) callback(latest.state);
    }, { sampleInterval });
    observer.observe('cpu');
    return () => observer.disconnect();
  } catch {
    return null;
  }
}

// ── 5. Multi-Screen Window Placement (Chrome) ──
// 듀얼 모니터 레이아웃

export interface ScreenInfo {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
}

/** 연결된 모든 화면 정보 */
export async function getScreens(): Promise<ScreenInfo[]> {
  // @ts-expect-error — getScreenDetails is Chrome-only
  if (!window.getScreenDetails) return [{ label: 'Primary', left: 0, top: 0, width: screen.width, height: screen.height, isPrimary: true }];
  try {
    // @ts-expect-error
    const details = await window.getScreenDetails();
    return details.screens.map((s: { label: string; left: number; top: number; width: number; height: number; isPrimary: boolean }) => ({
      label: s.label, left: s.left, top: s.top, width: s.width, height: s.height, isPrimary: s.isPrimary,
    }));
  } catch {
    return [{ label: 'Primary', left: 0, top: 0, width: screen.width, height: screen.height, isPrimary: true }];
  }
}

/** 듀얼 모니터 여부 */
export async function isMultiScreen(): Promise<boolean> {
  const screens = await getScreens();
  return screens.length > 1;
}

// ── 6. Ink API (Chrome — 저지연 펜 입력) ──

/** 저지연 펜 입력 활성화 (Canvas용) */
export async function requestInkPresenter(canvas: HTMLCanvasElement): Promise<unknown | null> {
  // @ts-expect-error — Ink API
  if (!navigator.ink) return null;
  try {
    // @ts-expect-error
    return await navigator.ink.requestPresenter({ presentationArea: canvas });
  } catch {
    return null;
  }
}

/** Ink API 지원 여부 */
export function supportsInk(): boolean {
  // @ts-expect-error
  return typeof navigator !== 'undefined' && !!navigator.ink;
}

// ── Capability Summary ──

export function getPlatformCapabilities() {
  return {
    fileHandling: supportsFileHandling(),
    windowControlsOverlay: supportsWindowControlsOverlay(),
    documentPiP: supportsDocumentPiP(),
    // @ts-expect-error
    computePressure: typeof PressureObserver !== 'undefined',
    // @ts-expect-error
    multiScreen: typeof window !== 'undefined' && !!window.getScreenDetails,
    ink: supportsInk(),
  };
}
