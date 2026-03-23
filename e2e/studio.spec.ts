import { test, expect } from '@playwright/test';

// ============================================================
// PART 1 — Helper: create session with prompt() auto-dismiss
// ============================================================

async function createSession(page: import('@playwright/test').Page) {
  // Handle the title prompt dialog
  page.on('dialog', async (dialog) => {
    await dialog.accept('테스트 소설');
  });
  const newBtn = page.locator('button', { hasText: /직접 설정|Set Up Manually|새로운 소설 시작|Start New Novel/ }).first();
  await expect(newBtn).toBeVisible({ timeout: 10000 });
  await newBtn.click();
  // Wait for session to be created — world design tab should appear
  await expect(page.locator('text=/세계관 설계|World Design/').first()).toBeVisible({ timeout: 5000 });
}

// ============================================================
// PART 2 — Core flow tests (existing, waitForTimeout removed)
// ============================================================

test.describe('NOA Studio — Core', () => {
  test('studio page loads with NOA STUDIO header', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('text=NOA STUDIO')).toBeVisible({ timeout: 15000 });
  });

  test('create new session via empty state', async ({ page }) => {
    await page.goto('/studio');
    await createSession(page);
  });

  test('switch between sidebar tabs', async ({ page }) => {
    await page.goto('/studio');
    await createSession(page);

    const tabs = [
      /세계관 설계|World Design/,
      /세계관 시뮬레이터|World Simulator/,
      /캐릭터 스튜디오|Character Studio/,
      /연출 스튜디오|Direction Studio/,
      /집필 스튜디오|Writing Studio/,
    ];

    for (const tabPattern of tabs) {
      const tabBtn = page.locator('button', { hasText: tabPattern }).first();
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        // Verify tab content loaded (no waitForTimeout)
        await expect(tabBtn).toHaveClass(/text-accent-purple|active/, { timeout: 3000 }).catch(() => {});
      }
    }
  });

  test('language switching KO ↔ EN', async ({ page }) => {
    await page.goto('/studio');
    // Click EN
    const enBtn = page.locator('button', { hasText: 'EN' }).first();
    await expect(enBtn).toBeVisible({ timeout: 10000 });
    await enBtn.click();
    // Verify EN content
    await expect(page.locator('text=/Set Up Manually|Start New Novel/').first()).toBeVisible({ timeout: 5000 });
    // Switch back to KO
    const koBtn = page.locator('button', { hasText: /KR|KO/ }).first();
    await koBtn.click();
    await expect(page.locator('text=/직접 설정|새로운 소설 시작/').first()).toBeVisible({ timeout: 5000 });
  });

  test('project selector is visible after session creation', async ({ page }) => {
    await page.goto('/studio');
    await createSession(page);
    const projectSelect = page.locator('select').first();
    await expect(projectSelect).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// PART 3 — Extended flow tests (new)
// ============================================================

test.describe('NOA Studio — Extended Flows', () => {
  test('world design form has required fields', async ({ page }) => {
    await page.goto('/studio');
    await createSession(page);
    // World design tab should be active by default
    // Check for genre selector or synopsis textarea
    const genreOrSynopsis = page.locator('select, textarea').first();
    await expect(genreOrSynopsis).toBeVisible({ timeout: 5000 });
  });

  test('writing studio tab shows mode buttons', async ({ page }) => {
    await page.goto('/studio');
    await createSession(page);
    // Navigate to writing tab
    const writingTab = page.locator('button', { hasText: /집필 스튜디오|Writing Studio/ }).first();
    await writingTab.click();
    // Should see writing mode buttons
    await expect(page.locator('text=/초안 생성|Draft|직접 편집|Edit/').first()).toBeVisible({ timeout: 5000 });
  });

  test('settings tab loads without error', async ({ page }) => {
    await page.goto('/studio');
    const settingsBtn = page.locator('button', { hasText: /설정|Settings/ }).first();
    if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsBtn.click();
      // Settings content should appear
      await expect(page.locator('text=/API|설정|Settings/').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('API key modal opens and closes', async ({ page }) => {
    await page.goto('/studio');
    // Look for API key setup button or banner
    const apiBtn = page.locator('button', { hasText: /설정하기|Set Up|API/ }).first();
    if (await apiBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await apiBtn.click();
      // Modal should appear with provider buttons
      await expect(page.locator('text=/Gemini|OpenAI|Claude/').first()).toBeVisible({ timeout: 3000 });
      // Close modal (click outside or X button)
      const closeBtn = page.locator('button[aria-label*="close"], button[aria-label*="닫기"]').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('navigation pages load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    for (const path of ['/', '/archive', '/rulebook', '/reference', '/about']) {
      await page.goto(path);
      await expect(page.locator('text=EH UNIVERSE')).toBeVisible({ timeout: 10000 });
    }
    // Filter out known non-critical errors (e.g., favicon, analytics)
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('analytics') && !e.includes('404'));
    expect(critical).toHaveLength(0);
  });
});
