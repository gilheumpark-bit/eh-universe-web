import { expect, test, type Page } from '@playwright/test';

const SENTINEL_KEY = 'loreguard:e2e:navigation-data-diff';
const SENTINEL_DB = 'loreguard-e2e-navigation-data-diff';
const SENTINEL_STORE = 'records';
const ACTIVE_NAVIGATION_PATHS = ['/docs', '/translation-studio', '/studio'] as const;

async function installQuietStudioState(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('noa-lg-onboarded', '1');
    window.localStorage.setItem('eh-user-role', 'writer');
  });
}

async function writeNavigationSentinel(page: Page, value: string) {
  await page.evaluate(async ({ key, dbName, storeName, nextValue }) => {
    window.localStorage.setItem(key, nextValue);
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(storeName, { keyPath: 'id' });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put({ id: 'sentinel', value: nextValue });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, { key: SENTINEL_KEY, dbName: SENTINEL_DB, storeName: SENTINEL_STORE, nextValue: value });
}

async function readNavigationSentinel(page: Page) {
  return page.evaluate(async ({ key, dbName, storeName }) => {
    const localValue = window.localStorage.getItem(key);
    const idbValue = await new Promise<string | null>((resolve, reject) => {
      const request = window.indexedDB.open(dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readonly');
        const getRequest = tx.objectStore(storeName).get('sentinel');
        getRequest.onsuccess = () => {
          const result = getRequest.result as { value?: string } | undefined;
          db.close();
          resolve(result?.value ?? null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
    return { localValue, idbValue };
  }, { key: SENTINEL_KEY, dbName: SENTINEL_DB, storeName: SENTINEL_STORE });
}

test.describe('Loreguard navigation-only data diff', () => {
  test('active route navigation preserves local and IndexedDB project sentinels', async ({ page }) => {
    test.setTimeout(90_000);
    await installQuietStudioState(page);

    await page.goto('/studio', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

    const expectedValue = `sentinel-${Date.now()}`;
    await writeNavigationSentinel(page, expectedValue);
    const before = await readNavigationSentinel(page);

    for (const path of ACTIVE_NAVIGATION_PATHS) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${path} status`).toBeLessThan(400);
      await expect(page.locator('body'), `${path} body`).toBeVisible({ timeout: 30_000 });
    }

    const after = await readNavigationSentinel(page);
    expect(after).toEqual(before);
    expect(after).toEqual({ localValue: expectedValue, idbValue: expectedValue });
  });
});
