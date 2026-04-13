import { expect, test } from "@playwright/test";

test.describe("API contracts (read-only)", () => {
  test("GET /api/health returns JSON with status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status(), "health HTTP status").toBeLessThan(500);
    const body = (await res.json()) as {
      status?: string;
      checks?: Record<string, unknown>;
      timestamp?: string;
    };
    expect(body.status, "health body.status").toBeDefined();
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
    expect(body.checks).toBeDefined();
  });

  test("GET /robots.txt is reachable", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  test("GET /sitemap.xml returns XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/<urlset[\s>]/i);
  });

  test("GET /api/ai-capabilities returns flags (no key material)", async ({ request }) => {
    const res = await request.get("/api/ai-capabilities");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      byokRequired?: boolean;
      hosted?: Record<string, boolean>;
      supportedProviders?: string[];
    };
    expect(typeof body.byokRequired).toBe("boolean");
    expect(body.hosted).toBeDefined();
    expect(Array.isArray(body.supportedProviders)).toBe(true);
  });

  test("GET /api/agent-search/status returns ok", async ({ request }) => {
    const res = await request.get("/api/agent-search/status");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; agentBuilder?: unknown };
    expect(body.ok).toBe(true);
    expect(body.agentBuilder).toBeDefined();
  });
});
