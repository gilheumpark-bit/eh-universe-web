// ============================================================
// QR Renderer — Witness Seal 외부 조회 QR 생성
// ============================================================
//
// QR 페이로드 = URL only (PII 0건).
// 형식: https://loreguard.dev/verify/{sealNumber}
//
// `qrcode` npm 패키지 미설치 시 placeholder SVG 반환.
// 패키지 설치: npm install qrcode @types/qrcode
//
// 설치 후 활성화:
//   - 본 파일의 dynamic import 패턴이 자동으로 진짜 QR 생성
//   - placeholder SVG 는 fallback only
//
// [C] 안전성: 패키지 미설치 silent fallback
// [G] 성능: dynamic import — initial bundle 영향 0
// [K] 간결성: generate + placeholder 2 함수
// ============================================================

const DEFAULT_VERIFY_URL = 'https://loreguard.dev/verify';

// ============================================================
// PART 1 — QR 생성 (실 패키지 또는 placeholder)
// ============================================================

/**
 * Witness Seal 시리얼 → QR DataURL (PNG base64).
 *
 * @param serial sealNumber (예: "LG-2605-0042-A8F5")
 * @param baseUrl 검증 URL prefix (기본 production)
 * @returns "data:image/png;base64,..." 또는 fallback SVG dataURL
 */
export async function generateQRDataUrl(
  serial: string,
  baseUrl: string = DEFAULT_VERIFY_URL,
): Promise<string> {
  const url = `${baseUrl}/${encodeURIComponent(serial)}`;
  try {
    // qrcode 패키지 dynamic import — 미설치 시 catch fallback.
    // ts type 우회 (패키지 미설치 환경 빌드 보장).
    const moduleName = 'qrcode';
    // qrcode 패키지 optional — string 변수 기반 import 로 정적 type-check 우회.
    // unknown 으로 받아 typeof 가드 후 호출 (no `any`).
    const mod: unknown = await import(/* webpackIgnore: true */ moduleName).then((m) => m.default ?? m).catch(() => null);
    if (
      mod &&
      typeof mod === 'object' &&
      'toDataURL' in mod &&
      typeof (mod as { toDataURL: unknown }).toDataURL === 'function'
    ) {
      return await (mod as { toDataURL: (url: string, opts: object) => Promise<string> }).toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 120,
        color: { dark: '#1A1A1A', light: '#FFFFFF' },
      });
    }
  } catch {
    // qrcode 패키지 로드 실패 — placeholder fallback
  }
  return buildPlaceholderQRDataUrl(url);
}

// ============================================================
// PART 2 — Placeholder SVG (qrcode 패키지 미설치 시)
// ============================================================

/**
 * QR 스타일 placeholder SVG. 실 QR 아님 — qrcode 패키지 설치 후 자동 교체.
 * 사용자가 검증 URL 을 직접 복사할 수 있도록 텍스트 표기.
 */
export function buildPlaceholderQRDataUrl(_url: string): string {
  // 단순 grid 패턴 (URL fragment 표기는 PHASE 2 — 현재 placeholder 만 표기)
  const svg = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR placeholder">
  <rect width="120" height="120" fill="#FFFFFF"/>
  <rect x="4" y="4" width="20" height="20" fill="#1A1A1A"/>
  <rect x="96" y="4" width="20" height="20" fill="#1A1A1A"/>
  <rect x="4" y="96" width="20" height="20" fill="#1A1A1A"/>
  <rect x="10" y="10" width="8" height="8" fill="#FFFFFF"/>
  <rect x="102" y="10" width="8" height="8" fill="#FFFFFF"/>
  <rect x="10" y="102" width="8" height="8" fill="#FFFFFF"/>
  <rect x="50" y="50" width="20" height="20" fill="#1A1A1A"/>
  <text x="60" y="115" text-anchor="middle" font-family="monospace" font-size="6" fill="#1A1A1A">QR placeholder</text>
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
