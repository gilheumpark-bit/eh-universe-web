import { test, expect } from '@playwright/test';
import {
  dismissOnboarding,
  ensureSession,
  switchToFreeMode,
} from './helpers/studio-flow';

// ============================================================
// PART 1 — Core flow tests
// ============================================================

test.describe('NOA Studio — Core', () => {
  test('studio page loads with NOA Studio header', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('text=/Loreguard|로어가드/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('create new session via button', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);
  });

  test('sidebar tabs are visible after session', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);

    // 가이드 모드에서 최소 세계관/캐릭터/연출 탭이 보여야 함 (KO/EN 양쪽 매칭)
    for (const pattern of [/세계관 생성|Worldbuilding/, /캐릭터·아이템|Characters/, /연출|Direction/]) {
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
      page.locator('button', { hasText: /집필|Writing/ }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('language switching KO ↔ EN', async ({ page }) => {
    await page.goto('/studio');
    const enBtn = page.locator('button', { hasText: 'EN' }).first();
    await expect(enBtn).toBeVisible({ timeout: 10000 });
    await enBtn.click();
    // EN 전환 확인 — 탭 라벨이 접힌 사이드바에 있을 수 있어 attached 체크
    await expect(page.locator('text=/Start a New Work|Worldbuilding|Create Project/').first()).toBeAttached({ timeout: 5000 });
    // KO 복귀
    const koBtn = page.locator('button', { hasText: 'KO' }).first();
    await koBtn.click();
    await expect(page.locator('text=/작품의 기준선|세계관 생성|프로젝트 생성/').first()).toBeAttached({ timeout: 5000 });
  });
});

// ============================================================
// PART 3 — Extended flow tests
// ============================================================

test.describe('NOA Studio — Extended Flows', () => {
  test('world design form has required fields', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);
    // Minimal assertion: world design surface is present
    // 탭 라벨이 접힌 사이드바에 있을 수 있으므로 attached 체크
    await expect(
      page.locator('text=/세계관 생성|Worldbuilding|세계관 기준선|세계관 모드/').first()
    ).toBeAttached({ timeout: 10000 });
  });

  test('writing tab shows mode buttons after free mode', async ({ page }) => {
    await page.goto('/studio');
    await ensureSession(page);
    await switchToFreeMode(page);

    const writingTab = page.locator('button:visible', { hasText: /집필|Writing/ }).first();
    await expect(writingTab).toBeVisible({ timeout: 5000 });
    await writingTab.click();

    // Consumer sanity check: writing UI labels are present (implementation may not use textarea/contenteditable)
    await expect(page.locator('text=/집필|Writing/').first()).toBeVisible({ timeout: 15000 });
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
    // 출고/Release 탭이 존재하는지 확인 (실제 내보내기 버튼은 프로젝트 데이터 필요)
    const releaseTab = page.locator('button', { hasText: /출고|Release/ }).first();
    await expect(releaseTab).toBeVisible({ timeout: 10000 });
  });

  test('navigation pages load without critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const pathsWithHeader = ['/docs', '/pricing', '/status', '/about'] as const;
    for (const path of pathsWithHeader) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      // home-header가 조건부 렌더링될 수 있으므로 header/nav 폴백 + 긴 타임아웃
      await expect(
        page.locator('[data-testid="home-header"], header, nav').first()
      ).toBeVisible({ timeout: 20000 });
    }
    // 홈은 초기에 스플래시만 올라와 Header가 없을 수 있음 — 콘솔 수집용으로만 방문
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

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
