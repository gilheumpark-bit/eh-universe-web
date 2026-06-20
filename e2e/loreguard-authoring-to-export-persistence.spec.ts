import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const EVIDENCE_DIR = 'C:\\Users\\sung4\\OneDrive\\바탕 화면\\EH\\E2E_950점_증거_2026-06-18';
const PROJECT_TITLE = '950 E2E 검증 작품';
const CORE_PREMISE = '권리 기록을 다루는 작가가 잃어버린 원고의 출처를 추적한다.';
const RIGHTS_MEMO = '작가 단독 창작, 외부자료 없음.';
const MANUSCRIPT_TEXT = '윤서는 제출 직전 원고와 과정기록의 해시를 다시 대조했다. 기록이 맞물리자 출고 패키지는 다음 단계로 넘어갔다.';

interface StoredProjectSnapshot {
  projectCount: number;
  matchedProjectName: string | null;
  matchedSessionTitle: string | null;
  lastProjectId: string | null;
  lastSessionId: string | null;
  projectText: string;
  hasProjectTitle: boolean;
  hasCorePremise: boolean;
  hasRightsMemo: boolean;
  hasStoredManuscript: boolean;
}

interface LayoutMetric {
  label: string;
  clientWidth: number;
  scrollWidth: number;
}

function appUrl(pathname: string): string {
  const origin = process.env.PLAYWRIGHT_APP_ORIGIN?.replace(/\/$/, '');
  return origin ? `${origin}${pathname}` : pathname;
}

function evidencePath(filename: string): string {
  return join(EVIDENCE_DIR, filename);
}

async function installCleanWriterState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem('__loreguard_e2e_cleaned__')) {
      window.localStorage.clear();
      window.sessionStorage.setItem('__loreguard_e2e_cleaned__', '1');
    }
    window.localStorage.setItem('eh-onboarded', '1');
    window.localStorage.setItem('noa-lg-onboarded', '1');
    window.localStorage.setItem('eh-user-role', 'writer');
    window.localStorage.setItem('noa_studio_lang', 'KO');
    window.localStorage.setItem('noa_first_visit_seen', '1');
  });
}

async function captureEvidence(page: Page, filename: string): Promise<string> {
  const targetPath = evidencePath(filename);
  await page.screenshot({ path: targetPath, fullPage: false });
  return targetPath;
}

async function readStoredProjectSnapshot(page: Page): Promise<StoredProjectSnapshot> {
  return page.evaluate(({ title, corePremise, rightsMemo, manuscript }) => {
    const rawProjects = window.localStorage.getItem('noa_projects_v2') ?? '[]';
    let projects: Array<Record<string, unknown>> = [];
    try {
      const parsed = JSON.parse(rawProjects);
      projects = Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : [];
    } catch {
      projects = [];
    }

    const projectTexts = projects.map((project) => JSON.stringify(project));
    const matchedProjectIndex = projectTexts.findIndex((projectText) => projectText.includes(title));
    const matchedProject = matchedProjectIndex >= 0 ? projects[matchedProjectIndex] : projects[0];
    const sessions = Array.isArray(matchedProject?.sessions)
      ? matchedProject.sessions as Array<Record<string, unknown>>
      : [];
    const matchedSession = sessions.find((session) => JSON.stringify(session).includes(title)) ?? sessions[0];
    const projectText = JSON.stringify(matchedProject ?? {});

    return {
      projectCount: projects.length,
      matchedProjectName: typeof matchedProject?.name === 'string' ? matchedProject.name : null,
      matchedSessionTitle: typeof matchedSession?.title === 'string' ? matchedSession.title : null,
      lastProjectId: window.localStorage.getItem('noa_last_project_id'),
      lastSessionId: window.localStorage.getItem('noa_last_session_id'),
      projectText,
      hasProjectTitle: projectText.includes(title),
      hasCorePremise: projectText.includes(corePremise),
      hasRightsMemo: projectText.includes(rightsMemo),
      hasStoredManuscript: projectText.includes(manuscript),
    };
  }, {
    title: PROJECT_TITLE,
    corePremise: CORE_PREMISE,
    rightsMemo: RIGHTS_MEMO,
    manuscript: MANUSCRIPT_TEXT,
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string): Promise<LayoutMetric> {
  const metric = await page.evaluate((metricLabel) => ({
    label: metricLabel,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }), label);
  expect(metric.scrollWidth, `${label} horizontal overflow`).toBeLessThanOrEqual(metric.clientWidth + 2);
  return metric;
}

async function fillProjectBasis(page: Page): Promise<void> {
  await page.getByTestId('project-title-input').fill(PROJECT_TITLE);
  await page.getByTestId('project-total-episodes-input').fill('12화');
  await page.getByTestId('project-episode-length-input').fill('5,500자');
  await page.getByTestId('project-schedule-input').fill('주 5회 연재');
  await page.getByTestId('project-core-premise-input').fill(CORE_PREMISE);
  await page.getByTestId('project-rights-memo-input').fill(RIGHTS_MEMO);
}

test.use({ viewport: { width: 1440, height: 960 } });

test.describe('Loreguard authoring to export persistence', () => {
  test('creates a work, persists it, saves manuscript text, and opens a ready export package', async ({ page }) => {
    test.setTimeout(120_000);
    await mkdir(EVIDENCE_DIR, { recursive: true });

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const screenshots: string[] = [];
    const layoutMetrics: LayoutMetric[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await installCleanWriterState(page);
    await page.goto(appUrl('/studio?tab=project'), { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('project-title-input')).toBeVisible({ timeout: 30_000 });
    layoutMetrics.push(await expectNoHorizontalOverflow(page, 'project-start'));
    screenshots.push(await captureEvidence(page, '01-project-start.png'));

    await fillProjectBasis(page);
    await page.getByTestId('project-save-open-world').click();
    await expect.poll(async () => {
      const snapshot = await readStoredProjectSnapshot(page);
      return snapshot.hasProjectTitle && snapshot.hasCorePremise && snapshot.hasRightsMemo;
    }, { timeout: 20_000 }).toBe(true);
    await page.waitForURL(/tab=world/, { timeout: 5_000 }).catch(() => undefined);

    const afterProjectSave = await readStoredProjectSnapshot(page);
    expect(afterProjectSave.projectCount).toBeGreaterThan(0);
    expect(afterProjectSave.lastProjectId).toBeTruthy();
    expect(afterProjectSave.lastSessionId).toBeTruthy();
    screenshots.push(await captureEvidence(page, '02-world-after-project-save.png'));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(async () => {
      const snapshot = await readStoredProjectSnapshot(page);
      return snapshot.hasProjectTitle && snapshot.hasCorePremise && snapshot.hasRightsMemo;
    }, { timeout: 20_000 }).toBe(true);
    screenshots.push(await captureEvidence(page, '03-world-after-reload.png'));

    await page.goto(appUrl('/studio?tab=writing'), { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('writing-manuscript-editor')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('writing-manuscript-editor').fill(MANUSCRIPT_TEXT);
    const saveButton = page.getByTestId('writing-save-episode');
    const saveButtonVisible = await saveButton.waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (saveButtonVisible) {
      await saveButton.click();
    } else {
      await page.keyboard.press('Control+S');
    }
    await expect.poll(async () => {
      const snapshot = await readStoredProjectSnapshot(page);
      return snapshot.hasStoredManuscript;
    }, { timeout: 20_000 }).toBe(true);
    layoutMetrics.push(await expectNoHorizontalOverflow(page, 'writing'));
    screenshots.push(await captureEvidence(page, '04-writing-saved-manuscript.png'));

    await page.goto(appUrl('/studio?tab=export'), { waitUntil: 'domcontentloaded' });
    const exportPackage = page.getByTestId('export-package-ready');
    await expect(exportPackage).toBeVisible({ timeout: 30_000 });
    await expect(exportPackage).toContainText('출고 문서함');
    await expect(exportPackage).toContainText('패키지 준비');
    await expect(exportPackage).toContainText('출고 패키지 · 과정기록 포함');
    await expect(exportPackage).toContainText('회차 원고');
    layoutMetrics.push(await expectNoHorizontalOverflow(page, 'export'));
    screenshots.push(await captureEvidence(page, '05-export-package-ready.png'));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('export-package-ready')).toContainText('패키지 준비', { timeout: 30_000 });
    const afterExportReload = await readStoredProjectSnapshot(page);
    expect(afterExportReload.hasProjectTitle).toBe(true);
    expect(afterExportReload.hasStoredManuscript).toBe(true);
    screenshots.push(await captureEvidence(page, '06-export-after-reload.png'));

    expect(pageErrors).toEqual([]);

    await writeFile(evidencePath('authoring-to-export-results.json'), JSON.stringify({
      status: 'passed',
      generatedAt: new Date().toISOString(),
      project: {
        title: PROJECT_TITLE,
        afterProjectSave,
        afterExportReload,
      },
      screenshots,
      layoutMetrics,
      consoleErrors,
      pageErrors,
    }, null, 2), 'utf8');
  });
});
