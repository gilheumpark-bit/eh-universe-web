/**
 * /api/checkout route tests
 *
 * T2 money/privilege evidence: feature gate, auth gate, plan price selection,
 * and Firebase uid propagation into the Stripe session creation boundary.
 */

// ============================================================
// PART 1 — Next.js Stand-ins & Mocks
// ============================================================

class CheckoutFakeRequest {
  headers: Headers;
  private readonly requestBody: string | null;

  constructor(init?: { headers?: Record<string, string>; body?: string }) {
    this.headers = new Headers(init?.headers ?? {});
    this.requestBody = init?.body ?? null;
  }

  async json() {
    return JSON.parse(this.requestBody ?? '{}');
  }
}

class CheckoutFakeResponse {
  private readonly responseBody: unknown;
  private readonly responseStatus: number;

  get status() {
    return this.responseStatus;
  }

  constructor(body: unknown, status: number) {
    this.responseBody = body;
    this.responseStatus = status;
  }

  async json() {
    return this.responseBody;
  }

  static json(
    body: unknown,
    options?: { status?: number; headers?: Record<string, string> },
  ) {
    return new CheckoutFakeResponse(body, options?.status ?? 200);
  }
}

jest.mock('next/server', () => ({
  NextRequest: CheckoutFakeRequest,
  NextResponse: CheckoutFakeResponse,
}));

const mockGetStripeSession = jest.fn();
jest.mock('@/lib/stripe', () => ({
  getStripeSession: (...args: unknown[]) => mockGetStripeSession(...args),
}));

const mockVerifyFirebaseIdToken = jest.fn();
jest.mock('@/lib/firebase-id-token', () => ({
  verifyFirebaseIdToken: (...args: unknown[]) => mockVerifyFirebaseIdToken(...args),
}));

const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => '203.0.113.10',
  RATE_LIMITS: {
    imageGen: { windowMs: 60_000, maxRequests: 10 },
  },
}));

const mockLoggerError = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

type CheckoutRequest = Parameters<(typeof import('../route'))['POST']>[0];

function makeRequest(init?: {
  token?: string;
  body?: Record<string, unknown>;
}): CheckoutRequest {
  const headers: Record<string, string> = {};
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  return new CheckoutFakeRequest({
    headers,
    body: JSON.stringify(init?.body ?? {}),
  }) as unknown as CheckoutRequest;
}

function enableCheckoutEnv(): void {
  process.env.STRIPE_SECRET_KEY = 'sk_test_12345678901234567890';
  process.env.FEATURE_STRIPE_CHECKOUT = 'on';
}

// ============================================================
// PART 2 — Test Lifecycle
// ============================================================

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  mockVerifyFirebaseIdToken.mockResolvedValue({ uid: 'uid-checkout', tier: 'pro' });
  mockGetStripeSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session/test' });
});

afterAll(() => {
  process.env = originalEnv;
});

// ============================================================
// PART 3 — Gate & Auth Contracts
// ============================================================

describe('/api/checkout POST — gate and auth', () => {
  it('returns checkout_disabled before rate limit/auth/session work when feature flag is off', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_12345678901234567890';
    process.env.FEATURE_STRIPE_CHECKOUT = 'off';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({ token: 'token' })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'checkout_disabled' });
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockVerifyFirebaseIdToken).not.toHaveBeenCalled();
    expect(mockGetStripeSession).not.toHaveBeenCalled();
  });

  it('rate-limited requests stop before auth and Stripe session creation', async () => {
    enableCheckoutEnv();
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 12_000 });

    const { POST } = await import('../route');
    const response = await POST(makeRequest({ token: 'token' })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Rate limited' });
    expect(mockVerifyFirebaseIdToken).not.toHaveBeenCalled();
    expect(mockGetStripeSession).not.toHaveBeenCalled();
  });

  it('missing bearer token returns 401 before Firebase or Stripe calls', async () => {
    enableCheckoutEnv();

    const { POST } = await import('../route');
    const response = await POST(makeRequest()) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
    expect(mockVerifyFirebaseIdToken).not.toHaveBeenCalled();
    expect(mockGetStripeSession).not.toHaveBeenCalled();
  });

  it('invalid Firebase token returns 401 and does not create a checkout session', async () => {
    enableCheckoutEnv();
    mockVerifyFirebaseIdToken.mockResolvedValue(null);

    const { POST } = await import('../route');
    const response = await POST(makeRequest({ token: 'bad-token' })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid token' });
    expect(mockVerifyFirebaseIdToken).toHaveBeenCalledWith('bad-token');
    expect(mockGetStripeSession).not.toHaveBeenCalled();
  });
});

// ============================================================
// PART 4 — Price & Privilege Boundary Contracts
// ============================================================

describe('/api/checkout POST — price selection and uid propagation', () => {
  it('starter plan uses server-side STRIPE_PRICE_ID_STARTER before legacy fallback', async () => {
    enableCheckoutEnv();
    process.env.STRIPE_PRICE_ID_STARTER = 'price_starter_server';
    process.env.STRIPE_PRICE_ID_INDIE = 'price_indie_legacy';
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_public_fallback';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { planId: 'starter' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(200);
    expect(mockGetStripeSession).toHaveBeenCalledWith(
      'price_starter_server',
      undefined,
      undefined,
      'uid-checkout',
      'starter',
    );
  });

  it('studio plan falls back to STRIPE_PRICE_ID_MID during migration', async () => {
    enableCheckoutEnv();
    process.env.STRIPE_PRICE_ID_MID = 'price_mid_server';
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_public_fallback';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { planId: 'studio' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(200);
    expect(mockGetStripeSession).toHaveBeenCalledWith(
      'price_mid_server',
      undefined,
      undefined,
      'uid-checkout',
      'studio',
    );
  });

  it('studio alias uses STRIPE_PRICE_ID_STUDIO before the legacy mid key', async () => {
    enableCheckoutEnv();
    process.env.STRIPE_PRICE_ID_STUDIO = 'price_studio_server';
    process.env.STRIPE_PRICE_ID_MID = 'price_mid_legacy';
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_public_fallback';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { planId: 'studio' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(200);
    expect(mockGetStripeSession).toHaveBeenCalledWith(
      'price_studio_server',
      undefined,
      undefined,
      'uid-checkout',
      'studio',
    );
  });

  it('pro tier uses server-side STRIPE_PRICE_ID_PRO and passes authenticated uid', async () => {
    enableCheckoutEnv();
    process.env.STRIPE_PRICE_ID_PRO = 'price_pro_server';
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_public_fallback';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { tier: 'pro', returnUrl: 'https://evil.example/steal' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.com/session/test' });
    expect(mockGetStripeSession).toHaveBeenCalledWith(
      'price_pro_server',
      undefined,
      'https://evil.example/steal',
      'uid-checkout',
      'pro',
    );
  });

  it('indie tier uses STRIPE_PRICE_ID_INDIE when present', async () => {
    enableCheckoutEnv();
    process.env.STRIPE_PRICE_ID_INDIE = 'price_indie_server';
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_public_fallback';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { tier: 'indie' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(200);
    expect(mockGetStripeSession).toHaveBeenCalledWith(
      'price_indie_server',
      undefined,
      undefined,
      'uid-checkout',
      'starter',
    );
  });

  it('unknown tier falls back to NEXT_PUBLIC_STRIPE_PRICE_ID without trusting client price input', async () => {
    enableCheckoutEnv();
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_public_fallback';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { tier: 'enterprise', priceId: 'price_client_injected' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(200);
    expect(mockGetStripeSession).toHaveBeenCalledWith(
      'price_public_fallback',
      undefined,
      undefined,
      'uid-checkout',
      null,
    );
  });

  it('missing server price configuration returns 501 before Stripe session creation', async () => {
    enableCheckoutEnv();
    delete process.env.STRIPE_PRICE_ID_STARTER;
    delete process.env.STRIPE_PRICE_ID_MID;
    delete process.env.STRIPE_PRICE_ID_PRO;
    delete process.env.STRIPE_PRICE_ID_INDIE;
    delete process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { tier: 'pro' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(501);
    expect(mockGetStripeSession).not.toHaveBeenCalled();
  });

  it('publisher plan is not handled by one-click checkout', async () => {
    enableCheckoutEnv();
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_public_fallback';

    const { POST } = await import('../route');
    const response = await POST(makeRequest({
      token: 'good-token',
      body: { planId: 'publisher' },
    })) as unknown as CheckoutFakeResponse;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'checkout_plan_not_supported' });
    expect(mockGetStripeSession).not.toHaveBeenCalled();
  });
});

export {};
