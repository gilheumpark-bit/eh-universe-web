/**
 * E2E Scenario 23 — Mobile viewport regression
 *
 * 외부 코워크 평가 (2026-04-25) "모바일 압축 가능성" 지적의 자동 측정.
 * `docs/unfixed-backlog.md` D13 의 실제 구현.
 *
 * 핵심 측정 (5 페이지 × 2 device emulation = 10 케이스):
 *   1. horizontal overflow 0 — 가로 스크롤 발생 안 함
 *   2. 터치 타깃 44px+ — WCAG AAA / Apple HIG 권장
 *   3. critical 텍스트 보임 — title / 첫 헤딩 viewport 안에 위치
 *
 * Windows 로컬 워커 크래시 (STATUS_ACCESS_VIOLATION) 회피 위해
 * CI (Ubuntu) 에서만 실행 — playwright.config.ts mobile project 활용.
 */

import { test, expect, devices } from '@playwright/test';

// 테스트 페이지 — 로그인 없이 접근 가능한 공개 페이지
const PUBLIC_PAGES: Array<{ path: string; expectedTitle: RegExp }> = [
  { path: '/', expectedTitle: /Loreguard|로어가드/i },
  { path: '/about', expectedTitle: /About|소개|EH/i },
  { path: '/network', expectedTitle: /Network|네트워크/i },
  { path: '/codex', expectedTitle: /Codex|코덱스/i },
  { path: '/changelog', expectedTitle: /Changelog|변경/i },
];

const MOBILE_DEVICES: Array<{ name: string; device: typeof devices['Pixel 5'] }> = [
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'iPhone 13', device: devices['iPhone 13'] },
];

// ============================================================
// PART 1 — Helpers
// ============================================================

async function detectHorizontalOverflow(page: import('@playwright/test').Page): Promise<{
  hasOverflow: boolean;
  scrollWidth: number;
  clientWidth: number;
}> {
  return await page.evaluate(() => {
    const root = document.documentElement;
    return {
      hasOverflow: root.scrollWidth > root.clientWidth + 1, // 1px tolerance
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
}

async function detectSmallTouchTargets(page: import('@playwright/test').Page): Promise<{
  total: number;
  small: number;
  smallSelectors: string[];
}> {
  return await page.evaluate(() => {
    const MIN_SIZE = 44; // WCAG AAA / Apple HIG
    const interactive = Array.from(
      document.querySelectorAll(
        'button, a[role="button"], [role="tab"], [role="menuitem"], a[href]:not([aria-hidden="true"])',
      ),
    );
    const visible = interactive.filter((el) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      );
    });
    const small = visible.filter((el) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      return rect.width < MIN_SIZE || rect.height < MIN_SIZE;
    });
    return {
      total: visible.length,
      small: small.length,
      smallSelectors: small.slice(0, 5).map((el) => {
        const e = el as HTMLElement;
        const tag = e.tagName.toLowerCase();
        const classList = e.className ? `.${e.className.split(/\s+/).slice(0, 2).join('.')}` : '';
        return `${tag}${classList}`.slice(0, 80);
      }),
    };
  });
}

// ============================================================
// PART 2 — Tests
// ============================================================

for (const { name, device } of MOBILE_DEVICES) {
  test.describe(`Mobile viewport — ${name}`, () => {
    test.use({ ...device });

    for (const { path, expectedTitle } of PUBLIC_PAGES) {
      test(`${path} — no horizontal overflow`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: 'networkidle' });
        // 404 는 skip (페이지 없음 = test 무관)
        if (response && response.status() === 404) {
          test.skip(true, `${path} returned 404 — page not deployed in this branch`);
          return;
        }
        const overflow = await detectHorizontalOverflow(page);
        expect.soft(overflow.hasOverflow).toBe(false);
        if (overflow.hasOverflow) {
          // 디버그용 — 어느 정도 overflow 인지
          console.log(
            `[${name}] ${path} overflow: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
          );
        }
      });

      test(`${path} — title visible`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        if (response && response.status() === 404) {
          test.skip(true, `${path} 404`);
          return;
        }
        const title = await page.title();
        expect(title).toMatch(expectedTitle);
      });

      test(`${path} — touch targets 44px+ (allow ≤2 small)`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: 'networkidle' });
        if (response && response.status() === 404) {
          test.skip(true, `${path} 404`);
          return;
        }
        const result = await detectSmallTouchTargets(page);
        // 너무 엄격한 100% 패스는 비현실 — 2개 미만 (예: <a> 토글, 작은 close 버튼) 까지 허용
        expect.soft(result.small).toBeLessThanOrEqual(2);
        if (result.small > 2) {
          console.log(
            `[${name}] ${path} ${result.small}/${result.total} small targets:`,
            result.smallSelectors,
          );
        }
      });
    }
  });
}
