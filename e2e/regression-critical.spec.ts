import { expect, test } from "@playwright/test";
import { dismissOnboarding } from "./helpers/studio-flow";

test.describe("Critical regressions", () => {
  test("studio unauthenticated quick start opens API key modal", async ({ page }) => {
    await page.goto("/studio");
    await dismissOnboarding(page);

    const quickStartButton = page.locator("button", { hasText: /쾌속 시작|Quick Start/ }).first();
    await expect(quickStartButton).toBeVisible({ timeout: 10000 });
    await quickStartButton.click();

    const apiModal = page.locator('[role="dialog"]').filter({ hasText: /Gemini|OpenAI|Claude|API/i }).first();
    await expect(apiModal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]').filter({ hasText: /장르 선택|Select Genre/ }).first()).toBeHidden();
  });
});
