import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const PROJECTS_KEY = 'noa_projects_v2';
const SNAPSHOT_DB = 'loreguard-e2e-multi-user-destructive-data-diff';
const SNAPSHOT_STORE = 'snapshots';
const SNAPSHOT_ID = 'protected-before-destructive-overwrite';
const CHANNEL_NAME = 'loreguard-e2e-multi-user-destructive-data-diff';

type PayloadHashes = {
  project: string;
  manuscript: string;
  sceneDirection: string;
  characters: string;
  worldSim: string;
  style: string;
};

function makeRealProjectPayload(stamp: number) {
  return [{
    id: 'e2e-real-payload-project',
    name: 'Loreguard E2E 실제 payload',
    description: 'browser multi-user destructive workflow replay fixture',
    genre: 'SF',
    createdAt: stamp,
    lastUpdate: stamp,
    sessions: [{
      id: 'e2e-real-payload-session',
      title: 'Episode 7',
      messages: [],
      lastUpdate: stamp,
      config: {
        genre: 'SF',
        povCharacter: '윤서',
        setting: '궤도 엘리베이터 하부 도시',
        primaryEmotion: '불신',
        episode: 7,
        title: '하강하는 빛',
        totalEpisodes: 25,
        guardrails: { min: 3500, max: 5500 },
        platform: 'MOBILE',
        corePremise: 'AI 시대에도 지휘와 승인 기록은 남는다.',
        powerStructure: '도시 의회와 궤도 운영사가 권한을 나눠 가진다.',
        currentConflict: '삭제된 승인 기록의 책임 소재를 두고 현장이 갈라진다.',
        worldHistory: '궤도 엘리베이터 완공 이후 지상과 궤도의 기록 체계가 분리되었다.',
        socialSystem: '지상 노동자와 궤도 거주자의 계층 분리.',
        economy: '에너지 배급권 중심의 교환 경제.',
        magicTechSystem: '부분 자동화된 고밀도 도시 운영 기술.',
        survivalEnvironment: '하부 도시는 정전과 데이터 손실에 취약하다.',
        culture: '승인 로그를 남기는 것이 직업 윤리로 여겨진다.',
        truthVsBeliefs: '운영사가 모든 기록을 보존한다고 믿지만 실제로는 권한별 삭제가 가능하다.',
        characters: [
          {
            id: 'char-yunseo',
            name: '윤서',
            role: '기록 책임자',
            traits: '차분함, 승인 로그 집착',
            appearance: '짧은 검은 머리와 낡은 현장 재킷',
            dna: 7,
          },
          {
            id: 'char-ian',
            name: '이안',
            role: '현장 승인자',
            traits: '현장 판단이 빠르고 책임 회피를 싫어함',
            appearance: '은색 작업복과 손목 단말',
            dna: 4,
          },
        ],
        charRelations: [
          { from: 'char-yunseo', to: 'char-ian', type: 'friend', desc: '승인 대기 중인 공동 책임자' },
        ],
        manuscripts: [{
          episode: 7,
          title: '하강하는 빛',
          content: '윤서는 마지막 승인 로그를 다시 열었다. 삭제된 문장은 없었다.',
          charCount: 35,
          lastUpdate: stamp,
        }],
        sceneDirection: {
          writerNotes: '수동 승인 전까지 모든 변경은 HOLD로 남긴다.',
          hooks: [{ position: 'ending', hookType: 'audit-hold', desc: '복구 전까지 출고를 멈춘다.' }],
        },
        episodeSceneSheets: [{
          id: 'scene-sheet-ep7',
          episode: 7,
          title: '하강하는 빛',
          arc: '윤서가 승인 로그를 검토하고 복구를 결정한다.',
          characters: '윤서, 이안',
          lastUpdate: stamp,
        }],
        worldSimData: {
          civs: [{ name: '하부 도시', era: 'near-future', color: '#4b5563', traits: ['dense', 'audited'] }],
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

function simulateDestructiveOverwrite(projects: unknown[]) {
  const next = JSON.parse(JSON.stringify(projects));
  const session = next[0].sessions[0];
  session.config.manuscripts = [];
  session.config.characters = [];
  session.config.corePremise = '';
  delete session.config.sceneDirection;
  delete session.config.styleProfile;
  next[0].lastUpdate += 1;
  session.lastUpdate += 1;
  return next;
}

async function installQuietStudioState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('eh-onboarded', '1');
    window.localStorage.setItem('noa-lg-onboarded', '1');
    window.localStorage.setItem('eh-user-role', 'writer');
    window.localStorage.setItem('noa_studio_lang', 'KO');
    window.localStorage.setItem('noa_first_visit_seen', '1');
  });
}

async function openStudioPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await installQuietStudioState(page);
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
  return page;
}

async function seedProtectedSnapshot(page: Page, projects: unknown[]): Promise<void> {
  await page.evaluate(async ({ dbName, storeName, snapshotId, projectsKey, projects }) => {
    function stableStringify(value: unknown): string {
      if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
      }
      return JSON.stringify(value);
    }

    async function digest(value: unknown): Promise<string> {
      const bytes = new TextEncoder().encode(stableStringify(value));
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    async function openDb(): Promise<IDBDatabase> {
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(storeName)) {
            request.result.createObjectStore(storeName, { keyPath: 'id' });
          }
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    }

    window.localStorage.setItem(projectsKey, JSON.stringify(projects));
    const projectHash = await digest(projects);
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put({
        id: snapshotId,
        protected: true,
        projects,
        projectHash,
        writtenAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { dbName: SNAPSHOT_DB, storeName: SNAPSHOT_STORE, snapshotId: SNAPSHOT_ID, projectsKey: PROJECTS_KEY, projects });
}

async function readPayloadHashes(page: Page): Promise<PayloadHashes> {
  return await page.evaluate(async ({ projectsKey }) => {
    function stableStringify(value: unknown): string {
      if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
      }
      return JSON.stringify(value);
    }

    async function digest(value: unknown): Promise<string> {
      const bytes = new TextEncoder().encode(stableStringify(value));
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    const projects = JSON.parse(window.localStorage.getItem(projectsKey) ?? '[]');
    const config = projects?.[0]?.sessions?.[0]?.config ?? {};
    const worldFields = {
      corePremise: config.corePremise ?? '',
      powerStructure: config.powerStructure ?? '',
      currentConflict: config.currentConflict ?? '',
      worldHistory: config.worldHistory ?? '',
      socialSystem: config.socialSystem ?? '',
      economy: config.economy ?? '',
      magicTechSystem: config.magicTechSystem ?? '',
      factionRelations: config.factionRelations ?? '',
      survivalEnvironment: config.survivalEnvironment ?? '',
      culture: config.culture ?? '',
      religion: config.religion ?? '',
      education: config.education ?? '',
      lawOrder: config.lawOrder ?? '',
      taboo: config.taboo ?? '',
      dailyLife: config.dailyLife ?? '',
      travelComm: config.travelComm ?? '',
      truthVsBeliefs: config.truthVsBeliefs ?? '',
    };

    return {
      project: await digest(projects),
      manuscript: await digest(config.manuscripts ?? []),
      sceneDirection: await digest({
        sceneDirection: config.sceneDirection ?? null,
        episodeSceneSheets: config.episodeSceneSheets ?? [],
      }),
      characters: await digest({
        characters: config.characters ?? [],
        charRelations: config.charRelations ?? [],
      }),
      worldSim: await digest({
        worldSimData: config.worldSimData ?? null,
        worldFields,
      }),
      style: await digest(config.styleProfile ?? null),
    };
  }, { projectsKey: PROJECTS_KEY });
}

async function writeProjects(page: Page, projects: unknown[]): Promise<void> {
  await page.evaluate(({ projectsKey, projects }) => {
    window.localStorage.setItem(projectsKey, JSON.stringify(projects));
    window.dispatchEvent(new StorageEvent('storage', { key: projectsKey }));
  }, { projectsKey: PROJECTS_KEY, projects });
}

async function waitForFollowerRestore(page: Page): Promise<{
  leaderHash: string;
  damagedHash: string;
  restoredHash: string;
  protectedSnapshot: boolean;
}> {
  return await page.evaluate(async ({ channelName, dbName, storeName, snapshotId, projectsKey }) => {
    function stableStringify(value: unknown): string {
      if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
      }
      return JSON.stringify(value);
    }

    async function digest(value: unknown): Promise<string> {
      const bytes = new TextEncoder().encode(stableStringify(value));
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    async function readSnapshot(): Promise<{ protected?: boolean; projects: unknown[] }> {
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(storeName, 'readonly');
          const getRequest = tx.objectStore(storeName).get(snapshotId);
          getRequest.onsuccess = () => {
            db.close();
            resolve(getRequest.result as { protected?: boolean; projects: unknown[] });
          };
          getRequest.onerror = () => reject(getRequest.error);
        };
      });
    }

    return await new Promise((resolve, reject) => {
      const channel = new BroadcastChannel(channelName);
      const timeout = window.setTimeout(() => {
        channel.close();
        reject(new Error('Timed out waiting for leader project hash'));
      }, 5000);

      channel.onmessage = async (event) => {
        try {
          const message = event.data as { type?: string; projectHash?: string };
          if (message.type !== 'leader-project-hash' || !message.projectHash) return;
          const damagedProjects = JSON.parse(window.localStorage.getItem(projectsKey) ?? '[]');
          const damagedHash = await digest(damagedProjects);
          if (damagedHash === message.projectHash) return;

          const snapshot = await readSnapshot();
          window.localStorage.setItem(projectsKey, JSON.stringify(snapshot.projects));
          window.dispatchEvent(new StorageEvent('storage', { key: projectsKey }));
          const restoredHash = await digest(snapshot.projects);

          window.clearTimeout(timeout);
          channel.close();
          resolve({
            leaderHash: message.projectHash,
            damagedHash,
            restoredHash,
            protectedSnapshot: Boolean(snapshot.protected),
          });
        } catch (error) {
          window.clearTimeout(timeout);
          channel.close();
          reject(error);
        }
      };
    });
  }, { channelName: CHANNEL_NAME, dbName: SNAPSHOT_DB, storeName: SNAPSHOT_STORE, snapshotId: SNAPSHOT_ID, projectsKey: PROJECTS_KEY });
}

async function broadcastLeaderProjectHash(page: Page, projectHash: string): Promise<void> {
  await page.evaluate(async ({ channelName, projectHash }) => {
    await new Promise<void>((resolve) => {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage({ type: 'leader-project-hash', projectHash });
      window.setTimeout(() => {
        channel.close();
        resolve();
      }, 50);
    });
  }, { channelName: CHANNEL_NAME, projectHash });
}

test.describe('Loreguard browser/staging multi-user destructive workflow data diff', () => {
  test('two studio tabs detect destructive Project[] overwrite and restore protected snapshot', async ({ context }) => {
    test.setTimeout(120_000);
    const leader = await openStudioPage(context);
    const follower = await openStudioPage(context);

    try {
      const originalProjects = makeRealProjectPayload(Date.now());
      await seedProtectedSnapshot(leader, originalProjects);
      const before = await readPayloadHashes(leader);
      expect(await readPayloadHashes(follower)).toEqual(before);

      const followerRestore = waitForFollowerRestore(follower);
      await writeProjects(follower, simulateDestructiveOverwrite(originalProjects));
      const damaged = await readPayloadHashes(follower);
      expect(damaged.project).not.toBe(before.project);
      expect(damaged.manuscript).not.toBe(before.manuscript);
      expect(damaged.characters).not.toBe(before.characters);
      expect(damaged.worldSim).not.toBe(before.worldSim);
      expect(damaged.style).not.toBe(before.style);

      await broadcastLeaderProjectHash(leader, before.project);
      const restoration = await followerRestore;
      expect(restoration.leaderHash).toBe(before.project);
      expect(restoration.damagedHash).toBe(damaged.project);
      expect(restoration.restoredHash).toBe(before.project);
      expect(restoration.protectedSnapshot).toBe(true);
      expect(await readPayloadHashes(follower)).toEqual(before);
    } finally {
      await follower.close();
      await leader.close();
    }
  });
});
