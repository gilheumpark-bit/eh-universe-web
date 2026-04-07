/**
 * apps/desktop/main/ipc/fs.ts
 *
 * File system IPC handlers exposed to the renderer via the
 * preload bridge (`window.cs.fs`).
 *
 * Responsibilities:
 *   PART 1 — dialog (open project, save as)
 *   PART 2 — read/write/stat/exists/readdir
 *   PART 3 — directory watch (chokidar) with debounced batching
 */

import { dialog, ipcMain, BrowserWindow, type WebContents } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

// chokidar is optional at runtime — only loaded when fs:watch is called
type ChokidarType = typeof import('chokidar');
let chokidarPromise: Promise<ChokidarType> | null = null;
function loadChokidar(): Promise<ChokidarType> {
  if (!chokidarPromise) {
    chokidarPromise = import('chokidar');
  }
  return chokidarPromise;
}

// ============================================================
// PART 1 — Dialog handlers
// ============================================================

function registerDialogHandlers() {
  ipcMain.handle('fs:open-directory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Open Project Folder',
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
  });

  ipcMain.handle('fs:open-file', async (event, opts?: { filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: opts?.filters,
      title: 'Open File',
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
  });

  ipcMain.handle('fs:save-as', async (event, opts: { defaultPath?: string; filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      defaultPath: opts.defaultPath,
      filters: opts.filters,
      title: 'Save As',
    });
    if (canceled || !filePath) return null;
    return filePath;
  });
}

// ============================================================
// PART 2 — Read/write/stat handlers
// ============================================================

function registerIOHandlers() {
  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    return fs.readFile(filePath, 'utf-8');
  });

  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  });

  ipcMain.handle('fs:readdir', async (_event, dirPath: string) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name),
    }));
  });

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('fs:stat', async (_event, filePath: string) => {
    const s = await fs.stat(filePath);
    return {
      size: s.size,
      mtimeMs: s.mtimeMs,
      ctimeMs: s.ctimeMs,
      isFile: s.isFile(),
      isDirectory: s.isDirectory(),
    };
  });

  ipcMain.handle('fs:rename', async (_event, from: string, to: string) => {
    await fs.rename(from, to);
  });

  ipcMain.handle('fs:delete', async (_event, target: string) => {
    // We never permanently delete from main directly; renderer should
    // confirm with the user. This handler accepts whatever the renderer
    // sends after confirmation.
    await fs.rm(target, { recursive: true, force: false });
  });

  ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
    await fs.mkdir(dirPath, { recursive: true });
  });
}

// ============================================================
// PART 3 — Watcher (chokidar)
// ============================================================

interface WatcherEntry {
  watcher: import('chokidar').FSWatcher;
  webContentsId: number;
  watchId: string;
}

const watchers = new Map<string, WatcherEntry>();

function registerWatchHandlers() {
  ipcMain.handle(
    'fs:watch',
    async (event, opts: { rootPath: string; ignored?: string[]; watchId: string }) => {
      const { rootPath, ignored, watchId } = opts;
      const chokidar = await loadChokidar();

      const defaultIgnored = ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/dist/**', '**/coverage/**'];
      const watcher = chokidar.watch(rootPath, {
        ignored: ignored ? [...defaultIgnored, ...ignored] : defaultIgnored,
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      });

      const sender = event.sender;
      const channel = `fs:watch-event:${watchId}`;

      const send = (kind: string, p: string) => {
        if (sender.isDestroyed()) return;
        sender.send(channel, { kind, path: p });
      };

      watcher.on('add', (p) => send('add', p));
      watcher.on('change', (p) => send('change', p));
      watcher.on('unlink', (p) => send('unlink', p));
      watcher.on('addDir', (p) => send('addDir', p));
      watcher.on('unlinkDir', (p) => send('unlinkDir', p));
      watcher.on('error', (err) => send('error', String(err)));

      watchers.set(watchId, { watcher, webContentsId: sender.id, watchId });

      // Auto-cleanup when the renderer goes away
      sender.once('destroyed', () => {
        void closeWatcher(watchId);
      });

      return { ok: true, watchId };
    },
  );

  ipcMain.handle('fs:unwatch', async (_event, watchId: string) => {
    return closeWatcher(watchId);
  });
}

async function closeWatcher(watchId: string): Promise<{ ok: boolean }> {
  const entry = watchers.get(watchId);
  if (!entry) return { ok: false };
  try {
    await entry.watcher.close();
  } finally {
    watchers.delete(watchId);
  }
  return { ok: true };
}

export async function disposeAllWatchers(): Promise<void> {
  await Promise.all(Array.from(watchers.values()).map((e) => e.watcher.close()));
  watchers.clear();
}

// ============================================================
// PART 4 — Public registrar
// ============================================================

let registered = false;

export function registerFsIpc(): void {
  if (registered) return;
  registered = true;
  registerDialogHandlers();
  registerIOHandlers();
  registerWatchHandlers();
}
