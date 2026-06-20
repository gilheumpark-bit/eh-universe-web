import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';

const PROJECT_ID = 'e2e-submission-package-project';
const SESSION_ID = 'e2e-submission-package-session';
const WORK_RECEIPT_JOURNAL_KEY = 'noa_work_receipt_journal_v1';
const REVISION_FIX_PREFIX = `revision:${SESSION_ID}:`;
const APPROVED_REASON = '작가가 수동 정리 대상으로 승인';
const REJECTED_REASON = '작가가 의도한 문체라 보류';
const EXPECTED_ARTIFACT_IDS = [
  'manuscript-md',
  'process-certificate',
  'public-certificate-card',
  'source-bundle',
  'import-file-report',
  'jurisdiction-form-pack',
  'release-credit-preview',
  'core-copyright-package',
  'ip-pack-manifest',
  'digital-signature',
] as const;
const PACKAGE_ACTION_BUTTON_NAME = /묶음 생성|Generate Package|상위 플랜 검토용 미리보기|출고 묶음 미리보기|출고 묶음 검토 생성|조직 제출 묶음 검토 생성/;

type ArtifactId = (typeof EXPECTED_ARTIFACT_IDS)[number];
type DownloadedArtifacts = Map<ArtifactId, string>;
type CapturedDownload = { mimeType: string; content: string };

interface DigitalSignaturePayload {
  kind?: unknown;
  manuscriptHash?: unknown;
  timelineHash?: unknown;
  sourceSummaryHash?: unknown;
}

interface IpPackManifestPayload {
  kind?: unknown;
  externalMaterialClusters?: Array<{
    labelKo?: unknown;
    statusKo?: unknown;
    purposeKo?: unknown;
  }>;
  mediaFormGroups?: Array<{
    titleKo?: unknown;
    purposeKo?: unknown;
    fields?: Array<{
      labelKo?: unknown;
      filled?: unknown;
      sourceKo?: unknown;
    }>;
  }>;
  projectLedgerScope?: {
    projectId?: unknown;
    projectScoped?: unknown;
  };
  publicVerifyPolicy?: {
    noManuscriptContent?: unknown;
    noPromptText?: unknown;
    noSourceBodyText?: unknown;
  };
  workReceiptSummary?: {
    count?: unknown;
    approved?: unknown;
    rejected?: unknown;
    contentPolicy?: unknown;
  };
  limitation?: unknown;
}

interface JurisdictionFormPackPayload {
  kind?: unknown;
  packId?: unknown;
  label?: {
    ko?: unknown;
  };
  forms?: Array<{
    title?: {
      ko?: unknown;
    };
  }>;
  sourceReferences?: Array<{
    checkedAt?: unknown;
  }>;
}

interface ReleaseCreditPreviewPayload {
  kind?: unknown;
  packageProfileId?: unknown;
  planId?: unknown;
  status?: unknown;
  product?: {
    labelKo?: unknown;
    requiredCredits?: unknown;
  };
  creditPreview?: {
    receiptDraftKo?: unknown;
    ledgerNoteKo?: unknown;
    projectScopeNoteKo?: unknown;
  };
  ledgerEventDraft?: {
    projectId?: unknown;
    projectScoped?: unknown;
    statusKo?: unknown;
    checkedAt?: unknown;
  };
  limitation?: unknown;
}

interface ZipManifestPayload {
  kind?: unknown;
  artifactCount?: unknown;
  artifacts?: Array<{
    id?: unknown;
    path?: unknown;
    filename?: unknown;
    mimeType?: unknown;
    size?: unknown;
  }>;
  limitation?: unknown;
}

// ============================================================
// PART 1 — Fixture and UI helpers
// ============================================================

function appUrl(path: string): string {
  const origin = process.env.PLAYWRIGHT_APP_ORIGIN?.replace(/\/$/, '');
  return origin ? `${origin}${path}` : path;
}

function makeProjectPayload(stamp: number) {
  return [{
    id: PROJECT_ID,
    name: '출고 검증 작품',
    description: 'submission package browser export verification fixture',
    genre: 'SF',
    createdAt: stamp,
    lastUpdate: stamp,
    sessions: [{
      id: SESSION_ID,
      title: '검증 회차',
      messages: [],
      lastUpdate: stamp,
      config: {
        genre: 'SF',
        povCharacter: '윤서',
        setting: '기록 보관소',
        primaryEmotion: '긴장',
        episode: 1,
        title: '첫 봉인',
        totalEpisodes: 12,
        guardrails: { min: 3500, max: 5500 },
        platform: 'MOBILE',
        projectTargetLanguage: 'KO',
        targetMarket: 'KR',
        corePremise: 'AI 지휘 과정과 승인 로그가 작품의 출고 자산이 된다.',
        powerStructure: '기록 담당자와 승인자가 분리되어 있다.',
        currentConflict: '최종 제출 전 hash manifest를 다시 대조해야 한다.',
        worldHistory: '모든 원고 수정은 담당자 승인 후 보관소에 기록된다.',
        socialSystem: '창작자는 작업자에게 역할과 권한을 부여한다.',
        economy: '출고 패키지는 플랫폼 제출과 권리 정리에 함께 쓰인다.',
        magicTechSystem: '검증 도구는 원고와 확인서의 hash chain을 비교한다.',
        survivalEnvironment: '잘못된 패키지는 HOLD 처리된다.',
        culture: '결과보다 지시와 승인 경로를 중요하게 본다.',
        truthVsBeliefs: '좋은 결과물만으로는 책임 경로를 설명할 수 없다.',
        characters: [
          {
            id: 'char-yunseo',
            name: '윤서',
            role: '기록 책임자',
            traits: '차분함, 꼼꼼함',
            appearance: '검은 재킷과 낡은 손목 단말',
            dna: 7,
          },
        ],
        charRelations: [],
        manuscripts: [
          {
            episode: 1,
            title: '첫 봉인',
            content: '윤서는 제출 직전 원고와 확인서의 해시를 다시 대조했다.',
            charCount: 34,
            lastUpdate: stamp,
          },
          {
            episode: 2,
            title: '두 번째 서명',
            content: '승인자는 결과가 아니라 지시와 수정 이력을 먼저 확인했다.',
            charCount: 33,
            lastUpdate: stamp,
          },
        ],
        importFileReports: [
          {
            id: 'e2e-import-world',
            fileName: 'world.md',
            status: 'success',
            detail: '세계관 후보 생성',
            candidateCount: 2,
            importedAt: new Date(stamp - 2_000).toISOString(),
          },
        ],
        sceneDirection: {
          writerNotes: '출고 전 hash manifest 검증을 HOLD 조건으로 둔다.',
          hooks: [{ position: 'ending', hookType: 'verification', desc: 'signature mismatch면 제출을 중지한다.' }],
        },
        episodeSceneSheets: [],
        worldSimData: {
          civs: [{ name: '기록 보관소', era: 'near-future', color: '#4169E1', traits: ['audited'] }],
        },
        styleProfile: {
          selectedDNA: [1, 4, 7],
          sliders: { density: 3, dialogue: 2 },
          checkedSF: [0, 2],
          checkedWeb: [1],
        },
      },
    }],
  }];
}

function makeWorkReceiptJournal(stamp: number) {
  return [
    {
      id: 'e2e-work-receipt-approved',
      at: stamp - 1_000,
      fixId: `${REVISION_FIX_PREFIX}mechanical-markdown-residue`,
      decision: 'approved',
      reason: APPROVED_REASON,
      scoreDelta: 0,
      receipt: {
        did: [{
          action: `fix 승인 — ${REVISION_FIX_PREFIX}mechanical-markdown-residue`,
          evidence: APPROVED_REASON,
        }],
        skipped: [],
      },
    },
    {
      id: 'e2e-work-receipt-rejected',
      at: stamp - 500,
      fixId: `${REVISION_FIX_PREFIX}voice-style-hold`,
      decision: 'rejected',
      reason: REJECTED_REASON,
      scoreDelta: null,
      receipt: {
        did: [],
        skipped: [{
          action: `fix 거절 — ${REVISION_FIX_PREFIX}voice-style-hold`,
          reason: REJECTED_REASON,
        }],
      },
    },
  ];
}

async function installSeededStudio(page: Page): Promise<void> {
  const stamp = Date.now();
  const projects = makeProjectPayload(stamp);
  const workReceipts = makeWorkReceiptJournal(stamp);
  await page.addInitScript(({ projects, projectId, sessionId, workReceipts, workReceiptJournalKey }) => {
    window.localStorage.setItem('eh-onboarded', '1');
    window.localStorage.setItem('noa-lg-onboarded', '1');
    window.localStorage.setItem('eh-user-role', 'writer');
    window.localStorage.setItem('noa_studio_lang', 'KO');
    window.localStorage.setItem('noa_first_visit_seen', '1');
    window.localStorage.setItem('noa_projects_v2', JSON.stringify(projects));
    window.localStorage.setItem('noa_last_project_id', projectId);
    window.localStorage.setItem('noa_last_session_id', sessionId);
    window.localStorage.setItem('noa_studio_currentProjectId', projectId);
    window.localStorage.setItem(workReceiptJournalKey, JSON.stringify(workReceipts));
  }, {
    projects,
    projectId: PROJECT_ID,
    sessionId: SESSION_ID,
    workReceipts,
    workReceiptJournalKey: WORK_RECEIPT_JOURNAL_KEY,
  });
}

async function openExportTabSubmissionPackage(page: Page): Promise<void> {
  await page.goto(appUrl('/studio?tab=export'), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
  const acceptCookieButton = page.getByRole('button', { name: /Accept|동의|필수/ });
  if (await acceptCookieButton.isVisible().catch(() => false)) {
    await acceptCookieButton.click();
  }
  await page.getByRole('tab', { name: /제출 묶음|Submission|ZIP/ }).click();
  await expect(page.getByLabel('제출 묶음 생성 도구', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME })).toBeVisible({ timeout: 30_000 });
}

async function generateSubmissionPackage(page: Page): Promise<void> {
  await installSeededStudio(page);
  await openExportTabSubmissionPackage(page);

  await page.getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME }).click();
  await expect(page.getByRole('button', { name: /묶음 생성 완료|Package generated/ })).toBeVisible({ timeout: 30_000 });
}

async function generateSubmissionPackageFromExportTab(page: Page): Promise<void> {
  await installSeededStudio(page);
  await openExportTabSubmissionPackage(page);

  await page.getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME }).click();
  await expect(page.getByRole('button', { name: /묶음 생성 완료|Package generated/ })).toBeVisible({ timeout: 30_000 });
}

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

// ============================================================
// PART 2 — Download manifest verification
// ============================================================

function artifactIdFromFilename(filename: string): ArtifactId | null {
  if (filename.startsWith('manuscript-')) return 'manuscript-md';
  if (filename.startsWith('authorship-journal-')) return 'process-certificate';
  if (filename.startsWith('public-process-card-')) return 'public-certificate-card';
  if (filename.startsWith('source-bundle-')) return 'source-bundle';
  if (filename.startsWith('import-file-report-')) return 'import-file-report';
  if (filename.startsWith('jurisdiction-form-pack-')) return 'jurisdiction-form-pack';
  if (filename.startsWith('release-credit-preview-')) return 'release-credit-preview';
  if (filename.startsWith('core-copyright-package-')) return 'core-copyright-package';
  if (filename.startsWith('ip-pack-manifest-')) return 'ip-pack-manifest';
  if (filename.startsWith('signature-')) return 'digital-signature';
  return null;
}

async function getCapturedDownloadCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const win = window as Window & { __loreguardCapturedDownloads?: CapturedDownload[] };
    return win.__loreguardCapturedDownloads?.length ?? 0;
  });
}

async function getCapturedDownload(page: Page, index: number): Promise<CapturedDownload> {
  return page.evaluate((downloadIndex) => {
    const win = window as Window & { __loreguardCapturedDownloads?: CapturedDownload[] };
    const captured = win.__loreguardCapturedDownloads?.[downloadIndex];
    if (!captured) throw new Error(`Captured download missing at ${downloadIndex}`);
    return captured;
  }, index);
}

function artifactIdFromDownloadLabel(label: string | null): ArtifactId {
  const filename = label?.replace(/^Download\s+/, '') ?? '';
  const artifactId = artifactIdFromFilename(filename);
  expect(artifactId, `unexpected download label: ${label}`).not.toBeNull();
  return artifactId!;
}

async function captureListedArtifactBlobs(page: Page): Promise<DownloadedArtifacts> {
  const buttons = page.locator('li button[aria-label^="Download "]');
  await expect(buttons).toHaveCount(EXPECTED_ARTIFACT_IDS.length, { timeout: 30_000 });

  const artifacts: DownloadedArtifacts = new Map();
  for (let index = 0; index < EXPECTED_ARTIFACT_IDS.length; index += 1) {
    const label = await buttons.nth(index).getAttribute('aria-label');
    const artifactId = artifactIdFromDownloadLabel(label);

    const beforeCount = await getCapturedDownloadCount(page);
    await buttons.nth(index).click();
    await expect.poll(() => getCapturedDownloadCount(page), {
      timeout: 10_000,
      message: `capture ${label ?? index}`,
    }).toBeGreaterThan(beforeCount);
    const captured = await getCapturedDownload(page, beforeCount);
    artifacts.set(artifactId, captured.content);
  }
  return artifacts;
}

function verifyArtifactManifest(artifacts: DownloadedArtifacts): void {
  for (const artifactId of EXPECTED_ARTIFACT_IDS) {
    expect(artifacts.has(artifactId), `${artifactId} artifact missing`).toBe(true);
  }

  const signature = JSON.parse(artifacts.get('digital-signature')!) as DigitalSignaturePayload;
  expect(signature.kind).toBe('loreguard.digital-signature.v1');
  expect(String(signature.manuscriptHash)).toMatch(/^[a-f0-9]{64}$/);
  expect(String(signature.timelineHash)).toMatch(/^[a-f0-9]{64}$/);
  expect(String(signature.sourceSummaryHash)).toMatch(/^[a-f0-9]{64}$/);
}

function expectKoreanIpPackFormLabels(ipPack: IpPackManifestPayload): void {
  expect(ipPack.externalMaterialClusters?.map((cluster) => cluster.labelKo)).toEqual(expect.arrayContaining([
    '진입 자료',
    '스토리 자료',
    '설정 자료',
    '제작·사업 자료',
  ]));
  expect(ipPack.externalMaterialClusters?.map((cluster) => cluster.statusKo)).toEqual(expect.arrayContaining([
    expect.stringMatching(/준비|보강 필요|대기/),
  ]));

  expect(ipPack.mediaFormGroups?.map((group) => group.titleKo)).toEqual(expect.arrayContaining([
    '작품 한눈 요약',
    '캐릭터·키씬 전달',
    '제작 경계',
  ]));
  const fieldLabels = ipPack.mediaFormGroups?.flatMap((group) =>
    group.fields?.map((field) => field.labelKo) ?? [],
  ) ?? [];
  expect(fieldLabels).toEqual(expect.arrayContaining([
    '로그라인',
    '1화 후킹',
    '목표 독자',
    '연재 회차',
    '플랫폼 기준',
    '주요 인물 외형',
    '키씬 5~10개',
    '콘티 귀속',
    '스포일러 공개 시점',
  ]));
}

async function readSubmissionPackageZip(downloadPath: string): Promise<{
  zip: JSZip;
  manifest: ZipManifestPayload;
  artifacts: DownloadedArtifacts;
}> {
  const zip = await JSZip.loadAsync(await readFile(downloadPath));
  const manifestFile = zip.file('manifest.json');
  const readmeFile = zip.file('README.txt');

  expect(manifestFile, 'ZIP manifest.json missing').toBeTruthy();
  expect(readmeFile, 'ZIP README.txt missing').toBeTruthy();

  const manifest = JSON.parse(await manifestFile!.async('string')) as ZipManifestPayload;
  expect(manifest.kind).toBe('loreguard.submission-package-zip.v1');
  expect(manifest.artifactCount).toBe(EXPECTED_ARTIFACT_IDS.length);
  expect(manifest.limitation).toMatch(/legal review remain separate review steps|법률 검토의 최종 판단은 별도 검토 단계/);
  expect(await readmeFile!.async('string')).toContain('Loreguard 출고 패키지');

  const entries = manifest.artifacts ?? [];
  const artifacts: DownloadedArtifacts = new Map();
  for (const artifactId of EXPECTED_ARTIFACT_IDS) {
    const entry = entries.find((item) => item.id === artifactId);
    expect(entry, `${artifactId} ZIP manifest entry missing`).toBeTruthy();
    expect(typeof entry!.path).toBe('string');
    const zipPath = String(entry!.path);
    expect(zipPath).toMatch(/^artifacts\//);
    expect(zipPath).not.toMatch(/\.\.|\\/);
    const file = zip.file(zipPath);
    expect(file, `${artifactId} ZIP file missing`).toBeTruthy();
    artifacts.set(artifactId, await file!.async('string'));
  }

  return { zip, manifest, artifacts };
}

async function readIpPackManifestFromZip(
  zip: JSZip,
  manifest: ZipManifestPayload,
): Promise<IpPackManifestPayload> {
  const ipEntry = manifest.artifacts?.find((artifact) => artifact.id === 'ip-pack-manifest');
  expect(ipEntry?.path, 'ip-pack-manifest ZIP path missing').toBeTruthy();
  const ipFile = zip.file(String(ipEntry!.path));
  expect(ipFile, 'ip-pack-manifest ZIP file missing').toBeTruthy();
  return JSON.parse(await ipFile!.async('string')) as IpPackManifestPayload;
}

// ============================================================
// PART 3 — Browser export test
// ============================================================

test.use({ acceptDownloads: true });

test.describe('Loreguard submission package browser export verification', () => {
  test.describe.configure({ mode: 'serial' });

  test('generates downloadable artifacts whose hashes match the digital-signature manifest', async ({ page }) => {
    test.setTimeout(120_000);
    await installBlobDownloadCapture(page);
    await generateSubmissionPackage(page);

    const artifacts = await captureListedArtifactBlobs(page);
    verifyArtifactManifest(artifacts);

    expect(artifacts.get('manuscript-md')).toContain('출고 검증 작품');
    expect(artifacts.get('manuscript-md')).toContain('윤서는 제출 직전 원고와 확인서의 해시를 다시 대조했다.');
    expect(artifacts.get('process-certificate')).not.toMatch(/저작권 보증|100% 저작권 보호/);
    expect(JSON.parse(artifacts.get('source-bundle')!)).toEqual({
      sources: expect.any(Array),
      links: expect.any(Array),
    });

    const ipPack = JSON.parse(artifacts.get('ip-pack-manifest')!) as IpPackManifestPayload;
    expect(ipPack.kind).toBe('loreguard.ip-pack-manifest.v1');
    expect(ipPack.publicVerifyPolicy?.noManuscriptContent).toBe(true);
    expect(ipPack.publicVerifyPolicy?.noPromptText).toBe(true);
    expect(ipPack.publicVerifyPolicy?.noSourceBodyText).toBe(true);
    expect(ipPack.projectLedgerScope?.projectId).toBe(PROJECT_ID);
    expect(ipPack.projectLedgerScope?.projectScoped).toBe(true);
    expectKoreanIpPackFormLabels(ipPack);
    expect(ipPack.limitation).toMatch(/does not certify copyright ownership|저작권 귀속.*확정하지 않습니다/);
    expect(artifacts.get('ip-pack-manifest')).not.toContain('윤서는 제출 직전 원고와 확인서의 해시를 다시 대조했다.');

    const jurisdictionPack = JSON.parse(artifacts.get('jurisdiction-form-pack')!) as JurisdictionFormPackPayload;
    expect(jurisdictionPack.kind).toBe('loreguard.jurisdiction-form-pack.v1');
    expect(jurisdictionPack.packId).toBe('ko-KR');
    expect(jurisdictionPack.label?.ko).toBe('한국어/한국 출고 팩');
    expect(jurisdictionPack.forms?.map((form) => form.title?.ko)).toEqual(expect.arrayContaining([
      '프로젝트 접수',
      '과정기록 양식',
      '권리/IP 자산화 양식',
      '출고 패키지 양식',
    ]));
    expect(jurisdictionPack.sourceReferences?.map((reference) => reference.checkedAt)).toContain('2026-06-15');

    const releaseCredit = JSON.parse(artifacts.get('release-credit-preview')!) as ReleaseCreditPreviewPayload;
    expect(releaseCredit.kind).toBe('loreguard.release-credit-preview.v1');
    expect(releaseCredit.packageProfileId).toBe('external-submission');
    expect(releaseCredit.planId).toBe('starter');
    expect(releaseCredit.product?.labelKo).toBe('완결 과정기록');
    expect(releaseCredit.product?.requiredCredits).toBe(10);
    expect(releaseCredit.ledgerEventDraft).toMatchObject({
      projectId: PROJECT_ID,
      projectScoped: true,
      checkedAt: '2026-06-14',
    });
    expect(String(releaseCredit.creditPreview?.ledgerNoteKo)).toContain('구매를 실행하지 않고');
    expect(String(releaseCredit.limitation)).toContain('실제 결제');

    expect(JSON.parse(artifacts.get('import-file-report')!)).toMatchObject({
      kind: 'loreguard.import-file-report.v1',
      count: 1,
      files: [
        expect.objectContaining({
          fileName: 'world.md',
          status: 'success',
          candidateCount: 2,
        }),
      ],
    });
  });

  test('keeps author decision reasons out of the UI IP Pack manifest', async ({ page }) => {
    test.setTimeout(120_000);
    await installBlobDownloadCapture(page);
    await generateSubmissionPackage(page);

    const artifacts = await captureListedArtifactBlobs(page);
    verifyArtifactManifest(artifacts);

    const ipPack = JSON.parse(artifacts.get('ip-pack-manifest')!) as IpPackManifestPayload;
    expect(ipPack.workReceiptSummary).toEqual({
      count: 0,
      approved: 0,
      rejected: 0,
      contentPolicy: 'counts-only-no-reasons-or-receipts',
    });
    expect(artifacts.get('ip-pack-manifest')).not.toContain(APPROVED_REASON);
    expect(artifacts.get('ip-pack-manifest')).not.toContain(REJECTED_REASON);
    expect(artifacts.get('ip-pack-manifest')).not.toContain('e2e-work-receipt-approved');
    expect(artifacts.get('ip-pack-manifest')).not.toContain('e2e-work-receipt-rejected');
  });

  test('downloads a single ZIP package whose manifest and artifacts are readable', async ({ page }) => {
    test.setTimeout(120_000);
    await installBlobDownloadCapture(page);
    await generateSubmissionPackage(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /ZIP 다운로드|Download ZIP/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^loreguard-package-.+\.zip$/);

    const downloadPath = await download.path();
    expect(downloadPath, 'Playwright download path missing').toBeTruthy();

    await expect(page.getByText(/ZIP 다운로드 준비됨|ZIP download ready/)).toBeVisible({ timeout: 15_000 });
    const { zip, manifest, artifacts } = await readSubmissionPackageZip(downloadPath!);

    expect(zip.file('manifest.json')).toBeTruthy();
    expect(manifest.artifacts?.map((artifact) => artifact.id).sort()).toEqual([...EXPECTED_ARTIFACT_IDS].sort());
    verifyArtifactManifest(artifacts);
    expectKoreanIpPackFormLabels(await readIpPackManifestFromZip(zip, manifest));
  });

  test('exposes submission package generation directly from the Export tab', async ({ page }) => {
    test.setTimeout(120_000);
    await installBlobDownloadCapture(page);
    await generateSubmissionPackageFromExportTab(page);

    await expect(page.getByText(/권리\/IP 자산화 구성표|Rights\/IP Pack Manifest/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /ZIP 다운로드|Download ZIP/ })).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /ZIP 다운로드|Download ZIP/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^loreguard-package-.+\.zip$/);

    const downloadPath = await download.path();
    expect(downloadPath, 'Playwright download path missing').toBeTruthy();

    const zip = await JSZip.loadAsync(await readFile(downloadPath!));
    const manifestFile = zip.file('manifest.json');
    const readmeFile = zip.file('README.txt');
    expect(manifestFile, 'ZIP manifest.json missing').toBeTruthy();
    expect(readmeFile, 'ZIP README.txt missing').toBeTruthy();

    const manifest = JSON.parse(await manifestFile!.async('string')) as ZipManifestPayload;
    expect(manifest.kind).toBe('loreguard.submission-package-zip.v1');
    expect(await readmeFile!.async('string')).toContain('Loreguard 출고 패키지');
    expect(manifest.artifacts?.some((artifact) => artifact.id === 'ip-pack-manifest')).toBe(true);

    const ipPack = await readIpPackManifestFromZip(zip, manifest);
    expect(ipPack).toMatchObject({
      kind: 'loreguard.ip-pack-manifest.v1',
      projectLedgerScope: expect.objectContaining({
        projectId: PROJECT_ID,
      }),
    });
    expectKoreanIpPackFormLabels(ipPack);
  });
});
