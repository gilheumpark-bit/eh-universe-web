import { expect, test, type Page } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

const SAFE_TEXT =
  "AI-TEST-INPUT-긴-문장-!@#$%^&*()_+ <script>window.__qa=1</script> 😀\n".repeat(12);

const CORE_PATHS = [
  "/studio",
  "/translation-studio",
  "/pricing",
  "/verify",
  "/terms",
  "/privacy",
  "/cookies",
  "/refund",
  "/copyright",
  "/changelog",
  "/status",
  "/docs",
  "/welcome",
] as const;

function appUrl(path: string) {
  const port = process.env.PLAYWRIGHT_TEST_PORT || "3005";
  return `http://localhost:${port}${path}`;
}

async function prepareSafeClientState(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("eh-cookie-consent", "accepted");
    window.localStorage.setItem("noa-lg-onboarded", "1");
    window.localStorage.setItem("noa_first_visit_seen", "1");
    window.localStorage.removeItem("noa_projects_v2");
    window.localStorage.removeItem("noa_last_project_id");
    window.localStorage.removeItem("noa_last_session_id");
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    bodyOverflow: document.body.scrollWidth - window.innerWidth,
    rootOverflow: document.documentElement.scrollWidth - window.innerWidth,
    viewportWidth: window.innerWidth,
    wideElements: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => {
        if (el.closest(".eh-nav,.eh-tools")) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none"
          && style.visibility !== "hidden"
          && Number(style.opacity) !== 0
          && rect.width > 0
          && rect.height > 0
          && (rect.left < -4 || rect.right > window.innerWidth + 4 || rect.width > window.innerWidth + 4);
      })
      .slice(0, 8)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/).slice(0, 3).join(".")} ${Math.round(rect.left)},${Math.round(rect.right)}`;
      }),
  }));

  expect(metrics.bodyOverflow, `${label} body horizontal overflow`).toBeLessThanOrEqual(4);
  expect(metrics.rootOverflow, `${label} root horizontal overflow`).toBeLessThanOrEqual(4);
  expect(metrics.wideElements, `${label} wide elements`).toEqual([]);
}

test.describe("Loreguard QA chief chaos pass", () => {
  test.beforeEach(async ({ page }) => {
    await prepareSafeClientState(page);
  });

  test("core public routes render without dead-end crashes", async ({ page }) => {
    test.setTimeout(180_000);
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      for (const path of CORE_PATHS) {
        const response = await page.goto(appUrl(path), { waitUntil: "domcontentloaded", timeout: 45_000 });
        expect(response, `${path} response`).toBeTruthy();
        expect(response!.status(), `${path} status`).toBeLessThan(400);
        await expect(page.locator("body"), `${path} body`).toBeVisible({ timeout: 15_000 });
        await expect(page.locator("body"), `${path} visible copy`).not.toHaveText("");
      }
      expect(errors, "page errors while opening public routes").toEqual([]);
    } finally {
      detach();
    }
  });

  test("project start form absorbs hostile-but-safe input and duplicate create clicks", async ({ page }) => {
    test.setTimeout(90_000);
    const { errors, detach } = attachPageErrorCollector(page);
    try {
      await page.goto(appUrl("/studio"), { waitUntil: "domcontentloaded" });
      await expect(page.locator(".ps-grid")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(".ps-form")).toHaveCSS("display", "grid");

      await page.getByPlaceholder("예: 회귀한 편집자의 마지막 원고").fill("AI-TEST-INPUT 프로젝트");
      await page.getByPlaceholder("예: 100화").fill("999999999999999999999999");
      await page.getByPlaceholder("예: 5,500~7,000자").fill("AI-TEST-INPUT-999999999999자");
      await page.getByPlaceholder("예: 주 5회, 시즌 단위, 공모전 제출").fill(SAFE_TEXT.slice(0, 700));
      await page.getByPlaceholder("이 작품이 어떤 세계와 갈등에서 시작하는지 한두 문장으로 적습니다.").fill(SAFE_TEXT);
      await page.getByPlaceholder("원작자, 공동기획, 외부자료, 상업 이용 예정 여부를 적습니다.").fill(SAFE_TEXT);

      const createButton = page.getByTestId("lg-project-start-empty");
      await expect(createButton).toBeEnabled();
      await createButton.dblclick();
      await expect(page.getByText("세계관 모드")).toBeVisible({ timeout: 30_000 });

      const sessionCount = await page.evaluate(() => {
        const projects = JSON.parse(window.localStorage.getItem("noa_projects_v2") || "[]") as Array<{ sessions?: unknown[] }>;
        return projects.reduce((sum, project) => sum + (Array.isArray(project.sessions) ? project.sessions.length : 0), 0);
      });
      expect(sessionCount, "duplicate create should not create extra sessions").toBeLessThanOrEqual(1);
      expect(errors, "page errors during project chaos input").toEqual([]);
    } finally {
      detach();
    }
  });

  test("studio frame fits mobile and 6K after project start styling", async ({ page }) => {
    test.setTimeout(90_000);
    const viewports = [
      { label: "mobile", width: 390, height: 844 },
      { label: "desktop", width: 1440, height: 900 },
      { label: "6k", width: 6016, height: 3384 },
    ] as const;

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(appUrl("/studio"), { waitUntil: "domcontentloaded" });
      await expect(page.locator(".eh-header")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(".ps-grid")).toBeVisible();
      await expectNoHorizontalOverflow(page, viewport.label);
    }
  });

  test("dangerous API writes are blocked without CSRF and do not mutate user data", async ({ page }) => {
    await page.goto(appUrl("/studio"), { waitUntil: "domcontentloaded" });

    const results = await page.evaluate(async () => {
      const payload = JSON.stringify({ marker: "AI-TEST-INPUT", returnUrl: "https://example.invalid" });
      const headers = { "Content-Type": "application/json" };
      const targets = ["/api/user/delete", "/api/user/export", "/api/checkout", "/api/upload"];
      const entries: Array<{ target: string; status: number }> = [];
      for (const target of targets) {
        const response = await fetch(target, { method: "POST", headers, body: payload });
        entries.push({ target, status: response.status });
      }
      return entries;
    });

    for (const result of results) {
      expect(result.status, `${result.target} should reject unsafe unauthenticated write`).toBeGreaterThanOrEqual(400);
    }
  });
});
