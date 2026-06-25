import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

/**
 * 번역 스튜디오 라우트 스모크: 200, body, pageerror 없음, 현재 패널 상호작용 1건.
 */
test.describe("Translation Studio", () => {
  test("GET /translation-studio renders and panel responds", async ({ page }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      const res = await page.goto("/translation-studio", { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(res, "no response").toBeTruthy();
      expect(res!.status(), "status").toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });

      await expect(page.getByRole("button", { name: /network|네트워크/i })).toHaveCount(0);

      // 현재 UI: Explorer / History 버튼이 존재
      const explorerButton = page.getByRole("button", { name: /Explorer|탐색/i });
      await expect(explorerButton).toBeVisible({ timeout: 20_000 });
      await explorerButton.click();

      // 클릭 후 에러 없이 패널이 동작하는지 확인
      await page.waitForTimeout(1000);

      expect(errors, "pageerror").toEqual([]);
    } finally {
      detach();
    }
  });
});
