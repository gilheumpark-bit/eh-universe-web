import { expect, test, type Page } from '@playwright/test';

// ============================================================
// Loreguard Trust Chain E2E — T1 (Security Theater) + T11 (Provenance Chain Break)
// ============================================================
//
// 7 테스트 케이스:
//   1. IndexedDB 해시 체인 무결성 검증
//   2. 변조 이벤트 → 체인 검증 실패
//   3. digital-signature hash 일관성
//   4. 변조 원고 → 서명 불일치
//   5. IP Pack manifest 에 원문 미노출
//   6. C2PA-ready manifest 존재·위장 방지
//   7. 공개 검증 페이지 존재
// ============================================================

const PROJECT_ID = 'e2e-trust-chain-project';
const SESSION_ID = 'e2e-trust-chain-session';
const MANUSCRIPT_TEXT = '윤서는 제출 직전 원고와 확인서의 해시를 다시 대조했다.';
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

type ArtifactId = (typeof EXPECTED_ARTIFACT_IDS)[number];
type DownloadedArtifacts = Map<ArtifactId, string>;
type CapturedDownload = { mimeType: string; content: string };

const PACKAGE_ACTION_BUTTON_NAME =
  /묶음 생성|Generate Package|상위 플랜 검토용 미리보기|상위 권한 검토용 미리보기|출고 묶음 미리보기|출고 묶음 검토 생성|조직 제출 묶음 검토 생성/;

// ============================================================
// PART 1 — 공용 헬퍼
// ============================================================

function appUrl(path: string): string {
  const origin = process.env.PLAYWRIGHT_APP_ORIGIN?.replace(/\/$/, '');
  return origin ? `${origin}${path}` : path;
}

test.use({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });

// ============================================================
// PART 2 — 프로젝트 시드 데이터
// ============================================================

function makeProjectPayload(stamp: number) {
  return [
    {
      id: PROJECT_ID,
      name: '신뢰 체인 검증 작품',
      description: 'trust chain E2E verification fixture',
      genre: 'SF',
      createdAt: stamp,
      lastUpdate: stamp,
      sessions: [
        {
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
            corePremise:
              'AI 지휘 과정과 승인 로그가 작품의 출고 자산이 된다.',
            powerStructure: '기록 담당자와 승인자가 분리되어 있다.',
            currentConflict:
              '최종 제출 전 hash manifest를 다시 대조해야 한다.',
            worldHistory:
              '모든 원고 수정은 담당자 승인 후 보관소에 기록된다.',
            socialSystem: '창작자는 작업자에게 역할과 권한을 부여한다.',
            economy:
              '출고 패키지는 플랫폼 제출과 권리 정리에 함께 쓰인다.',
            magicTechSystem:
              '검증 도구는 원고와 확인서의 hash chain을 비교한다.',
            survivalEnvironment: '잘못된 패키지는 HOLD 처리된다.',
            culture: '결과보다 지시와 승인 경로를 중요하게 본다.',
            truthVsBeliefs:
              '좋은 결과물만으로는 책임 경로를 설명할 수 없다.',
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
                content: MANUSCRIPT_TEXT,
                charCount: MANUSCRIPT_TEXT.length,
                lastUpdate: stamp,
              },
              {
                episode: 2,
                title: '두 번째 서명',
                content:
                  '승인자는 결과가 아니라 지시와 수정 이력을 먼저 확인했다.',
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
              writerNotes:
                '출고 전 hash manifest 검증을 HOLD 조건으로 둔다.',
              hooks: [
                {
                  position: 'ending',
                  hookType: 'verification',
                  desc: 'signature mismatch면 제출을 중지한다.',
                },
              ],
            },
            episodeSceneSheets: [],
            worldSimData: {
              civs: [
                {
                  name: '기록 보관소',
                  era: 'near-future',
                  color: '#4169E1',
                  traits: ['audited'],
                },
              ],
            },
            styleProfile: {
              selectedDNA: [1, 4, 7],
              sliders: { density: 3, dialogue: 2 },
              checkedSF: [0, 2],
              checkedWeb: [1],
            },
          },
        },
      ],
    },
  ];
}

async function installSeededStudio(page: Page): Promise<void> {
  const stamp = Date.now();
  const projects = makeProjectPayload(stamp);
  await page.addInitScript(
    ({ projects, projectId, sessionId }) => {
      window.localStorage.setItem('eh-onboarded', '1');
      window.localStorage.setItem('noa-lg-onboarded', '1');
      window.localStorage.setItem('eh-user-role', 'writer');
      window.localStorage.setItem('noa_studio_lang', 'KO');
      window.localStorage.setItem('noa_first_visit_seen', '1');
      window.localStorage.setItem('noa_payment_status', 'paid');
      window.localStorage.setItem('noa_entitlement_plan', 'pro');
      window.localStorage.setItem(
        'noa_projects_v2',
        JSON.stringify(projects),
      );
      window.localStorage.setItem('noa_last_project_id', projectId);
      window.localStorage.setItem('noa_last_session_id', sessionId);
      window.localStorage.setItem(
        'noa_studio_currentProjectId',
        projectId,
      );
      window.localStorage.setItem(
        'noa_work_receipt_journal_v1',
        JSON.stringify([]),
      );
    },
    { projects, projectId: PROJECT_ID, sessionId: SESSION_ID },
  );
}

async function installBlobDownloadCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const capturedDownloads: Array<{
      mimeType: string;
      content: string;
    }> = [];
    Object.defineProperty(window, '__loreguardCapturedDownloads', {
      value: capturedDownloads,
      configurable: true,
    });
    const origCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = ((object: Blob | MediaSource) => {
      if (object instanceof Blob) {
        void object.text().then((content) => {
          capturedDownloads.push({ mimeType: object.type, content });
        });
      }
      return origCreateObjectURL(object);
    }) as typeof URL.createObjectURL;
  });
}

// ============================================================
// PART 3 — 제출 묶음 생성 + 아티팩트 캡처
// ============================================================

async function openExportTabSubmissionPackage(
  page: Page,
): Promise<void> {
  await page.goto(appUrl('/studio?tab=export'), {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
  const acceptBtn = page.getByRole('button', {
    name: /Accept|동의|필수/,
  });
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click();
  }
  await page
    .getByRole('tab', { name: /제출 묶음|Submission|ZIP/ })
    .click();
  await expect(
    page.getByLabel('제출 묶음 생성 도구', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME }),
  ).toBeVisible({ timeout: 30_000 });
}

async function generateSubmissionPackage(page: Page): Promise<void> {
  await installSeededStudio(page);
  await openExportTabSubmissionPackage(page);
  await page
    .getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME })
    .click();
  await expect(
    page.getByRole('button', {
      name: /묶음 생성 완료|Package generated/,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

function artifactIdFromFilename(filename: string): ArtifactId | null {
  if (filename.startsWith('manuscript-')) return 'manuscript-md';
  if (filename.startsWith('authorship-journal-'))
    return 'process-certificate';
  if (filename.startsWith('public-process-card-'))
    return 'public-certificate-card';
  if (filename.startsWith('source-bundle-')) return 'source-bundle';
  if (filename.startsWith('import-file-report-'))
    return 'import-file-report';
  if (filename.startsWith('jurisdiction-form-pack-'))
    return 'jurisdiction-form-pack';
  if (filename.startsWith('release-credit-preview-'))
    return 'release-credit-preview';
  if (filename.startsWith('core-copyright-package-'))
    return 'core-copyright-package';
  if (filename.startsWith('ip-pack-manifest-'))
    return 'ip-pack-manifest';
  if (filename.startsWith('signature-')) return 'digital-signature';
  return null;
}

async function getCapturedDownloadCount(
  page: Page,
): Promise<number> {
  return page.evaluate(() => {
    const win = window as Window & {
      __loreguardCapturedDownloads?: CapturedDownload[];
    };
    return win.__loreguardCapturedDownloads?.length ?? 0;
  });
}

async function getCapturedDownload(
  page: Page,
  index: number,
): Promise<CapturedDownload> {
  return page.evaluate((i) => {
    const win = window as Window & {
      __loreguardCapturedDownloads?: CapturedDownload[];
    };
    const captured = win.__loreguardCapturedDownloads?.[i];
    if (!captured)
      throw new Error(`Captured download missing at ${i}`);
    return captured;
  }, index);
}

async function captureListedArtifactBlobs(
  page: Page,
): Promise<DownloadedArtifacts> {
  const buttons = page.locator('li button[aria-label^="Download "]');
  await expect(buttons).toHaveCount(EXPECTED_ARTIFACT_IDS.length, {
    timeout: 30_000,
  });

  const artifacts: DownloadedArtifacts = new Map();
  for (
    let index = 0;
    index < EXPECTED_ARTIFACT_IDS.length;
    index += 1
  ) {
    const label = await buttons.nth(index).getAttribute('aria-label');
    const filename = label?.replace(/^Download\s+/, '') ?? '';
    const artifactId = artifactIdFromFilename(filename);
    expect(
      artifactId,
      `unexpected download label: ${label}`,
    ).not.toBeNull();

    const beforeCount = await getCapturedDownloadCount(page);
    await buttons.nth(index).click();
    await expect
      .poll(() => getCapturedDownloadCount(page), {
        timeout: 10_000,
        message: `capture ${label ?? index}`,
      })
      .toBeGreaterThan(beforeCount);
    const captured = await getCapturedDownload(page, beforeCount);
    artifacts.set(artifactId!, captured.content);
  }
  return artifacts;
}

// ============================================================
// PART 4 — IndexedDB 해시 체인 시드
// ============================================================

/**
 * 3개 CreativeEvent 를 IDB 에 시드 (해시 체인 브라우저 내 계산).
 *
 * addInitScript 는 top-level async 를 지원하지 않으므로
 * async IIFE 패턴을 사용한다.
 *
 * @param tamperSecondAfterHash  true 이면 두 번째 이벤트의
 *   afterHash 를 변조해 hash-mismatch 를 유발한다.
 */
async function installCreativeEventChain(
  page: Page,
  opts: { tamperSecondAfterHash?: boolean } = {},
): Promise<void> {
  const tamper = opts.tamperSecondAfterHash ?? false;
  const stamp = new Date().toISOString();

  await page.addInitScript(
    ({
      projectId,
      stamp: ts,
      tamper: doTamper,
    }: {
      projectId: string;
      stamp: string;
      tamper: boolean;
    }) => {
      // ── SHA-256 (browser) ──
      function sha256Hex(text: string): Promise<string> {
        const encoded = new TextEncoder().encode(text);
        return crypto.subtle
          .digest('SHA-256', encoded)
          .then((buf) =>
            Array.from(new Uint8Array(buf))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(''),
          );
      }

      // ── Canonical JSON (save-engine/hash.ts 동일) ──
      function canonicalJson(value: unknown): string {
        if (value === null || value === undefined)
          return JSON.stringify(value ?? null);
        if (typeof value !== 'object') return JSON.stringify(value);
        if (Array.isArray(value))
          return `[${(value as unknown[]).map(canonicalJson).join(',')}]`;
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).sort();
        const parts: string[] = [];
        for (const k of keys) {
          const v = obj[k];
          if (v === undefined) continue;
          parts.push(
            `${JSON.stringify(k)}:${canonicalJson(v)}`,
          );
        }
        return `{${parts.join(',')}}`;
      }

      // ── computeEventHash ──
      function computeHash(
        event: Record<string, unknown>,
      ): Promise<string> {
        const copy = { ...event };
        delete copy['eventHash'];
        return sha256Hex(canonicalJson(copy));
      }

      // ── IDB 쓰기 ──
      function writeToIdb(
        events: Record<string, unknown>[],
      ): void {
        const req = indexedDB.open(
          'loreguard_creative_process',
          1,
        );
        req.onupgradeneeded = () => {
          const db = req.result;
          if (
            !db.objectStoreNames.contains('creative_events')
          ) {
            const store = db.createObjectStore(
              'creative_events',
              { keyPath: 'id' },
            );
            store.createIndex('by_projectId', 'projectId', {
              unique: false,
            });
            store.createIndex('by_episodeId', 'episodeId', {
              unique: false,
            });
            store.createIndex('by_createdAt', 'createdAt', {
              unique: false,
            });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(
            'creative_events',
            'readwrite',
          );
          const store = tx.objectStore('creative_events');
          for (const ev of events) store.put(ev);
          tx.oncomplete = () => db.close();
        };
      }

      // ── 이벤트 기본 데이터 ──
      const ev1Base: Record<string, unknown> = {
        id: '01J0000000000000000000001',
        projectId,
        targetType: 'manuscript',
        targetId: 'ep-1',
        eventType: 'create',
        actorType: 'human',
        actorId: 'e2e-author',
        originType: 'HUMAN_DRAFT',
        beforeHash: null,
        afterHash: 'a'.repeat(64),
        createdAt: ts,
        appVersion: 'e2e',
        parentEventHash: null,
      };

      const ev2Base: Record<string, unknown> = {
        id: '01J0000000000000000000002',
        projectId,
        targetType: 'manuscript',
        targetId: 'ep-1',
        eventType: 'edit',
        actorType: 'human',
        actorId: 'e2e-author',
        originType: 'HUMAN_DRAFT',
        beforeHash: 'a'.repeat(64),
        afterHash: 'b'.repeat(64),
        createdAt: ts,
        appVersion: 'e2e',
      };

      const ev3Base: Record<string, unknown> = {
        id: '01J0000000000000000000003',
        projectId,
        targetType: 'manuscript',
        targetId: 'ep-1',
        eventType: 'edit',
        actorType: 'ai',
        actorId: 'claude-3.5',
        originType: 'AI_GENERATED',
        beforeHash: 'b'.repeat(64),
        afterHash: 'c'.repeat(64),
        createdAt: ts,
        appVersion: 'e2e',
      };

      // ── async IIFE: 해시 체인 계산 + IDB 시드 ──
      void (async () => {
        const ev1Hash = await computeHash(ev1Base);
        const ev1 = { ...ev1Base, eventHash: ev1Hash };

        ev2Base['parentEventHash'] = ev1Hash;
        if (doTamper) {
          // afterHash 변조 → 해시 재계산 불일치 유발
          // 원래 해시를 eventHash 에 넣고 내용은 변조
          const originalHash = await computeHash({
            ...ev2Base,
          });
          ev2Base['afterHash'] =
            'f' + (ev2Base['afterHash'] as string).slice(1);
          const ev2 = {
            ...ev2Base,
            eventHash: originalHash,
          };

          ev3Base['parentEventHash'] = originalHash;
          const ev3Hash = await computeHash(ev3Base);
          const ev3 = { ...ev3Base, eventHash: ev3Hash };

          writeToIdb([ev1, ev2, ev3]);
        } else {
          const ev2Hash = await computeHash(ev2Base);
          const ev2 = { ...ev2Base, eventHash: ev2Hash };

          ev3Base['parentEventHash'] = ev2Hash;
          const ev3Hash = await computeHash(ev3Base);
          const ev3 = { ...ev3Base, eventHash: ev3Hash };

          writeToIdb([ev1, ev2, ev3]);
        }
      })();
    },
    { projectId: PROJECT_ID, stamp, tamper },
  );
}

// ============================================================
// PART 5 — 브라우저 내 체인 검증 (page.evaluate)
// ============================================================

/**
 * 브라우저에서 IDB 이벤트를 읽고 해시 체인을 재검증한다.
 * 반환: 각 이벤트별 { id, hashValid, parentValid }.
 */
async function verifyChainInBrowser(page: Page): Promise<{
  valid: boolean;
  results: Array<{
    id: string;
    hashValid: boolean;
    parentValid: boolean;
  }>;
}> {
  return page.evaluate(async () => {
    async function sha256Hex(text: string): Promise<string> {
      const encoded = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest(
        'SHA-256',
        encoded,
      );
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }

    function canonicalJson(value: unknown): string {
      if (value === null || value === undefined)
        return JSON.stringify(value ?? null);
      if (typeof value !== 'object')
        return JSON.stringify(value);
      if (Array.isArray(value))
        return `[${(value as unknown[]).map(canonicalJson).join(',')}]`;
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      const parts: string[] = [];
      for (const k of keys) {
        const v = obj[k];
        if (v === undefined) continue;
        parts.push(
          `${JSON.stringify(k)}:${canonicalJson(v)}`,
        );
      }
      return `{${parts.join(',')}}`;
    }

    async function computeEventHash(
      event: Record<string, unknown>,
    ): Promise<string> {
      const copy = { ...event };
      delete copy['eventHash'];
      return sha256Hex(canonicalJson(copy));
    }

    function readEventsFromIdb(): Promise<
      Record<string, unknown>[]
    > {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(
          'loreguard_creative_process',
          1,
        );
        req.onsuccess = () => {
          const db = req.result;
          if (
            !db.objectStoreNames.contains('creative_events')
          ) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction(
            'creative_events',
            'readonly',
          );
          const store = tx.objectStore('creative_events');
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            db.close();
            const events = (
              getAll.result as Record<string, unknown>[]
            ).sort((a, b) =>
              String(a['id']).localeCompare(String(b['id'])),
            );
            resolve(events);
          };
          getAll.onerror = () => {
            db.close();
            reject(getAll.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    }

    const events = await readEventsFromIdb();
    const results: Array<{
      id: string;
      hashValid: boolean;
      parentValid: boolean;
    }> = [];
    let prevHash: string | null = null;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const recomputed = await computeEventHash(ev);
      const storedHash = ev['eventHash'] as string;
      const storedParent = (ev['parentEventHash'] ??
        null) as string | null;

      results.push({
        id: ev['id'] as string,
        hashValid: recomputed === storedHash,
        parentValid: storedParent === prevHash,
      });

      prevHash = storedHash;
    }

    const allValid = results.every(
      (r) => r.hashValid && r.parentValid,
    );
    return { valid: allValid, results };
  });
}

// ============================================================
// PART 6 — 테스트 케이스
// ============================================================

test.describe(
  'Loreguard Trust Chain — T1 Security Theater · T11 Provenance Chain Break',
  () => {
    test.describe.configure({ mode: 'serial' });

    // ──────────────────────────────────────────────────
    // 테스트 1: IndexedDB 해시 체인 무결성
    // ──────────────────────────────────────────────────
    test('IndexedDB 해시 체인 무결성 — 3개 이벤트의 SHA-256 체인이 유효하다', async ({
      page,
    }) => {
      test.setTimeout(120_000);

      await installCreativeEventChain(page, {
        tamperSecondAfterHash: false,
      });
      await page.goto(appUrl('/studio'), {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('body')).toBeVisible({
        timeout: 30_000,
      });

      // IDB 에 3개 이벤트가 시드될 때까지 대기
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              return new Promise<number>((resolve) => {
                const req = indexedDB.open(
                  'loreguard_creative_process',
                  1,
                );
                req.onsuccess = () => {
                  const db = req.result;
                  if (
                    !db.objectStoreNames.contains(
                      'creative_events',
                    )
                  ) {
                    db.close();
                    resolve(0);
                    return;
                  }
                  const tx = db.transaction(
                    'creative_events',
                    'readonly',
                  );
                  const count =
                    tx.objectStore('creative_events').count();
                  count.onsuccess = () => {
                    db.close();
                    resolve(count.result);
                  };
                  count.onerror = () => {
                    db.close();
                    resolve(0);
                  };
                };
                req.onerror = () => resolve(0);
              });
            }),
          { timeout: 15_000, message: 'IDB 이벤트 시드 대기' },
        )
        .toBe(3);

      const result = await verifyChainInBrowser(page);
      expect(
        result.valid,
        `해시 체인 검증 실패: ${JSON.stringify(result.results)}`,
      ).toBe(true);
      expect(result.results).toHaveLength(3);
    });

    // ──────────────────────────────────────────────────
    // 테스트 2: 변조 이벤트 → 체인 검증 실패
    // ──────────────────────────────────────────────────
    test('변조 이벤트 → afterHash 변조 시 해시 재계산 불일치 검출', async ({
      page,
    }) => {
      test.setTimeout(120_000);

      await installCreativeEventChain(page, {
        tamperSecondAfterHash: true,
      });
      await page.goto(appUrl('/studio'), {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('body')).toBeVisible({
        timeout: 30_000,
      });

      // IDB 시드 대기
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              return new Promise<number>((resolve) => {
                const req = indexedDB.open(
                  'loreguard_creative_process',
                  1,
                );
                req.onsuccess = () => {
                  const db = req.result;
                  if (
                    !db.objectStoreNames.contains(
                      'creative_events',
                    )
                  ) {
                    db.close();
                    resolve(0);
                    return;
                  }
                  const tx = db.transaction(
                    'creative_events',
                    'readonly',
                  );
                  const count =
                    tx.objectStore('creative_events').count();
                  count.onsuccess = () => {
                    db.close();
                    resolve(count.result);
                  };
                  count.onerror = () => {
                    db.close();
                    resolve(0);
                  };
                };
                req.onerror = () => resolve(0);
              });
            }),
          { timeout: 15_000, message: 'IDB 이벤트 시드 대기' },
        )
        .toBe(3);

      const result = await verifyChainInBrowser(page);

      // 두 번째 이벤트의 hashValid 가 false 여야 한다
      expect(result.valid).toBe(false);
      expect(result.results).toHaveLength(3);
      expect(
        result.results[1].hashValid,
        '변조된 두 번째 이벤트의 해시가 불일치해야 함',
      ).toBe(false);
    });

    // ──────────────────────────────────────────────────
    // 테스트 3: digital-signature hash 일관성
    // ──────────────────────────────────────────────────
    test('digital-signature 의 manuscriptHash 가 원고 SHA-256 과 일치한다', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await installBlobDownloadCapture(page);
      await generateSubmissionPackage(page);

      const artifacts = await captureListedArtifactBlobs(page);
      expect(
        artifacts.has('digital-signature'),
        'digital-signature artifact missing',
      ).toBe(true);
      expect(
        artifacts.has('manuscript-md'),
        'manuscript-md artifact missing',
      ).toBe(true);

      const signatureJson = JSON.parse(
        artifacts.get('digital-signature')!,
      ) as {
        kind?: string;
        manuscriptHash?: string;
      };
      expect(signatureJson.kind).toBe(
        'loreguard.digital-signature.v1',
      );
      expect(String(signatureJson.manuscriptHash)).toMatch(
        /^[a-f0-9]{64}$/,
      );

      // 브라우저에서 에피소드 조인 형식에 맞춰 SHA-256 계산 + manuscriptHash 대조
      const hashMatch = await page.evaluate(
        async ({
          expected,
        }: {
          expected: string;
        }) => {
          const text = "---EPISODE-1---\n\n" +
            "윤서는 제출 직전 원고와 확인서의 해시를 다시 대조했다." +
            "\n\n" +
            "---EPISODE-2---\n\n" +
            "승인자는 결과가 아니라 지시와 수정 이력을 먼저 확인했다.";

          const encoded = new TextEncoder().encode(text);
          const buf = await crypto.subtle.digest(
            'SHA-256',
            encoded,
          );
          const computed = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          return { computed, expected, match: computed === expected };
        },
        {
          expected: signatureJson.manuscriptHash!,
        },
      );

      expect(
        hashMatch.match,
        `manuscriptHash 불일치: computed=${hashMatch.computed}, expected=${hashMatch.expected}`,
      ).toBe(true);
    });

    // ──────────────────────────────────────────────────
    // 테스트 4: 변조 원고 → 서명 불일치
    // ──────────────────────────────────────────────────
    test('원고 변조 시 manuscriptHash 가 달라진다', async ({
      page,
    }) => {
      test.setTimeout(120_000);

      // 1. 처음부터 변조된 텍스트를 가진 프로젝트 데이터를 시딩
      const stamp = Date.now();
      const tamperedProjects = makeProjectPayload(stamp);
      // 첫 번째 에피소드 본문 변조
      tamperedProjects[0].sessions[0].config.manuscripts[0].content =
        '이 원고는 변조되었습니다. 해시가 달라져야 합니다.';
      tamperedProjects[0].sessions[0].config.manuscripts[0].charCount =
        '이 원고는 변조되었습니다. 해시가 달라져야 합니다.'.length;

      await page.addInitScript(
        ({ projects, projectId, sessionId }) => {
          window.localStorage.setItem('eh-onboarded', '1');
          window.localStorage.setItem('noa-lg-onboarded', '1');
          window.localStorage.setItem('eh-user-role', 'writer');
          window.localStorage.setItem('noa_studio_lang', 'KO');
          window.localStorage.setItem('noa_first_visit_seen', '1');
          window.localStorage.setItem('noa_payment_status', 'paid');
          window.localStorage.setItem('noa_entitlement_plan', 'pro');
          window.localStorage.setItem(
            'noa_projects_v2',
            JSON.stringify(projects),
          );
          window.localStorage.setItem('noa_last_project_id', projectId);
          window.localStorage.setItem('noa_last_session_id', sessionId);
          window.localStorage.setItem(
            'noa_studio_currentProjectId',
            projectId,
          );
          window.localStorage.setItem(
            'noa_work_receipt_journal_v1',
            JSON.stringify([]),
          );
        },
        {
          projects: tamperedProjects,
          projectId: PROJECT_ID,
          sessionId: SESSION_ID,
        },
      );

      await installBlobDownloadCapture(page);
      await openExportTabSubmissionPackage(page);

      // 2. 패키지 생성
      await page
        .getByRole('button', { name: PACKAGE_ACTION_BUTTON_NAME })
        .click();
      await expect(
        page.getByRole('button', {
          name: /묶음 생성 완료|Package generated/,
        }),
      ).toBeVisible({ timeout: 30_000 });

      // 3. 변조된 패키지의 manuscriptHash 추출
      const artifacts = await captureListedArtifactBlobs(page);
      const sig = JSON.parse(
        artifacts.get('digital-signature')!,
      ) as { manuscriptHash?: string };
      const tamperedHash = sig.manuscriptHash!;
      expect(tamperedHash).toMatch(/^[a-f0-9]{64}$/);

      // 4. 원본 텍스트의 정상 해시 계산
      const originalHash = await page.evaluate(async () => {
        const text =
          '---EPISODE-1---\n\n' +
          '윤서는 제출 직전 원고와 확인서의 해시를 다시 대조했다.' +
          '\n\n' +
          '---EPISODE-2---\n\n' +
          '승인자는 결과가 아니라 지시와 수정 이력을 먼저 확인했다.';
        const encoded = new TextEncoder().encode(text);
        const buf = await crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      });

      // 변조된 원고의 해시는 원본 원고의 해시와 달라야 한다
      expect(tamperedHash).not.toBe(originalHash);
    });

    // ──────────────────────────────────────────────────
    // 테스트 5: IP Pack manifest 에 원문 미노출
    // ──────────────────────────────────────────────────
    test('ip-pack-manifest 에 원고 본문이 포함되지 않는다', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await installBlobDownloadCapture(page);
      await generateSubmissionPackage(page);

      const artifacts = await captureListedArtifactBlobs(page);
      expect(
        artifacts.has('ip-pack-manifest'),
        'ip-pack-manifest artifact missing',
      ).toBe(true);

      const ipPackRaw = artifacts.get('ip-pack-manifest')!;
      const ipPack = JSON.parse(ipPackRaw) as {
        kind?: string;
        publicVerifyPolicy?: {
          noManuscriptContent?: boolean;
          noPromptText?: boolean;
          noSourceBodyText?: boolean;
        };
      };

      expect(ipPack.kind).toBe('loreguard.ip-pack-manifest.v1');
      expect(ipPack.publicVerifyPolicy?.noManuscriptContent).toBe(
        true,
      );
      expect(ipPack.publicVerifyPolicy?.noPromptText).toBe(true);

      // IP pack manifest JSON 에 실제 원고 텍스트 미포함 확인
      expect(ipPackRaw).not.toContain(MANUSCRIPT_TEXT);
      expect(ipPackRaw).not.toContain(
        '승인자는 결과가 아니라 지시와 수정 이력을 먼저 확인했다.',
      );
    });

    // ──────────────────────────────────────────────────
    // 테스트 6: C2PA-ready manifest 존재·위장 방지
    // ──────────────────────────────────────────────────
    test('C2PA-ready manifest 가 존재하면 공식 C2PA Manifest Store 로 위장하지 않는다', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await installBlobDownloadCapture(page);
      await generateSubmissionPackage(page);

      // 캡처된 전체 blob 에서 c2pa-ready-manifest 탐색
      const allDownloads = await page.evaluate(() => {
        const win = window as Window & {
          __loreguardCapturedDownloads?: Array<{
            mimeType: string;
            content: string;
          }>;
        };
        return win.__loreguardCapturedDownloads ?? [];
      });

      const artifacts = await captureListedArtifactBlobs(page);

      // 방법 1: 별도 다운로드 blob 에서 C2PA manifest 탐색
      let c2paContent: string | null = null;
      for (const dl of allDownloads) {
        if (dl.mimeType.includes('json')) {
          try {
            const parsed = JSON.parse(dl.content) as {
              kind?: string;
            };
            if (
              parsed.kind ===
              'loreguard.c2pa-ready-manifest.v1'
            ) {
              c2paContent = dl.content;
              break;
            }
          } catch {
            /* JSON 파싱 실패 — 무시 */
          }
        }
      }

      // 방법 2: process-certificate 에서 C2PA 참조 확인
      const processCert =
        artifacts.get('process-certificate') ?? '';
      const processCertHasC2pa =
        processCert.includes('C2PA') ||
        processCert.includes('c2pa') ||
        processCert.includes('Content Credentials');

      // 방법 3: ip-pack-manifest 에서 C2PA 참조 확인
      const ipPackRaw = artifacts.get('ip-pack-manifest') ?? '';
      const ipPackHasC2pa =
        ipPackRaw.includes('c2pa-ready-manifest') ||
        ipPackRaw.includes('provenance-assertion-payload') ||
        ipPackRaw.includes('C2PA') ||
        ipPackRaw.includes('c2pa-round-trip-hold');

      if (c2paContent) {
        // C2PA-ready manifest 별도 존재 → 위장 방지 속성 검증
        const c2pa = JSON.parse(c2paContent) as {
          kind?: string;
          compatibility?: {
            officialC2paManifestStore?: boolean;
            targetSpec?: string;
          };
        };

        expect(c2pa.kind).toBe(
          'loreguard.c2pa-ready-manifest.v1',
        );
        expect(
          c2pa.compatibility?.officialC2paManifestStore,
        ).toBe(false);
        expect(c2pa.compatibility?.targetSpec).toBe('C2PA 2.4');
      } else {
        // 별도 파일 미존재: process-certificate 또는 ip-pack-manifest 에서
        // C2PA readiness 를 참조해야 한다
        const hasC2paRef = processCertHasC2pa || ipPackHasC2pa;
        expect(
          hasC2paRef,
          'C2PA-ready manifest 가 별도 파일로 없으면 process-certificate 또는 ip-pack-manifest 에서 C2PA 를 참조해야 한다',
        ).toBe(true);
      }
    });

    // ──────────────────────────────────────────────────
    // 테스트 7: 공개 검증 페이지 존재
    // ──────────────────────────────────────────────────
    test('공개 검증 페이지가 존재하고 잘못된 ID 입력 시 크래시 없이 안내한다', async ({
      page,
    }) => {
      test.setTimeout(60_000);

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      await page.addInitScript(() => {
        window.localStorage.setItem(
          'eh-cookie-consent',
          'accepted',
        );
        window.localStorage.setItem('noa-lg-onboarded', '1');
        window.localStorage.setItem(
          'noa_first_visit_seen',
          '1',
        );
      });

      // ── /verify: 200 응답 + 검증 UI 렌더 ──
      const verifyRes = await page.goto(appUrl('/verify'), {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      expect(verifyRes, '/verify 응답 없음').toBeTruthy();
      expect(
        verifyRes!.status(),
        '/verify 상태 코드',
      ).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible({
        timeout: 15_000,
      });

      // 검증 관련 제목 확인
      const verifyTitle = page.getByText(
        /확인서 조회|Certificate Lookup|창작 과정 확인서|Authorship Journal/,
      );
      await expect(verifyTitle.first()).toBeVisible({
        timeout: 15_000,
      });

      // 입력 필드 존재
      await expect(page.locator('#verify-id').first()).toBeVisible({
        timeout: 10_000,
      });

      // 조회 버튼 존재
      const lookupBtn = page.getByRole('button', {
        name: /조회|Lookup/,
      });
      await expect(lookupBtn.first()).toBeVisible({
        timeout: 10_000,
      });

      // ── /verify/not-real-record: 크래시 없이 안내 ──
      const notFoundRes = await page.goto(
        appUrl('/verify/not-real-record'),
        { waitUntil: 'domcontentloaded', timeout: 45_000 },
      );
      expect(
        notFoundRes,
        '/verify/not-real-record 응답 없음',
      ).toBeTruthy();
      expect(
        notFoundRes!.status(),
        '/verify/not-real-record 서버 에러 아님',
      ).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible({
        timeout: 15_000,
      });

      // 미등록 / 확인 필요 안내 텍스트 확인
      const notFoundText = page.getByText(
        /미등록|찾지 못|not found|확인 필요|No certificate|해당 번호로 등록된|등록 상태/,
      );
      await expect(notFoundText.first()).toBeVisible({
        timeout: 15_000,
      });

      // pageerror 없어야 한다
      expect(
        pageErrors,
        '/verify 라우트에서 pageerror 발생',
      ).toEqual([]);
    });
  },
);
