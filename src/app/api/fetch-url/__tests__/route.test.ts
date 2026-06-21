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
  static json(body: unknown, opts?: { status?: number }) {
    return new FakeNextResponse(body, opts?.status ?? 200);
  }
}

jest.mock('next/server', () => ({
  NextResponse: FakeNextResponse,
}));

jest.mock('@/lib/firebase-id-token', () => ({
  verifyFirebaseIdToken: jest.fn(async () => null),
}));

import { GET } from '../route';

function makeRequest(url: string, authorization?: string) {
  return {
    url: `http://localhost:3000/api/fetch-url?url=${encodeURIComponent(url)}`,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'authorization') return authorization ?? null;
        if (name.toLowerCase() === 'x-forwarded-for') return '127.0.0.1';
        return null;
      },
    },
  } as never;
}

describe('/api/fetch-url auth gate', () => {
  const nodeEnv = process.env as Record<string, string | undefined>;
  const originalEnv = nodeEnv.NODE_ENV;
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    savedFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    nodeEnv.NODE_ENV = originalEnv;
    global.fetch = savedFetch;
    jest.clearAllMocks();
  });

  it('blocks production URL fetch without a Firebase token', async () => {
    nodeEnv.NODE_ENV = 'production';

    const response = await GET(makeRequest('https://example.com/post'));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toContain('로그인');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
