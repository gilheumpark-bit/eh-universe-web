import { expect, test, type Page } from '@playwright/test';

async function installQuietLocale(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('eh-lang', 'ko');
      localStorage.setItem('noa_studio_lang', 'KO');
      localStorage.setItem('eh-onboarded', '1');
      localStorage.setItem('noa-lg-onboarded', '1');
    } catch {
      /* storage unavailable */
    }
  });
}

test.describe('Loreguard billing/privilege local E2E', () => {
  test('POST /api/checkout does not create a session before explicit Stripe activation', async ({ page }) => {
    await installQuietLocale(page);
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'pro',
          priceId: 'price_client_injected',
          returnUrl: 'https://evil.example/steal',
        }),
      });
      return {
        status: res.status,
        body: await res.json().catch(() => ({})),
      };
    });

    expect([403, 503]).toContain(response.status);
    expect(response.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    expect(response.body).not.toHaveProperty('url');
  });

  test('pricing page stays in alpha CTA mode without triggering checkout', async ({ page }) => {
    await installQuietLocale(page);
    const checkoutRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/checkout') {
        checkoutRequests.push(request.method());
      }
    });

    const response = await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /가격 안내|Pricing/ })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('note')).toContainText(/현재 알파|Alpha/i);
    await expect(page.locator('a[href="/welcome"]').first()).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();

    const subscribeCount = await page.getByRole('button', { name: /구독 시작|Subscribe/i }).count();
    expect(subscribeCount).toBe(0);
    expect(checkoutRequests).toEqual([]);
  });

  test('payment success/cancel pages do not grant privilege without refreshed account evidence', async ({ page }) => {
    await installQuietLocale(page);

    const successResponse = await page.goto('/payment/success', { waitUntil: 'domcontentloaded' });
    expect(successResponse?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /결제가 완료되었습니다|Payment Complete/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('status')).toContainText(
      /권한은 다음 로그인 시 자동 반영됩니다|계정 권한이 갱신되었습니다|Permissions will apply automatically|Account permissions refreshed/i,
      { timeout: 20_000 },
    );

    const cancelResponse = await page.goto('/payment/cancel', { waitUntil: 'domcontentloaded' });
    expect(cancelResponse?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /결제가 취소되었습니다|Checkout Canceled/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/요금이 청구되지 않았습니다|You have not been charged/i)).toBeVisible();
  });
});
