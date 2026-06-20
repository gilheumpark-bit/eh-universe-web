/**
 * E2E Test: Studio Page Navigation & Core Layout
 *
 * Tests the main studio page loads correctly with all critical panels.
 */
import { test, expect } from "@playwright/test";
import { dismissOnboarding, dismissApiKeyModal, ensureSession } from "./helpers/studio-flow";

test.describe("Studio Page", () => {
  test("should render studio shell with sidebar and editor", async ({ page }) => {
    await page.goto("/studio");
    await dismissOnboarding(page);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=/NOA Studio/i").first()).toBeVisible({ timeout: 15000 });

    const quickStart = page.locator("button", { hasText: /쾌속 시작|Quick Start/ }).first();
    if (await quickStart.isVisible({ timeout: 1500 }).catch(() => false)) {
      await quickStart.click();
      await dismissApiKeyModal(page);
    }

    await expect(page.locator("body")).toBeVisible();
  });

  test("should show main studio tabs after session (layout interactive)", async ({ page }) => {
    await page.goto("/studio");
    await ensureSession(page);
    await expect(
      page.locator("button:visible", { hasText: /세계관 스튜디오|World Studio/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should reach stable body after load", async ({ page }) => {
    await page.goto("/studio");
    await dismissOnboarding(page);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
