import { normalizePublicVerificationUrl } from '../public-verification-url';

describe('public-verification-url', () => {
  it('API 조회 주소를 공개 조회 화면 주소로 바꾼다', () => {
    expect(normalizePublicVerificationUrl('https://example.test/api/cp/verify/cert-1')).toBe(
      'https://example.test/verify/cert-1',
    );
  });

  it('query와 hash가 붙은 API 주소도 공개 조회 화면 주소로 정리한다', () => {
    expect(normalizePublicVerificationUrl('https://example.test/api/cp/verify/cert-2?lookup=true#x')).toBe(
      'https://example.test/verify/cert-2',
    );
  });

  it('상대 API 주소는 상대 공개 조회 주소로 정리한다', () => {
    expect(normalizePublicVerificationUrl('/api/cp/verify/cert-3?lookup=true')).toBe('/verify/cert-3');
  });

  it('이미 공개 조회 주소이면 그대로 둔다', () => {
    expect(normalizePublicVerificationUrl('https://example.test/verify/cert-4')).toBe(
      'https://example.test/verify/cert-4',
    );
  });
});
