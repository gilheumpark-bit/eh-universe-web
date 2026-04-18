import { defineConfig, devices } from '@playwright/test';

/**
 * E2E는 기본 포트 3005에서 프로덕션 서버를 띄워 실행합니다.
 * 로컬에서 `next dev`/다른 앱이 3000을 쓰고 있어도 `npm run test:e2e`가 충돌하지 않습니다.
 * 포트 변경: PLAYWRIGHT_TEST_PORT=3010 npx playwright test
 *
 * 구조:
 *   - e2e/*.spec.ts               — 기존 smoke / API / regression 스펙 (chromium)
 *   - e2e/scenarios/*.spec.ts     — 신규 Novel Studio 시나리오 (chromium + mobile)
 *   - e2e/fixtures/studio-state.ts — 공통 픽스처 (localStorage + DGX Spark 모킹)
 */
const E2E_PORT = process.env.PLAYWRIGHT_TEST_PORT || '3005';
const E2E_ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['list']] : 'html',
  use: {
    baseURL: E2E_ORIGIN,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile project runs only the scenario subset — the rest of the suite is desktop-first.
    {
      name: 'mobile',
      testDir: './e2e/scenarios',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${E2E_PORT}`,
    url: E2E_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
