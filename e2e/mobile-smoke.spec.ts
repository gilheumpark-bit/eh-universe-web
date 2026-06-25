import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

/**
 * 모바일 뷰포트에서 핵심 셸이 깨지지 않는지 (터치 타깃·레이아웃 스모크).
 */
test.describe("Mobile viewport smoke", () => {
  test("home body and splash or content visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  });

  test("studio entry reaches a visible mobile shell", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 20000 });
  });

  test("about support page has h1", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
  });
});
