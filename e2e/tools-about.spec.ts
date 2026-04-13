/**
 * Smoke: /tools index, About anchors (Settings footer targets).
 */
import { test, expect } from "@playwright/test";

test.describe("Tools index & About anchors", () => {
  test("/tools returns 200 and lists tool links", async ({ page }) => {
    const res = await page.goto("/tools");
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
    // Header also links to tools; scope to <main> for the tools index grid only.
    const main = page.locator("main");
    await expect(main.locator('a[href="/tools/galaxy-map"]')).toBeVisible({ timeout: 15000 });
    await expect(main.locator('a[href="/tools/vessel"]')).toBeVisible({ timeout: 15000 });
  });

  test("/about exposes privacy and license sections", async ({ page }) => {
    await page.goto("/about#privacy");
    const main = page.locator("main");
    await expect(main.locator("#privacy").first()).toBeVisible({ timeout: 15000 });
    await expect(main.locator("#license").first()).toBeVisible();
  });
});
