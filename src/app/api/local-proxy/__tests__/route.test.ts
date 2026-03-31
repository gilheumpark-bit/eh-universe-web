/**
 * #42 — local-proxy security tests
 *
 * NextRequest requires the Web Request global which isn't available in jsdom.
 * We mock next/server with lightweight stand-ins, then test the actual
 * route handlers for security guards:
 * - Production block
 * - Private-network-only URL validation
 * - Development pass-through
 */

// --- Lightweight NextRequest/NextResponse stand-ins ---

class FakeNextRequest {
  method: string;
  nextUrl: URL;
  headers: Headers;
  private _body: string | null;

  constructor(input: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
    this.method = init?.method ?? 'GET';
    this.nextUrl = typeof input === 'string' ? new URL(input) : input;
    this.headers = new Headers(init?.headers);
    this._body = init?.body ?? null;
  }

  async json() {
    return JSON.parse(this._body ?? '{}');
  }
}

class FakeNextResponse {
  _body: unknown;
  _status: number;
  get status() { return this._status; }
  constructor(body: unknown, status: number) {
    this._body = body;
    this._status = status;
  }
  async json() { return this._body; }
  static json(body: unknown, opts?: { status?: number; headers?: Record<string, string> }) {
    return new FakeNextResponse(body, opts?.status ?? 200);
  }
}

jest.mock('next/server', () => ({
  NextRequest: FakeNextRequest,
  NextResponse: FakeNextResponse,
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true, retryAfterMs: 0 }),
  RATE_LIMITS: { default: { windowMs: 60000, maxRequests: 100 } },
  getClientIp: () => '127.0.0.1',
}));

import { GET, POST } from '../route';

function makeGetReq(baseUrl: string) {
  return new FakeNextRequest(
    `http://localhost:3000/api/local-proxy?baseUrl=${encodeURIComponent(baseUrl)}`,
  ) as never;
}

function makePostReq(body: Record<string, unknown>) {
  return new FakeNextRequest('http://localhost:3000/api/local-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

describe('local-proxy security', () => {
  const origEnv = process.env.NODE_ENV;
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    savedFetch = global.fetch;
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: origEnv, writable: true });
    global.fetch = savedFetch;
  });

  // --- rejection tests (no fetch needed) ---

  it('rejects non-localhost URLs (GET)', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    const res = await GET(makeGetReq('http://evil.com:1234'));
    expect(res.status).toBe(403);
  });

  it('rejects non-localhost URLs (POST)', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    const res = await POST(makePostReq({ baseUrl: 'http://attacker.io:8080' }));
    expect(res.status).toBe(403);
  });

  it('blocks in production (GET)', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    const res = await GET(makeGetReq('http://localhost:1234'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('production');
  });

  it('blocks in production (POST)', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    const res = await POST(makePostReq({ baseUrl: 'http://localhost:1234' }));
    expect(res.status).toBe(403);
  });

  it('rejects invalid IP ranges like 192.168.999.999', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    const res = await GET(makeGetReq('http://192.168.999.999:1234'));
    expect(res.status).toBe(403);
  });

  // --- pass-through tests (mock fetch) ---

  it('allows localhost in development (GET)', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'model-1' }] }),
    });

    const res = await GET(makeGetReq('http://localhost:1234'));
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:1234/v1/models',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('allows private IP 192.168.x.x in development (POST)', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    const res = await POST(makePostReq({
      baseUrl: 'http://192.168.1.100:8080',
      model: 'local-model',
      messages: [{ role: 'user', content: 'test' }],
    }));
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://192.168.1.100:8080/v1/chat/completions',
      expect.anything(),
    );
  });
});
