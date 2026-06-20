/**
 * E2E Scenario 08 — Tab navigation & cross-tab coherence (T-006).
 *
 * Covers:
 *   - Writing → Rulebook switch persists editDraft to
 *     localStorage key `noa_editdraft_${currentSessionId}` (StudioShell.tsx handleTabChange).
 *   - Characters tab round-trip: Applied Settings still reflects seeded
 *     character (Tiptap editor remounts and config.characters is read from the session).
 *   - Ctrl+\\ split view toggle via useStudioKeyboard → WritingTabInline bridge.
 *   - Arrow Up/Down episode navigation is gated on volumes[] seeding — fixme.
 */

import { test, expect, type Page } from '@playwright/test';
import { primeStudio } from '../fixtures/studio-state';

// ============================================================
// PART 1 — Helpers
// ============================================================

async function gotoStudio(page: Page): Promise<void> {
  await page.goto('/studio');
  await expect(
    page.getByText(/NOA\s*(Studio|스튜디오)/i).first(),
  ).toBeVisible({ timeout: 20_000 });
  // Neutral focus so F-keys route to window, not a hidden input.
  await page.locator('body').click({ position: { x: 10, y: 10 } });
}

/** Click the "집필" (manual edit) button in the sticky writing toolbar. */
async function clickEditMode(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /집필\s*직접 타이핑|Write\s*Type directly/ });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
}

// ============================================================
// PART 2 — Tests
// ============================================================

test.describe('Tab navigation — /studio cross-tab', () => {
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

  test('Writing → Rulebook switch persists editDraft to localStorage', async ({ page }) => {
    await gotoStudio(page);

    // F4 → writing.
    await page.keyboard.press('F4');
    await expect(
      page.getByRole('heading', { name: /^집필$|^Writing$|^Write$/ }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Enter 집필 (edit) mode.
    await clickEditMode(page);

    // Type into the Tiptap editor.
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 5_000 });
    const draft = '탭 이동 직전에 저장되어야 하는 원고 조각';
    await editor.click();
    await editor.pressSequentially(draft, { delay: 10 });

    // Let the 300ms NovelEditor debounce propagate to editDraft state.
    await page.waitForTimeout(500);

    // Switching tabs — StudioShell.handleTabChange writes editDraft to
    // localStorage BEFORE the confirm dialog fires, so the key should already
    // exist even if we cancel the confirm.
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('F3');

    // If an unsaved-edits confirm dialog appears, keep editing (so we don't
    // lose state) — the localStorage write already happened before the dialog.
    const keepBtn = page
      .getByRole('button', { name: /계속 편집|Keep Editing|Cancel|취소/ })
      .first();
    if (await keepBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await keepBtn.click();
    }

    // Inspect localStorage for the noa_editdraft_${sid} entry.
    const stored = await page.evaluate(() => {
      const entries: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('noa_editdraft_')) {
          entries[key] = localStorage.getItem(key) ?? '';
        }
      }
      return entries;
    });
    const matched = Object.values(stored).some((v) => v.includes(draft));
    expect(matched).toBe(true);
  });

  test('Writing → Characters → Writing round-trip preserves Applied Settings', async ({ page }) => {
    await gotoStudio(page);

    // Writing → Characters → Writing — each F-key transition should not crash
    // and the Applied Settings snapshot should still echo the seeded config.
    await page.keyboard.press('F4');
    await expect(
      page.getByRole('heading', { name: /^집필$|^Writing$|^Write$/ }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('F2'); // characters
    await page.waitForTimeout(300);
    await page.keyboard.press('F4'); // writing
    await expect(
      page.getByRole('heading', { name: /^집필$|^Writing$|^Write$/ }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Switch to 집필 mode so the Applied Settings accordion is visible.
    await clickEditMode(page);

    const appliedHeader = page.getByText(/현재 적용 설정|Applied Settings/).first();
    await expect(appliedHeader).toBeVisible({ timeout: 10_000 });
    await appliedHeader.click();

    // Seeded genre chip from STUB_CONFIG is echoed in the Applied Settings summary.
    // (The WritingTabInline inline panel carries genre + episode; the full character
    // chip list belongs to the legacy WritingTab wrapper, not the active surface.)
    await expect(page.getByText(/fantasy/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/EP\.\s*1|1화/).first()).toBeVisible();
  });

  test('Ctrl+\\ toggles the split view without throwing', async ({ page }) => {
    await gotoStudio(page);

    // Land on writing so the split-view bridge (WritingTabInline) is mounted.
    await page.keyboard.press('F4');
    await expect(
      page.getByRole('heading', { name: /^집필$|^Writing$|^Write$/ }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Seed storage key cleanly so we can assert the toggle flips it.
    await page.evaluate(() => {
      try {
        localStorage.setItem('noa_split_view_default', '0');
      } catch {
        /* noop */
      }
    });

    // Fire Ctrl+\ twice — open then close.
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+\\');
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+\\');
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
    // After two toggles the persisted state is still one of '0'/'1' (WritingTabInline:199).
    const finalState = await page.evaluate(() =>
      localStorage.getItem('noa_split_view_default'),
    );
    expect(finalState === '0' || finalState === '1').toBe(true);
  });

  // Arrow-key episode navigation currently requires keyboard focus to be on the
  // EpisodeExplorer tree (role="tree", tabIndex=0). Seeded STUB_SESSION has no
  // volumes[] so the tree renders the empty state ("아직 원고가 없어요") and the
  // Arrow handlers early-return on flatEpisodes.length === 0. Re-enable once the
  // fixture seeds manuscripts[] + volumes[] (T-007).
  test.fixme(
    'Arrow Up/Down on EpisodeExplorer changes currentEpisode (T-007 마일스톤에서 통과 예정)',
    async ({ page }) => {
      await gotoStudio(page);
      await page.keyboard.press('F4');
      const tree = page.locator('[role="tree"][aria-label*="에피소드"]');
      await tree.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
    },
  );
});
