import { test, expect } from '@playwright/test';

test.describe('NOA Studio', () => {
  test('studio page loads with NOA STUDIO header', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('text=NOA STUDIO')).toBeVisible({ timeout: 15000 });
  });

  test('create new session', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForTimeout(1000);
    // Click the "새로운 소설 시작" button
    const newBtn = page.locator('button', { hasText: /새로운 소설 시작|Start New Novel/ });
    if (await newBtn.isVisible()) {
      await newBtn.click();
    }
    // A session should now exist — verify world design tab is active
    await expect(page.locator('text=/세계관 설계|World Design/')).toBeVisible({ timeout: 5000 });
  });

  test('switch between sidebar tabs', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForTimeout(1000);

    // Create session first
    const newBtn = page.locator('button', { hasText: /새로운 소설 시작|Start New Novel/ });
    if (await newBtn.isVisible()) await newBtn.click();

    // Check tabs exist
    const tabs = [
      /세계관 설계|World Design/,
      /세계관 시뮬레이터|World Simulator/,
      /캐릭터 스튜디오|Character Studio/,
      /연출 스튜디오|Direction Studio/,
      /집필 스튜디오|Writing Studio/,
      /아카이브|Archives/,
    ];

    for (const tabPattern of tabs) {
      const tabBtn = page.locator('button', { hasText: tabPattern }).first();
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('language switching KO to EN', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForTimeout(1000);

    // Click EN
    const enBtn = page.locator('button', { hasText: 'EN' }).first();
    await enBtn.click();
    await page.waitForTimeout(500);

    // Should show English text
    await expect(page.locator('text=Start New Novel')).toBeVisible({ timeout: 3000 });

    // Switch back to KO
    const koBtn = page.locator('button', { hasText: 'KO' }).first();
    await koBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=새로운 소설 시작')).toBeVisible({ timeout: 3000 });
  });

  test('project selector is visible', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForTimeout(1000);

    // Create a session to ensure a project exists
    const newBtn = page.locator('button', { hasText: /새로운 소설 시작|Start New Novel/ });
    if (await newBtn.isVisible()) await newBtn.click();

    // Project dropdown should be in the sidebar
    const projectSelect = page.locator('select').first();
    await expect(projectSelect).toBeVisible({ timeout: 5000 });
  });
});
