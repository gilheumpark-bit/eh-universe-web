/**
 * E2E Test: Main Landing Page & Navigation
 * 
 * Tests the home page loads correctly and navigation works.
 */
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should render the home page with hero section', async ({ page }) => {
    await page.goto('/');
    
    // Page should have a main heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to studio from home', async ({ page }) => {
    await page.goto('/');
    
    // Find a link that navigates to studio
    const studioLink = page.locator('a[href*="/studio"]').first();
    if (await studioLink.isVisible()) {
      await studioLink.click();
      await page.waitForURL('**/studio**');
      await expect(page.url()).toContain('/studio');
    }
  });

  test('should have working header navigation', async ({ page }) => {
    await page.goto('/');
    
    // Header should be visible
    const header = page.locator('header, nav').first();
    await expect(header).toBeVisible();
    
    // Should have navigation links
    const links = header.locator('a');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('should have responsive meta viewport', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });
});
