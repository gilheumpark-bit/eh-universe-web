/**
 * [M9 audit P0-1 / P0-2] Feature gate regression tests
 *
 * Verifies that the three dead-but-wired endpoints return 503 when their gate
 * envs are absent. Gates are the first branch of each handler — no rate limit /
 * auth / body parse runs before the 503, so credit-consuming downstream calls
 * cannot be triggered by unauthenticated probes while the UI is missing.
 *
 * Covers:
 *   POST /api/checkout         — requires STRIPE_SECRET_KEY && FEATURE_STRIPE_CHECKOUT=on
 *   POST /api/agent-search     — requires FEATURE_AGENT_SEARCH=on
 *   GET  /api/agent-search/status — requires FEATURE_AGENT_SEARCH=on
 */

// ============================================================
// PART 1 — Lightweight NextRequest/NextResponse stand-ins
// ============================================================

class FakeNextRequest {
  method: string;
  nextUrl: URL;
  headers: Headers;
  private _body: string | null;

  constructor(
    input: string | URL,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) {
    this.method = init?.method ?? 'GET';
    this.nextUrl = typeof input === 'string' ? new URL(input) : input;
    this.headers = new Headers(init?.headers);
    this._body = init?.body ?? null;
  }

  async json() {
    return JSON.parse(this._body ?? '{}');
  }

  async text() {
    return this._body ?? '';
  }
}

class FakeNextResponse {
  _body: unknown;
  _status: number;
  get status() {
    return this._status;
  }
  constructor(body: unknown, status: number) {
    this._body = body;
    this._status = status;
  }
  async json() {
    return this._body;
  }
  static json(
    body: unknown,
    opts?: { status?: number; headers?: Record<string, string> },
  ) {
    return new FakeNextResponse(body, opts?.status ?? 200);
  }
}

jest.mock('next/server', () => ({
  NextRequest: FakeNextRequest,
  NextResponse: FakeNextResponse,
}));

// Rate limiter always allows — we test the gate itself, not downstream.
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true, retryAfterMs: 0 }),
  RATE_LIMITS: {
    default: { windowMs: 60_000, maxRequests: 100 },
    chat: { windowMs: 60_000, maxRequests: 60 },
    imageGen: { windowMs: 60_000, maxRequests: 10 },
  },
  getClientIp: () => '127.0.0.1',
}));

// vertex-app-builder is imported by agent-search handlers — stub to avoid real Google SDK load.
jest.mock('@/lib/vertex-app-builder', () => ({
  isAgentBuilderConfigured: () => true,
  searchAgentBuilder: async () => ({ results: [], summary: '', totalSize: 0 }),
  converseAgentBuilder: async () => ({ reply: '', conversationId: '', references: [] }),
  getAgentBuilderStatus: () => ({ universe: false, novel: false, code: false }),
}));

// api-logger — silence in tests.
jest.mock('@/lib/api-logger', () => ({
  apiLog: () => undefined,
  createRequestTimer: () => ({ elapsed: () => 0 }),
}));

// firebase-id-token imports `jose` (pure ESM). Stub it so checkout route imports cleanly in jsdom.
// The gate runs before this is ever called, so the stub is never invoked in these tests.
jest.mock('@/lib/firebase-id-token', () => ({
  verifyFirebaseIdToken: async () => null,
}));

// stripe SDK is loaded lazily by checkout; stub in case a future import path changes.
jest.mock('@/lib/stripe', () => ({
  getStripeSession: async () => ({ url: 'https://checkout.stripe.com/test' }),
}));

// ============================================================
// PART 2 — Env setup / teardown
// ============================================================

const origEnv = { ...process.env };

function clearGateEnv(): void {
  delete process.env.FEATURE_STRIPE_CHECKOUT;
  delete process.env.FEATURE_AGENT_SEARCH;
  delete process.env.STRIPE_SECRET_KEY;
}

beforeEach(() => {
  clearGateEnv();
});

afterAll(() => {
  process.env = origEnv;
});

// ============================================================
// PART 3 — /api/checkout gate
// ============================================================

describe('[M9 P0-1] /api/checkout gate', () => {
  it('returns 503 checkout_disabled when FEATURE_STRIPE_CHECKOUT is absent', async () => {
    const { POST } = await import('../checkout/route');
    const req = new FakeNextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: '{}',
    }) as never;
    const res = (await POST(req)) as unknown as FakeNextResponse;
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'checkout_disabled' });
  });

  it('returns 503 even when STRIPE_SECRET_KEY is set but flag is off', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.FEATURE_STRIPE_CHECKOUT = 'off';
    const { POST } = await import('../checkout/route');
    const req = new FakeNextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: '{}',
    }) as never;
    const res = (await POST(req)) as unknown as FakeNextResponse;
    expect(res.status).toBe(503);
  });
});

// ============================================================
// PART 4 — /api/agent-search gate
// ============================================================

describe('[M9 P0-2] /api/agent-search gate', () => {
  it('POST returns 503 agent_search_disabled when flag is absent', async () => {
    const { POST } = await import('../agent-search/route');
    const req = new FakeNextRequest('http://localhost:3000/api/agent-search', {
      method: 'POST',
      body: JSON.stringify({ studio: 'universe', query: 'test' }),
    }) as never;
    const res = (await POST(req)) as unknown as FakeNextResponse;
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'agent_search_disabled' });
  });

  it('GET status returns 503 when flag is absent', async () => {
    const { GET } = await import('../agent-search/status/route');
    const req = new FakeNextRequest('http://localhost:3000/api/agent-search/status') as never;
    const res = (await GET(req)) as unknown as FakeNextResponse;
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'agent_search_disabled' });
  });
});
