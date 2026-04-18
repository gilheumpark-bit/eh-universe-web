/**
 * E2E Scenario 03 — Writing tab with mocked AI response.
 *
 * Covers:
 *   - F4 → writing tab becomes active
 *   - Writing surface visible (mode toggle / prompt input)
 *   - All AI network calls are intercepted via mockDGXSpark; no real traffic.
 *
 * The Studio writing flow is complex (mode toggles, quality gates, streaming).
 * We intentionally keep this smoke-level: verify the tab renders + AI calls are
 * mocked and deterministic. Deeper flow assertions belong in unit tests.
 */

import { test, expect } from '@playwright/test';
import { primeStudio } from '../fixtures/studio-state';

test.describe('Writing flow — F4 + AI mock', () => {
  test.beforeEach(async ({ page }) => {
    await primeStudio(page, { onboarded: true, withProject: true, lang: 'KO' });
  });

  test('F4 shortcut activates writing tab', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    // Focus body, then hit F4
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('F4');

    // Writing-related copy must be present somewhere after switch.
    await expect(
      page.locator('text=/집필|Writing/').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('AI endpoints are mocked — no real network hits', async ({ page }) => {
    // Track any request that slipped past the mock.
    const leaked: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      // Anything pointing at an external AI provider is a leak.
      if (/api\.ehuniverse\.com|api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.groq\.com/.test(url)) {
        leaked.push(url);
      }
    });

    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    // Switch to writing tab
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('F4');

    await page.waitForTimeout(500);

    // Zero real AI traffic is the contract: mock must catch everything.
    expect(leaked).toEqual([]);
  });

  test('mocked chat completion returns stubbed payload', async ({ page }) => {
    await page.goto('/studio');
    await expect(
      page.locator('text=/NOA Studio/i').first(),
    ).toBeVisible({ timeout: 20_000 });

    // Fire a request manually via fetch from page context to prove the mock works.
    const result = await page.evaluate(async () => {
      try {
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'e2e', messages: [] }),
        });
        return { ok: res.ok, json: await res.json() };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    });

    expect(result.ok).toBe(true);
    expect(result.json?.choices?.[0]?.message?.content).toMatch(/E2E 가짜 응답/);
  });
});
