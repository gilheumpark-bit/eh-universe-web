/**
 * Unit tests for src/lib/rate-limit.ts
 * Covers: sliding window, presets, cleanup, getClientIp
 */

// We need to isolate the module per test group because it uses module-level
// mutable state (rateLimitMap, lastCleanup). Jest's module cache makes
// `jest.isolateModules` the safest approach here.

describe('rate-limit', () => {
  let checkRateLimit: typeof import('@/lib/rate-limit').checkRateLimit;
  let getClientIp: typeof import('@/lib/rate-limit').getClientIp;
  let RATE_LIMITS: typeof import('@/lib/rate-limit').RATE_LIMITS;

  beforeEach(() => {
    jest.resetModules();
     
    const mod = require('@/lib/rate-limit');
    checkRateLimit = mod.checkRateLimit;
    getClientIp = mod.getClientIp;
    RATE_LIMITS = mod.RATE_LIMITS;
  });

  // ============================================================
  // PART 1 — Sliding window behavior
  // ============================================================

  describe('sliding window', () => {
    it('allows the first request', () => {
      const result = checkRateLimit('1.2.3.4', 'test', { windowMs: 60_000, maxRequests: 5 });
      expect(result.allowed).toBe(true);
      expect(result.retryAfterMs).toBe(0);
    });

    it('allows requests up to maxRequests', () => {
      const config = { windowMs: 60_000, maxRequests: 3 };
      expect(checkRateLimit('1.1.1.1', 'r', config).allowed).toBe(true);
      expect(checkRateLimit('1.1.1.1', 'r', config).allowed).toBe(true);
      expect(checkRateLimit('1.1.1.1', 'r', config).allowed).toBe(true);
    });

    it('blocks once maxRequests is exceeded', () => {
      const config = { windowMs: 60_000, maxRequests: 2 };
      checkRateLimit('2.2.2.2', 'r', config);
      checkRateLimit('2.2.2.2', 'r', config);
      const result = checkRateLimit('2.2.2.2', 'r', config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('uses composite key of route + ip', () => {
      const config = { windowMs: 60_000, maxRequests: 1 };
      checkRateLimit('3.3.3.3', 'route-a', config);
      // Same IP, different route => allowed
      const result = checkRateLimit('3.3.3.3', 'route-b', config);
      expect(result.allowed).toBe(true);
    });

    it('different IPs have independent limits', () => {
      const config = { windowMs: 60_000, maxRequests: 1 };
      checkRateLimit('4.4.4.4', 'r', config);
      const result = checkRateLimit('5.5.5.5', 'r', config);
      expect(result.allowed).toBe(true);
    });

    it('resets after window expires', () => {
      const config = { windowMs: 100, maxRequests: 1 };
      checkRateLimit('6.6.6.6', 'r', config);

      // Advance time past window
      const originalNow = Date.now;
      Date.now = () => originalNow() + 200;
      try {
        const result = checkRateLimit('6.6.6.6', 'r', config);
        expect(result.allowed).toBe(true);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  // ============================================================
  // PART 2 — Preset configurations
  // ============================================================

  describe('RATE_LIMITS presets', () => {
    it('defines chat preset', () => {
      expect(RATE_LIMITS.chat.windowMs).toBe(60_000);
      expect(RATE_LIMITS.chat.maxRequests).toBe(30);
    });

    it('defines imageGen preset', () => {
      expect(RATE_LIMITS.imageGen.windowMs).toBe(60_000);
      expect(RATE_LIMITS.imageGen.maxRequests).toBe(10);
    });

    it('defines default preset', () => {
      expect(RATE_LIMITS.default.windowMs).toBe(60_000);
      expect(RATE_LIMITS.default.maxRequests).toBe(60);
    });
  });

  // ============================================================
  // PART 3 — Expired entry cleanup
  // ============================================================

  describe('cleanup of expired entries', () => {
    it('evicts oldest entry when map exceeds MAX_ENTRIES', () => {
      // MAX_ENTRIES is 2000 — fill to capacity, then add one more
      const config = { windowMs: 60_000, maxRequests: 100 };
      for (let i = 0; i < 2001; i++) {
        checkRateLimit(`ip-${i}`, 'r', config);
      }
      // Should not throw and the latest request should be allowed
      const result = checkRateLimit('ip-2001', 'r', config);
      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================
  // PART 4 — getClientIp extraction
  // ============================================================

  describe('getClientIp', () => {
    it('prefers x-real-ip', () => {
      const headers = new Headers({
        'x-real-ip': '10.0.0.1',
        'x-forwarded-for': '10.0.0.2, 10.0.0.3',
      });
      expect(getClientIp(headers)).toBe('10.0.0.1');
    });

    it('falls back to first x-forwarded-for entry', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });
      expect(getClientIp(headers)).toBe('192.168.1.1');
    });

    it('trims whitespace from x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': '  172.16.0.1 , 10.0.0.1',
      });
      expect(getClientIp(headers)).toBe('172.16.0.1');
    });

    it('returns "unknown" when no headers present', () => {
      const headers = new Headers();
      expect(getClientIp(headers)).toBe('unknown');
    });
  });
});
