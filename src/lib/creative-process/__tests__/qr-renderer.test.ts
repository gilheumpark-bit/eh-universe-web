/**
 * qr-renderer.test.ts (2026-05-10 — Visual Charter v1.0)
 */

import {
  generateQRDataUrl,
  buildPlaceholderQRDataUrl,
  buildVerifyUrl,
} from '../qr-renderer';

describe('qr-renderer — buildVerifyUrl', () => {
  it('default base url', () => {
    const url = buildVerifyUrl('LG-2605-0042-A8F5');
    expect(url).toBe('https://loreguard.dev/verify/LG-2605-0042-A8F5');
  });

  it('custom base url', () => {
    const url = buildVerifyUrl('LG-2605-0001-FFFF', 'https://staging.loreguard.dev/v');
    expect(url).toBe('https://staging.loreguard.dev/v/LG-2605-0001-FFFF');
  });

  it('serial encodeURIComponent 적용', () => {
    const url = buildVerifyUrl('LG/2605');
    expect(url).toContain('LG%2F2605');
  });
});

describe('qr-renderer — buildPlaceholderQRDataUrl', () => {
  it('SVG data URL 형식', () => {
    const dataUrl = buildPlaceholderQRDataUrl('https://test.example/verify/A');
    expect(dataUrl.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('encoded svg 안에 viewBox 120×120', () => {
    const dataUrl = buildPlaceholderQRDataUrl('https://test.example');
    const decoded = decodeURIComponent(dataUrl.split(',')[1]);
    expect(decoded).toContain('viewBox="0 0 120 120"');
  });

  it('placeholder 라는 텍스트 포함', () => {
    const dataUrl = buildPlaceholderQRDataUrl('https://test.example');
    const decoded = decodeURIComponent(dataUrl.split(',')[1]);
    expect(decoded.toLowerCase()).toContain('placeholder');
  });
});

describe('qr-renderer — generateQRDataUrl', () => {
  it('qrcode 패키지 미설치 시 placeholder fallback', async () => {
    const dataUrl = await generateQRDataUrl('LG-2605-0001-AAAA');
    // 패키지 미설치 환경 → placeholder SVG
    // 패키지 설치 시 → PNG base64
    expect(dataUrl.startsWith('data:image/')).toBe(true);
  });

  it('실패 시 placeholder 안전 fallback (throw X)', async () => {
    await expect(
      generateQRDataUrl('LG-NOT-A-VALID-SEAL'),
    ).resolves.toBeTruthy();
  });
});
