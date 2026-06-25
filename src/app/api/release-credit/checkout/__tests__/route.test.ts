class ReleaseCreditCheckoutFakeRequest {
  headers: Headers;
  private readonly requestBody: string | null;

  constructor(init?: { headers?: Record<string, string>; body?: string }) {
    this.headers = new Headers(init?.headers ?? {});
    this.requestBody = init?.body ?? null;
  }

  async json() {
    return JSON.parse(this.requestBody ?? "{}");
  }
}

class ReleaseCreditCheckoutFakeResponse {
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

  static json(body: unknown, options?: { status?: number }) {
    return new ReleaseCreditCheckoutFakeResponse(body, options?.status ?? 200);
  }
}

jest.mock("next/server", () => ({
  NextRequest: ReleaseCreditCheckoutFakeRequest,
  NextResponse: ReleaseCreditCheckoutFakeResponse,
}));

const mockVerifyFirebaseIdToken = jest.fn();
jest.mock("@/lib/firebase-id-token", () => ({
  verifyFirebaseIdToken: (...args: unknown[]) => mockVerifyFirebaseIdToken(...args),
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "203.0.113.13",
}));

const mockGetStripeReleaseCreditSession = jest.fn();
jest.mock("@/lib/stripe", () => ({
  getStripeReleaseCreditSession: (...args: unknown[]) => mockGetStripeReleaseCreditSession(...args),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

type CheckoutRequest = Parameters<(typeof import("../route"))["POST"]>[0];

function makeRequest(init?: {
  token?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): CheckoutRequest {
  const headers: Record<string, string> = {
    origin: "https://app.example",
    host: "app.example",
    ...init?.headers,
  };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  return new ReleaseCreditCheckoutFakeRequest({
    headers,
    body: JSON.stringify(init?.body ?? {}),
  }) as unknown as CheckoutRequest;
}

function makeBody(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    productId: "episode-c2pa",
    projectId: "project-alpha",
    periodKey: "2026-06",
    certificateId: "CERT-ALPHA-001",
    returnUrl: "https://evil.example/steal",
    ...overrides,
  };
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = {
    ...originalEnv,
    STRIPE_SECRET_KEY: "sk_test_123456789",
    FEATURE_STRIPE_CHECKOUT: "on",
    STRIPE_PRICE_ID_CERT_EPISODE_C2PA: "price_episode_c2pa",
  };
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  mockVerifyFirebaseIdToken.mockResolvedValue({ uid: "uid-release", tier: "free" });
  mockGetStripeReleaseCreditSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/test" });
});

afterEach(() => {
  process.env = originalEnv;
});

describe("/api/release-credit/checkout", () => {
  it("stays disabled until Stripe checkout is explicitly enabled", async () => {
    process.env.FEATURE_STRIPE_CHECKOUT = "off";

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ token: "token", body: makeBody() })) as unknown as ReleaseCreditCheckoutFakeResponse;

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "checkout_disabled" });
    expect(mockGetStripeReleaseCreditSession).not.toHaveBeenCalled();
  });

  it("requires auth before creating a one-off checkout session", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ body: makeBody() })) as unknown as ReleaseCreditCheckoutFakeResponse;

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "authentication_required" });
    expect(mockGetStripeReleaseCreditSession).not.toHaveBeenCalled();
  });

  it("rejects cross-origin checkout attempts before Stripe work", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "token",
      headers: { origin: "https://evil.example", host: "app.example" },
      body: makeBody(),
    })) as unknown as ReleaseCreditCheckoutFakeResponse;

    expect(response.status).toBe(403);
    expect(mockGetStripeReleaseCreditSession).not.toHaveBeenCalled();
  });

  it("creates a payment checkout session with server-side product metadata", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "token",
      body: makeBody(),
    })) as unknown as ReleaseCreditCheckoutFakeResponse;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/test" });
    expect(mockGetStripeReleaseCreditSession).toHaveBeenCalledWith({
      priceId: "price_episode_c2pa",
      returnUrl: "https://evil.example/steal",
      firebaseUid: "uid-release",
      projectId: "project-alpha",
      periodKey: "2026-06",
      productId: "episode-c2pa",
      packageProfileId: "public-reader",
      creditAmount: 2,
      certificateId: "CERT-ALPHA-001",
    });
  });

  it("does not trust unsupported products or missing price envs", async () => {
    const { POST } = await import("../route");
    const unsupported = await POST(makeRequest({
      token: "token",
      body: makeBody({ productId: "unknown-product" }),
    })) as unknown as ReleaseCreditCheckoutFakeResponse;

    expect(unsupported.status).toBe(400);
    expect(mockGetStripeReleaseCreditSession).not.toHaveBeenCalled();

    delete process.env.STRIPE_PRICE_ID_CERT_EPISODE_C2PA;
    const missingPrice = await POST(makeRequest({
      token: "token",
      body: makeBody(),
    })) as unknown as ReleaseCreditCheckoutFakeResponse;

    expect(missingPrice.status).toBe(501);
    expect(await missingPrice.json()).toEqual({ error: "certificate_price_not_configured" });
  });
});

export {};
