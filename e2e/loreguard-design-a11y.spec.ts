import { expect, test, type Page } from '@playwright/test';

const TAB_LABELS = [
  '프로젝트 생성',
  '세계관 생성',
  '캐릭터·아이템',
  '메인 시나리오',
  '씬시트',
  '연출',
  '집필',
  '퇴고',
  '번역·현지화',
  '출고',
] as const;

async function openLoreguard(page: Page) {
  const port = process.env.PLAYWRIGHT_TEST_PORT || '3005';
  await page.addInitScript(() => {
    window.localStorage.setItem('eh-lang', 'ko');
    window.localStorage.setItem('eh-cookie-consent', 'accepted');
    window.localStorage.setItem('noa_studio_ctrl_p_warned', '1');
    document.cookie = 'eh-lang=ko; path=/; max-age=31536000; SameSite=Lax';
    window.localStorage.setItem('noa-lg-onboarded', '1');
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('noa_leader_evt_')) window.localStorage.removeItem(key);
    }
    window.localStorage.removeItem('noa-lg-world-rail');
    window.localStorage.removeItem('noa-lg-world-board');
    window.localStorage.removeItem('noa-lg-plot-rail');
    window.localStorage.removeItem('noa-lg-character-rail');
    window.localStorage.removeItem('noa-lg-direction-nav');
    window.localStorage.removeItem('noa-lg-direction-panel');
  });
  await page.goto(`http://localhost:${port}/studio`);
  await expect(page.locator('.eh-tab').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeVisible({ timeout: 30_000 });
}

async function ensureProject(page: Page) {
  const createButton = page
    .getByRole('button', {
      name: /^(기준선 만들기|새 프로젝트 시작|새 프로젝트|새 작품 만들기|빈 프로젝트 생성)$/,
    })
    .first();
  if ((await createButton.count()) > 0) {
    await createButton.click();
    await page.waitForFunction(() => {
      try {
        const projects = JSON.parse(window.localStorage.getItem('noa_projects_v2') ?? '[]');
        return Array.isArray(projects) && projects.length > 0;
      } catch {
        return false;
      }
    });
    await page.locator('.eh-tab').nth(1).click();
    await expect(page.getByText(/세계관 기준선|세계관 모드/)).toBeVisible();
  }
}

async function seedTranslationProject(page: Page) {
  await page.addInitScript(() => {
    const project = {
      id: 'e2e-tx-proj',
      name: 'E2E 번역 프로젝트',
      description: '번역 패널 회귀 검증용 프로젝트',
      genre: 'SYSTEM_HUNTER',
      createdAt: 1_734_000_000_000,
      lastUpdate: 1_734_000_000_000,
      volumes: [],
      sessions: [
        {
          id: 'e2e-tx-sess',
          title: '1화',
          messages: [],
          lastUpdate: 1_734_000_000_000,
          config: {
            title: '번역 회귀 원고',
            genre: 'SYSTEM_HUNTER',
            episode: 1,
            totalEpisodes: 25,
            setting: '도시 외곽의 균열 구역',
            povCharacter: '노아',
            primaryEmotion: '긴장',
            narrativeIntensity: 'standard',
            guardrails: { min: 3000, max: 5000 },
            characters: [],
            manuscripts: [
              {
                episode: 1,
                title: '1화',
                content: '노아는 균열 앞에 멈춰 섰다. 오래된 표식이 푸른빛으로 흔들렸다.',
                charCount: 39,
                createdAt: 1_734_000_000_000,
                updatedAt: 1_734_000_000_000,
              },
            ],
            translationConfig: {
              targetLang: 'EN',
              mode: 'fidelity',
              band: 0.5,
              glossary: [{ source: '균열', target: 'rift', locked: true }],
            },
          },
        },
      ],
    };

    localStorage.setItem('noa_projects_v2', JSON.stringify([project]));
    localStorage.setItem('noa_last_project_id', 'e2e-tx-proj');
    localStorage.setItem('noa_last_session_id', 'e2e-tx-sess');
    localStorage.removeItem('noa-lg-tx-rail');
    localStorage.removeItem('noa-lg-tx-panel');
  });
}

async function openAndCloseMobileSheet(page: Page, label: string) {
  const openButton = page.getByRole('button', { name: `${label} 열기`, exact: true });
  await expect(openButton).toBeVisible();
  await openButton.scrollIntoViewIfNeeded();
  await openButton.click();

  const dialog = page.getByRole('dialog', { name: label, exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-lg-mobile-sheet-open', '1');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('body')).not.toHaveAttribute('data-lg-mobile-sheet-open', '1');
}

async function expandCollapsedPanel(page: Page, label: RegExp) {
  const expandButton = page.getByRole('button', { name: new RegExp(`^(?:${label.source}) 펼치기$`) }).first();
  try {
    await expandButton.waitFor({ state: 'visible', timeout: 1_500 });
    await expandButton.click();
  } catch {
    // The panel may already be open on wide desktop layouts.
  }
}

test('Loreguard design accessibility regression', async ({ page }) => {
  test.setTimeout(90_000);

  await openLoreguard(page);
  await expect(page.locator('.eh-tab')).toHaveCount(10);
  await expect(page.locator('main')).toBeVisible();

  const layoutButton = page.locator('.lg-layout-menu > .eh-icbtn');
  await expect(layoutButton).toHaveAttribute('aria-expanded', 'false');
  await layoutButton.click();
  const dialog = page.locator('.lg-layout-pop');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.lg-layout-field input')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await ensureProject(page);

  await page.locator('.eh-tab').nth(4).click();
  await expandCollapsedPanel(page, /씬시트 보조 패널|Scene sheet panel/);
  await expect(page.locator('.tpanel-head').filter({ hasText: /씬시트 보조 패널|Scene sheet panel/ })).toBeVisible();

  await page.locator('.eh-tab').nth(5).click();
  await expandCollapsedPanel(page, /연출 보조 패널|Direction panel/);
  await expect(page.locator('.tpanel-head').filter({ hasText: /연출 보조 패널|Direction panel/ })).toBeVisible();

  await page.locator('.eh-tab').nth(7).click();
  await expandCollapsedPanel(page, /퇴고 보조 패널/);
  await expect(page.locator('.wr-panel-head').filter({ hasText: /퇴고 보조 패널/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.locator('.eh-tab').nth(9).click();
  await expandCollapsedPanel(page, /출고 점검 패널/);
  await expect(page.locator('.wr-panel-head').filter({ hasText: /출고 보조 패널/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.eh-tab').first().click();
  await page.waitForTimeout(500);

  const trigger = page.getByRole('button', { name: '작품 기준표 열기' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '작품 기준표' })).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-lg-mobile-sheet-open', '1');
  await expect(page.getByRole('dialog', { name: '쿠키 동의' })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '작품 기준표' })).toBeHidden();
});

test('Loreguard mobile tab strip keeps every step reachable', async ({ page }) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await openLoreguard(page);
  await ensureProject(page);

  for (const label of TAB_LABELS) {
    const tab = page.getByRole('button', { name: label, exact: true });
    await expect(tab).toBeVisible();
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('main')).toBeVisible();
  }
});

test('Loreguard studio frame fits representative desktop and 6K widths', async ({ page }) => {
  test.setTimeout(120_000);

  const viewports = [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 },
    { width: 6016, height: 3384 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openLoreguard(page);
    await ensureProject(page);

    await expect(page.locator('.eh-tab')).toHaveCount(10);
    await expect(page.locator('.eh-header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - window.innerWidth,
      root: document.documentElement.scrollWidth - window.innerWidth,
    }));
    expect(overflow.body, `${viewport.width}px body horizontal overflow`).toBeLessThanOrEqual(4);
    expect(overflow.root, `${viewport.width}px root horizontal overflow`).toBeLessThanOrEqual(4);
  }
});

test('Loreguard mobile IDE panels open and close as sheets', async ({ page }) => {
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await openLoreguard(page);

  await openAndCloseMobileSheet(page, '작품 기준표');
  await ensureProject(page);

  await page.getByRole('button', { name: '퇴고', exact: true }).click();
  await openAndCloseMobileSheet(page, '퇴고 원고함');
  await openAndCloseMobileSheet(page, '퇴고 보조 패널');

  await page.getByRole('button', { name: '출고', exact: true }).click();
  await openAndCloseMobileSheet(page, '출고 원고함');
  await openAndCloseMobileSheet(page, '출고 점검 패널');
});

test('Loreguard mobile world panels open and close as sheets', async ({ page }) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await openLoreguard(page);
  await ensureProject(page);

  const collapsedRail = page.locator('aside#lg-world-rail[aria-label="세계관 도구 (접힘)"]');
  await expect(collapsedRail).toBeVisible();
  await page.getByRole('button', { name: '세계관 도구 레일 펼치기', exact: true }).click();
  const rail = page.getByRole('dialog', { name: '세계관 도구 레일', exact: true });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('새 세계관');
  await page.getByRole('button', { name: '세계관 도구 레일 접기', exact: true }).click();
  await expect(collapsedRail).toBeVisible();

  const collapsedBoard = page.locator('aside#lg-world-board[aria-label="세계관 보드 (접힘)"]');
  await expect(collapsedBoard).toBeVisible();
  await page.getByRole('button', { name: '세계관 보드 펼치기', exact: true }).click();
  const board = page.getByRole('dialog', { name: '세계관 보드', exact: true });
  await expect(board).toBeVisible();
  await expect(board).toContainText('완성도 0%');
  await board.getByRole('button', { name: /핵심 전제/ }).click();
  await expect(collapsedBoard).toBeVisible();
});

test('Loreguard mobile main scenario rail opens and closes as sheet', async ({ page }) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await openLoreguard(page);
  await ensureProject(page);

  const plotTab = page.getByRole('button', { name: '메인 시나리오', exact: true });
  await plotTab.scrollIntoViewIfNeeded();
  await plotTab.click();

  await expect(page.getByText('메인 시나리오 모드')).toBeVisible();
  const collapsedRail = page.locator('aside#lg-plot-rail[aria-label="메인 시나리오 개요 레일 (접힘)"]');
  await expect(collapsedRail).toBeVisible();
  await page.getByRole('button', { name: '메인 시나리오 개요 레일 펼치기', exact: true }).click();

  const rail = page.getByRole('dialog', { name: '메인 시나리오 개요 레일', exact: true });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('비트 추가');
  await page.getByRole('button', { name: '메인 시나리오 개요 레일 접기', exact: true }).click();
  await expect(collapsedRail).toBeVisible();
});

test('Loreguard mobile character item roster opens and closes as sheet', async ({ page }) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await openLoreguard(page);
  await ensureProject(page);

  const characterTab = page.getByRole('button', { name: '캐릭터·아이템', exact: true });
  await characterTab.scrollIntoViewIfNeeded();
  await characterTab.click();

  const collapsedRail = page.locator('aside#lg-character-rail[aria-label="캐릭터·아이템 로스터 (접힘)"]');
  await expect(collapsedRail).toBeVisible();
  await page.getByRole('button', { name: '캐릭터·아이템 로스터 펼치기', exact: true }).click();

  let rail = page.getByRole('dialog', { name: '캐릭터·아이템 로스터', exact: true });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('캐릭터 모드');
  await rail.getByRole('button', { name: '아이템', exact: true }).click();
  await expect(collapsedRail).toBeVisible();

  await page.getByRole('button', { name: '캐릭터·아이템 로스터 펼치기', exact: true }).click();
  rail = page.getByRole('dialog', { name: '캐릭터·아이템 로스터', exact: true });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('아이템 모드');
  await rail.getByRole('button', { name: '인물', exact: true }).click();
  await expect(collapsedRail).toBeVisible();
});

test('Loreguard mobile scene and direction panels open and close as sheets', async ({ page }) => {
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await openLoreguard(page);
  await ensureProject(page);

  const sceneTab = page.getByRole('button', { name: '씬시트', exact: true });
  await sceneTab.scrollIntoViewIfNeeded();
  await sceneTab.click();

  const collapsedNav = page.locator('aside#lg-direction-nav[aria-label="회차 내비게이션 (접힘)"]');
  await expect(collapsedNav).toBeVisible();
  await page.getByRole('button', { name: '회차 내비게이션 펼치기', exact: true }).click();
  const nav = page.getByRole('dialog', { name: '회차 내비게이션', exact: true });
  await expect(nav).toBeVisible();
  await expect(nav).toContainText('1화');
  await page.getByRole('button', { name: '회차 내비게이션 접기', exact: true }).click();
  await expect(collapsedNav).toBeVisible();

  const collapsedScenePanel = page.locator(
    'aside#lg-direction-panel[aria-label="씬시트 보조 패널 (접힘)"], aside#lg-direction-panel[aria-label="Scene sheet panel (접힘)"]',
  );
  await expect(collapsedScenePanel).toBeVisible();
  await page.getByRole('button', { name: /^(씬시트 보조 패널|Scene sheet panel) 펼치기$/ }).click();
  const scenePanel = page.getByRole('dialog', { name: /^(씬시트 보조 패널|Scene sheet panel)$/ });
  await expect(scenePanel).toBeVisible();
  await expect(scenePanel).toContainText('씬시트 상태');
  await page.getByRole('button', { name: /^(씬시트 보조 패널|Scene sheet panel) 접기$/ }).click();
  await expect(collapsedScenePanel).toBeVisible();

  const directionTab = page.getByRole('button', { name: '연출', exact: true });
  await directionTab.scrollIntoViewIfNeeded();
  await directionTab.click();

  const collapsedDirectionPanel = page.locator(
    'aside#lg-direction-panel[aria-label="연출 보조 패널 (접힘)"], aside#lg-direction-panel[aria-label="Direction panel (접힘)"]',
  );
  await expect(collapsedDirectionPanel).toBeVisible();
  await page.getByRole('button', { name: /^(연출 보조 패널|Direction panel) 펼치기$/ }).click();
  const directionPanel = page.getByRole('dialog', { name: /^(연출 보조 패널|Direction panel)$/ });
  await expect(directionPanel).toBeVisible();
  await expect(directionPanel).toContainText('씬시트 상태');
  await page.getByRole('button', { name: /^(연출 보조 패널|Direction panel) 접기$/ }).click();
  await expect(collapsedDirectionPanel).toBeVisible();
});

test('Loreguard mobile translation empty review panel starts collapsed', async ({ page }) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await openLoreguard(page);
  await ensureProject(page);

  const translationTab = page.getByRole('button', { name: '번역·현지화', exact: true });
  await translationTab.scrollIntoViewIfNeeded();
  await translationTab.click();

  await expect(page.getByText('번역할 원고가 없습니다')).toBeVisible();
  const collapsedRail = page.locator('aside#lg-tx-rail[aria-label="번역 언어·회차 레일 (접힘)"]');
  await expect(collapsedRail).toBeVisible();
  await page.getByRole('button', { name: '언어·회차 레일 펼치기', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '번역 언어·회차 레일', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '언어·회차 레일 접기', exact: true }).click();
  await expect(collapsedRail).toBeVisible();

  const collapsedPanel = page.locator('aside#lg-tx-panel[aria-label="번역 검수 패널 (접힘)"]');
  await expect(collapsedPanel).toBeVisible();

  await page.getByRole('button', { name: '검수 패널 펼치기', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '번역 검수 패널', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '검수 패널 접기', exact: true }).click();
  await expect(collapsedPanel).toBeVisible();
});

test('Loreguard mobile translation review panel opens as sheet with manuscript', async ({ page }) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await seedTranslationProject(page);
  await openLoreguard(page);

  const translationTab = page.getByRole('button', { name: '번역·현지화', exact: true });
  await translationTab.scrollIntoViewIfNeeded();
  await translationTab.click();

  await expect(page.getByText('노아는 균열 앞에 멈춰 섰다.')).toBeVisible();
  await expect(page.locator('aside#lg-tx-rail[aria-label="번역 언어·회차 레일 (접힘)"]')).toBeVisible();
  await page.getByRole('button', { name: '언어·회차 레일 펼치기', exact: true }).click();
  const rail = page.getByRole('dialog', { name: '번역 언어·회차 레일', exact: true });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('언어 쌍');
  await expect(rail).toContainText('회차');
  await rail.getByRole('button', { name: /일본어/ }).click();
  await expect(page.locator('aside#lg-tx-rail[aria-label="번역 언어·회차 레일 (접힘)"]')).toBeVisible();

  await expect(page.locator('aside#lg-tx-panel[aria-label="번역 검수 패널 (접힘)"]')).toBeVisible();

  await page.getByRole('button', { name: '검수 패널 펼치기', exact: true }).click();
  const panel = page.getByRole('dialog', { name: '번역 검수 패널', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('검수 도구');

  const box = await panel.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(320);

  await page.getByRole('button', { name: '검수 패널 접기', exact: true }).click();
  await expect(page.locator('aside#lg-tx-panel[aria-label="번역 검수 패널 (접힘)"]')).toBeVisible();
});
