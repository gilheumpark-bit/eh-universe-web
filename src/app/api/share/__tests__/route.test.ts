class ShareFakeRequest {
  headers: Headers;
  nextUrl: URL;
  private readonly requestBody: string | null;

  constructor(init?: { url?: string; headers?: Record<string, string>; body?: string }) {
    this.headers = new Headers(init?.headers ?? {});
    this.nextUrl = new URL(init?.url ?? "https://app.example/api/share");
    this.requestBody = init?.body ?? null;
  }

  async json() {
    return JSON.parse(this.requestBody ?? "{}");
  }
}

class ShareFakeResponse {
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
    return new ShareFakeResponse(body, options?.status ?? 200);
  }
}

jest.mock("next/server", () => ({
  NextRequest: ShareFakeRequest,
  NextResponse: ShareFakeResponse,
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limit", () => ({
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "203.0.113.88",
}));

const mockVerifyFirebaseIdToken = jest.fn();
jest.mock("@/lib/firebase-id-token", () => ({
  verifyFirebaseIdToken: (...args: unknown[]) => mockVerifyFirebaseIdToken(...args),
}));

const mockCreateDocument = jest.fn();
const mockGetDocument = jest.fn();
jest.mock("@/lib/firestore-service-rest", () => ({
  firestoreCreateDocument: (...args: unknown[]) => mockCreateDocument(...args),
  firestoreGetDocument: (...args: unknown[]) => mockGetDocument(...args),
}));

const mockApiLog = jest.fn();
jest.mock("@/lib/api-logger", () => ({
  apiLog: (...args: unknown[]) => mockApiLog(...args),
}));

type SharePostRequest = Parameters<(typeof import("../route"))["POST"]>[0];

function makePostRequest(init?: {
  token?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}): SharePostRequest {
  const body = JSON.stringify(init?.body ?? {
    type: "novel",
    title: "테스트 원고",
    content: "긴 원고 공유 본문",
  });
  const headers: Record<string, string> = {
    origin: "https://app.example",
    host: "app.example",
    "content-type": "application/json",
    "content-length": String(new TextEncoder().encode(body).length),
    ...init?.headers,
  };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  return new ShareFakeRequest({ headers, body }) as unknown as SharePostRequest;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = {
    ...originalEnv,
    FIREBASE_PROJECT_ID: "share-test-project",
  };
  jest.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  mockVerifyFirebaseIdToken.mockResolvedValue({ uid: "uid-share" });
  mockCreateDocument.mockResolvedValue({ ok: true, name: "shares/test" });
});

afterEach(() => {
  process.env = originalEnv;
});

describe("/api/share", () => {
  it("rejects server-backed share creation without an Origin header", async () => {
    const { POST } = await import("../route");
    const response = await POST(makePostRequest({
      token: "token",
      headers: { origin: "", host: "app.example" },
    })) as unknown as ShareFakeResponse;

    expect(response.status).toBe(403);
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("requires a signed-in user for long server-backed share links", async () => {
    const { POST } = await import("../route");
    const response = await POST(makePostRequest()) as unknown as ShareFakeResponse;

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "authentication_required" });
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("creates a persistent share for same-origin authenticated requests", async () => {
    const { POST } = await import("../route");
    const response = await POST(makePostRequest({ token: "token" })) as unknown as ShareFakeResponse;
    const body = await response.json() as { id: string; storage: string };

    expect(response.status).toBe(200);
    expect(body.id).toMatch(/^sh_/);
    expect(body.storage).toBe("persistent");
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "share-test-project",
      "shares",
      expect.objectContaining({
        ownerUid: { stringValue: "uid-share" },
      }),
      expect.objectContaining({ documentId: expect.stringMatching(/^sh_/) }),
    );
    expect(mockApiLog).toHaveBeenCalledWith(expect.objectContaining({
      event: "share_created",
      route: "/api/share",
    }));
  });
});

export {};
