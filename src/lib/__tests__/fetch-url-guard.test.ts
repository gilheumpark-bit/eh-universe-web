// ============================================================
// [P13 루프2/Senior, 2026-06-08] fetch-url-guard SSRF 방어 테스트.
//   기존: 131줄 모듈, 테스트 0건. IPv6 / DNS rebinding regression 위험.
//   목표: RFC1918 + CGNAT + link-local + post-fetch validate 회귀 보호.
// ============================================================

import {
  assertResolvedHostAllowedForFetch,
  assertUrlAllowedForFetch,
  validatePostFetchUrl,
  rateLimitFetchUrl,
} from '@/lib/fetch-url-guard';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockedLookup = require('node:dns/promises').lookup as jest.Mock;

describe('fetch-url-guard · assertUrlAllowedForFetch (pre-fetch)', () => {
  it('public https URL → allowed', () => {
    const r = assertUrlAllowedForFetch('https://example.com/page');
    expect(r.ok).toBe(true);
  });
  it('http → allowed (proxy 패턴 대응)', () => {
    const r = assertUrlAllowedForFetch('http://example.com');
    expect(r.ok).toBe(true);
  });
  it('ftp:// → blocked', () => {
    const r = assertUrlAllowedForFetch('ftp://example.com');
    expect(r.ok).toBe(false);
  });
  it('file:// → blocked', () => {
    const r = assertUrlAllowedForFetch('file:///etc/passwd');
    expect(r.ok).toBe(false);
  });
  it('잘못된 URL → blocked', () => {
    const r = assertUrlAllowedForFetch('not a url');
    expect(r.ok).toBe(false);
  });
  it('localhost → blocked', () => {
    expect(assertUrlAllowedForFetch('http://localhost/').ok).toBe(false);
  });
  it('127.0.0.1 → blocked', () => {
    expect(assertUrlAllowedForFetch('http://127.0.0.1/').ok).toBe(false);
  });
  it('0.0.0.0 → blocked', () => {
    expect(assertUrlAllowedForFetch('http://0.0.0.0/').ok).toBe(false);
  });
  it('10.0.0.1 (RFC1918 class A) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://10.0.0.1/').ok).toBe(false);
  });
  it('172.16.0.1 (RFC1918 class B) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://172.16.0.1/').ok).toBe(false);
  });
  it('172.31.255.255 (RFC1918 class B 끝) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://172.31.255.255/').ok).toBe(false);
  });
  it('172.32.0.0 (RFC1918 범위 밖) → allowed', () => {
    expect(assertUrlAllowedForFetch('http://172.32.0.0/').ok).toBe(true);
  });
  it('192.168.1.1 (RFC1918 class C) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://192.168.1.1/').ok).toBe(false);
  });
  it('169.254.169.254 (link-local · cloud metadata) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://169.254.169.254/').ok).toBe(false);
  });
  it('100.64.0.1 (CGNAT RFC6598) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://100.64.0.1/').ok).toBe(false);
  });
  it('100.127.255.255 (CGNAT 끝) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://100.127.255.255/').ok).toBe(false);
  });
  it('100.128.0.0 (CGNAT 범위 밖) → allowed', () => {
    expect(assertUrlAllowedForFetch('http://100.128.0.0/').ok).toBe(true);
  });
  it('metadata.google.internal → blocked', () => {
    expect(assertUrlAllowedForFetch('http://metadata.google.internal/').ok).toBe(false);
  });
  it('[::1] (IPv6 loopback) → blocked', () => {
    expect(assertUrlAllowedForFetch('http://[::1]/').ok).toBe(false);
  });
});

describe('fetch-url-guard · validatePostFetchUrl (DNS rebinding)', () => {
  it('public URL → 통과', () => {
    expect(() => validatePostFetchUrl('https://example.com/page')).not.toThrow();
  });
  it('redirect → private IP → throw', () => {
    expect(() => validatePostFetchUrl('http://10.0.0.1/')).toThrow(/SSRF/);
  });
  it('redirect → 127.0.0.1 → throw', () => {
    expect(() => validatePostFetchUrl('http://127.0.0.1/')).toThrow(/SSRF/);
  });
  it('redirect → 169.254/16 link-local → throw', () => {
    expect(() => validatePostFetchUrl('http://169.254.169.254/metadata')).toThrow(/SSRF/);
  });
});

describe('fetch-url-guard · resolved DNS guard', () => {
  beforeEach(() => {
    mockedLookup.mockReset();
  });

  it('blocks public hostname when DNS resolves to a private address', async () => {
    mockedLookup.mockResolvedValue([{ address: '10.0.0.12', family: 4 }]);

    const result = await assertResolvedHostAllowedForFetch('https://example.com/story');

    expect(result.ok).toBe(false);
  });

  it('allows public hostname when DNS resolves to public addresses', async () => {
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

    const result = await assertResolvedHostAllowedForFetch('https://example.com/story');

    expect(result.ok).toBe(true);
  });
});

describe('fetch-url-guard · DNS rebinding (P12 루프3 — 2026-06-08)', () => {
  // 시나리오: 공인 IP 로 첫 resolve → fetch → redirect (Location) → 사설 IP.
  // validatePostFetchUrl 가 response.url 검증으로 차단.
  it('redirect to 192.168 → blocked', () => {
    expect(() => validatePostFetchUrl('https://192.168.1.10/secret')).toThrow(/SSRF/);
  });

  it('IPv6 사설 fc00::/7 (ULA) — bracketed form 도 차단 (W1-ssrf: hostname 정규화)', () => {
    // 이전: URL.hostname 이 '[fc00::1]' → /^fc00:/ 미매칭으로 통과 (SSRF gap).
    // 수정: normalizeHost 가 대괄호 제거 후 ULA 범위 차단. post-fetch 도 동일 정규화.
    expect(() => validatePostFetchUrl('http://[fc00::1]/')).toThrow(/SSRF/);
  });

  it('IPv6 loopback [::1] → blocked (현재 거동)', () => {
    // /^::1$/ 패턴은 [...] 포함 host 와 매칭 안 됨 — 그러나 assertUrlAllowedForFetch 가 별도 가드함.
    // post-fetch 의 ::1 차단은 pre-fetch 단계에서만 보장됨 (현재 정책).
    expect(assertUrlAllowedForFetch('http://[::1]/').ok).toBe(false);
  });

  it('redirect 시뮬: 동일 host 가 첫 resolve 공인 → 두 번째 사설 (every-request 재검증)', () => {
    // 핵심 정책: validatePostFetchUrl 는 매 응답에서 호출돼야 함.
    // 첫 요청 응답 url 이 공인이면 통과, 두 번째 응답 url 이 사설이면 throw.
    const firstResponseUrl = 'https://example.com/initial';
    const secondResponseUrl = 'http://10.0.0.5/internal'; // rebinding 시뮬
    expect(() => validatePostFetchUrl(firstResponseUrl)).not.toThrow();
    expect(() => validatePostFetchUrl(secondResponseUrl)).toThrow(/SSRF/);
  });

  it('pre-fetch + post-fetch 의 조합으로만 완전 방어 가능 (방어 명세)', () => {
    // 공인 도메인 → 통과
    expect(assertUrlAllowedForFetch('https://example.com').ok).toBe(true);
    // 동일 도메인이 DNS 변조로 redirect 되어 사설로 가면 post-fetch 가 잡아야 함.
    // (네트워크 stack 단에서 actual resolve 가 사설로 가도 final URL 검사로 일관.)
    expect(() => validatePostFetchUrl('http://127.0.0.1/leak')).toThrow(/SSRF/);
  });
});

describe('fetch-url-guard · IPv6 SSRF 우회 차단 (W1-ssrf — 2026-06-11)', () => {
  // pre-fetch: assertUrlAllowedForFetch 가 fetch 전에 모든 IPv6 리터럴/사설을 차단해야 함.
  it('[::1] (IPv6 loopback) → pre-fetch blocked', () => {
    expect(assertUrlAllowedForFetch('http://[::1]/').ok).toBe(false);
  });
  it('[fc00::1] (ULA fc00::/7) → pre-fetch blocked', () => {
    expect(assertUrlAllowedForFetch('http://[fc00::1]/').ok).toBe(false);
  });
  it('[fd00::2] (ULA fd00) → pre-fetch blocked', () => {
    expect(assertUrlAllowedForFetch('http://[fd00::2]/').ok).toBe(false);
  });
  it('[fe80::1] (link-local fe80::/10) → pre-fetch blocked', () => {
    expect(assertUrlAllowedForFetch('http://[fe80::1]/').ok).toBe(false);
  });
  it('[::ffff:127.0.0.1] (IPv4-mapped → loopback) → pre-fetch blocked', () => {
    expect(assertUrlAllowedForFetch('http://[::ffff:127.0.0.1]/').ok).toBe(false);
  });
  it('[::ffff:10.0.0.1] (IPv4-mapped → RFC1918) → pre-fetch blocked', () => {
    expect(assertUrlAllowedForFetch('http://[::ffff:10.0.0.1]/').ok).toBe(false);
  });
  it('[::ffff:169.254.169.254] (IPv4-mapped → cloud metadata) → pre-fetch blocked', () => {
    expect(assertUrlAllowedForFetch('http://[::ffff:169.254.169.254]/').ok).toBe(false);
  });
  it('[2606:4700:4700::1111] (공인 IPv6) → 정책상 raw IPv6 리터럴 차단', () => {
    // 본 프록시는 공인 호스트명 fetch 가 목적 — raw IPv6 리터럴은 allowlist 정책상 거부.
    expect(assertUrlAllowedForFetch('http://[2606:4700:4700::1111]/').ok).toBe(false);
  });
  it('대문자 [FC00::1] → 정규화 후 차단', () => {
    expect(assertUrlAllowedForFetch('http://[FC00::1]/').ok).toBe(false);
  });

  // post-fetch: redirect 결과가 IPv6 사설/매핑이면 동일 정규화로 차단.
  it('post-fetch [fc00::1] → throw', () => {
    expect(() => validatePostFetchUrl('http://[fc00::1]/')).toThrow(/SSRF/);
  });
  it('post-fetch [::ffff:127.0.0.1] → throw', () => {
    expect(() => validatePostFetchUrl('http://[::ffff:127.0.0.1]/')).toThrow(/SSRF/);
  });
  it('post-fetch [::1] → throw', () => {
    expect(() => validatePostFetchUrl('http://[::1]/')).toThrow(/SSRF/);
  });

  // 정상 외부 URL 흐름 보존 (회귀 방지).
  it('정상 https 외부 URL → pre-fetch 통과', () => {
    expect(assertUrlAllowedForFetch('https://example.com/path').ok).toBe(true);
  });
  it('정상 https 외부 URL → post-fetch 통과', () => {
    expect(() => validatePostFetchUrl('https://example.com/path')).not.toThrow();
  });
});

describe('fetch-url-guard · rateLimitFetchUrl', () => {
  it('40회 까지는 ok', () => {
    const key = 'rl-test-' + Date.now();
    for (let i = 0; i < 40; i++) {
      const r = rateLimitFetchUrl(key);
      expect(r.ok).toBe(true);
    }
  });
  it('41번째 호출 → blocked', () => {
    const key = 'rl-block-' + Date.now();
    for (let i = 0; i < 40; i++) rateLimitFetchUrl(key);
    const blocked = rateLimitFetchUrl(key);
    expect(blocked.ok).toBe(false);
  });
});
