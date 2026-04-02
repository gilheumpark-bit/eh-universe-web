import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

/**
 * 번역 스튜디오 라우트 스모크: 200, body, pageerror 없음, 워크스페이스 탭바 상호작용 1건.
 */
test.describe("Translation Studio", () => {
  test("GET /translation-studio renders and workspace tabs respond", async ({ page }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      const res = await page.goto("/translation-studio", { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(res, "no response").toBeTruthy();
      expect(res!.status(), "status").toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });

      const networkTab = page.getByRole("button", { name: /network|네트워크/i });
      await expect(networkTab).toBeVisible({ timeout: 20_000 });
      await networkTab.click();
      await expect(page.getByRole("navigation", { name: /workspace|작업 영역/i })).toBeVisible();

      expect(errors, "pageerror").toEqual([]);
    } finally {
      detach();
    }
  });
});
