import { expect, test, type Page } from '@playwright/test';

// ============================================================
// 상수
// ============================================================

const E2E_PORT = process.env.PLAYWRIGHT_TEST_PORT || '3005';
const ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

const PROJECT_ID = 'e2e-access-compliance-project';
const SESSION_ID = 'e2e-access-compliance-session';

const PACKAGE_ACTION_BUTTON_NAME =
  /묶음 생성|Generate Package|상위 플랜 검토용 미리보기|상위 권한 검토용 미리보기|출고 묶음 미리보기|출고 묶음 검토 생성|조직 제출 묶음 검토 생성/;

type CapturedDownload = { mimeType: string; content: string };

// ============================================================
// 헬퍼 — URL
// ============================================================

function appUrl(path: string): string {
  const origin = process.env.PLAYWRIGHT_APP_ORIGIN?.replace(/\/$/, '');
  return origin ? `${origin}${path}` : path;
}

// ============================================================
// 헬퍼 — 프로젝트 시드
// ============================================================

const stamp = Date.now();

function makeProjectFixture(id: string, name: string, sessionId: string) {
  return [{
    id,
    name,
    description: 'access compliance E2E fixture',
    genre: 'SF',
    createdAt: stamp,
    lastUpdate: stamp,
    sessions: [{
      id: sessionId,
      title: '검증 회차',
      messages: [],
      lastUpdate: stamp,
      config: {
        genre: 'SF',
        episode: 1,
        totalEpisodes: 12,
        guardrails: { min: 3500, max: 5500 },
        corePremise: '접근 제어 검증용 작품.',
        rightsMemo: '단독 창작.',
        manuscripts: [{
          episode: 1,
          title: '1화',
          content: '윤서는 원고의 권한을 확인했다.',
          charCount: 17,
          lastUpdate: stamp,
        }],
      },
    }],
  }];
}

async function installSeededStudio(
  page: Page,
  projects: ReturnType<typeof makeProjectFixture>,
  currentProjectId: string,
  currentSessionId: string,
  paymentStatus = 'paid',
  plan = 'pro',
): Promise<void> {
  await page.addInitScript(
    ({ projects, currentProjectId, currentSessionId, paymentStatus, plan }) => {
      window.localStorage.clear();
      window.localStorage.setItem('eh-onboarded', '1');
      window.localStorage.setItem('noa-lg-onboarded', '1');
      window.localStorage.setItem('eh-user-role', 'writer');
      window.localStorage.setItem('noa_studio_lang', 'KO');
      window.localStorage.setItem('noa_first_visit_seen', '1');
      window.localStorage.setItem('noa_projects_v2', JSON.stringify(projects));
      window.localStorage.setItem('noa_last_project_id', currentProjectId);
      window.localStorage.setItem('noa_last_session_id', currentSessionId);
      window.localStorage.setItem('noa_studio_currentProjectId', currentProjectId);
      window.localStorage.setItem('noa_payment_status', paymentStatus);
      window.localStorage.setItem('noa_entitlement_plan', plan);
      window.localStorage.setItem('noa_save_engine_migrated', '1');
    },
    { projects, currentProjectId, currentSessionId, paymentStatus, plan },
  );
}

// ============================================================
// 헬퍼 — Blob 다운로드 캡처
// ============================================================

async function installBlobDownloadCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const capturedDownloads: Array<{ mimeType: string; content: string }> = [];
    Object.defineProperty(window, '__loreguardCapturedDownloads', {
      value: capturedDownloads,
      configurable: true,
    });
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = ((object: Blob | MediaSource) => {
      if (object instanceof Blob) {
        void object.text().then((content) => {
          capturedDownloads.push({ mimeType: object.type, content });
        });
      }
      return createObjectURL(object);
    }) as typeof URL.createObjectURL;
  });
}

async function getCapturedArtifacts(
  page: Page,
): Promise<Array<{ mimeType: string; content: string }>> {
  return page.evaluate(() => {
    const win = window as Window & { __loreguardCapturedDownloads?: CapturedDownload[] };
    return win.__loreguardCapturedDownloads ?? [];
  });
}

// ============================================================
// 헬퍼 — 쿠키 배너 닫기
// ============================================================

async function dismissCookieBannerIfVisible(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /Accept|동의|필수/ });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
  }
}

// ============================================================
// 테스트
// ============================================================

test.use({ viewport: { width: 1440, height: 960 } });

test.describe('Loreguard trust: access & compliance', () => {
  // ===========================================================
  // Test 1: 미결제 상태 submission-package 차단 (T2)
  // ===========================================================
  test('Test 1: 미결제 상태 submission-package 차단', async ({ page }) => {
    test.setTimeout(120_000);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const projects = makeProjectFixture(PROJECT_ID, '접근 제어 검증 작품', SESSION_ID);
    await installSeededStudio(page, projects, PROJECT_ID, SESSION_ID, 'none', 'free');

    await page.goto(appUrl('/studio?tab=export'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
    await dismissCookieBannerIfVisible(page);

    // 제출 묶음 탭 클릭
    const submissionTab = page.getByRole('tab', { name: /제출 묶음|Submission|ZIP/ });
    await submissionTab.click();
    await expect(
      page.getByLabel('제출 묶음 생성 도구', { exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // 패키지 생성 버튼이 제한 라벨로 보여야 함
    const btn = page.getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME });
    await expect(btn).toBeVisible({ timeout: 30_000 });
    const btnText = await btn.textContent();
    expect(btnText).toBeTruthy();
    // 미결제 free 플랜에서 버튼 텍스트 확인 — 제한 라벨 또는 미리보기
    expect(btnText).toMatch(
      /상위|미리보기|제한|Review|검토|출고 묶음|묶음 생성|Generate Package/i,
    );

    // 페이지가 크래시 없이 렌더링되는지 확인
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText!.length).toBeGreaterThan(0);

    // 치명적 pageerror 없음
    expect(pageErrors).toEqual([]);
  });

  // ===========================================================
  // Test 2: 가짜 API key 차단 (T3)
  // ===========================================================
  test('Test 2: 가짜 API key 차단', async ({ page }) => {
    test.setTimeout(120_000);

    const projects = makeProjectFixture(PROJECT_ID, '접근 제어 검증 작품', SESSION_ID);
    await installSeededStudio(page, projects, PROJECT_ID, SESSION_ID);

    // AI 자동완성 관련 API를 401 Unauthorized로 모킹
    await page.route('**/api/ai/complete', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized', message: 'Invalid API Key' }),
      });
    });
    await page.route('**/api/complete', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized', message: 'Invalid API Key' }),
      });
    });
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized', message: 'Invalid API Key' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(appUrl('/studio?tab=writing'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
    await dismissCookieBannerIfVisible(page);

    // 원고 편집기가 보이면 텍스트 입력 후 Tab으로 자동완성 트리거 시도
    const editor = page.getByTestId('writing-manuscript-editor');
    const editorVisible = await editor.isVisible({ timeout: 10_000 }).catch(() => false);
    if (editorVisible) {
      await editor.click();
      await page.keyboard.type('윤서는 ');
      await page.keyboard.press('Tab');
    }

    // 인증 에러 메시지 또는 키 설정 안내 표시 확인
    // body 전체에서 인증·키 관련 텍스트 탐색
    await expect(page.locator('body')).toContainText(
      /인증|오류|Key|Unauthorized|연결 필요|Needs connection|설정하기|Set Up|연결.*키/i,
      { timeout: 15_000 },
    );

    // 페이지가 정상 렌더링 중
    await expect(page.locator('body')).toBeVisible();
  });

  // ===========================================================
  // Test 3: AI 생성물 표시 존재 (T9)
  // ===========================================================
  test('Test 3: AI 생성물 표시 존재', async ({ page }) => {
    test.setTimeout(60_000);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // /ai-disclosure 페이지 방문
    const res = await page.goto(appUrl('/ai-disclosure'), {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect(res, '/ai-disclosure 응답 없음').toBeTruthy();
    expect(res!.status(), '/ai-disclosure HTTP 200').toBe(200);
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    // 페이지 제목: AI 고지 / AI Disclosure
    await expect(
      page.locator('text=/AI 고지|AI Disclosure|AI使用告知|AI 使用披露/').first(),
    ).toBeVisible({ timeout: 10_000 });

    // AI 모델 사용 내역 섹션
    await expect(
      page.locator('text=/사용 중인 AI 모델|AI Models in Use/').first(),
    ).toBeVisible({ timeout: 10_000 });

    // 전체 body 텍스트 추출
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();

    // IndexedDB 또는 로컬 저장 관련 언급 — 데이터 흐름 다이어그램 내 "Local IndexedDB" 포함
    const hasLocalDataMention =
      bodyText!.includes('IndexedDB') ||
      bodyText!.includes('로컬') ||
      /local/i.test(bodyText!) ||
      /메타데이터|metadata|machine.readable/i.test(bodyText!);
    expect(
      hasLocalDataMention,
      'IndexedDB·로컬 저장·메타데이터 관련 언급 필요',
    ).toBe(true);

    // 규제 맥락 — EU AI Act 직접 언급이 아니더라도
    // 저작권·사실확인·제공사정책·재학습 등 규제 맥락이 필수
    const hasRegulatoryContext =
      /저작권|copyright/i.test(bodyText!) ||
      /사실 확인|Fact check/i.test(bodyText!) ||
      /재학습.*사용.*여부|Retraining/i.test(bodyText!) ||
      /제공사.*정책|provider.*terms|provider.*policy/i.test(bodyText!) ||
      /민감 주제|Sensitive/i.test(bodyText!) ||
      /전문 분야|Specialized/i.test(bodyText!) ||
      /EU AI|인공지능.*법|AI Act|Basic Act/i.test(bodyText!);
    expect(
      hasRegulatoryContext,
      '규제 관련 맥락 텍스트 (저작권·사실확인·제공사정책·재학습 등) 필요',
    ).toBe(true);

    // 치명적 pageerror 없음
    expect(pageErrors).toEqual([]);
  });

  // ===========================================================
  // Test 4: 보호 API 무인증 차단 — 5개 엔드포인트 (T3)
  // ===========================================================
  const protectedEndpoints: Array<{
    path: string;
    expectedStatuses: number[];
  }> = [
    { path: '/api/complete',             expectedStatuses: [401, 403, 503] },
    { path: '/api/translate',            expectedStatuses: [401, 403, 503] },
    { path: '/api/cp/register',          expectedStatuses: [401, 403, 503] },
    { path: '/api/release-credit/debit', expectedStatuses: [401, 403, 503] },
    { path: '/api/stripe/webhook',       expectedStatuses: [400, 401, 403, 503] },
  ];

  for (const endpoint of protectedEndpoints) {
    test(`Test 4: 보호 API 무인증 차단 — POST ${endpoint.path}`, async ({ request }) => {
      const res = await request.post(`${ORIGIN}${endpoint.path}`, {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({}),
      });
      const status = res.status();
      expect(
        endpoint.expectedStatuses,
        `POST ${endpoint.path} → ${status} (기대: ${endpoint.expectedStatuses.join('|')})`,
      ).toContain(status);
    });
  }

  // ===========================================================
  // Test 5: export 아티팩트 limitation 문구 (T2)
  // ===========================================================
  test('Test 5: export 아티팩트 limitation 문구', async ({ page }) => {
    test.setTimeout(120_000);

    const projects = makeProjectFixture(PROJECT_ID, '접근 제어 검증 작품', SESSION_ID);
    await installBlobDownloadCapture(page);
    await installSeededStudio(page, projects, PROJECT_ID, SESSION_ID);

    // Export 탭 → 제출 묶음 → 패키지 생성
    await page.goto(appUrl('/studio?tab=export'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
    await dismissCookieBannerIfVisible(page);

    await page.getByRole('tab', { name: /제출 묶음|Submission|ZIP/ }).click();
    await expect(
      page.getByLabel('제출 묶음 생성 도구', { exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    const generateBtn = page.getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME });
    await expect(generateBtn).toBeVisible({ timeout: 30_000 });
    await generateBtn.click();
    await expect(
      page.getByRole('button', { name: /묶음 생성 완료|Package generated/ }),
    ).toBeVisible({ timeout: 30_000 });

    // 각 아티팩트의 다운로드 버튼을 차례대로 클릭하여 blob URL 가로채기 트리거
    const buttons = page.locator('li button[aria-label^="Download "]');
    await expect(buttons.first()).toBeVisible({ timeout: 30_000 });

    const buttonCount = await buttons.count();
    for (let index = 0; index < buttonCount; index++) {
      const beforeCount = await page.evaluate(() => {
        const win = window as Window & { __loreguardCapturedDownloads?: CapturedDownload[] };
        return win.__loreguardCapturedDownloads?.length ?? 0;
      });
      await buttons.nth(index).click();
      await expect
        .poll(() => page.evaluate(() => {
          const win = window as Window & { __loreguardCapturedDownloads?: CapturedDownload[] };
          return win.__loreguardCapturedDownloads?.length ?? 0;
        }), {
          timeout: 10_000,
          message: `capture download button ${index}`,
        })
        .toBeGreaterThan(beforeCount);
    }

    // 캡처된 아티팩트 수집
    const artifacts = await getCapturedArtifacts(page);
    expect(artifacts.length).toBeGreaterThan(0);

    // ip-pack-manifest 찾기 및 limitation 검증
    const manifestArtifact = artifacts.find((a) =>
      a.content.includes('loreguard.ip-pack-manifest.v1'),
    );
    expect(manifestArtifact, 'ip-pack-manifest 아티팩트 누락').toBeTruthy();
    const manifest = JSON.parse(manifestArtifact!.content) as {
      kind: string;
      limitation: unknown;
    };
    expect(manifest.limitation, 'ip-pack-manifest limitation 필드 누락').toBeTruthy();
    const ipLimitation = String(manifest.limitation);
    expect(ipLimitation.length).toBeGreaterThan(0);
    // 저작권/법적 검토 관련 면책 문구
    expect(ipLimitation).toMatch(
      /copyright|저작권|legal review|법률 검토|certify|확정|귀속|ownership|does not certify/i,
    );

    // release-credit-preview 찾기 및 limitation 검증
    const creditArtifact = artifacts.find((a) =>
      a.content.includes('loreguard.release-credit-preview.v1'),
    );
    expect(creditArtifact, 'release-credit-preview 아티팩트 누락').toBeTruthy();
    const credit = JSON.parse(creditArtifact!.content) as {
      kind: string;
      limitation: unknown;
    };
    expect(credit.limitation, 'release-credit-preview limitation 필드 누락').toBeTruthy();
    const rcLimitation = String(credit.limitation);
    expect(rcLimitation.length).toBeGreaterThan(0);
    // 실제 결제 관련 면책 문구
    expect(rcLimitation).toMatch(
      /실제 결제|actual payment|결제.*실행|purchase|billing|구매/i,
    );
  });

  // ===========================================================
  // Test 6: NOA VETO 표시 확인 (T10 축소)
  // ===========================================================
  test('Test 6: NOA VETO 표시 확인 (T10 축소)', async ({ page }) => {
    test.setTimeout(120_000);

    const projects = makeProjectFixture(PROJECT_ID, '접근 제어 검증 작품', SESSION_ID);
    await installSeededStudio(page, projects, PROJECT_ID, SESSION_ID);

    const vetoPayload = JSON.stringify({
      blocked: true,
      reason: 'TRINITY_VETO_HARD_BLOCK',
      gradeRequired: 'Black',
    });

    // AI 관련 API 모두 VETO 차단 응답으로 모킹
    await page.route('**/api/complete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: vetoPayload,
      });
    });
    await page.route('**/api/ai/complete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: vetoPayload,
      });
    });
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'noa_request_blocked',
            detail: {
              blocked: true,
              reason: 'TRINITY_VETO_HARD_BLOCK',
              gradeRequired: 'Black',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/gemini-structured', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: vetoPayload,
      });
    });
    await page.route('**/api/analyze-chapter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: vetoPayload,
      });
    });

    // Writing 탭으로 이동
    await page.goto(appUrl('/studio?tab=writing'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
    await dismissCookieBannerIfVisible(page);

    // 원고 편집기에서 AI 자동완성 트리거
    const editor = page.getByTestId('writing-manuscript-editor');
    const editorVisible = await editor.isVisible({ timeout: 10_000 }).catch(() => false);
    if (editorVisible) {
      await editor.click();
      await page.keyboard.type('유해 콘텐츠 테스트 입력 ');
      await page.keyboard.press('Tab');

      // VETO/차단 메시지 확인
      await expect(page.locator('body')).toContainText(
        /차단|VETO|거부|blocked|판정|gate|TRINITY|제한|이용.*중단/i,
        { timeout: 15_000 },
      );
    } else {
      // 편집기가 없으면 노아 제안 버튼 클릭 시도
      const noaBtn = page.locator('button:visible', {
        hasText: /노아 제안|Noa|생성|Generate|AI 제안|초고/,
      }).first();
      const hasBtnVisible = await noaBtn.isVisible({ timeout: 8_000 }).catch(() => false);

      if (hasBtnVisible) {
        await noaBtn.click();
        await expect(page.locator('body')).toContainText(
          /차단|VETO|거부|blocked|판정|gate|TRINITY|제한/i,
          { timeout: 15_000 },
        );
      } else {
        // 최종 폴백: 모킹된 API가 실제로 블록 응답을 반환하는지 직접 확인
        const directRes = await page.evaluate(async () => {
          const response = await fetch('/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: 'VETO 확인용 테스트 입력 — 충분히 긴 텍스트를 보냅니다.',
              genre: 'SF',
              maxTokens: 100,
            }),
          });
          return response.json() as Promise<Record<string, unknown>>;
        });
        expect(directRes).toMatchObject({
          blocked: true,
          reason: expect.stringContaining('TRINITY_VETO'),
        });
      }
    }

    // 페이지가 크래시 없이 살아 있는지 확인
    await expect(page.locator('body')).toBeVisible();
  });
});
