// ============================================================
// Responsive Utilities — 320px ~ 4K 완전 대응
// ============================================================

/** 디바이스 타입 감지 */
export type DeviceType = 'mobile-small' | 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w <= 375) return 'mobile-small';
  if (w <= 768) return 'mobile';
  if (w <= 1024) return 'tablet';
  if (w <= 2560) return 'desktop';
  return 'ultrawide';
}

/** DPR(Device Pixel Ratio) 기반 이미지 URL 선택 */
export function getOptimalImageSrc(baseSrc: string, widths: number[] = [320, 640, 1280, 1920]): {
  src: string;
  srcSet: string;
  sizes: string;
} {
  const ext = baseSrc.split('.').pop() || 'jpg';
  const base = baseSrc.replace(`.${ext}`, '');

  const srcSet = widths.map(w => `${base}-${w}w.webp ${w}w`).join(', ');
  const sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw';

  return { src: baseSrc, srcSet, sizes };
}

/** 고해상도 캔버스 설정 (Retina 대응) */
export function setupHiDPICanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
  return ctx;
}

/** 현재 실제 뷰포트 크기 (키보드, 주소창 제외) */
export function getVisualViewport(): { width: number; height: number } {
  if (typeof visualViewport !== 'undefined') {
    return { width: visualViewport.width, height: visualViewport.height };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

/** 인쇄 시 미리보기 호출 */
export function printContent(elementId?: string): void {
  if (elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Print</title>
      <style>body{font-family:serif;line-height:1.8;max-width:700px;margin:0 auto;padding:2cm;}
      h1,h2,h3{font-family:sans-serif;}@page{margin:2cm;}</style></head>
      <body>${el.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  } else {
    window.print();
  }
}
