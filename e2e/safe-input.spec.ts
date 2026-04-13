import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

/** 식별 가능한 테스트 전용 문자열 — 결제·운영 DB 없음, 클라이언트 검색/팔레트만. */
const TEST_TAG = "AI-TEST-INPUT";
const XSS_LIKE = "<script>alert('AI-TEST-INPUT')</script>";
const LONG_EDGE = `${TEST_TAG}${"가".repeat(400)}`;

test.describe("Safe input injection (client-only)", () => {
  test("code-studio command palette accepts test tag and edge strings without pageerror", async ({
    page,
  }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      await page.goto("/code-studio", { waitUntil: "domcontentloaded", timeout: 45_000 });
      const demo = page.locator("button", { hasText: /데모 열기|Open Demo/ }).first();
      await expect(demo).toBeVisible({ timeout: 20_000 });
      await demo.click();
      await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 20_000 });

      await page.keyboard.press("Control+Shift+KeyP");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 8000 });
      const input = dialog.locator('input[type="text"]').first();
      await expect(input).toBeVisible({ timeout: 5000 });

      await input.fill(TEST_TAG);
      await expect(input).toHaveValue(TEST_TAG);
      await input.fill(XSS_LIKE);
      await input.fill(LONG_EDGE);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden({ timeout: 5000 });

      expect(errors).toEqual([]);
    } finally {
      detach();
    }
  });
});
