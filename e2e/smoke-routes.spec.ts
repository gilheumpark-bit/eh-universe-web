import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

/**
 * 정적·핵심 라우트 스모크: HTTP 4xx 미만, body 표시, pageerror 없음.
 * 결제/운영 DB 변이 없음 — GET 네비게이션만.
 */
const STATIC_SMOKE_PATHS: readonly string[] = [
  "/",
  "/about",
  "/archive",
  "/code-studio",
  "/codex",
  "/docs",
  "/network",
  "/network/guidelines",
  "/network/agent",
  "/network/admin/reports",
  "/network/admin/settlements",
  "/reference",
  "/reports",
  "/rulebook",
  "/studio",
  "/tools",
  "/tools/galaxy-map",
  "/tools/neka-sound",
  "/tools/noa-tower",
  "/tools/soundtrack",
  "/studio?tab=style",
  "/tools/vessel",
  "/tools/warp-gate",
];

test.describe("Smoke: static routes", () => {
  for (const path of STATIC_SMOKE_PATHS) {
    test(`GET ${path} renders without pageerror`, async ({ page }) => {
      const { errors, detach } = attachPageErrorCollector(page);
      try {
        const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
        expect(res, `no response for ${path}`).toBeTruthy();
        expect(res!.status(), `${path} status`).toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });
        expect(errors, `pageerror on ${path}`).toEqual([]);
      } finally {
        detach();
      }
    });
  }
});
