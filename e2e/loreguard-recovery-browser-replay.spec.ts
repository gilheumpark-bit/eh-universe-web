import { expect, test, type Page } from '@playwright/test';

const DB_NAME = 'noa_journal_v1';
const DB_VERSION = 1;
const STORE_JOURNAL = 'journal';
const STORE_META = 'journal_meta';
const STORE_QUARANTINE = 'journal_quarantine';
const META_KEY_TIP = 'tip';
const GENESIS = 'GENESIS';

type SeedMode = 'valid-crash' | 'corrupt-chain';

interface BrowserJournalEntry {
  id: string;
  clock: { physical: number; logical: number; nodeId: string };
  sessionId: string;
  tabId: string;
  projectId: string | null;
  entryType: 'init' | 'delta';
  parentHash: string;
  contentHash: string;
  payload: unknown;
  createdBy: 'system' | 'user';
  journalVersion: number;
}

async function installCrashedStudioState(page: Page) {
  await page.addInitScript(() => {
    const staleHeartbeatAt = Date.now() - 120_000;
    window.localStorage.setItem('eh-onboarded', '1');
    window.localStorage.setItem('noa-lg-onboarded', '1');
    window.localStorage.setItem('eh-user-role', 'writer');
    window.localStorage.setItem('noa_studio_lang', 'KO');
    window.localStorage.setItem('noa_first_visit_seen', '1');
    window.localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow');
    window.localStorage.setItem('noa_studio_session', 'e2e-session');
    window.localStorage.setItem(
      'noa_journal_beacon',
      JSON.stringify({
        lastHeartbeat: staleHeartbeatAt,
        sessionId: 'e2e-session',
        tabId: 'e2e-tab',
      }),
    );
  });
}

async function seedJournal(page: Page, mode: SeedMode) {
  await page.goto('/offline', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    async ({ dbName, dbVersion, storeJournal, storeMeta, storeQuarantine, metaKeyTip, genesis, seedMode }) => {
      function canonicalJson(value: unknown): string {
        if (value === null || value === undefined) return JSON.stringify(value ?? null);
        if (typeof value !== 'object') return JSON.stringify(value);
        if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
          .sort()
          .filter((key) => record[key] !== undefined)
          .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
          .join(',')}}`;
      }

      async function sha256Hex(input: string): Promise<string> {
        const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        return Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
      }

      async function makeEntry(input: {
        id: string;
        physical: number;
        logical: number;
        entryType: 'init' | 'delta';
        payload: unknown;
        parentHash: string;
        contentHashOverride?: string;
      }): Promise<BrowserJournalEntry> {
        const payloadHash = await sha256Hex(canonicalJson(input.payload));
        return {
          id: input.id,
          clock: { physical: input.physical, logical: input.logical, nodeId: 'e2e-node' },
          sessionId: 'e2e-session',
          tabId: 'e2e-tab',
          projectId:
            input.entryType === 'delta' &&
            typeof input.payload === 'object' &&
            input.payload !== null &&
            'projectId' in input.payload
              ? String((input.payload as { projectId: string }).projectId)
              : null,
          entryType: input.entryType,
          parentHash: input.parentHash,
          contentHash: input.contentHashOverride ?? payloadHash,
          payload: input.payload,
          createdBy: input.entryType === 'init' ? 'system' : 'user',
          journalVersion: 1,
        };
      }

      async function deleteDatabase(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = window.indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
          deleteRequest.onblocked = () => resolve();
        });
      }

      async function openSeedDatabase(): Promise<IDBDatabase> {
        return new Promise<IDBDatabase>((resolve, reject) => {
          const openRequest = window.indexedDB.open(dbName, dbVersion);
          openRequest.onupgradeneeded = () => {
            const database = openRequest.result;
            if (!database.objectStoreNames.contains(storeJournal)) {
              const journal = database.createObjectStore(storeJournal, { keyPath: 'id' });
              journal.createIndex('by-projectId', 'projectId', { unique: false });
              journal.createIndex('by-type', 'entryType', { unique: false });
              journal.createIndex('by-clock', 'clock.physical', { unique: false });
            }
            if (!database.objectStoreNames.contains('snapshots')) {
              const snapshots = database.createObjectStore('snapshots', { keyPath: 'id' });
              snapshots.createIndex('by-entryId', 'payload.coversUpToEntryId', { unique: false });
              snapshots.createIndex('by-protected', 'meta.protected', { unique: false });
            }
            if (!database.objectStoreNames.contains(storeMeta)) {
              database.createObjectStore(storeMeta, { keyPath: 'key' });
            }
            if (!database.objectStoreNames.contains(storeQuarantine)) {
              database.createObjectStore(storeQuarantine, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('sync_queue')) {
              database.createObjectStore('sync_queue', { keyPath: 'id' });
            }
          };
          openRequest.onsuccess = () => resolve(openRequest.result);
          openRequest.onerror = () => reject(openRequest.error);
        });
      }

      async function writeSeedEntries(database: IDBDatabase, entries: BrowserJournalEntry[]) {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction([storeJournal, storeMeta], 'readwrite');
          const journal = transaction.objectStore(storeJournal);
          for (const entry of entries) journal.put(entry);
          transaction.objectStore(storeMeta).put({
            key: metaKeyTip,
            value: entries[entries.length - 1].id,
            updatedAt: Date.now(),
          });
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      }

      await deleteDatabase();
      const openedDatabase = await openSeedDatabase();
      const basePhysical = Date.now() - 90_000;
      const initEntry = await makeEntry({
        id: '01E2ERECOVERY000000000001',
        physical: basePhysical,
        logical: 0,
        entryType: 'init',
        payload: { schemaVersion: 1, projectsEmpty: true },
        parentHash: genesis,
      });
      const entries = [initEntry];

      if (seedMode === 'corrupt-chain') {
        entries.push(
          await makeEntry({
            id: '01E2ERECOVERY000000000002',
            physical: basePhysical + 1_000,
            logical: 1,
            entryType: 'delta',
            payload: {
              projectId: 'e2e-project',
              ops: [{ op: 'add', path: '/0', value: { id: 'e2e-project', title: 'corrupt draft' } }],
              target: 'project',
              baseContentHash: initEntry.contentHash,
            },
            parentHash: initEntry.contentHash,
            contentHashOverride: 'deadbeef',
          }),
        );
      }

      await writeSeedEntries(openedDatabase, entries);
      openedDatabase.close();
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      storeJournal: STORE_JOURNAL,
      storeMeta: STORE_META,
      storeQuarantine: STORE_QUARANTINE,
      metaKeyTip: META_KEY_TIP,
      genesis: GENESIS,
      seedMode: mode,
    },
  );
}

async function readJournalState(page: Page) {
  return page.evaluate(
    async ({ dbName, dbVersion, storeJournal, storeMeta, storeQuarantine, metaKeyTip }) => {
      const openedDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
        const openRequest = window.indexedDB.open(dbName, dbVersion);
        openRequest.onsuccess = () => resolve(openRequest.result);
        openRequest.onerror = () => reject(openRequest.error);
      });
      const countStore = (storeName: string) =>
        new Promise<number>((resolve, reject) => {
          const transaction = openedDatabase.transaction(storeName, 'readonly');
          const countRequest = transaction.objectStore(storeName).count();
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => reject(countRequest.error);
        });
      const tipValue = await new Promise<string | null>((resolve, reject) => {
        const transaction = openedDatabase.transaction(storeMeta, 'readonly');
        const getRequest = transaction.objectStore(storeMeta).get(metaKeyTip);
        getRequest.onsuccess = () => resolve((getRequest.result?.value as string | undefined) ?? null);
        getRequest.onerror = () => reject(getRequest.error);
      });
      const journalCount = await countStore(storeJournal);
      const quarantineCount = await countStore(storeQuarantine);
      openedDatabase.close();
      return { journalCount, quarantineCount, tipValue };
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      storeJournal: STORE_JOURNAL,
      storeMeta: STORE_META,
      storeQuarantine: STORE_QUARANTINE,
      metaKeyTip: META_KEY_TIP,
    },
  );
}

test.describe('Loreguard browser recovery replay', () => {
  test.describe.configure({ mode: 'serial' });

  test('stale heartbeat + reload opens RecoveryDialog without losing seeded journal', async ({ page }) => {
    test.setTimeout(120_000);
    await installCrashedStudioState(page);
    await seedJournal(page, 'valid-crash');

    const response = await page.goto('/studio', { waitUntil: 'domcontentloaded' });
    expect(response?.status(), '/studio status').toBeLessThan(400);
    await expect(page.getByRole('alertdialog', { name: /이전 세션 복구|Restore previous session/ })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('recovery-restore-btn')).toBeVisible();

    const journalState = await readJournalState(page);
    expect(journalState.journalCount).toBeGreaterThanOrEqual(1);
    expect(journalState.tipValue).toBeTruthy();
  });

  test('storage-corruption replay quarantines damaged entry and keeps RecoveryDialog HOLD', async ({ page }) => {
    test.setTimeout(120_000);
    await installCrashedStudioState(page);
    await seedJournal(page, 'corrupt-chain');

    const response = await page.goto('/studio', { waitUntil: 'domcontentloaded' });
    expect(response?.status(), '/studio status').toBeLessThan(400);
    await expect(page.getByRole('alertdialog', { name: /이전 세션 복구|Restore previous session/ })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('recovery-warning-banner')).toBeVisible();
    await expect(page.getByTestId('recovery-corrupted')).toContainText(/1개|1/);

    const journalState = await readJournalState(page);
    expect(journalState.quarantineCount).toBeGreaterThanOrEqual(1);
    expect(journalState.journalCount).toBeGreaterThanOrEqual(2);
  });
});
