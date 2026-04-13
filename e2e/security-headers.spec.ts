import { expect, test } from "@playwright/test";

test.describe("Security headers on document responses", () => {
  test("HTML routes include hardening headers from proxy", async ({ request }) => {
    const res = await request.get("/about");
    expect(res.status()).toBe(200);
    const h = res.headers();
    expect(h["x-content-type-options"]?.toLowerCase()).toBe("nosniff");
    expect(h["x-frame-options"]?.toUpperCase()).toBe("DENY");
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["permissions-policy"]).toBeTruthy();
    expect(h["content-security-policy"]?.length ?? 0).toBeGreaterThan(20);
  });

  test("code-studio includes COOP/COEP for WebContainer isolation", async ({ request }) => {
    const res = await request.get("/code-studio");
    expect(res.status()).toBe(200);
    const h = res.headers();
    expect(h["cross-origin-opener-policy"]?.toLowerCase()).toBe("same-origin");
    expect(h["cross-origin-embedder-policy"]?.toLowerCase()).toBe("require-corp");
  });
});
