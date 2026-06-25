import { expect, test } from "@playwright/test";

// ============================================================
// PART 1 - RETIRED NETWORK SURFACE
// ============================================================

test.describe("Retired EH Network surface", () => {
  const removedNetworkPaths = [
    "/network",
    "/network/new",
    "/network/logs/new",
    "/network/planets/unknown-planet-id",
  ] as const;

  test("public header does not expose Network navigation", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator('[data-testid="home-header"], header').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("link", { name: /^NETWORK$/i })).toHaveCount(0);
  });

  for (const path of removedNetworkPaths) {
    test(`GET ${path} stays removed`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(res, `no response for ${path}`).toBeTruthy();
      expect(res!.status(), `${path} status`).toBe(404);
    });
  }

  for (const path of ["/api/network-agent/search", "/api/network-agent/ingest"] as const) {
    test(`POST ${path} returns retired API response`, async ({ request }) => {
      const res = await request.post(path, { data: { query: "e2e-retired-surface" } });
      expect(res.status(), `${path} status`).toBe(410);
      await expect(res.json()).resolves.toMatchObject({
        ok: false,
        error: "surface_removed",
      });
    });
  }
});

// IDENTITY_SEAL: PART-1 | role=retired-network e2e coverage | inputs=removed routes | outputs=404/410 assertions
