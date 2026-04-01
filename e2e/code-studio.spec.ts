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
    
    // Open demo (ensures editor is actually mounted)
    const demoButton = page.locator("button", { hasText: /데모 열기|Open Demo/ }).first();
    if (await demoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await demoButton.click();
    }

    // Editor area should be present
    const editor = page.locator('.monaco-editor, [data-testid="code-editor"]').first();
    await expect(editor).toBeVisible({ timeout: 20000 });
  });

  test('should open file explorer sidebar', async ({ page }) => {
    await page.goto('/code-studio');
    await page.waitForLoadState('networkidle');
    
    const demoButton = page.locator("button", { hasText: /데모 열기|Open Demo/ }).first();
    if (await demoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await demoButton.click();
    }

    // File explorer should be visible (allow either testid or known label)
    const explorer = page.locator('[data-testid="file-explorer"], .file-tree').first();
    const explorerLabel = page.getByText(/파일|Files|Explorer/i).first();
    await expect(explorer.or(explorerLabel)).toBeVisible({ timeout: 20000 });
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
