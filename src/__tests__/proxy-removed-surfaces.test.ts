// Regression guard for removed public Loreguard surfaces.
export {};

class FakeNextRequest {
  method: string;
  nextUrl: URL;
  headers: Headers;
  private readonly cookieStore: Record<string, string>;

  constructor(input: string, init?: { method?: string; headers?: Record<string, string>; cookies?: Record<string, string> }) {
    this.method = init?.method ?? 'GET';
    this.nextUrl = new URL(input);
    this.headers = new Headers(init?.headers);
    this.cookieStore = init?.cookies ?? {};
  }

  cookies = {
    get: (key: string) => {
      const value = this.cookieStore[key];
      return value === undefined ? undefined : { value };
    },
  };
}

class FakeNextResponse {
  body: unknown;
  status: number;

  constructor(body?: unknown, init?: { status?: number }) {
    this.body = body;
    this.status = init?.status ?? 200;
  }

  async json() {
    return this.body;
  }

  static json(body: unknown, init?: { status?: number }) {
    return new FakeNextResponse(body, init);
  }

  static next() {
    return new FakeNextResponse(null, { status: 200 });
  }
}

jest.mock('next/server', () => ({
  NextRequest: FakeNextRequest,
  NextResponse: FakeNextResponse,
}));

describe('proxy removed surfaces', () => {
  it.each([
    '/code',
    '/code-studio',
    '/code-studio/editor',
    '/codex',
    '/reference',
    '/reports',
    '/rulebook',
    '/tools',
    '/tools/warp-gate',
    '/world/demo',
  ])('returns 404 for %s', async (path) => {
    const { proxy } = await import('../proxy');
    const res = proxy(new FakeNextRequest(`http://localhost:3000${path}`) as never) as unknown as FakeNextResponse;
    expect(res.status).toBe(404);
  });

  it.each([
    '/api/code/autopilot',
    '/api/network-agent/search',
    '/api/npm-search',
  ])('returns 410 for removed legacy API %s', async (path) => {
    const { proxy } = await import('../proxy');
    const res = proxy(
      new FakeNextRequest(`http://localhost:3000${path}`, { method: 'POST' }) as never,
    ) as unknown as FakeNextResponse;
    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toMatchObject({ error: 'surface_removed' });
  });

  it('blocks cross-origin API writes without a CSRF token', async () => {
    const { proxy } = await import('../proxy');
    const res = proxy(
      new FakeNextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'https://evil.example' },
      }) as never,
    ) as unknown as FakeNextResponse;

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'csrf_failed' });
  });

  it('allows same-origin API writes while legacy clients migrate to CSRF headers', async () => {
    const { proxy } = await import('../proxy');
    const res = proxy(
      new FakeNextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      }) as never,
    ) as unknown as FakeNextResponse;

    expect(res.status).toBe(200);
  });

  it('allows API writes with a matching double-submit token', async () => {
    const { proxy } = await import('../proxy');
    const res = proxy(
      new FakeNextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { host: 'localhost:3000', 'x-csrf-token': 'token-1' },
        cookies: { 'eh-csrf-token': 'token-1' },
      }) as never,
    ) as unknown as FakeNextResponse;

    expect(res.status).toBe(200);
  });
});
