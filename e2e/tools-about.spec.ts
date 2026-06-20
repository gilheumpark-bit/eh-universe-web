/**
 * Smoke: current support pages and retired /tools guard.
 */
import { test, expect } from "@playwright/test";

test.describe("Support pages & retired tools guard", () => {
  test("/tools stays retired", async ({ page }) => {
    const res = await page.goto("/tools");
    expect(res?.status()).toBe(404);
  });

  test("/about exposes privacy and license sections", async ({ page }) => {
    await page.goto("/about#privacy");
    const main = page.locator("main");
    await expect(main.locator("#privacy").first()).toBeVisible({ timeout: 15000 });
    await expect(main.locator("#license").first()).toBeVisible();
  });

  for (const path of ["/docs", "/privacy", "/terms"] as const) {
    test(`GET ${path} renders current support surface`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(res, `no response for ${path}`).toBeTruthy();
      expect(res!.status(), `${path} status`).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
    });
  }
});
