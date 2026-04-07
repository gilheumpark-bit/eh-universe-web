/**
 * apps/desktop/e2e/playwright.config.ts
 *
 * Playwright config for Electron e2e tests.
 *
 * Tests live in apps/desktop/e2e/specs/. They drive the packaged
 * Electron app via @playwright/test's electron launcher.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,           // Electron sessions can't share state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
