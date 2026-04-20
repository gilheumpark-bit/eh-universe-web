/**
 * E2E Scenario 19 — M2 Writing Tab Refactor Regression.
 *
 * Purpose:
 *   Validate the M2 Day 3-7 extraction of WritingTabInline.tsx did not break
 *   the writing surface. Covers:
 *     - Shell renders (tsx compiles, dynamic import resolves).
 *     - ModeSwitch toolbar primary buttons + Tier toggle.
 *     - FabControls mounts in AI mode with Ctrl+Enter affordance.
 *     - SceneWarnings banner receives noa:scene-warnings events.
 *     - useWritingReducer splitView is persisted to localStorage
 *       via 'noa_split_view_default' key.
 *     - No pageerror throws across mode transitions.
 *
 * Accessors (from DOM inspection):
 *   - Mode toolbar buttons:   getByRole('button', { name: /집필\s*직접 타이핑/ })
 *   - AI mode toolbar:        getByRole('button', { name: /NOA 생성\s*노아가 다음/ })
 *   - Tier toggle:            getByRole('button', { name: /⚙ 고급 모드|Advanced Mode/ })
 *   - AI FAB:                 [aria-label="NOA 생성 시작"]
 *   - Split view toggle:      button containing "분할 뷰" / "Split"
 */

import { test, expect, type Page } from '@playwright/test';
import { primeStudio } from '../fixtures/studio-state';

// ============================================================
// PART 1 — Helpers
// ============================================================

async function openWriting(page: Page): Promise<void> {
  await page.goto('/studio');
  await expect(
    page.getByText(/NOA\s*(Studio|스튜디오)/i).first(),
  ).toBeVisible({ timeout: 20_000 });
  await page.locator('body').click({ position: { x: 10, y: 10 } });
  await page.keyboard.press('F4');
  await expect(
    page.getByRole('heading', { name: /^집필$|^Writing$|^Write$/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

// ============================================================
// PART 2 — Tests
// ============================================================

test.describe('Scenario 19 — Writing refactor regression (M2)', () => {
  test.beforeEach(async ({ page }) => {
    await primeStudio(page, { onboarded: true, withProject: true, lang: 'KO' });
    await page.addInitScript(() => {
      try {
        localStorage.setItem('loreguard_studio_onboarded', '1');
        localStorage.setItem('eh-cookie-consent', 'accepted');
        localStorage.setItem('eh-lang', 'ko');
      } catch {
        /* ignore */
      }
    });
  });

  test('19.1 — Shell mounts + primary toolbar visible', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openWriting(page);

    // ModeSwitch extracted — both primary buttons still present.
    await expect(
      page.getByRole('button', { name: /집필\s*직접 타이핑/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /NOA 생성\s*노아가 다음 장면을 씁니다/ }),
    ).toBeVisible();

    // Tier toggle present (button moved into ModeSwitch).
    await expect(
      page.getByRole('button', { name: /⚙ 고급 모드/ }),
    ).toBeVisible();

    // Split view toggle — now driven by useWritingReducer.
    await expect(
      page.getByRole('button', { name: /분할 뷰|Split/ }),
    ).toBeVisible();

    // No pageerror thrown during initial render.
    expect(errors).toEqual([]);
  });

  test('19.2 — FabControls visible in AI mode + Ctrl+Enter affordance', async ({ page }) => {
    await openWriting(page);

    const aiBtn = page.getByRole('button', {
      name: /NOA 생성\s*노아가 다음 장면을 씁니다/,
    });
    await aiBtn.click();

    // FAB rendered via extracted FabControls.
    const fab = page.locator(
      '[aria-label="NOA 생성 시작"], [aria-label="Start NOA generation"]',
    );
    await expect(fab).toBeVisible({ timeout: 5_000 });
    await expect(fab).toHaveAttribute('title', /Ctrl\+Enter/);
  });

  test('19.3 — useWritingReducer persists splitView to localStorage', async ({ page }) => {
    await openWriting(page);

    const splitBtn = page.getByRole('button', { name: /분할 뷰|Split/ });
    await splitBtn.click();

    // Reducer effect writes '1' on open.
    const opened = await page.evaluate(() =>
      localStorage.getItem('noa_split_view_default'),
    );
    expect(opened).toBe('1');

    await splitBtn.click();
    const closed = await page.evaluate(() =>
      localStorage.getItem('noa_split_view_default'),
    );
    expect(closed).toBe('0');
  });

  test('19.4 — SceneWarnings banner reacts to noa:scene-warnings event', async ({ page }) => {
    await openWriting(page);

    // Enter edit mode so the main stream area renders.
    const editBtn = page.getByRole('button', { name: /집필\s*직접 타이핑/ });
    await editBtn.click();

    // Dispatch a scene warning.
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('noa:scene-warnings', {
          detail: [
            { severity: 'warning', message: 'M2 test warning message', sceneId: 's1' },
          ],
        }),
      );
    });

    // Banner visible with message.
    await expect(
      page.getByText(/M2 test warning message/).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Clear — empty array dismisses.
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('noa:scene-warnings', { detail: [] }));
    });
    await expect(
      page.getByText(/M2 test warning message/),
    ).toHaveCount(0, { timeout: 5_000 });
  });

  test('19.5 — Mode transitions trigger zero pageerror', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openWriting(page);

    const editBtn = page.getByRole('button', { name: /집필\s*직접 타이핑/ });
    const aiBtn = page.getByRole('button', { name: /NOA 생성\s*노아가 다음 장면을 씁니다/ });

    await editBtn.click();
    await page.waitForTimeout(200);
    await aiBtn.click();
    await page.waitForTimeout(200);
    await editBtn.click();
    await page.waitForTimeout(200);

    // Ctrl+Enter in AI mode — FabControls shortcut.
    await aiBtn.click();
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(400);

    expect(errors).toEqual([]);
  });
});
