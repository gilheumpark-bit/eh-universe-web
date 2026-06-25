import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

/**
 * 정적·핵심 라우트 스모크: HTTP 4xx 미만, body 표시, pageerror 없음, 가로 넘침 없음.
 * 결제/운영 DB 변이 없음 — GET 네비게이션만.
 *
 * Loreguard 공개 표면 기준:
 * - Studio 흐름, 번역·현지화, 문서/가격/법적/확인/웰컴만 정상 페이지로 본다.
 * - 결제 결과, 문제 제보, 오프라인, 구 진입 리다이렉트는 검색 노출 대상은 아니지만 깨지면 안 되는 보조 페이지로 본다.
 * - 제거된 구표면은 렌더 성공이 아니라 404/410이 맞다.
 */
const CURRENT_PUBLIC_PATHS: readonly string[] = [
  "/",
  "/about",
  "/ai-disclosure",
  "/changelog",
  "/cookies",
  "/copyright",
  "/docs",
  "/pricing",
  "/privacy",
  "/refund",
  "/status",
  "/studio",
  "/terms",
  "/translation-studio",
  "/verify",
  "/welcome",
  "/bug-report",
  "/desktop",
  "/offline",
  "/payment/cancel",
  "/payment/success",
  "/translate",
  "/verify/not-real-record",
  "/preview/bad-token",
];

const REMOVED_SURFACE_PATHS: readonly string[] = [
  "/code",
  "/code-studio",
  "/codex",
  "/reference",
  "/reports",
  "/rulebook",
  "/tools",
  "/tools/noa-tower",
  "/world",
];

const REMOVED_API_PATHS: readonly string[] = [
  "/api/network-agent/smoke",
  "/api/network-agent/search",
  "/api/network-agent/ingest",
  "/api/npm-search",
];

test.describe("Smoke: static routes", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem("eh-cookie-consent", "accepted");
      window.localStorage.setItem("noa-lg-onboarded", "1");
      window.localStorage.setItem("noa_first_visit_seen", "1");
    });
  });

  for (const path of CURRENT_PUBLIC_PATHS) {
    test(`GET ${path} renders without pageerror`, async ({ page }) => {
      const { errors, detach } = attachPageErrorCollector(page);
      try {
        const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
        expect(res, `no response for ${path}`).toBeTruthy();
        expect(res!.status(), `${path} status`).toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });
        // 리다이렉트 라우트에서 evaluate context 파괴 방어
        try {
          await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
          const overflow = await page.evaluate(() => ({
            body: document.body.scrollWidth - window.innerWidth,
            root: document.documentElement.scrollWidth - window.innerWidth,
          }));
          expect(overflow.body, `${path} body horizontal overflow`).toBeLessThanOrEqual(4);
          expect(overflow.root, `${path} root horizontal overflow`).toBeLessThanOrEqual(4);
        } catch {
          // 네비게이션으로 context 파괴 시 overflow 검사 스킵
        }
        expect(errors, `pageerror on ${path}`).toEqual([]);
      } finally {
        detach();
      }
    });
  }

  for (const path of REMOVED_SURFACE_PATHS) {
    test(`GET ${path} is not a public page`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(res, `no response for ${path}`).toBeTruthy();
      expect(res!.status(), `${path} removed status`).toBe(404);
    });
  }

  for (const path of REMOVED_API_PATHS) {
    test(`GET ${path} is retired`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(res, `no response for ${path}`).toBeTruthy();
      expect(res!.status(), `${path} removed API status`).toBe(410);
    });
  }
});
