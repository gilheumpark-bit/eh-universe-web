// ============================================================
// QR Renderer — Witness Seal 외부 조회 QR 생성
// ============================================================
//
// QR 페이로드 = URL only (PII 0건).
// 형식: https://loreguard.dev/verify/{sealNumber}
//
// 정상 경로는 `qrcode` 패키지로 실제 QR 이미지를 생성한다.
// 패키지 로드가 실패하는 예외 상황에만 직접 입력 가능한 검증 링크 카드를 반환한다.
//
// [C] 안전성: QR 생성 실패 시에도 검증 URL 자체는 잃지 않는다.
// [G] 성능: dynamic import — initial bundle 영향 0
// [K] 간결성: generate + fallback 2 함수
// ============================================================

const DEFAULT_VERIFY_URL = 'https://loreguard.dev/verify';

// ============================================================
// PART 1 — QR 생성
// ============================================================

/**
 * Witness Seal 시리얼 → QR DataURL (PNG base64).
 *
 * @param serial sealNumber (예: "LG-2605-0042-A8F5")
 * @param baseUrl 검증 URL prefix (기본 production)
 * @returns "data:image/png;base64,..." 또는 검증 링크 fallback SVG dataURL
 */
export async function generateQRDataUrl(
  serial: string,
  baseUrl: string = DEFAULT_VERIFY_URL,
): Promise<string> {
  const url = `${baseUrl}/${encodeURIComponent(serial)}`;
  try {
    const qrcode = await import('qrcode');
    return await qrcode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 120,
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    });
  } catch {
    // QR 생성 실패 — 검증 URL fallback
  }
  return buildPlaceholderQRDataUrl(url);
}

// ============================================================
// PART 2 — 검증 링크 fallback SVG
// ============================================================

/**
 * QR 생성 실패 시 노출되는 fallback SVG.
 * 스캔 가능 QR처럼 오해되지 않도록 검증 링크 카드로 표시한다.
 */
export function buildPlaceholderQRDataUrl(url: string): string {
  const safeUrl = url.replace(/[<>&"']/g, (ch) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch] ?? ch));
  const svg = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verification link fallback">
  <rect width="120" height="120" fill="#FFFFFF"/>
  <rect x="4" y="4" width="112" height="112" rx="10" fill="#F8FAFC" stroke="#1A1A1A" stroke-width="2"/>
  <path d="M28 37h64M28 52h64M28 67h42" stroke="#1A1A1A" stroke-width="4" stroke-linecap="round"/>
  <text x="60" y="91" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#1A1A1A">VERIFY LINK</text>
  <title>${safeUrl}</title>
</svg>`;
  // SVG → data URL (base64 회피, URL encode)
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

// ============================================================
// PART 3 — Verify URL 빌더 (직접 사용)
// ============================================================

export function buildVerifyUrl(serial: string, baseUrl: string = DEFAULT_VERIFY_URL): string {
  return `${baseUrl}/${encodeURIComponent(serial)}`;
}
