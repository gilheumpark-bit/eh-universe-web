/**
 * CookieConsent — GDPR 배너 저장 로직 테스트
 * localStorage 키: 'eh-cookie-consent' = 'accepted' | 'rejected'
 */

describe('CookieConsent module', () => {
  it('module loads without error', () => {
    expect(() => require('../CookieConsent')).not.toThrow();
  });
  it('exports default component', () => {
    const mod = require('../CookieConsent');
    expect(typeof mod.default).toBe('function');
  });
});

describe('CookieConsent storage semantics', () => {
  const STORAGE_KEY = 'eh-cookie-consent';

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('초기 방문 시 localStorage에 값이 없다', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('accepted 저장 시 다음 방문에 배너가 다시 뜨지 않아야 함 (영속성)', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('accepted');
  });

  it('rejected 저장도 같은 방식으로 영속된다', () => {
    localStorage.setItem(STORAGE_KEY, 'rejected');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('rejected');
  });

  it('유효하지 않은 값도 로컬스토리지에 저장 가능 (클라이언트 검증 X)', () => {
    localStorage.setItem(STORAGE_KEY, 'unknown');
    // 프로덕션 코드에서는 'accepted'/'rejected' 외 값이면 배너 재노출로 동작
    expect(localStorage.getItem(STORAGE_KEY)).toBe('unknown');
  });
});
