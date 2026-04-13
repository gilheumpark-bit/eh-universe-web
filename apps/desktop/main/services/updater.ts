/**
 * apps/desktop/main/services/updater.ts
 *
 * Auto-update via electron-updater + GitHub Releases.
 *
 * PART 1 — Lifecycle hookup
 * PART 2 — User-driven check (menu / tray)
 * PART 3 — IPC handlers (renderer can show update banner)
 *
 * Behavior:
 *   - Background check on app start (5s after window load)
 *   - Periodic check every 24 hours
 *   - User MUST consent before download starts (no silent updates)
 *   - User MUST consent before quit-and-install
 *   - Failures are logged but never crash the app
 */

import { app, ipcMain, type BrowserWindow } from 'electron';

// electron-updater is dynamically required so dev builds without
// the package installed still run.
type ElectronUpdater = {
  autoUpdater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    logger: unknown;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
    checkForUpdates: () => Promise<unknown>;
    downloadUpdate: () => Promise<unknown>;
    quitAndInstall: (isSilent?: boolean, isForceRunAfter?: boolean) => void;
  };
};

let updaterMod: ElectronUpdater | null = null;
function loadUpdater(): ElectronUpdater | null {
  if (updaterMod) return updaterMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    updaterMod = require('electron-updater') as ElectronUpdater;
    return updaterMod;
  } catch {
    console.warn('[updater] electron-updater not installed, auto-update disabled');
    return null;
  }
}

// ============================================================
// PART 1 — Lifecycle hookup
// ============================================================

let intervalHandle: NodeJS.Timeout | null = null;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 5_000;

let mainWindowRef: BrowserWindow | null = null;

function broadcast(channel: string, payload: unknown): void {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return;
  mainWindowRef.webContents.send(channel, payload);
}

export function initAutoUpdate(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  if (!app.isPackaged) {
    console.log('[updater] dev build, auto-update disabled');
    return;
  }

  const updater = loadUpdater();
  if (!updater) return;

  updater.autoUpdater.autoDownload = false; // require consent
  updater.autoUpdater.autoInstallOnAppQuit = false;
  // Suppress electron-updater's own console.error output for expected failures
  updater.autoUpdater.logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

  updater.autoUpdater.on('checking-for-update', () => {
    broadcast('updater:checking', null);
  });
  updater.autoUpdater.on('update-available', (info) => {
    broadcast('updater:available', info);
  });
  updater.autoUpdater.on('update-not-available', () => {
    broadcast('updater:not-available', null);
  });
  updater.autoUpdater.on('error', (err) => {
    broadcast('updater:error', { message: (err as Error)?.message ?? String(err) });
  });
  updater.autoUpdater.on('download-progress', (progress) => {
    broadcast('updater:progress', progress);
  });
  updater.autoUpdater.on('update-downloaded', (info) => {
    broadcast('updater:downloaded', info);
  });

  // Background check — fail silently (repo may not exist yet)
  const quietCheck = () => {
    void updater.autoUpdater.checkForUpdates().catch((err: Error & { statusCode?: number }) => {
      // 404 = no releases published yet — expected for pre-release builds
      if (err.statusCode === 404 || /404/.test(err.message)) {
        console.log('[updater] no releases found (404) — skipping');
        return;
      }
      console.warn('[updater] check failed:', err.message);
    });
  };

  setTimeout(quietCheck, INITIAL_DELAY_MS);
  intervalHandle = setInterval(quietCheck, ONE_DAY_MS);
}

export function disposeAutoUpdate(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  mainWindowRef = null;
}

// ============================================================
// PART 2 — User-driven actions
// ============================================================

async function userCheck(): Promise<{ ok: boolean; error?: string }> {
  const updater = loadUpdater();
  if (!updater) return { ok: false, error: 'updater-unavailable' };
  try {
    await updater.autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function userDownload(): Promise<{ ok: boolean; error?: string }> {
  const updater = loadUpdater();
  if (!updater) return { ok: false, error: 'updater-unavailable' };
  try {
    await updater.autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function userQuitAndInstall(): void {
  const updater = loadUpdater();
  if (!updater) return;
  updater.autoUpdater.quitAndInstall(false, true);
}

// ============================================================
// PART 3 — IPC handlers
// ============================================================

let registered = false;

export function registerUpdaterIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.handle('updater:check', () => userCheck());
  ipcMain.handle('updater:download', () => userDownload());
  ipcMain.handle('updater:install', () => {
    userQuitAndInstall();
    return { ok: true };
  });
  ipcMain.handle('updater:available?', () => Boolean(loadUpdater()) && app.isPackaged);
}
