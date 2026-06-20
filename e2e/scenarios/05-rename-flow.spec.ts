/**
 * E2E Scenario 05 — Bulk rename (Ctrl+Shift+H).
 *
 * Covers src/components/studio/RenameDialog.tsx + StudioShell keydown handler:
 *   - Ctrl+Shift+H opens the rename dialog
 *   - From/To inputs accept typing
 *   - Preview button shows preview header with match counts (or noMatches copy)
 *   - Escape closes the dialog
 */

import { test, expect } from '@playwright/test';
import { primeStudio, STUB_CONFIG } from '../fixtures/studio-state';

test.describe('Rename flow — Ctrl+Shift+H', () => {
  test.beforeEach(async ({ page }) => {
    await primeStudio(page, { onboarded: true, withProject: true, lang: 'KO' });
  });

  test('Ctrl+Shift+H opens the rename dialog', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+Shift+KeyH');

    // Dialog has a titled header — '찾아바꾸기' (KO)
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('text=/찾아바꾸기|Rename/').first(),
    ).toBeVisible();
  });

  test('Escape closes the rename dialog', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+Shift+KeyH');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('From/To inputs accept typing and Preview renders a status row', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+Shift+KeyH');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    const fromInput = page.locator('[data-testid="rename-from-input"]');
    const toInput = page.locator('[data-testid="rename-to-input"]');
    const previewBtn = page.locator('[data-testid="rename-preview-btn"]');

    // Use a character name that exists in the seeded project.
    const original = STUB_CONFIG.characters[0].name; // "E2E 주인공"
    const replacement = 'E2E 영웅';

    await fromInput.fill(original);
    await toInput.fill(replacement);

    // Preview button enabled only once both inputs are non-empty & differ.
    await expect(previewBtn).toBeEnabled({ timeout: 2_000 });
    await previewBtn.click();

    // After preview, the dialog renders either a "Preview · N matches" header OR a no-matches row.
    await expect(
      page.locator('text=/미리보기|Preview|일치하는 항목이|No matches/').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('empty From input disables Preview button', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+Shift+KeyH');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    const previewBtn = page.locator('[data-testid="rename-preview-btn"]');
    // With no input yet, the preview button should be disabled.
    await expect(previewBtn).toBeDisabled();
  });
});
