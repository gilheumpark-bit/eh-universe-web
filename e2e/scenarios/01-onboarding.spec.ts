/**
 * E2E Scenario 01 — Welcome onboarding flow.
 *
 * Covers src/app/welcome/page.tsx:
 *   - 3-slide deck renders in KO (default)
 *   - Next button advances slide index
 *   - Final "시작하기" routes to /studio and sets eh-onboarded=1
 *   - Skip button short-circuits to /studio and still sets the flag
 *   - Pre-onboarded users are redirected immediately
 */

import { test, expect } from '@playwright/test';
import {
  ONBOARD_KEY,
  mockDGXSpark,
  seedLocalStorage,
} from '../fixtures/studio-state';

test.describe('Onboarding — /welcome', () => {
  test.beforeEach(async ({ page }) => {
    // Mock AI so /studio load after onboarding does not hit network.
    await mockDGXSpark(page);
  });

  test('renders first slide in Korean by default', async ({ page }) => {
    // Not yet onboarded — should see first-slide copy.
    await seedLocalStorage(page, { onboarded: false, lang: 'KO' });
    await page.goto('/welcome');

    // Heading from SLIDES[0].heading.ko
    await expect(
      page.getByRole('heading', { name: /AI가 쓰나요\? 작가가 쓰나요\?/ }),
    ).toBeVisible({ timeout: 15_000 });

    // Skip button is always present
    await expect(page.getByRole('button', { name: /건너뛰기/ })).toBeVisible();

    // Next button present on non-last slide
    await expect(page.getByRole('button', { name: /^다음/ })).toBeVisible();
  });

  test('navigates through all 3 slides via Next', async ({ page }) => {
    await seedLocalStorage(page, { onboarded: false, lang: 'KO' });
    await page.goto('/welcome');

    // Slide 1 → 2
    await page.getByRole('button', { name: /^다음/ }).click();
    await expect(
      page.getByRole('heading', { name: /AI가 아닌, 당신을 훈련시킵니다/ }),
    ).toBeVisible();

    // Slide 2 → 3 (last)
    await page.getByRole('button', { name: /^다음/ }).click();
    await expect(
      page.getByRole('heading', { name: /같이 하세요\./ }),
    ).toBeVisible();

    // Last slide shows "시작하기" instead of "다음"
    await expect(page.getByRole('button', { name: /^시작하기/ })).toBeVisible();
  });

  test('Start button routes to /studio and sets onboarding flag', async ({ page }) => {
    await seedLocalStorage(page, { onboarded: false, lang: 'KO' });
    await page.goto('/welcome');

    // Fast-forward to last slide
    await page.getByRole('button', { name: /^다음/ }).click();
    await page.getByRole('button', { name: /^다음/ }).click();

    // Click Start
    await page.getByRole('button', { name: /^시작하기/ }).click();

    // Should end up on /studio
    await page.waitForURL(/\/studio(\?|#|$)/, { timeout: 10_000 });

    // localStorage flag is set
    const flag = await page.evaluate((k) => localStorage.getItem(k), ONBOARD_KEY);
    expect(flag).toBe('1');
  });

  test('Skip button also finishes onboarding and navigates to /studio', async ({ page }) => {
    await seedLocalStorage(page, { onboarded: false, lang: 'KO' });
    await page.goto('/welcome');

    await page.getByRole('button', { name: /건너뛰기/ }).click();

    await page.waitForURL(/\/studio(\?|#|$)/, { timeout: 10_000 });
    const flag = await page.evaluate((k) => localStorage.getItem(k), ONBOARD_KEY);
    expect(flag).toBe('1');
  });

  test('pre-onboarded users redirect out of /welcome', async ({ page }) => {
    // Flag already set — component should router.replace('/studio').
    await seedLocalStorage(page, { onboarded: true });
    await page.goto('/welcome');
    await page.waitForURL(/\/studio(\?|#|$)/, { timeout: 10_000 });
  });
});
