import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { dismissOnboarding, dismissApiKeyModal } from "./helpers/studio-flow";

const E2E_PORT = process.env.PLAYWRIGHT_TEST_PORT || "3005";
const ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

const CAP_BYOK_ONLY = JSON.stringify({
  byokRequired: true,
  hosted: {
    gemini: false,
    openai: false,
    claude: false,
    groq: false,
    mistral: false,
    ollama: false,
    lmstudio: false,
  },
  supportedProviders: ["gemini", "openai", "claude", "groq", "mistral", "ollama", "lmstudio"],
  message: "BYOK (E2E stub)",
});

const CAP_HOSTED_GEMINI = JSON.stringify({
  byokRequired: false,
  hosted: {
    gemini: true,
    openai: false,
    claude: false,
    groq: false,
    mistral: false,
    ollama: false,
    lmstudio: false,
  },
  supportedProviders: ["gemini", "openai", "claude", "groq", "mistral", "ollama", "lmstudio"],
  message: "Hosted Gemini (E2E stub)",
});

async function routeCapabilities(page: Page, body: string) {
  await page.route("**/api/ai-capabilities", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
}

/** Deep-link — avoids sidebar collapsed / duplicate tab-settings (mobile vs footer) flakes. */
async function openStudioSettings(page: Page, lang: "ko" | "en" | "ja" | "zh" = "ko") {
  await page.addInitScript((lc) => {
    try {
      localStorage.setItem("eh-lang", lc);
      localStorage.removeItem("noa_api_banner_dismissed");
    } catch {
      /* ignore */
    }
  }, lang);
  await page.goto("/studio?tab=settings", { waitUntil: "domcontentloaded" });
  await dismissOnboarding(page);
  await dismissApiKeyModal(page);
  await expect(
    page.getByRole("heading", { name: /설정 및 계정|Settings & Account|設定とアカウント|设置与账户/ }),
  ).toBeVisible({ timeout: 20_000 });
}

function chatHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Origin: ORIGIN,
  };
}

test.describe("BYOK / API settings — commercial matrix (30)", () => {
  test.describe("A. Studio UI — deterministic capabilities stub", () => {
    test.beforeEach(async ({ page }) => {
      await routeCapabilities(page, CAP_BYOK_ONLY);
    });

    test("01 tab-settings control is present", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.setItem("eh-lang", "ko");
        } catch {
          /* ignore */
        }
      });
      await page.goto("/studio", { waitUntil: "domcontentloaded" });
      await dismissOnboarding(page);
      const footerGear = page.locator('[data-testid="tab-settings"]:not([role="tab"])');
      const mobileTab = page.locator('[data-testid="tab-settings"][role="tab"]');
      await expect
        .poll(
          async () =>
            (await footerGear.isVisible().catch(() => false)) || (await mobileTab.isVisible().catch(() => false)),
          { timeout: 15_000 },
        )
        .toBe(true);
      expect(await page.locator('[data-testid="tab-settings"]').count()).toBeGreaterThanOrEqual(1);
    });

    test("02 settings view opens from sidebar", async ({ page }) => {
      await openStudioSettings(page, "ko");
      await expect(page.getByTestId("settings-api-key-row")).toBeVisible();
    });

    test("03 API key row shows management copy (KO)", async ({ page }) => {
      await openStudioSettings(page, "ko");
      await expect(page.getByText("API 키 관리")).toBeVisible();
    });

    test("04 badge 미설정 when no personal key and no hosted", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("noa_api_key");
          localStorage.removeItem("noa_api_key_ts");
          localStorage.setItem("noa_active_provider", "gemini");
          localStorage.setItem("eh-lang", "ko");
        } catch {
          /* ignore */
        }
      });
      await page.goto("/studio?tab=settings", { waitUntil: "domcontentloaded" });
      await dismissOnboarding(page);
      await expect(page.getByTestId("settings-api-key-status")).toContainText("미설정", { timeout: 15_000 });
    });

    test("05 badge Not Set in EN locale", async ({ page }) => {
      await openStudioSettings(page, "en");
      await expect(page.getByTestId("settings-api-key-status")).toContainText("Not Set", { timeout: 15_000 });
    });

    test("06 open API modal from settings row", async ({ page }) => {
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.getByTestId("api-key-modal-secret-input")).toBeVisible();
    });

    test("07 modal secret input accepts focus", async ({ page }) => {
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await page.getByTestId("api-key-modal-secret-input").click();
      await expect(page.getByTestId("api-key-modal-secret-input")).toBeFocused();
    });

    test("08 Escape closes API modal", async ({ page }) => {
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await page.keyboard.press("Escape");
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 8000 });
    });

    test("09 close button on modal header", async ({ page }) => {
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await page.getByTestId("api-key-modal-close").click();
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 8000 });
    });

    test("10 save dummy key then badge shows configured (KO)", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("noa_api_key");
          localStorage.removeItem("noa_api_key_ts");
          localStorage.setItem("noa_active_provider", "gemini");
        } catch {
          /* ignore */
        }
      });
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await page.getByTestId("api-key-modal-secret-input").fill("AIza-e2e-dummy-key-not-real");
      await page.getByTestId("api-key-modal-save").click();
      await page.getByTestId("api-key-modal-close").click();
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 8000 });
      await expect(page.getByTestId("settings-api-key-status")).toContainText("설정됨", { timeout: 10_000 });
    });

    test("11 delete key restores 미설정", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          const slots = [{ id: "slot-e2e", provider: "gemini", apiKey: "noa:1:e2e", model: "gemini-2.5-pro", role: "default", label: "e2e", enabled: true }];
          localStorage.setItem("eh-api-key-slots", JSON.stringify(slots));
          localStorage.setItem("noa_api_key", "noa:1:e2e");
          localStorage.setItem("noa_active_provider", "gemini");
        } catch {
          /* ignore */
        }
      });
      await openStudioSettings(page, "ko");
      await expect(page.getByTestId("settings-api-key-status")).toContainText("설정됨", { timeout: 15_000 });
      await page.getByTestId("settings-api-key-row").click();
      await page.getByTestId("api-key-modal-delete").click();
      await page.getByTestId("api-key-modal-close").click();
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 8000 });
      await expect(page.getByTestId("settings-api-key-status")).toContainText("미설정", { timeout: 10_000 });
    });

    test("12 test connection disabled without input and no storage", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("noa_api_key");
          localStorage.removeItem("noa_api_key_ts");
        } catch {
          /* ignore */
        }
      });
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await expect(page.getByTestId("api-key-modal-test")).toBeDisabled();
    });

    test("13 JP locale shows 未設定", async ({ page }) => {
      await openStudioSettings(page, "ja");
      await expect(page.getByTestId("settings-api-key-status")).toContainText("未設定", { timeout: 15_000 });
    });

    test("14 CN locale shows 未设置", async ({ page }) => {
      await openStudioSettings(page, "zh");
      await expect(page.getByTestId("settings-api-key-status")).toContainText("未设置", { timeout: 15_000 });
    });

    test("15 banner API setup opens modal via btn-api-key", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("noa_api_key");
          localStorage.removeItem("noa_api_key_ts");
          localStorage.removeItem("noa_api_banner_dismissed");
        } catch {
          /* ignore */
        }
      });
      await page.goto("/studio", { waitUntil: "domcontentloaded" });
      await dismissOnboarding(page);
      await expect(page.getByTestId("btn-api-key")).toBeVisible({ timeout: 20_000 });
      await page.getByTestId("btn-api-key").click();
      await expect(page.getByTestId("api-key-modal-secret-input")).toBeVisible({ timeout: 8000 });
    });

    test("16 save disabled when empty and no prior key", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("noa_api_key");
          localStorage.removeItem("noa_api_key_ts");
        } catch {
          /* ignore */
        }
      });
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await expect(page.getByTestId("api-key-modal-save")).toBeDisabled();
    });

    test("17 provider chip Google Gemini is selectable", async ({ page }) => {
      await openStudioSettings(page, "ko");
      await page.getByTestId("settings-api-key-row").click();
      await page.getByTestId("provider-chip-openai").click();
      await expect(page.getByTestId("api-key-modal-secret-input")).toBeVisible();
      await page.getByTestId("provider-chip-gemini").click();
      await expect(page.getByTestId("api-key-modal-secret-input")).toBeVisible();
    });
  });

  test.describe("B. Hosted-only badge (stub)", () => {
    test.beforeEach(async ({ page }) => {
      await routeCapabilities(page, CAP_HOSTED_GEMINI);
    });

    test("18 플랫폼 키만 when hosted gemini and no personal key", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("noa_api_key");
          localStorage.removeItem("noa_api_key_ts");
          localStorage.setItem("noa_active_provider", "gemini");
          localStorage.setItem("eh-lang", "ko");
        } catch {
          /* ignore */
        }
      });
      await page.goto("/studio?tab=settings", { waitUntil: "domcontentloaded" });
      await dismissOnboarding(page);
      await expect(page.getByTestId("settings-api-key-status")).toContainText("플랫폼", { timeout: 20_000 });
    });

    test("19 personal key overrides — shows 설정됨 with hosted also true", async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.setItem("noa_api_key", "noa:1:e2e-personal");
          localStorage.setItem("noa_active_provider", "gemini");
          localStorage.setItem("eh-lang", "ko");
        } catch {
          /* ignore */
        }
      });
      await page.goto("/studio?tab=settings", { waitUntil: "domcontentloaded" });
      await dismissOnboarding(page);
      await expect(page.getByTestId("settings-api-key-status")).toContainText("설정됨", { timeout: 20_000 });
    });
  });

  test.describe("C. API contracts — chat + capabilities", () => {
    async function postChat(request: APIRequestContext, body: unknown, headers?: Record<string, string>) {
      return request.post("/api/chat", {
        headers: { ...chatHeaders(), ...headers },
        data: typeof body === "string" ? body : JSON.stringify(body),
      });
    }

    test("20 GET /api/health is sub-500", async ({ request }) => {
      const res = await request.get("/api/health");
      expect(res.status(), "health status").toBeLessThan(500);
    });

    test("21 POST /api/chat without Origin is rejected (CSRF)", async ({ request }) => {
      const res = await request.post("/api/chat", {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({
          provider: "gemini",
          model: "gemini-2.5-pro",
          messages: [{ role: "user", content: 'Say "OK" in one word.' }],
          temperature: 0.2,
        }),
      });
      expect(res.status()).toBe(403);
      const text = await res.text();
      expect(text.toLowerCase()).toMatch(/origin|forbidden/);
    });

    test("22 POST /api/chat invalid JSON → 400", async ({ request }) => {
      const res = await postChat(request, "{not-json", {});
      expect(res.status()).toBe(400);
    });

    test("23 POST /api/chat guest without apiKey → 401", async ({ request }) => {
      const res = await postChat(request, {
        provider: "gemini",
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: 'Say "OK" in one word.' }],
        temperature: 0.2,
        isChatMode: true,
      });
      expect(res.status()).toBe(401);
    });

    test("24 POST /api/chat keyVerification + bogus key is not CSRF 403", async ({ request }) => {
      const res = await postChat(request, {
        provider: "gemini",
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: 'Say "OK" in one word.' }],
        temperature: 0.2,
        apiKey: "AIza-invalid-e2e-key",
        keyVerification: true,
        isChatMode: true,
      });
      expect(res.status()).not.toBe(403);
      const raw = await res.text();
      expect(raw).not.toMatch(/Origin header required/i);
    });

    test("25 POST /api/chat invalid provider → 400", async ({ request }) => {
      const res = await postChat(request, {
        provider: "not-a-provider",
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: "hi" }],
        temperature: 0.2,
      });
      expect(res.status()).toBe(400);
    });

    test("26 POST /api/chat empty messages → 400", async ({ request }) => {
      const res = await postChat(request, {
        provider: "gemini",
        model: "gemini-2.5-pro",
        messages: [],
        temperature: 0.2,
      });
      expect(res.status()).toBe(400);
    });

    test("27 POST /api/chat temperature out of range → 400", async ({ request }) => {
      const res = await postChat(request, {
        provider: "gemini",
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: "hi" }],
        temperature: 9,
      });
      expect(res.status()).toBe(400);
    });

    test("28 POST /api/chat too many messages → 400", async ({ request }) => {
      const messages = Array.from({ length: 201 }, () => ({ role: "user", content: "x" }));
      const res = await postChat(request, {
        provider: "gemini",
        model: "gemini-2.5-pro",
        messages,
        temperature: 0.2,
      });
      expect(res.status()).toBe(400);
    });

    test("29 POST /api/chat invalid model string → 400", async ({ request }) => {
      const res = await postChat(request, {
        provider: "gemini",
        model: "bad model!",
        messages: [{ role: "user", content: "hi" }],
        temperature: 0.2,
      });
      expect(res.status()).toBe(400);
    });

    test("30 GET /api/ai-capabilities shape", async ({ request }) => {
      const res = await request.get("/api/ai-capabilities");
      expect(res.status()).toBe(200);
      const body = (await res.json()) as {
        byokRequired?: boolean;
        hosted?: Record<string, boolean>;
        supportedProviders?: string[];
      };
      expect(typeof body.byokRequired).toBe("boolean");
      expect(body.hosted).toBeDefined();
      expect(typeof body.hosted?.gemini).toBe("boolean");
      expect(Array.isArray(body.supportedProviders)).toBeTruthy();
    });
  });
});
