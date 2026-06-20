// ============================================================
// [P13 루프2/Senior, 2026-06-08] csrf.ts double-submit cookie 검증 테스트.
//   기존: 84줄 모듈, 테스트 0건. timing attack regression 위험.
//   목표: timingSafeEqual 사용 확인 + length mismatch early return 검증.
// ============================================================

import { generateCsrfToken, verifyCsrf, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

interface FakeCookies {
  get: (k: string) => { value: string } | undefined;
}

function makeReq(opts: { cookie?: string; header?: string }): {
  cookies: FakeCookies;
  headers: Headers;
} {
  return {
    cookies: {
      get: (k: string) => (k === CSRF_COOKIE_NAME && opts.cookie !== undefined ? { value: opts.cookie } : undefined),
    },
    headers: new Headers(opts.header !== undefined ? { [CSRF_HEADER_NAME]: opts.header } : {}),
  };
}

describe('csrf · generateCsrfToken', () => {
  it('base64url 형식 — URL-safe 만 사용', () => {
    const t = generateCsrfToken();
    // base64url: A-Z a-z 0-9 - _
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('충분한 길이 (≥40 chars from 32 bytes)', () => {
    const t = generateCsrfToken();
    expect(t.length).toBeGreaterThanOrEqual(40);
  });
  it('호출마다 다른 토큰 (CSPRNG)', () => {
    const s = new Set<string>();
    for (let i = 0; i < 100; i++) s.add(generateCsrfToken());
    expect(s.size).toBe(100);
  });
});

describe('csrf · verifyCsrf', () => {
  it('쿠키 + 헤더 일치 → true', () => {
    const t = generateCsrfToken();
    const req = makeReq({ cookie: t, header: t });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyCsrf(req as any)).toBe(true);
  });
  it('쿠키만 있고 헤더 없음 → false', () => {
    const t = generateCsrfToken();
    const req = makeReq({ cookie: t });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyCsrf(req as any)).toBe(false);
  });
  it('헤더만 있고 쿠키 없음 → false', () => {
    const t = generateCsrfToken();
    const req = makeReq({ header: t });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyCsrf(req as any)).toBe(false);
  });
  it('서로 다른 값 → false', () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    const req = makeReq({ cookie: a, header: b });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyCsrf(req as any)).toBe(false);
  });
  it('길이 다른 값 → 조기 false (timing-safe early return)', () => {
    const req = makeReq({ cookie: 'short', header: 'much-longer-value' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyCsrf(req as any)).toBe(false);
  });
  it('빈 문자열 쿠키 + 빈 문자열 헤더 → false (둘 다 falsy)', () => {
    const req = makeReq({ cookie: '', header: '' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyCsrf(req as any)).toBe(false);
  });
});
