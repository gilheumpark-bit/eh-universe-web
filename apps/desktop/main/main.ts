/**
 * apps/desktop/main/main.ts — Electron main process entry
 *
 * PART 1 — Environment + window creation
 * PART 2 — IPC registration (delegated to main/ipc/*)
 * PART 3 — App lifecycle
 */

import path from 'node:path';
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import serve from 'electron-serve';

import { handleAiChatRequest, type ChatRequest } from './services/ai-service';
import { registerFsIpc, disposeAllWatchers } from './ipc/fs';
import { registerQuillIpc } from './ipc/quill';
import { registerKeystoreIpc } from './ipc/keystore';
import { registerAiIpc } from './ipc/ai';
import { registerShellIpc, disposeAllShellSessions } from './ipc/shell';
import { registerGitIpc } from './ipc/git';
import { initAutoUpdate, disposeAutoUpdate, registerUpdaterIpc } from './services/updater';
import { registerCliInstallerIpc } from './services/cli-installer';

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

  // Auto-update (no-op in dev or when electron-updater is missing)
  initAutoUpdate(mainWindow);
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
  registerUpdaterIpc();
  registerCliInstallerIpc();

  // Legacy / inline handlers (will be migrated to ipc/* modules in C-2..C-4)
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('ai:chat-request', async (event, request: ChatRequest) => {
    return handleAiChatRequest(event.sender, request);
  });
}

// ============================================================
// PART 3 — App lifecycle
// ============================================================

function buildMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder…',
          accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
          click: (_item, win) => {
            if (win) (win as BrowserWindow).webContents.send('menu:open-folder');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { label: 'Edit', submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    { label: 'View', submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Install Command Line Tools (cs)',
          click: (_item, win) => {
            if (!win) return;
            (win as BrowserWindow).webContents.send('menu:cli-install');
          },
        },
        {
          label: 'Uninstall Command Line Tools',
          click: (_item, win) => {
            if (!win) return;
            (win as BrowserWindow).webContents.send('menu:cli-uninstall');
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click: (_item, win) => {
            if (!win) return;
            (win as BrowserWindow).webContents.send('menu:check-updates');
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'EH Code Studio Website',
          click: () => shell.openExternal('https://github.com/eh-universe/code-studio'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  registerIpc();
  buildMenu();
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
  disposeAutoUpdate();
  await disposeAllWatchers();
});
