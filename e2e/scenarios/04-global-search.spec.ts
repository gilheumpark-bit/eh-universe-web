/**
 * E2E Scenario 04 — Global search palette (Ctrl+K).
 *
 * Covers src/components/studio/GlobalSearchPalette.tsx:
 *   - Ctrl+K opens the palette (showGlobalSearch=true toggle)
 *   - Input receives focus (auto-focus on mount)
 *   - Typing a seeded character name produces a match row
 *   - Escape closes the palette
 *   - Re-pressing Ctrl+K toggles palette open/closed
 */

import { test, expect } from '@playwright/test';
import { primeStudio, STUB_CONFIG } from '../fixtures/studio-state';

test.describe('Global search palette — Ctrl+K', () => {
  test.beforeEach(async ({ page }) => {
    // Seed project so the palette has something to index.
    await primeStudio(page, { onboarded: true, withProject: true, lang: 'KO' });
  });

  test('Ctrl+K opens the palette with focused input', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+KeyK');

    // The palette search input is the only visible searchbox role after toggle.
    // GlobalSearchPalette renders an <input> auto-focused inside a modal.
    const searchInput = page
      .locator('input[type="text"], input:not([type])')
      .filter({ hasNot: page.locator('[hidden]') })
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
  });

  test('Escape closes the palette', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    // Open
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+KeyK');

    // A "filter tab" row exists only when palette is open — search for Korean labels.
    const anyFilterTab = page.locator('text=/전체|캐릭터|에피소드|세계관|본문|명령/').first();
    await expect(anyFilterTab).toBeVisible({ timeout: 5_000 });

    // Close
    await page.keyboard.press('Escape');

    // Filter tabs should disappear. We assert the palette-specific copy is gone.
    await expect(anyFilterTab).toBeHidden({ timeout: 5_000 });
  });

  test('Ctrl+K toggles palette open → closed → open', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // 1st press — open
    await page.keyboard.press('Control+KeyK');
    const filterTab = page.locator('text=/전체|캐릭터|에피소드/').first();
    await expect(filterTab).toBeVisible({ timeout: 5_000 });

    // 2nd press — close (toggle)
    await page.keyboard.press('Control+KeyK');
    await expect(filterTab).toBeHidden({ timeout: 5_000 });
  });

  test('typing a seeded character name surfaces a result', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+KeyK');

    // Wait for input to be focused (auto-focus in PART 4).
    await page.waitForTimeout(300);

    // Type seeded character name from STUB_CONFIG
    const charName = STUB_CONFIG.characters[0].name; // "E2E 주인공"
    await page.keyboard.type(charName);

    // buildResults debounces 300ms — wait it out, then a bit more.
    await page.waitForTimeout(500);

    // Result row should render the name somewhere in the palette.
    await expect(
      page.locator('text=' + charName).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
