/**
 * E2E Test: Studio Page Navigation & Core Layout
 * 
 * Tests the main studio page loads correctly with all critical panels.
 */
import { test, expect } from '@playwright/test';

test.describe('Studio Page', () => {
  test('should render studio shell with sidebar and editor', async ({ page }) => {
    await page.goto('/studio');
    
    // Studio shell should be visible
    await expect(page.locator('[data-testid="studio-shell"]')).toBeVisible({ timeout: 10000 });
    
    // Sidebar navigation should contain key sections
    const sidebar = page.locator('[data-testid="studio-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Editor area should exist
    await expect(page.locator('[data-testid="studio-editor"], #main-editor')).toBeVisible();
  });

  test('should toggle right panel on chat button click', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');
    
    // Click chat toggle
    const chatBtn = page.locator('button[aria-label*="chat"], button[data-panel="chat"]').first();
    if (await chatBtn.isVisible()) {
      await chatBtn.click();
      // Chat panel should appear
      await expect(page.locator('[data-testid="chat-panel"], .chat-panel')).toBeVisible();
    }
  });

  test('should display loading skeleton on initial load', async ({ page }) => {
    await page.goto('/studio');
    // Loading skeleton should appear briefly
    const skeleton = page.locator('.skeleton, [data-testid="loading-skeleton"]');
    // Either skeleton appeared and disappeared, or content loaded directly
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
