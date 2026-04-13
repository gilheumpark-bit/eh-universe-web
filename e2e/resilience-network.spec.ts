import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

test.describe("Network resilience (read-only, no mutations)", () => {
  test("about page loads when requests are artificially delayed", async ({ page, context }) => {
    await context.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, 120));
      await route.continue();
    });
    await page.goto("/about", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main, [role='main'], article, h1").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("network hub stays interactive after going offline (no uncaught errors)", async ({
    page,
    context,
  }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      await page.goto("/network", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });

      await context.setOffline(true);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {
        /* 일부 환경에서 오프라인 리로드가 중단될 수 있음 */
      });
      await page.waitForTimeout(1500);
      expect(errors.filter((e) => !e.includes("ChunkLoadError") && !e.includes("Loading chunk"))).toEqual(
        [],
      );
    } finally {
      detach();
    }
  });
});
