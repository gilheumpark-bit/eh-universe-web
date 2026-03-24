import { expect, test } from "@playwright/test";

// ============================================================
// PART 1 - NETWORK LANDING AND ENTRY FLOWS
// ============================================================

test.describe("EH Network", () => {
  test("header network link navigates to network landing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /EH Universe/i }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole("link", { name: "NETWORK" }).first().click();
    await expect(page).toHaveURL(/\/network$/);
    await expect(page.locator("text=/행성 등록하기|Register a Planet/").first()).toBeVisible({ timeout: 10000 });
  });

  test("network landing shows core sections", async ({ page }) => {
    await page.goto("/network");

    await expect(page.locator("text=/행성 등록하기|Register a Planet/").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/최신 로그 보기|View Latest Logs/").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/행성 등록소|Planet Registry/").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/관측 로그|Observation Log/").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/정산 결과|Settlement Results?/").first()).toBeVisible({ timeout: 10000 });
  });

  test("network new page asks unauthenticated user to sign in", async ({ page }) => {
    await page.goto("/network/new");

    await expect(page.locator("text=/행성을 만들려면 먼저 로그인하세요.|Sign in before creating your planet./").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button", { hasText: /Google 로그인|Sign In with Google/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test("network log composer asks unauthenticated user to sign in", async ({ page }) => {
    await page.goto("/network/logs/new");

    await expect(page.locator("text=/관측 로그를 쓰려면 로그인하세요.|Sign in to publish a log./").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button", { hasText: /Google 로그인|Sign In with Google/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test("invalid planet detail shows fallback state without crashing", async ({ page }) => {
    await page.goto("/network/planets/unknown-planet-id");

    await expect(page.locator("text=/행성을 찾을 수 없습니다.|Planet not found./").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/네트워크 홈으로|Back to Network/").first()).toBeVisible({ timeout: 10000 });
  });
});

// IDENTITY_SEAL: PART-1 | role=network e2e coverage | inputs=public routes | outputs=core route assertions
