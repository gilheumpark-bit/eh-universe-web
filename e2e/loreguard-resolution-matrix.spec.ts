import { expect, test, type Page } from "@playwright/test";
import { attachPageErrorCollector } from "./helpers/e2e-utils";

const MATRIX_PATHS: readonly string[] = [
  "/",
  "/studio",
  "/translation-studio",
  "/docs",
  "/pricing",
  "/terms",
  "/verify",
  "/welcome",
];

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "1280", width: 1280, height: 800 },
  { label: "1440", width: 1440, height: 900 },
  { label: "2560", width: 2560, height: 1440 },
  { label: "3440", width: 3440, height: 1440 },
  { label: "6k", width: 6016, height: 3384 },
] as const;

const ZOOM_STRESS = [
  { label: "125", zoom: 1.25 },
  { label: "150", zoom: 1.5 },
] as const;

const ZOOM_PATHS: readonly string[] = [
  "/",
  "/studio",
  "/translation-studio",
  "/verify",
];

async function preparePage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("eh-cookie-consent", "accepted");
    window.localStorage.setItem("noa-lg-onboarded", "1");
    window.localStorage.setItem("noa_first_visit_seen", "1");
  });
}

async function openAndCheck(page: Page, path: string, label: string, zoom?: number) {
  const { errors, detach } = attachPageErrorCollector(page);
  try {
    const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
    expect(response, `${label} ${path} response`).toBeTruthy();
    expect(response!.status(), `${label} ${path} status`).toBeLessThan(400);
    if (zoom) {
      await page.evaluate((value) => {
        document.documentElement.style.zoom = String(value);
      }, zoom);
    }
    await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });

    const metrics = await page.evaluate(() => {
      const describeElement = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        const id = el.id ? `#${el.id}` : "";
        const classNames = typeof el.className === "string"
          ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 4).join(".")}`
          : "";
        return `${el.tagName.toLowerCase()}${id}${classNames} ${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}`;
      };

      const fixedOutOfBounds = Array.from(document.querySelectorAll<HTMLElement>("*"))
        .filter((el) => {
          const style = window.getComputedStyle(el);
          if (style.position !== "fixed") return false;
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (
            rect.left < -4 ||
            rect.top < -4 ||
            rect.right > window.innerWidth + 4 ||
            rect.bottom > window.innerHeight + 4
          );
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const id = el.id ? `#${el.id}` : "";
          const cls = typeof el.className === "string" ? `.${el.className.split(/\s+/).slice(0, 3).join(".")}` : "";
          return `${el.tagName.toLowerCase()}${id}${cls} ${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}`;
        });
      const wideElements = Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((el) => {
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (
            rect.left < -4 ||
            rect.right > window.innerWidth + 4 ||
            rect.width > window.innerWidth + 4
          );
        })
        .slice(0, 10)
        .map(describeElement);

      return {
        bodyOverflow: document.body.scrollWidth - window.innerWidth,
        rootOverflow: document.documentElement.scrollWidth - window.innerWidth,
        fixedOutOfBounds,
        wideElements,
        bodyTextLength: document.body.innerText.trim().length,
      };
    });

    expect(metrics.bodyTextLength, `${label} ${path} visible text`).toBeGreaterThan(0);
    expect(metrics.wideElements, `${label} ${path} elements causing horizontal overflow`).toEqual([]);
    expect(metrics.bodyOverflow, `${label} ${path} body horizontal overflow`).toBeLessThanOrEqual(4);
    expect(metrics.rootOverflow, `${label} ${path} root horizontal overflow`).toBeLessThanOrEqual(4);
    expect(metrics.fixedOutOfBounds, `${label} ${path} fixed elements inside viewport`).toEqual([]);
    expect(errors, `${label} ${path} pageerror`).toEqual([]);
  } finally {
    detach();
  }
}

test.describe("Loreguard resolution matrix", () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page);
  });

  for (const viewport of VIEWPORTS) {
    test(`representative pages fit ${viewport.label}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const path of MATRIX_PATHS) {
        await openAndCheck(page, path, viewport.label);
      }
    });
  }

  for (const stress of ZOOM_STRESS) {
    test(`representative pages survive ${stress.label}% zoom stress`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1440, height: 900 });

      for (const path of ZOOM_PATHS) {
        await openAndCheck(page, path, `${stress.label}%`, stress.zoom);
        await page.evaluate(() => {
          document.documentElement.style.zoom = "";
        });
      }
    });
  }
});
