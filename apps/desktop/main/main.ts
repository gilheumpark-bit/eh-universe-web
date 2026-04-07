import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import serve from 'electron-serve';
import { handleAiChatRequest, type ChatRequest } from './services/ai-service';

const isProd = process.env.NODE_FILE_ENV === 'production' || !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'renderer/out' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
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

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('ai:chat-request', async (event, request: ChatRequest) => {
    return handleAiChatRequest(event.sender, request);
});

ipcMain.handle('fs:open-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) return null;
    return filePaths[0];
});

ipcMain.handle('fs:read-file', async (_, filePath: string) => {
    return await fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf-8');
});

ipcMain.handle('fs:readdir', async (_, dirPath: string) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name)
    }));
});

ipcMain.handle('fs:exists', async (_, filePath: string) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
});
