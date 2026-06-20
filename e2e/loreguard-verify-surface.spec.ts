import { expect, test } from '@playwright/test';

const VERIFY_ID = 'LG-2605-0042-A8F5';

test.describe('Loreguard verification surface', () => {
  test('renders registered certificate metadata without manuscript content', async ({ page }) => {
    await page.route('**/api/cp/verify/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          registered: true,
          cert_id: VERIFY_ID,
          seal_number: 'SEAL-2026-VERIFY',
          registered_at: '2026-06-12T00:00:00.000Z',
          visibility: 'publisher',
          issuer_type: 'self',
          github_repo: 'eh/loreguard',
          github_commit_sha: 'abcdef1234567890',
          manuscript: 'SHOULD_NOT_RENDER',
          raw_content: 'SHOULD_NOT_RENDER',
        }),
      });
    });

    await page.goto('/verify', { waitUntil: 'domcontentloaded' });
    await page.locator('#verify-id').fill(VERIFY_ID);
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/PASS — 등록 확인|PASS — Registered/)).toBeVisible();
    await expect(page.getByText(VERIFY_ID)).toBeVisible();
    await expect(page.getByText('SEAL-2026-VERIFY')).toBeVisible();
    await expect(page.getByText('abcdef1234567890')).toBeVisible();
    await expect(page.getByText('SHOULD_NOT_RENDER')).toHaveCount(0);
  });

  test('renders fail state for an unregistered certificate id', async ({ page }) => {
    await page.route('**/api/cp/verify/**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ registered: false, error: 'cert_not_registered' }),
      });
    });

    await page.goto('/verify', { waitUntil: 'domcontentloaded' });
    await page.locator('#verify-id').fill(VERIFY_ID);
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/FAIL — 미등록|FAIL — Not registered/)).toBeVisible();
    await expect(page.getByText(/등록된 확인서가 없습니다|No certificate is registered/)).toBeVisible();
  });
});
