import type { Page } from "@playwright/test";

const ONBOARDING_KEYS = ["eh-onboarded", "noa-lg-onboarded", "noa_first_visit_seen"] as const;

async function clickIfVisible(page: Page, selector: string): Promise<boolean> {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.click();
  return true;
}

async function clickButtonIfVisible(page: Page, name: RegExp): Promise<boolean> {
  const locator = page.getByRole("button", { name }).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.click();
  return true;
}

export async function dismissOnboarding(page: Page): Promise<void> {
  await page.evaluate((keys) => {
    try {
      for (const key of keys) localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }, ONBOARDING_KEYS);

  const candidates = [
    'button[aria-label*="건너뛰기"]',
    'button[aria-label*="Skip"]',
    'button[aria-label*="スキップ"]',
    'button[aria-label*="跳过"]',
    "button.noa-onboard-skip",
    "button.noa-onboard-x",
  ];
  for (const selector of candidates) {
    if (await clickIfVisible(page, selector)) return;
  }

  const buttonCandidates = [
    /건너뛰기|Skip|スキップ|跳过/,
    /빈 프로젝트로 시작|Start with an empty project/,
    /노아 샘플로 시작|Start with a Noa sample/,
  ];
  for (const name of buttonCandidates) {
    if (await clickButtonIfVisible(page, name)) return;
  }
}

export async function dismissApiKeyModal(page: Page): Promise<void> {
  const candidates = [
    '[data-testid="api-key-modal-close"]',
    '[aria-label*="닫기"]',
    '[aria-label*="Close"]',
    '[aria-label*="닫아"]',
  ];
  for (const selector of candidates) {
    if (await clickIfVisible(page, selector)) return;
  }

  await page.keyboard.press("Escape").catch(() => {});
}

export async function ensureSession(page: Page): Promise<void> {
  await dismissOnboarding(page);

  const tabs = [
    /세계관 생성|Worldbuilding/,
    /캐릭터·아이템|Characters/,
    /연출|Direction/,
    /집필|Writing/,
  ];
  for (const name of tabs) {
    if (await page.getByRole("button", { name }).first().isVisible().catch(() => false)) {
      return;
    }
  }

  const createButtons = [
    '[data-testid="lg-project-library-new"]',
    '[data-testid="lg-project-library-noa"]',
    '[data-testid="lg-project-library-import"]',
  ];
  for (const selector of createButtons) {
    const clicked = await clickIfVisible(page, selector);
    if (clicked) {
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      return;
    }
  }

  const fallbackButtons = [
    /새 작품|New work/i,
    /질문으로 기준 잡기|Set the basis with questions/i,
    /빈 프로젝트로 시작|Start with an empty project/i,
    /노아 샘플로 시작|Start with a Noa sample/i,
    /프로젝트 생성|Create Project|새로운 소설 시작|Start New Novel/i,
  ];
  for (const name of fallbackButtons) {
    if (await clickButtonIfVisible(page, name)) {
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      return;
    }
  }
}

export async function switchToFreeMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.setItem("noa_studio_mode", "free");
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await dismissOnboarding(page);
}
