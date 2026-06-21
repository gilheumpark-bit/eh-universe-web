class MetricsFakeRequest {
  headers: Headers;

  constructor(headers?: Record<string, string>) {
    this.headers = new Headers(headers ?? {});
  }
}

class MetricsFakeResponse {
  private readonly responseBody: unknown;
  private readonly responseStatus: number;
  readonly headers: Headers;

  get status() {
    return this.responseStatus;
  }

  constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    this.responseBody = body;
    this.responseStatus = init?.status ?? 200;
    this.headers = new Headers(init?.headers ?? {});
  }

  async json() {
    return this.responseBody;
  }

  async text() {
    return String(this.responseBody ?? "");
  }

  static json(body: unknown, options?: { status?: number }) {
    return new MetricsFakeResponse(body, { status: options?.status ?? 200 });
  }
}

jest.mock("next/server", () => ({
  NextRequest: MetricsFakeRequest,
  NextResponse: MetricsFakeResponse,
}));

type MetricsRequest = Parameters<(typeof import("../route"))["GET"]>[0];

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("/api/metrics", () => {
  it("stays closed when metrics are disabled", async () => {
    process.env.METRICS_ENABLED = "off";
    const { GET } = await import("../route");

    const response = await GET(new MetricsFakeRequest() as unknown as MetricsRequest) as unknown as MetricsFakeResponse;

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "metrics_disabled" });
  });

  it("requires the configured bearer token before exposing metrics", async () => {
    process.env.METRICS_ENABLED = "on";
    process.env.METRICS_BEARER_TOKEN = "metrics-secret";
    const { GET } = await import("../route");

    const blocked = await GET(new MetricsFakeRequest() as unknown as MetricsRequest) as unknown as MetricsFakeResponse;
    expect(blocked.status).toBe(401);
    expect(await blocked.json()).toEqual({ error: "metrics_auth_required" });

    const allowed = await GET(new MetricsFakeRequest({
      authorization: "Bearer metrics-secret",
    }) as unknown as MetricsRequest) as unknown as MetricsFakeResponse;
    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toContain("eh_app_info");
  });
});

export {};
