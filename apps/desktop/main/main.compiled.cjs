"use strict";
/**
 * apps/desktop/main/main.ts — Electron main process entry
 *
 * PART 1 — Environment + window creation
 * PART 2 — IPC registration (delegated to main/ipc/*)
 * PART 3 — App lifecycle
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const electron_1 = require("electron");
const electron_serve_1 = __importDefault(require("electron-serve"));
const ai_service_1 = require("./services/ai-service");
const fs_2 = require("./ipc/fs");
const quill_1 = require("./ipc/quill");
const keystore_1 = require("./ipc/keystore");
const ai_1 = require("./ipc/ai");
const shell_1 = require("./ipc/shell");
const git_1 = require("./ipc/git");
const updater_1 = require("./services/updater");
const cli_installer_1 = require("./services/cli-installer");
const system_1 = require("./ipc/system");
// ============================================================
// PART 1 — Environment + window
// ============================================================
// Packaged builds are always "prod" for load path + COEP. Dev `electron .`
// often has no NODE_ENV; do not infer production from that.
const isProd = electron_1.app.isPackaged ||
    process.env.NODE_FILE_ENV === 'production' ||
    process.env.NODE_ENV === 'production';
const loadApp = isProd
    ? (0, electron_serve_1.default)({ directory: 'renderer/out' })
    : null;
if (isProd) {
    // `electron-serve` returns a loader function that also registers `app://`
    // protocol. Calling `serve()` without using its return value can leave
    // `app://` unregistered in production builds.
}
else {
    electron_1.app.setPath('userData', `${electron_1.app.getPath('userData')} (development)`);
}
async function createWindow() {
    const preloadPath = path_1.default.join(__dirname, 'preload.js');
    const mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // preload needs Node APIs (chokidar etc.)
            // In dev, `electron .` can run without a compiled `app/preload.js`.
            // Avoid a hard crash/blank screen by enabling preload only when present.
            preload: fs_1.default.existsSync(preloadPath) ? preloadPath : undefined,
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0a0e1a',
    });
    mainWindow.on('closed', () => {
        // eslint-disable-next-line no-console
        console.log('[desktop] mainWindow closed');
    });
    mainWindow.on('unresponsive', () => {
        // eslint-disable-next-line no-console
        console.warn('[desktop] mainWindow unresponsive');
    });
    // Forward renderer console + crashes to main logs (debug blank screen)
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
        // eslint-disable-next-line no-console
        console.log('[renderer][console][%s] %s (%s:%s)', level, message, sourceId, line);
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        // eslint-disable-next-line no-console
        console.error('[renderer] render-process-gone', details);
    });
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        // eslint-disable-next-line no-console
        console.error('[renderer] did-fail-load', { errorCode, errorDescription, validatedURL });
    });
    // WebContainer / SharedArrayBuffer: COOP+COEP on responses.
    // Do NOT apply in dev: Next.js Turbopack/HMR + reload can break with COEP,
    // producing a brief paint then a blank renderer (subresource / WS issues).
    if (isProd) {
        mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Cross-Origin-Embedder-Policy': ['require-corp'],
                    'Cross-Origin-Opener-Policy': ['same-origin'],
                },
            });
        });
    }
    if (isProd) {
        // `renderer/out` contains a statically-exported Next app. `electron-serve`
        // will map paths like `/code-studio` to the exported HTML.
        if (!loadApp)
            throw new Error('Production loader not initialized');
        try {
            await loadApp(mainWindow, 'code-studio');
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('[desktop] loadApp failed', err);
            throw err;
        }
    }
    else {
        const resolvedPort = await resolveDevRendererPort();
        const url = `http://localhost:${resolvedPort}/code-studio`;
        try {
            // eslint-disable-next-line no-console
            console.log('[desktop] loadURL', url);
            await mainWindow.loadURL(url);
            mainWindow.webContents.openDevTools();
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('[desktop] loadURL failed', err);
            throw err;
        }
    }
    mainWindow.once('ready-to-show', () => {
        // Some environments can launch a window offscreen or hidden; force show+focus.
        mainWindow.show();
        mainWindow.focus();
    });
    // Fallback: if ready-to-show doesn't fire (rare), show anyway.
    setTimeout(() => {
        if (!mainWindow.isVisible()) {
            mainWindow.show();
            mainWindow.focus();
        }
    }, 1500);
    // External links open in default browser
    mainWindow.webContents.setWindowOpenHandler((details) => {
        electron_1.shell.openExternal(details.url);
        return { action: 'deny' };
    });
    // Auto-update (no-op in dev or when electron-updater is missing)
    (0, updater_1.initAutoUpdate)(mainWindow);
}
async function resolveDevRendererPort() {
    const argPort = Number(process.argv[2]);
    const envPort = Number(process.env.EH_RENDERER_PORT ?? process.env.PORT);
    const candidates = [
        Number.isFinite(envPort) && envPort > 0 ? envPort : null,
        Number.isFinite(argPort) && argPort > 0 ? argPort : null,
        8888, // nextron default: next dev -p 8888 renderer
        3000,
        3001,
    ].filter((v) => typeof v === 'number');
    for (const port of candidates) {
        const ok = await isHttpOk(`http://localhost:${port}/code-studio`);
        if (ok)
            return port;
    }
    // Last resort: return nextron default so the error surface is predictable.
    return 8888;
}
function isHttpOk(url) {
    return new Promise((resolve) => {
        const req = http_1.default.get(url, (res) => {
            res.resume(); // drain
            resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 400));
        });
        req.on('error', () => resolve(false));
        req.setTimeout(800, () => {
            req.destroy();
            resolve(false);
        });
    });
}
// ============================================================
// PART 2 — IPC registration
// ============================================================
function registerIpc() {
    // Modular handlers
    (0, fs_2.registerFsIpc)();
    (0, quill_1.registerQuillIpc)();
    (0, keystore_1.registerKeystoreIpc)();
    (0, ai_1.registerAiIpc)();
    (0, shell_1.registerShellIpc)();
    (0, git_1.registerGitIpc)();
    (0, updater_1.registerUpdaterIpc)();
    (0, cli_installer_1.registerCliInstallerIpc)();
    (0, system_1.registerSystemIpc)();
    // Legacy / inline handlers (will be migrated to ipc/* modules in C-2..C-4)
    electron_1.ipcMain.handle('get-app-version', () => electron_1.app.getVersion());
    electron_1.ipcMain.handle('ai:chat-request', async (event, request) => {
        return (0, ai_service_1.handleAiChatRequest)(event.sender, request);
    });
}
// ============================================================
// PART 3 — App lifecycle
// ============================================================
function buildMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac
            ? [
                {
                    label: electron_1.app.name,
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideOthers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' },
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
                        if (win)
                            win.webContents.send('menu:open-folder');
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
                        if (!win)
                            return;
                        win.webContents.send('menu:cli-install');
                    },
                },
                {
                    label: 'Uninstall Command Line Tools',
                    click: (_item, win) => {
                        if (!win)
                            return;
                        win.webContents.send('menu:cli-uninstall');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Check for Updates…',
                    click: (_item, win) => {
                        if (!win)
                            return;
                        win.webContents.send('menu:check-updates');
                    },
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'EH Code Studio Website',
                    click: () => electron_1.shell.openExternal('https://github.com/eh-universe/code-studio'),
                },
            ],
        },
    ];
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
electron_1.app.whenReady().then(() => {
    // eslint-disable-next-line no-console
    console.log('[desktop] app ready (isProd=%s, nodeEnv=%s)', isProd, process.env.NODE_ENV);
    registerIpc();
    buildMenu();
    void createWindow().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[desktop] createWindow failed', err);
        // Keep process alive for debugging rather than silent exit.
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            void createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('before-quit', async () => {
    (0, shell_1.disposeAllShellSessions)();
    (0, updater_1.disposeAutoUpdate)();
    await (0, fs_2.disposeAllWatchers)();
});
