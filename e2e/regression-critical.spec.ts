import { expect, test } from "@playwright/test";
import { dismissOnboarding } from "./helpers/studio-flow";

test.describe("Critical regressions", () => {
  test("network does not stay stuck in loading state", async ({ page }) => {
    await page.goto("/network");
    await expect(page.locator("text=/행성 등록하기|Register a Planet/").first()).toBeVisible({ timeout: 15000 });

    // Either loading resolves, or a retry/empty state appears (env may have no backend configured)
    await page.waitForTimeout(14000);

    const loadingPlanetsVisible = await page.locator("text=/행성을 불러오는 중|Loading planets/").first().isVisible().catch(() => false);
    const loadingPostsVisible = await page.locator("text=/게시글을 불러오는 중|Loading posts/").first().isVisible().catch(() => false);

    const retryVisible = await page.getByRole("button", { name: /다시 시도|Retry/i }).first().isVisible().catch(() => false);
    const planetCount = await page.locator('a[href^="/network/planets/"]').count();
    const logCount = await page.locator('a[href^="/network/logs/"]').count();

    expect((!loadingPlanetsVisible && !loadingPostsVisible) || retryVisible || planetCount > 0 || logCount > 0).toBeTruthy();
  });

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

  test("code studio demo open does not emit pageerror", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/code-studio");
    const demoButton = page.locator("button", { hasText: /데모 열기|Open Demo/ }).first();
    await expect(demoButton).toBeVisible({ timeout: 15000 });

    await demoButton.click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    expect(pageErrors).toEqual([]);
  });
});
