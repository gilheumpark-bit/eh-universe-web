import { test, expect } from '@playwright/test';

// ============================================================
// PART 1 — Helper: dismiss onboarding + create session
// ============================================================

async function dismissOnboarding(page: import('@playwright/test').Page) {
  // 온보딩 가이드가 뜨면 닫기
  const closeBtn = page.locator('button', { hasText: /온보딩 닫기|Close/ }).first();
  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeBtn.click();
  }
}

async function dismissApiKeyModal(page: import('@playwright/test').Page) {
  const apiModal = page.locator('[role="dialog"]').filter({ hasText: /Gemini|OpenAI|Claude|API/i }).first();
  if (await apiModal.isVisible({ timeout: 800 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(apiModal).toBeHidden({ timeout: 5000 });
  }
}

async function ensureSession(page: import('@playwright/test').Page) {
  await dismissOnboarding(page);
  await dismissApiKeyModal(page);

  // 온보딩 버튼 클릭 → 새 세션 생성 (Quick Start / Manual Setup / Try Demo)
  const newBtn = page.locator('button', { hasText: /Quick Start|Manual Setup|Try Demo|쾌속 시작|직접 설정|데모 체험/ }).first();
  await expect(newBtn).toBeVisible({ timeout: 10000 });
  await newBtn.click();
  await dismissApiKeyModal(page);

  // 세션 생성 확인: 세계관 설계 헤딩 또는 사이드바 탭이 보이면 성공
  await expect(
    page.locator('text=/세계관 설계|세계관 스튜디오|World Design|World Studio/').first()
  ).toBeVisible({ timeout: 8000 });
}

async function switchToFreeMode(page: import('@playwright/test').Page) {
  await dismissApiKeyModal(page);
  // 가이드 모드 → 자유 모드 전환 (토글 클릭)
  const modeToggle = page.locator('button[aria-label="모드 전환"], button[aria-label="Toggle mode"]').first();
  if (await modeToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    const modeLabel = page.locator('text=/가이드 모드|Guided Mode/').first();
    if (await modeLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modeToggle.click();
    }
  }
}

// ============================================================
// PART 2 — Core flow tests
// ============================================================

test.describe('NOA Studio — Core', () => {
  test('studio page loads with NOA Studio header', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('text=/NOA Studio/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('create new session via button', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);
  });

  test('sidebar tabs are visible after session', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);

    // 가이드 모드에서 최소 세계관/캐릭터/연출 탭이 보여야 함 (KO/EN 양쪽 매칭)
    for (const pattern of [/세계관 스튜디오|World Studio/, /캐릭터 스튜디오|Character Studio/, /연출 스튜디오|Direction Studio/]) {
      await expect(
        page.locator('button:visible', { hasText: pattern }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('free mode shows all tabs', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);
    await switchToFreeMode(page);

    // 자유 모드에서 집필/문체/원고도 보여야 함
    await expect(
      page.locator('button', { hasText: /집필 스튜디오|Writing/ }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('language switching KO ↔ EN', async ({ page }) => {
    await page.goto('/studio');
    const enBtn = page.locator('button', { hasText: 'EN' }).first();
    await expect(enBtn).toBeVisible({ timeout: 10000 });
    await enBtn.click();
    // EN 전환 확인
    await expect(page.locator('text=/Start New Novel|World Studio/').first()).toBeVisible({ timeout: 5000 });
    // KO 복귀
    const koBtn = page.locator('button', { hasText: 'KO' }).first();
    await koBtn.click();
    await expect(page.locator('text=/새로운 소설 시작|세계관 스튜디오/').first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// PART 3 — Extended flow tests
// ============================================================

test.describe('NOA Studio — Extended Flows', () => {
  test('world design form has required fields', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);
    // 장르 선택기 또는 시놉시스 입력 확인
    const formEl = page.locator('select, textarea').first();
    await expect(formEl).toBeVisible({ timeout: 5000 });
  });

  test('writing tab shows mode buttons after free mode', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);
    await switchToFreeMode(page);

    const writingTab = page.locator('button:visible', { hasText: /집필 스튜디오|Writing Studio|Writing/ }).first();
    await expect(writingTab).toBeVisible({ timeout: 5000 });
    await writingTab.click();

    // 집필 모드 버튼 확인
    await expect(
      page.locator('button:visible', { hasText: /초안 생성|Draft|글쓰기|Write|3단계|AUTO/ }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('API key modal opens and closes', async ({ page }) => {
    await page.goto('/studio');
    const apiBtn = page.locator('button', { hasText: /설정하기|Set Up/ }).first();
    if (await apiBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await apiBtn.click();
      await expect(
        page.locator('text=/Gemini|OpenAI|Claude|API/i').first()
      ).toBeVisible({ timeout: 5000 });
      // ESC로 닫기
      await page.keyboard.press('Escape');
    }
  });

  test('export buttons are visible', async ({ page }) => {
    await page.goto('/studio');
    await dismissOnboarding(page);
    // 내보내기 섹션이 접기식이므로 먼저 펼침
    const exportToggle = page.locator('summary', { hasText: /내보내기|Export/i }).first();
    if (await exportToggle.isVisible()) await exportToggle.click();
    for (const format of ['TXT', 'JSON', 'EPUB', 'DOCX']) {
      await expect(
        page.locator('button', { hasText: format }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('navigation pages load without critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    for (const path of ['/', '/archive', '/rulebook', '/reference', '/about']) {
      await page.goto(path);
      await expect(page.locator('text=EH UNIVERSE').first()).toBeVisible({ timeout: 10000 });
    }

    const benignPatterns = [
      'favicon', 'analytics', '404', 'chunk', 'preload', 'prefetch',
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
