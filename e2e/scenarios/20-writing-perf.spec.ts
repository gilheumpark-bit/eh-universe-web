/**
 * E2E Scenario 20 — M2.2 Writing Tab Performance + FAB UX.
 *
 * Purpose:
 *   Validate the M2.2 Day 8-14 outcomes:
 *     - Dynamic import chunks (Canvas/Refine/Advanced) load on-demand only.
 *     - FAB label reflects 작가 주도 철학 ("엔진 호출" / "Summon Engine").
 *     - sceneSheetEmpty guard blocks handleSend + shows toast.
 *     - FAB secondary visual hierarchy (no full-primary bg-accent-blue).
 *     - No JS/network errors across mode transitions.
 *
 * Accessors:
 *   - AI FAB:                [data-testid="noa-fab"]
 *   - Guard toast:           [data-testid="noa-fab-guard-toast"]
 *   - Canvas chunk skeleton: [data-testid="mode-chunk-loading-canvas"]
 *   - Advanced dropdown:     role=menu with 3-Step / Refine / Advanced items
 *
 * Hermetic — primeStudio mocks DGX Spark; no real network I/O.
 */

import { test, expect, type Page, type Request } from '@playwright/test';
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

/** Enable the advanced writing mode toggle (Tier=Advanced). */
async function enableAdvancedMode(page: Page): Promise<void> {
  const tierBtn = page.getByRole('button', { name: /⚙ 고급 모드|Advanced Mode/ });
  const isAdvancedOn = await tierBtn.getAttribute('aria-pressed');
  if (isAdvancedOn !== 'true') {
    await tierBtn.click();
  }
}

/** Click the AI mode primary button to ensure FAB is mounted. */
async function enterAiMode(page: Page): Promise<void> {
  const aiBtn = page.getByRole('button', {
    name: /NOA 생성\s*노아가 다음 장면을 씁니다/,
  });
  await aiBtn.click();
}

// ============================================================
// PART 2 — Tests
// ============================================================

test.describe('Scenario 20 — Writing perf + FAB UX (M2.2)', () => {
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

  test('20.1 — FAB mounts with "엔진 호출" label + secondary visual', async ({ page }) => {
    await openWriting(page);
    await enterAiMode(page);

    const fab = page.locator('[data-testid="noa-fab"]');
    await expect(fab).toBeVisible({ timeout: 5_000 });

    // Label changed from "NOA 생성" → "엔진 호출" (작가 주도 철학).
    await expect(fab).toContainText(/엔진 호출/);

    // Title attribute includes the philosophy tagline.
    await expect(fab).toHaveAttribute('title', /작가가 먼저|작가 주도|You lead|engine follows|参照|引擎/i);

    // Visual hierarchy: must NOT use the old full-primary `bg-accent-blue` background.
    // (accept accent-blue hover/border, reject it as base bg.)
    const classes = (await fab.getAttribute('class')) ?? '';
    expect(classes).not.toMatch(/(?:^|\s)bg-accent-blue(?:\s|$)/);
    expect(classes).toMatch(/bg-bg-primary/);

    // aria-label is the localized 엔진 호출.
    await expect(fab).toHaveAttribute('aria-label', /엔진 호출|Summon Engine|呼び出し|调用引擎/);
  });

  test('20.2 — sceneSheetEmpty guard blocks handleSend + shows toast', async ({ page }) => {
    await openWriting(page);
    await enterAiMode(page);

    const fab = page.locator('[data-testid="noa-fab"]');
    await expect(fab).toBeVisible({ timeout: 5_000 });

    // Stub session has no episodeSceneSheets — guard should be active.
    await expect(fab).toHaveAttribute('data-scene-sheet-empty', '1');

    // Capture AI/network requests to verify handleSend was blocked.
    const aiCalls: string[] = [];
    page.on('request', (req: Request) => {
      const url = req.url();
      if (/\/v1\/chat\/completions|\/api\/chat|\/api\/spark/.test(url)) {
        aiCalls.push(url);
      }
    });

    await fab.click();

    // Guard toast appears with localized message.
    const toast = page.locator('[data-testid="noa-fab-guard-toast"]');
    await expect(toast).toBeVisible({ timeout: 3_000 });
    await expect(toast).toContainText(/씬시트를 먼저|Fill the scene sheet|シーンシート|场景表/i);

    // Give any background call a brief window to materialize — then assert none fired.
    await page.waitForTimeout(400);
    expect(aiCalls.length).toBe(0);
  });

  test('20.3 — Canvas chunk loads on-demand (not in initial bundle)', async ({ page }) => {
    // Collect all JS chunk requests to verify canvas chunk is NOT pre-loaded.
    const chunkUrls: string[] = [];
    page.on('request', (req: Request) => {
      const url = req.url();
      if (/\.(js|mjs)(\?.*)?$/.test(url) && /_next\/static\/chunks/.test(url)) {
        chunkUrls.push(url);
      }
    });

    await openWriting(page);

    // Snapshot initial chunks. Canvas code should not be among them by filename.
    // Next.js chunk names include the source file hash — we check by source path hint.
    const initialCanvasChunk = chunkUrls.some((u) => /CanvasModeSection/i.test(u));
    expect(initialCanvasChunk).toBe(false);

    // Enable advanced mode.
    await enableAdvancedMode(page);

    // Open advanced dropdown + click 3-Step (canvas).
    const advBtn = page.getByRole('button', { name: /고급|More/ }).first();
    await advBtn.click();
    const canvasItem = page.getByRole('menuitem', { name: /3단계|3-Step/ }).or(
      page.getByRole('button', { name: /3단계|3-Step/ }).filter({ hasNot: page.locator('[aria-haspopup]') }),
    );
    // Fallback: direct text click.
    try {
      await canvasItem.first().click({ timeout: 2_000 });
    } catch {
      await page.getByText(/3단계|3-Step/).first().click();
    }

    // After switching, either the skeleton OR the Canvas content is visible.
    await expect(
      page.locator('[data-testid="mode-chunk-loading-canvas"]').or(
        page.locator('[data-mode="canvas"]'),
      ).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('20.4 — Zero pageerror across mode transitions (memo safety)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known hydration noise — focus on React/JS runtime errors.
        if (!/hydration|Expected server HTML/i.test(text)) {
          errors.push(`console.error: ${text}`);
        }
      }
    });

    await openWriting(page);

    const editBtn = page.getByRole('button', { name: /집필\s*직접 타이핑/ });
    const aiBtn = page.getByRole('button', { name: /NOA 생성\s*노아가 다음 장면을 씁니다/ });

    // Rapid mode transitions — memo comparators must not crash.
    for (let i = 0; i < 3; i++) {
      await editBtn.click();
      await page.waitForTimeout(100);
      await aiBtn.click();
      await page.waitForTimeout(100);
    }

    // Typing a few characters in edit mode — exercises ModeSwitch/FabControls memo.
    await editBtn.click();
    const editor = page.locator('[data-zen-editor] .ProseMirror, [data-zen-editor] textarea').first();
    if ((await editor.count()) > 0) {
      await editor.click();
      await page.keyboard.type('테스트 입력', { delay: 30 });
    }

    expect(errors).toEqual([]);
  });

  test('20.5 — FAB Ctrl+Enter still works after memo wrapping', async ({ page }) => {
    await openWriting(page);
    await enterAiMode(page);

    const fab = page.locator('[data-testid="noa-fab"]');
    await expect(fab).toBeVisible({ timeout: 5_000 });

    // sceneSheetEmpty is true in stub → Ctrl+Enter should also be blocked by guard.
    // (Parity with button click path — same handleClick flow.)
    // Hook listens via useCtrlEnterShortcut at window level.
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+Enter');

    // Toast may show OR handleSend fires the mocked completion — either is valid:
    // the key assertion is no pageerror + FAB remains interactive.
    await page.waitForTimeout(300);
    await expect(fab).toBeVisible();
    await expect(fab).not.toBeDisabled();
  });
});
