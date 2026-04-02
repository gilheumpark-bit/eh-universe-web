import { defineConfig, devices } from '@playwright/test';

/**
 * E2E는 기본 포트 3005에서 프로덕션 서버를 띄워 실행합니다.
 * 로컬에서 `next dev`/다른 앱이 3000을 쓰고 있어도 `npm run test:e2e`가 충돌하지 않습니다.
 * 포트 변경: PLAYWRIGHT_TEST_PORT=3010 npx playwright test
 */
const E2E_PORT = process.env.PLAYWRIGHT_TEST_PORT || '3005';
const E2E_ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: E2E_ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${E2E_PORT}`,
    url: E2E_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
