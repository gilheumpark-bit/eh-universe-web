import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";
import { dismissApiKeyModal, ensureSession } from "./helpers/studio-flow";

const TEST_TAG = "AI-TEST-INPUT";
const XSS_LIKE = "<img src=x onerror=AI-TEST-INPUT>";
const LONG = `${TEST_TAG}${"Z".repeat(300)}`;

test.describe("NOA Studio — safe input & race (no API calls)", () => {
  test("global search palette accepts test tag and edge strings", async ({ page }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await ensureSession(page);

      await page.getByRole("button", { name: /Global Search|전체 검색/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 8000 });
      const input = dialog.locator("input").first();
      await expect(input).toBeVisible({ timeout: 5000 });

      await input.fill(TEST_TAG);
      await expect(input).toHaveValue(TEST_TAG);
      await input.fill(XSS_LIKE);
      await input.fill(LONG);
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden({ timeout: 5000 });

      expect(errors).toEqual([]);
    } finally {
      detach();
    }
  });

  test("Ctrl+K open/close cycles do not throw (debounce-friendly)", async ({ page }) => {
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await ensureSession(page);
      await dismissApiKeyModal(page);

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Control+KeyK");
        await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 5000 });
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5000 });
      }

      expect(errors).toEqual([]);
    } finally {
      detach();
    }
  });
});
