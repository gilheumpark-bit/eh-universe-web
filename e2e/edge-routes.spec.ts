import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

/**
 * 동적·엣지 라우트: 500 없이 폴백 UI 또는 안내 화면 (읽기 전용 GET).
 */
test.describe("Edge & dynamic routes", () => {
  test("invalid planet id shows fallback, not 500", async ({ page }) => {
    const res = await page.goto("/network/planets/unknown-planet-e2e-id");
    expect(res?.status()).toBeLessThan(500);
    await expect(
      page.locator('a[href="/network"], a:has-text("Network"), a:has-text("네트워크")').first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("world share page without valid payload shows invalid state", async ({ page }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      const res = await page.goto("/world/e2e-smoke-id");
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByText(/Invalid world data|유효하지 않은 세계관|无效的世界观|無効な世界観/i).first(),
      ).toBeVisible({ timeout: 10000 });
      expect(errors).toEqual([]);
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

  test("archive missing slug returns graceful not-found or list", async ({ page }) => {
    const res = await page.goto("/archive/nonexistent-slug-e2e-xyz");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(/declassified|기밀 해제|尚未解密|Back to Archive|아카이브로/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
