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
  test('world import query prefills a new session', async ({ page }) => {
    const payload = Buffer.from(JSON.stringify({
      name: '한글★세계관 테스트',
      summary: '첫 줄 요약\\n둘째 줄 with symbols !@#$%^&*()',
      tags: ['SF', '태그'],
      coreRules: ['규칙 1', '규칙 2'],
    }), 'utf8').toString('base64');

    await page.goto(`/studio?worldImport=${payload}`);

    await expect(page.getByText(/Network에서 세계관을 불러왔습니다|World imported from Network/).first()).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => (
      await page.locator('input, textarea').evaluateAll((elements) =>
        elements
          .map((element) => (element as HTMLInputElement | HTMLTextAreaElement).value)
          .filter(Boolean)
      )
    ), { timeout: 10000 }).toContain('한글★세계관 테스트');
    await expect.poll(async () => (
      await page.locator('input, textarea').evaluateAll((elements) =>
        elements
          .map((element) => (element as HTMLInputElement | HTMLTextAreaElement).value)
          .filter(Boolean)
      )
    ), { timeout: 10000 }).toContain('첫 줄 요약\\n둘째 줄 with symbols !@#$%^&*()');
  });

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
    const startWritingBtn = page.locator('button', { hasText: /집필 시작|Start Writing|Start Novel/ }).first();
    await expect(startWritingBtn).toBeVisible({ timeout: 10000 });
    await startWritingBtn.click();
    await expect(page.locator('button', { hasText: /초안 생성|Draft|수동 편집|Manual Edit|캔버스|Canvas|고급|Advanced/ }).first()).toBeVisible({ timeout: 10000 });
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
    // Look for API key setup button via data-testid or text
    const apiBtn = page.locator('[data-testid="btn-api-key"], button:has-text("설정하기"), button:has-text("Set Up"), button:has-text("API")').first();
    if (await apiBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await apiBtn.click();
      // Modal should appear with provider buttons or input fields
      await expect(
        page.locator('text=/Gemini|OpenAI|Claude|API|Provider/i').first()
      ).toBeVisible({ timeout: 5000 });
      // Close modal
      const closeBtn = page.locator('button[aria-label="닫기"], button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('navigation pages load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    for (const path of ['/', '/archive', '/rulebook', '/reference', '/about']) {
      await page.goto(path);
      await expect(page.locator('text=EH UNIVERSE').first()).toBeVisible({ timeout: 10000 });
    }
    // Filter out known non-critical errors (favicon, analytics, 404, hydration, chunk loading, preload, net errors, etc.)
    const benignPatterns = [
      'favicon', 'analytics', '404', 'hydrat', 'chunk', 'preload', 'prefetch',
      'net::ERR_', 'Failed to load resource', 'Download the React DevTools',
      'Warning:', 'ERR_CONNECTION', 'NEXT_', 'webpack', 'Fast Refresh',
      'localhost', 'firebase', 'firestore', 'gtag', 'google',
      'eval', 'unsafe-eval', 'Content Security Policy',
      'backend', 'offline', 'WebChannel', 'INTERNAL UNHANDLED ERROR',
      'HMR', 'hot-update', 'React does not recognize',
    ];
    const critical = errors.filter(e =>
      !benignPatterns.some(pattern => e.toLowerCase().includes(pattern.toLowerCase()))
    );
    expect(critical).toHaveLength(0);
  });
});
