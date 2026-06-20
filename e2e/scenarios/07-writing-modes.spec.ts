/**
 * E2E Scenario 07 — Writing modes (T-005).
 *
 * Covers src/components/studio/tabs/WritingTabInline.tsx — the active Studio
 * writing surface (not the older WritingTab wrapper):
 *   - 2 always-on mode buttons (집필 / NOA 생성)
 *   - "⚙ 고급 모드" Tier toggle — unlocks the 3 advanced modes (3단계/다듬기/고급)
 *     via the "⚙ 고급" dropdown menu once advancedWritingMode is on
 *   - Switching to 집필 (edit) reveals the rich textarea; switching to NOA 생성
 *     (ai) keeps the editDraft intact (StudioShell owns the state)
 *   - "📋 현재 적용 설정" accordion shows seeded genre/episode/characters
 *   - AI FAB is present in AI mode with Ctrl+Enter affordance
 *   - Ctrl+Enter global shortcut does not throw runtime errors
 *
 * Accessors from DOM inspection:
 *   - Mode buttons exposed by visible text label combinations.
 *   - FAB: aria-label="NOA 생성 시작" + title containing Ctrl+Enter
 *   - Advanced menu: aria-haspopup="menu" + title contains "고급 모드"
 *   - Applied Settings expandable: <summary> with "현재 적용 설정" text.
 *
 * VersionDiff prev/next buttons ("이전 버전"/"다음 버전") are only rendered when
 * an assistant message has ≥2 versions. With STUB_SESSION starting empty, this
 * is a M1 seam → flagged fixme.
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
  // Writing toolbar sticky header — visible "집필" heading.
  await expect(
    page.getByRole('heading', { name: /^집필$|^Writing$|^Write$/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/** Click the primary "집필" (manual edit) mode button in the sticky toolbar. */
async function clickEditMode(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /집필\s*직접 타이핑|Write\s*Type directly/ });
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.click();
}

/** Click the primary "NOA 생성" (ai) mode button in the sticky toolbar. */
async function clickAiMode(page: Page): Promise<void> {
  const btn = page.getByRole('button', {
    name: /NOA 생성\s*노아가 다음 장면을 씁니다|Generate\s*NOA writes/,
  });
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.click();
}

// ============================================================
// PART 2 — Tests
// ============================================================

test.describe('Writing modes — /studio writing tab', () => {
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

  test('default toolbar exposes 집필 + NOA 생성 with "⚙ 고급 모드" Tier toggle', async ({ page }) => {
    await openWriting(page);

    // Both primary buttons visible.
    await expect(
      page.getByRole('button', { name: /집필\s*직접 타이핑/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /NOA 생성\s*노아가 다음 장면을 씁니다/ }),
    ).toBeVisible();

    // Tier toggle present.
    await expect(
      page.getByRole('button', { name: /⚙ 고급 모드/ }),
    ).toBeVisible();
  });

  test('enabling Tier 2 exposes 고급 dropdown with 3단계/다듬기/고급 items', async ({ page }) => {
    await openWriting(page);

    // Click the Tier toggle to switch into advancedWritingMode=true.
    const tierToggle = page.getByRole('button', { name: /⚙ 고급 모드/ });
    await tierToggle.click();

    // After toggle, label flips to "← 기본 모드로" / "← Back to Basic".
    await expect(
      page.getByRole('button', { name: /기본 모드로|Back to Basic|Basic Mode/ }),
    ).toBeVisible({ timeout: 3_000 });

    // "고급" dropdown trigger becomes visible as an aria-haspopup="menu" button.
    const advMenuBtn = page
      .locator('button[aria-haspopup="menu"]')
      .filter({ hasText: /고급|More/ })
      .first();
    await expect(advMenuBtn).toBeVisible({ timeout: 3_000 });

    // Open the menu.
    await advMenuBtn.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    // Three advanced mode buttons — match by their aria button name which begins
    // with the label and includes the description.
    await expect(
      menu.getByRole('button', { name: /^3단계|^3-Step/ }),
    ).toBeVisible();
    await expect(
      menu.getByRole('button', { name: /^다듬기|^Refine/ }),
    ).toBeVisible();
    await expect(
      menu.getByRole('button', { name: /^고급|^Advanced/ }),
    ).toBeVisible();

    // Menu holds exactly 3 items.
    await expect(menu.locator('button')).toHaveCount(3);
  });

  test('switching 집필 → NOA → 집필 preserves editDraft through remount', async ({ page }) => {
    await openWriting(page);

    await clickEditMode(page);

    // Tiptap/ProseMirror editor: editable contenteditable region.
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 5_000 });

    const draft = '이번 회차 테스트 문단 — 중간 저장 확인';
    await editor.click();
    await editor.pressSequentially(draft, { delay: 10 });

    // Wait past NovelEditor's 300ms onUpdate debounce so editDraft is stored in StudioShell.
    await page.waitForTimeout(500);

    // Switch to AI mode (NovelEditor unmounts).
    await clickAiMode(page);
    await page.waitForTimeout(200);

    // Back to edit mode — editor should carry the draft via StudioShell's editDraft state.
    await clickEditMode(page);
    const reEditor = page.locator('[contenteditable="true"]').first();
    await expect(reEditor).toBeVisible();
    // Content preserved — check for the typed substring somewhere in the DOM.
    await expect(reEditor).toContainText(draft, { timeout: 5_000 });
  });

  test('Applied Settings accordion reveals seeded genre + episode', async ({ page }) => {
    await openWriting(page);

    // Ensure we are in a mode where the summary renders (messages list area).
    await clickEditMode(page);

    // Summary details element in the right sidebar / main column.
    const summary = page.getByText(/현재 적용 설정|Applied Settings/).first();
    await expect(summary).toBeVisible({ timeout: 10_000 });
    await summary.click();

    // Seeded genre chip — "fantasy" from STUB_CONFIG.
    await expect(page.getByText(/fantasy/i).first()).toBeVisible();

    // Seeded episode marker.
    await expect(page.getByText(/EP\.\s*1|1화/).first()).toBeVisible();
  });

  test('AI FAB renders in AI mode with Ctrl+Enter affordance', async ({ page }) => {
    await openWriting(page);
    await clickAiMode(page);

    const fab = page.locator(
      '[aria-label="NOA 생성 시작"], [aria-label="Start NOA generation"]',
    );
    await expect(fab).toBeVisible({ timeout: 5_000 });
    await expect(fab).toHaveAttribute('title', /Ctrl\+Enter/);
  });

  test('Ctrl+Enter global shortcut does not throw in AI mode', async ({ page }) => {
    await openWriting(page);
    await clickAiMode(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(400);

    expect(errors).toEqual([]);
  });

  // VersionDiff requires ≥2 versions on a message. Seeded session has zero messages
  // so the control never renders. M1 will add the pre-seeded version history path.
  test.fixme(
    'VersionDiff prev/next buttons navigate versions (M1 마일스톤에서 통과 예정)',
    async ({ page }) => {
      await openWriting(page);
      await clickAiMode(page);
      const prev = page.locator('[aria-label="이전 버전"]').first();
      const next = page.locator('[aria-label="다음 버전"]').first();
      await expect(prev).toBeVisible();
      await expect(next).toBeVisible();
    },
  );
});
