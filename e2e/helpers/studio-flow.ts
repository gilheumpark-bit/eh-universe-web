import { expect, type Page } from "@playwright/test";

export async function dismissOnboarding(page: Page) {
  const closeBtn = page.locator("button", { hasText: /온보딩 닫기|Close/ }).first();
  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeBtn.click();
  }
}

export async function dismissApiKeyModal(page: Page) {
  const apiModal = page.locator('[role="dialog"]').filter({ hasText: /Gemini|OpenAI|Claude|API/i }).first();
  if (await apiModal.isVisible({ timeout: 800 }).catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(apiModal).toBeHidden({ timeout: 5000 });
  }
}

export async function ensureSession(page: Page) {
  await dismissOnboarding(page);
  await dismissApiKeyModal(page);

  const newBtn = page.locator("button", { hasText: /Quick Start|Manual Setup|Try Demo|쾌속 시작|직접 설정|데모 체험/ }).first();
  await expect(newBtn).toBeVisible({ timeout: 10000 });
  await newBtn.click();
  await dismissApiKeyModal(page);

  await expect(
    page.locator("text=/세계관 설계|세계관 스튜디오|World Design|World Studio/").first(),
  ).toBeVisible({ timeout: 8000 });
}

export async function switchToFreeMode(page: Page) {
  await dismissApiKeyModal(page);
  const modeToggle = page.locator('button[aria-label="모드 전환"], button[aria-label="Toggle mode"]').first();
  if (await modeToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    const modeLabel = page.locator("text=/가이드 모드|Guided Mode/").first();
    if (await modeLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modeToggle.click();
    }
  }
}
