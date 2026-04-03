// ============================================================
// Advanced Browser APIs — 5대 브라우저 최대 활용
// ============================================================
// Chrome/Edge: Shape Detection, Local Font, EyeDropper
// All: Screen Capture, Speculation Rules
// 미지원 브라우저: graceful fallback (에러 없이 비활성)

// ── 1. Shape Detection API (OCR — 이미지→텍스트) ──

export interface OCRResult {
  text: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

/** 이미지에서 텍스트 추출 (Chromium only) */
export async function detectTextFromImage(imageSource: ImageBitmapSource): Promise<OCRResult[]> {
  // @ts-ignore
  if (typeof TextDetector === 'undefined') return [];
  try {
    // @ts-ignore
    const detector = new TextDetector();
    const results = await detector.detect(imageSource);
    return results.map((r: { rawValue: string; boundingBox: DOMRectReadOnly }) => ({
      text: r.rawValue,
      boundingBox: { x: r.boundingBox.x, y: r.boundingBox.y, width: r.boundingBox.width, height: r.boundingBox.height },
      confidence: 1,
    }));
  } catch {
    return [];
  }
}

/** 바코드/QR 감지 */
export async function detectBarcode(imageSource: ImageBitmapSource): Promise<string[]> {
  // @ts-ignore
  if (typeof BarcodeDetector === 'undefined') return [];
  try {
    // @ts-ignore
    const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128'] });
    const results = await detector.detect(imageSource);
    return results.map((r: { rawValue: string }) => r.rawValue);
  } catch {
    return [];
  }
}

// ── 2. Local Font Access API (시스템 폰트 목록) ──

export interface LocalFont {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

/** 시스템에 설치된 폰트 목록 조회 (Chromium only, 권한 필요) */
export async function getLocalFonts(): Promise<LocalFont[]> {
  try {
    // @ts-ignore
    if (!window.queryLocalFonts) return [];
    // @ts-ignore
    const fonts = await window.queryLocalFonts();
    const seen = new Set<string>();
    const result: LocalFont[] = [];
    for (const font of fonts) {
      if (seen.has(font.family)) continue;
      seen.add(font.family);
      result.push({
        family: font.family,
        fullName: font.fullName,
        postscriptName: font.postscriptName,
        style: font.style,
      });
    }
    return result.sort((a, b) => a.family.localeCompare(b.family));
  } catch {
    return [];
  }
}

// ── 3. EyeDropper API (화면 색상 추출) ──

/** 화면에서 색상 추출 (Chromium only) */
export async function pickColorFromScreen(): Promise<string | null> {
  // @ts-ignore
  if (typeof EyeDropper === 'undefined') return null;
  try {
    // @ts-ignore
    const dropper = new EyeDropper();
    const result = await dropper.open();
    return result.sRGBHex;
  } catch {
    return null; // 사용자가 ESC로 취소
  }
}

// ── 4. Screen Capture API (화면 녹화) ──

export interface ScreenRecording {
  blob: Blob;
  url: string;
  duration: number;
}

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingStartTime = 0;

/** 화면 녹화 시작 */
export async function startScreenRecording(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
    });

    recordedChunks = [];
    recordingStartTime = Date.now();

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.start(1000); // 1초마다 chunk
    return true;
  } catch {
    return false;
  }
}

/** 화면 녹화 중지 + 결과 반환 */
export function stopScreenRecording(): Promise<ScreenRecording | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const duration = Date.now() - recordingStartTime;

      // 스트림 트랙 정리
      mediaRecorder?.stream.getTracks().forEach(t => t.stop());
      mediaRecorder = null;
      recordedChunks = [];

      resolve({ blob, url, duration });
    };

    mediaRecorder.stop();
  });
}

/** 녹화 중인지 */
export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

// ── 5. Speculation Rules (페이지 사전 렌더링) ──

/** 자주 이동하는 경로를 사전 렌더링 힌트로 등록 */
export function addSpeculationRules(urls: string[]): void {
  if (!HTMLScriptElement.supports?.('speculationrules')) return;

  // 기존 규칙 제거
  const existing = document.querySelector('script[type="speculationrules"][data-eh]');
  if (existing) existing.remove();

  const rules = {
    prerender: [{
      urls,
      eagerness: 'moderate' as const,
    }],
  };

  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.dataset.eh = '1';
  script.textContent = JSON.stringify(rules);
  document.head.appendChild(script);
}

/** 스튜디오 경로 기본 사전 렌더링 */
export function preloadStudioRoutes(): void {
  addSpeculationRules([
    '/studio',
    '/code-studio',
    '/translation-studio',
    '/archive',
  ]);
}

// ── Capability Detection ──

export function getBrowserCapabilities() {
  return {
    // @ts-ignore
    textDetection: typeof TextDetector !== 'undefined',
    // @ts-ignore
    barcodeDetection: typeof BarcodeDetector !== 'undefined',
    // @ts-ignore
    localFonts: typeof window !== 'undefined' && !!window.queryLocalFonts,
    // @ts-ignore
    eyeDropper: typeof EyeDropper !== 'undefined',
    screenCapture: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia,
    speculationRules: typeof HTMLScriptElement !== 'undefined' && !!HTMLScriptElement.supports?.('speculationrules'),
  };
}
