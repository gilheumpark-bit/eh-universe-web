/**
 * /api/image-gen route tests
 *
 * P0 evidence: hosted/local-spark visual generation must honor the common
 * server-side tier gate before NOA checks or upstream image calls.
 */

class ImageGenFakeRequest {
  headers: Headers;
  private readonly requestBody: string;

  constructor(init: { headers?: Record<string, string>; body: string }) {
    this.headers = new Headers(init.headers ?? {});
    this.requestBody = init.body;
  }

  async json() {
    return JSON.parse(this.requestBody);
  }
}

class ImageGenFakeResponse {
  private readonly responseBody: unknown;
  private readonly responseStatus: number;
  readonly headers: Headers;

  get status() {
    return this.responseStatus;
  }

  constructor(body: unknown, status: number, headers?: HeadersInit) {
    this.responseBody = body;
    this.responseStatus = status;
    this.headers = new Headers(headers);
  }

  async json() {
    return this.responseBody;
  }

  static json(body: unknown, options?: { status?: number; headers?: HeadersInit }) {
    return new ImageGenFakeResponse(body, options?.status ?? 200, options?.headers);
  }
}

jest.mock('next/server', () => ({
  NextRequest: ImageGenFakeRequest,
  NextResponse: ImageGenFakeResponse,
}));
jest.mock('@/lib/server-ai-init', () => ({}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabledServer: () => true,
}));

jest.mock('@/lib/api-origin-guard', () => ({
  checkSameOriginHeaders: () => ({ ok: true }),
}));

const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => '203.0.113.72',
  RATE_LIMITS: {
    imageGen: { windowMs: 60_000, maxRequests: 10 },
  },
}));

const mockApplyNoaGate = jest.fn();
const mockFilterOutputIp = jest.fn((value: string, _route?: string) => ({ output: value, matches: [] }));
jest.mock('@/lib/noa/server-gate', () => ({
  applyNoaGate: (...args: unknown[]) => mockApplyNoaGate(...args),
  filterOutputIp: (value: string, route: string) => mockFilterOutputIp(value, route),
}));

type ImageGenRequest = Parameters<(typeof import('../route'))['POST']>[0];

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>): ImageGenRequest {
  return new ImageGenFakeRequest({
    headers: { origin: 'https://app.example', host: 'app.example', ...(headers ?? {}) },
    body: JSON.stringify(body),
  }) as unknown as ImageGenRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  mockApplyNoaGate.mockResolvedValue({
    blocked: false,
    gateMs: 1,
    ipMatches: [],
  });
});

describe('/api/image-gen POST — common tier gate', () => {
  it('returns common paywall response before NOA and upstream execution for local-spark without login', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy;
    const { POST } = await import('../route');

    try {
      const response = await POST(makeRequest({
        provider: 'local-spark',
        prompt: '은색 여우 마스코트 뱃지',
        width: 1024,
        height: 1024,
      })) as unknown as ImageGenFakeResponse;

      expect(response.status).toBe(401);
      const body = await response.json() as { error?: string; paywall?: { feature?: string; pricingUrl?: string } };
      expect(body.error).toBe('login_or_byok_required');
      expect(body.paywall?.feature).toBe('시각 자료 생성');
      expect(body.paywall?.pricingUrl).toBe('/pricing');
      expect(mockApplyNoaGate).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

export {};
