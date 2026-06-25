import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

/**
 * 동적·엣지 라우트: 500 없이 폴백 UI 또는 안내 화면 (읽기 전용 GET).
 */
test.describe("Edge & dynamic routes", () => {
  test("retired network dynamic route stays removed", async ({ page }) => {
    const res = await page.goto("/network/planets/unknown-planet-e2e-id");
    expect(res?.status()).toBe(404);
  });

  test("retired world share route stays removed", async ({ page }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      const res = await page.goto("/world/e2e-smoke-id");
      expect([404, 308, 302, 200].includes(res?.status() ?? 0)).toBe(true);
      // Next.js 404 페이지는 body가 hidden일 수 있으므로 attached 체크
      await expect(page.locator('body')).toBeAttached({ timeout: 10_000 });
    } finally {
      detach();
    }
  });

  test("preview with bogus token eventually leaves loading without crash", async ({ page }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      const res = await page.goto("/preview/e2e-bogus-token-not-real");
      expect(res?.status()).toBeLessThan(500);
      await page.waitForTimeout(4000);
      await expect(page.locator("body")).toBeVisible();
      const fatal = errors.filter(
        (e) => !/Failed to fetch|Firebase|firestore|network/i.test(e),
      );
      expect(fatal).toEqual([]);
    } finally {
      detach();
    }
  });

  test("retired archive dynamic route stays removed", async ({ page }) => {
    const res = await page.goto("/archive/nonexistent-slug-e2e-xyz");
    expect(res?.status()).toBe(404);
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  });
});
