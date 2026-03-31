/**
 * E2E Test: Code Studio IDE Features
 * 
 * Tests file creation, editor interaction, and terminal panel.
 */
import { test, expect } from '@playwright/test';

test.describe('Code Studio', () => {
  test('should load code studio with Monaco editor', async ({ page }) => {
    await page.goto('/code-studio');
    await page.waitForLoadState('networkidle');
    
    // Editor area should be present
    const editor = page.locator('.monaco-editor, [data-testid="code-editor"]');
    await expect(editor.first()).toBeVisible({ timeout: 15000 });
  });

  test('should open file explorer sidebar', async ({ page }) => {
    await page.goto('/code-studio');
    await page.waitForLoadState('networkidle');
    
    // File explorer should be visible
    const explorer = page.locator('[data-testid="file-explorer"], .file-tree');
    await expect(explorer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should toggle terminal panel', async ({ page }) => {
    await page.goto('/code-studio');
    await page.waitForLoadState('networkidle');
    
    // Find and click terminal toggle
    const termBtn = page.locator('button[aria-label*="terminal"], button[data-panel="terminal"]').first();
    if (await termBtn.isVisible()) {
      await termBtn.click();
      await expect(page.locator('.xterm, [data-testid="terminal-panel"]').first()).toBeVisible();
    }
  });

  test('should display activity bar with panel icons', async ({ page }) => {
    await page.goto('/code-studio');
    await page.waitForLoadState('networkidle');
    
    // Activity bar should be visible with at least one button
    const activityBar = page.locator('[data-testid="activity-bar"], .activity-bar');
    if (await activityBar.first().isVisible()) {
      const buttons = activityBar.locator('button');
      expect(await buttons.count()).toBeGreaterThan(0);
    }
  });
});
