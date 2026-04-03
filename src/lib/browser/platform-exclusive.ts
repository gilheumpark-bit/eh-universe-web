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
  if (!(window as any).launchQueue) return [];
  const files: LaunchedFile[] = [];
  (window as any).launchQueue.setConsumer(async (launchParams: { files: FileSystemFileHandle[] }) => {
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
  return typeof window !== 'undefined' && !!(window as any).launchQueue;
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
  const overlay = (navigator as any).windowControlsOverlay;
  if (!overlay) return { x: 0, y: 0, width: 0, height: 0, visible: false };
  const rect = overlay.getTitlebarAreaRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: overlay.visible };
}

/** 타이틀바 오버레이 지원 여부 */
export function supportsWindowControlsOverlay(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).windowControlsOverlay;
}

/** 타이틀바 변경 리스너 */
export function onTitleBarChange(callback: (area: TitleBarArea) => void): () => void {
  const overlay = (navigator as any).windowControlsOverlay;
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
  if (!(window as any).documentPictureInPicture) return null;
  try {
    const pipWindow = await (window as any).documentPictureInPicture.requestWindow({ width, height });
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
  return typeof window !== 'undefined' && !!(window as any).documentPictureInPicture;
}

// ── 4. Compute Pressure API (Chrome) ──
// CPU/GPU 부하 감지 → 배치 작업 스로틀

export type PressureState = 'nominal' | 'fair' | 'serious' | 'critical';

/** CPU 부하 감시 시작 */
export function observeComputePressure(
  callback: (state: PressureState) => void,
  sampleInterval: number = 2000,
): (() => void) | null {
  if (typeof (globalThis as any).PressureObserver === 'undefined') return null;
  try {
    const observer = new (globalThis as any).PressureObserver((records: Array<{ state: PressureState }>) => {
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
  if (!(window as any).getScreenDetails) return [{ label: 'Primary', left: 0, top: 0, width: screen.width, height: screen.height, isPrimary: true }];
  try {
    const details = await (window as any).getScreenDetails();
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
  if (!(navigator as any).ink) return null;
  try {
    return await (navigator as any).ink.requestPresenter({ presentationArea: canvas });
  } catch {
    return null;
  }
}

/** Ink API 지원 여부 */
export function supportsInk(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).ink;
}

// ── Capability Summary ──

export function getPlatformCapabilities() {
  return {
    fileHandling: supportsFileHandling(),
    windowControlsOverlay: supportsWindowControlsOverlay(),
    documentPiP: supportsDocumentPiP(),
    computePressure: typeof (globalThis as any).PressureObserver !== 'undefined',
    multiScreen: typeof window !== 'undefined' && !!(window as any).getScreenDetails,
    ink: supportsInk(),
  };
}
