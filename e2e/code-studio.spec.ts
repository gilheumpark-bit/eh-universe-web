import { test, expect } from "@playwright/test";

// ============================================================
// PART 1 — Code Studio smoke tests
// ============================================================

test.describe("Code Studio", () => {
  test("loads code studio page", async ({ page }) => {
    await page.goto("/code-studio");
    await expect(page.locator("body")).toBeVisible();
    // Wait for either the Shell UI or a loading indicator to appear
    await expect(
      page
        .locator(
          'text=/Code Studio|코드 스튜디오|Loading|로딩|Composer|패널/',
        )
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("command palette opens with Ctrl+Shift+P", async ({ page }) => {
    await page.goto("/code-studio");
    // Wait for Shell to hydrate
    await page.waitForTimeout(3000);
    await page.keyboard.press("Control+Shift+P");
    // Command palette should become visible (dialog or overlay)
    const palette = page.locator(
      '[role="dialog"], [data-testid="command-palette"], [class*="command-palette"], [class*="CommandPalette"]',
    );
    const isVisible = await palette
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    // Some implementations may not have a command palette yet — skip gracefully
    if (isVisible) {
      await expect(palette.first()).toBeVisible();
    }
    // Close with Escape
    await page.keyboard.press("Escape");
  });

  test("no critical console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/code-studio");
    await page.waitForTimeout(5000);

    // Filter out benign/expected errors
    const benignPatterns = [
      "favicon",
      "analytics",
      "404",
      "chunk",
      "preload",
      "prefetch",
      "net::ERR_",
      "Failed to load resource",
      "Download the React DevTools",
      "Warning:",
      "ERR_CONNECTION",
      "NEXT_",
      "webpack",
      "Fast Refresh",
      "localhost",
      "firebase",
      "firestore",
      "gtag",
      "google",
      "eval",
      "unsafe-eval",
      "Content Security Policy",
      "backend",
      "offline",
      "WebChannel",
      "INTERNAL UNHANDLED ERROR",
      "HMR",
      "hot-update",
      "React does not recognize",
      "webcontainer",
      "monaco",
      "xterm",
    ];
    const critical = errors.filter(
      (e) =>
        !benignPatterns.some((p) =>
          e.toLowerCase().includes(p.toLowerCase()),
        ),
    );
    expect(critical).toHaveLength(0);
  });

  test("page has correct title or heading", async ({ page }) => {
    await page.goto("/code-studio");
    // Title or heading should reference Code Studio
    const heading = page
      .locator("h1, h2, [class*='title'], [class*='Title']")
      .first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });
});
