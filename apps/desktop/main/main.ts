/**
 * apps/desktop/main/main.ts — Electron main process entry
 *
 * PART 1 — Environment + window creation
 * PART 2 — IPC registration (delegated to main/ipc/*)
 * PART 3 — App lifecycle
 */

import path from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import serve from 'electron-serve';

import { handleAiChatRequest, type ChatRequest } from './services/ai-service';
import { registerFsIpc, disposeAllWatchers } from './ipc/fs';
import { registerQuillIpc } from './ipc/quill';
import { registerKeystoreIpc } from './ipc/keystore';
import { registerAiIpc } from './ipc/ai';
import { registerShellIpc, disposeAllShellSessions } from './ipc/shell';
import { registerGitIpc } from './ipc/git';

// ============================================================
// PART 1 — Environment + window
// ============================================================

const isProd =
  process.env.NODE_FILE_ENV === 'production' ||
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'renderer/out' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

async function createWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // preload needs Node APIs (chokidar etc.)
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0e1a',
  });

  // WebContainer requirements: COOP/COEP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Embedder-Policy': ['require-corp'],
        'Cross-Origin-Opener-Policy': ['same-origin'],
      },
    });
  });

  if (isProd) {
    await mainWindow.loadURL('app://./code-studio');
  } else {
    const port = process.argv[2] || 3000;
    await mainWindow.loadURL(`http://localhost:${port}/code-studio`);
    mainWindow.webContents.openDevTools();
  }

  // External links open in default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });
}

// ============================================================
// PART 2 — IPC registration
// ============================================================

function registerIpc(): void {
  // Modular handlers
  registerFsIpc();
  registerQuillIpc();
  registerKeystoreIpc();
  registerAiIpc();
  registerShellIpc();
  registerGitIpc();

  // Legacy / inline handlers (will be migrated to ipc/* modules in C-2..C-4)
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('ai:chat-request', async (event, request: ChatRequest) => {
    return handleAiChatRequest(event.sender, request);
  });
}

// ============================================================
// PART 3 — App lifecycle
// ============================================================

app.whenReady().then(() => {
  registerIpc();
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  disposeAllShellSessions();
  await disposeAllWatchers();
});
