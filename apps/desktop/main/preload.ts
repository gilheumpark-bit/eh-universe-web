/**
 * apps/desktop/main/preload.ts — preload bridge
 *
 * Exposes a safe `window.cs` API to the renderer.
 *
 * Rules:
 *   - Only typed, narrow methods.
 *   - NEVER expose `ipcRenderer` directly.
 *   - NEVER expose API keys (those live in keystore IPC, main-only).
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

// ============================================================
// PART 1 — fs surface
// ============================================================

interface FsEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface FsStat {
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  isFile: boolean;
  isDirectory: boolean;
}

interface FsWatchEvent {
  kind: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'error';
  path: string;
}

const fs = {
  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('fs:open-directory'),
  openFile: (opts?: { filters?: { name: string; extensions: string[] }[] }): Promise<string | null> =>
    ipcRenderer.invoke('fs:open-file', opts),
  saveAs: (opts: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null> =>
    ipcRenderer.invoke('fs:save-as', opts),

  readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:write-file', filePath, content),

  readDir: (dirPath: string): Promise<FsEntry[]> => ipcRenderer.invoke('fs:readdir', dirPath),
  exists: (filePath: string): Promise<boolean> => ipcRenderer.invoke('fs:exists', filePath),
  stat: (filePath: string): Promise<FsStat> => ipcRenderer.invoke('fs:stat', filePath),

  rename: (from: string, to: string): Promise<void> => ipcRenderer.invoke('fs:rename', from, to),
  delete: (target: string): Promise<void> => ipcRenderer.invoke('fs:delete', target),
  mkdir: (dirPath: string): Promise<void> => ipcRenderer.invoke('fs:mkdir', dirPath),

  watch: (
    opts: { rootPath: string; ignored?: string[]; watchId: string },
    callback: (event: FsWatchEvent) => void,
  ): Promise<() => void> => {
    const channel = `fs:watch-event:${opts.watchId}`;
    const listener = (_e: IpcRendererEvent, ev: FsWatchEvent) => callback(ev);
    ipcRenderer.on(channel, listener);

    return ipcRenderer.invoke('fs:watch', opts).then(() => {
      return () => {
        ipcRenderer.removeListener(channel, listener);
        void ipcRenderer.invoke('fs:unwatch', opts.watchId);
      };
    });
  },
};

// ============================================================
// PART 2a — quill surface
// ============================================================

interface QuillVerifyRequest {
  filePath: string;
  tier?: 'A' | 'B' | 'C';
}

interface QuillVerifyResult {
  filePath: string;
  tier: 'A' | 'B' | 'C';
  issues: Array<{
    ruleId: string;
    severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
    line: number;
    column?: number;
    message: string;
  }>;
  durationMs: number;
  engineVersion: string;
}

const quill = {
  verify: (req: QuillVerifyRequest): Promise<QuillVerifyResult> =>
    ipcRenderer.invoke('quill:verify', req),
  engineVersion: (): Promise<string> => ipcRenderer.invoke('quill:engine-version'),
  fullScan: (rootPath: string): Promise<{ scanned: number; issues: number }> =>
    ipcRenderer.invoke('quill:full-scan', rootPath),

  autoStart: (opts: { rootPath: string; sessionId: string }): Promise<{ ok: true }> =>
    ipcRenderer.invoke('quill:auto-start', opts),
  autoStop: (sessionId: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('quill:auto-stop', sessionId),
  autoPause: (sessionId: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('quill:auto-pause', sessionId),
  autoResume: (sessionId: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('quill:auto-resume', sessionId),

  onAutoReport: (callback: (result: QuillVerifyResult) => void): (() => void) => {
    const sub = (_e: IpcRendererEvent, result: QuillVerifyResult) => callback(result);
    ipcRenderer.on('quill:auto-report', sub);
    return () => ipcRenderer.removeListener('quill:auto-report', sub);
  },
  onAutoError: (callback: (error: { filePath: string; error: string }) => void): (() => void) => {
    const sub = (_e: IpcRendererEvent, err: { filePath: string; error: string }) => callback(err);
    ipcRenderer.on('quill:auto-error', sub);
    return () => ipcRenderer.removeListener('quill:auto-error', sub);
  },
};

// ============================================================
// PART 2 — ai surface (keystore-backed BYOK)
// ============================================================

interface AIChatRequest {
  provider: 'gemini' | 'openai' | 'claude' | 'groq' | 'ollama' | 'lmstudio';
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

const ai = {
  // New canonical streaming API
  chatStream: (req: AIChatRequest): Promise<{ requestId: string }> =>
    ipcRenderer.invoke('ai:chat-stream', req),
  ariState: (): Promise<unknown[]> => ipcRenderer.invoke('ai:ari-state'),
  ariReset: (provider?: string): Promise<{ ok: true }> => ipcRenderer.invoke('ai:ari-reset', provider),

  // Stream listeners
  onChunk: (requestId: string, callback: (chunk: string) => void) => {
    const channel = `ai:chat-chunk:${requestId}`;
    const sub = (_e: IpcRendererEvent, chunk: string) => callback(chunk);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  onError: (requestId: string, callback: (error: unknown) => void) => {
    const channel = `ai:chat-error:${requestId}`;
    const sub = (_e: IpcRendererEvent, error: unknown) => callback(error);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  onEnd: (requestId: string, callback: () => void) => {
    const channel = `ai:chat-end:${requestId}`;
    const sub = () => callback();
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },

  // Legacy compat for renderer migration period
  request: (request: Record<string, unknown>) => ipcRenderer.invoke('ai:chat-request', request),
};

// ============================================================
// PART 2b — keystore surface (renderer can SET/HAS/LIST/DELETE — never GET)
// ============================================================

const keystore = {
  set: (provider: string, key: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('keystore:set', provider, key),
  has: (provider: string): Promise<boolean> => ipcRenderer.invoke('keystore:has', provider),
  list: (): Promise<string[]> => ipcRenderer.invoke('keystore:list'),
  delete: (provider: string): Promise<boolean> => ipcRenderer.invoke('keystore:delete', provider),
  clear: (): Promise<{ ok: true }> => ipcRenderer.invoke('keystore:clear'),
  available: (): Promise<boolean> => ipcRenderer.invoke('keystore:available'),
  // Intentionally no `get` — keys never leave main.
};

// ============================================================
// PART 2c — shell surface (PTY)
// ============================================================

const shell = {
  create: (opts: { id: string; cwd?: string; cols?: number; rows?: number }): Promise<{ ok: true; id: string; kind: 'pty' | 'child' }> =>
    ipcRenderer.invoke('shell:create', opts),
  write: (id: string, data: string): void => {
    ipcRenderer.send('shell:write', id, data);
  },
  resize: (id: string, cols: number, rows: number): void => {
    ipcRenderer.send('shell:resize', id, cols, rows);
  },
  dispose: (id: string): void => {
    ipcRenderer.send('shell:dispose', id);
  },
  onData: (id: string, callback: (data: string) => void): (() => void) => {
    const channel = `shell:data:${id}`;
    const sub = (_e: IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  onExit: (id: string, callback: (e: { exitCode: number }) => void): (() => void) => {
    const channel = `shell:exit:${id}`;
    const sub = (_e: IpcRendererEvent, ev: { exitCode: number }) => callback(ev);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
};

// ============================================================
// PART 2d — git surface
// ============================================================

const git = {
  status: (cwd: string): Promise<unknown> => ipcRenderer.invoke('git:status', cwd),
  diff: (cwd: string, file?: string): Promise<unknown> => ipcRenderer.invoke('git:diff', cwd, file),
  log: (cwd: string, opts?: { limit?: number; file?: string }): Promise<unknown> =>
    ipcRenderer.invoke('git:log', cwd, opts),
  branchList: (cwd: string): Promise<unknown> => ipcRenderer.invoke('git:branch-list', cwd),
  currentBranch: (cwd: string): Promise<unknown> => ipcRenderer.invoke('git:current-branch', cwd),
  add: (cwd: string, paths: string[]): Promise<unknown> => ipcRenderer.invoke('git:add', cwd, paths),
  commit: (cwd: string, message: string, opts?: { signoff?: boolean }): Promise<unknown> =>
    ipcRenderer.invoke('git:commit', cwd, message, opts),
  show: (cwd: string, ref: string): Promise<unknown> => ipcRenderer.invoke('git:show', cwd, ref),
};

// ============================================================
// PART 2g — updater surface
// ============================================================

interface UpdaterStatus {
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
}

const updater = {
  available: (): Promise<boolean> => ipcRenderer.invoke('updater:available?'),
  check: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('updater:check'),
  download: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('updater:download'),
  install: (): Promise<{ ok: true }> => ipcRenderer.invoke('updater:install'),

  onChecking: (cb: () => void): (() => void) => {
    const sub = () => cb();
    ipcRenderer.on('updater:checking', sub);
    return () => ipcRenderer.removeListener('updater:checking', sub);
  },
  onAvailable: (cb: (info: UpdaterStatus) => void): (() => void) => {
    const sub = (_e: IpcRendererEvent, info: UpdaterStatus) => cb(info);
    ipcRenderer.on('updater:available', sub);
    return () => ipcRenderer.removeListener('updater:available', sub);
  },
  onNotAvailable: (cb: () => void): (() => void) => {
    const sub = () => cb();
    ipcRenderer.on('updater:not-available', sub);
    return () => ipcRenderer.removeListener('updater:not-available', sub);
  },
  onError: (cb: (err: { message: string }) => void): (() => void) => {
    const sub = (_e: IpcRendererEvent, err: { message: string }) => cb(err);
    ipcRenderer.on('updater:error', sub);
    return () => ipcRenderer.removeListener('updater:error', sub);
  },
  onProgress: (cb: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void): (() => void) => {
    const sub = (_e: IpcRendererEvent, p: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => cb(p);
    ipcRenderer.on('updater:progress', sub);
    return () => ipcRenderer.removeListener('updater:progress', sub);
  },
  onDownloaded: (cb: (info: UpdaterStatus) => void): (() => void) => {
    const sub = (_e: IpcRendererEvent, info: UpdaterStatus) => cb(info);
    ipcRenderer.on('updater:downloaded', sub);
    return () => ipcRenderer.removeListener('updater:downloaded', sub);
  },
};

// ============================================================
// PART 2h — cli installer surface
// ============================================================

const cli = {
  status: (): Promise<{ installed: boolean; target: string }> =>
    ipcRenderer.invoke('cli:status'),
  install: (): Promise<{ ok: true }> => ipcRenderer.invoke('cli:install'),
  uninstall: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('cli:uninstall'),
};

// ============================================================
// PART 2i — menu event listeners (renderer subscribes)
// ============================================================

const menu = {
  onOpenFolder: (cb: () => void): (() => void) => {
    const sub = () => cb();
    ipcRenderer.on('menu:open-folder', sub);
    return () => ipcRenderer.removeListener('menu:open-folder', sub);
  },
  onCliInstall: (cb: () => void): (() => void) => {
    const sub = () => cb();
    ipcRenderer.on('menu:cli-install', sub);
    return () => ipcRenderer.removeListener('menu:cli-install', sub);
  },
  onCliUninstall: (cb: () => void): (() => void) => {
    const sub = () => cb();
    ipcRenderer.on('menu:cli-uninstall', sub);
    return () => ipcRenderer.removeListener('menu:cli-uninstall', sub);
  },
  onCheckUpdates: (cb: () => void): (() => void) => {
    const sub = () => cb();
    ipcRenderer.on('menu:check-updates', sub);
    return () => ipcRenderer.removeListener('menu:check-updates', sub);
  },
};

// ============================================================
// PART 3 — meta
// ============================================================

const meta = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
};

const system = {
  getLocalSpec: (): Promise<{
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    cpus: number;
    totalMem: number;
    freeMem: number;
    appVersion: string;
  }> => ipcRenderer.invoke('system:get-local-spec'),
  openPath: (filePath: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('system:open-path', filePath),
};

// ============================================================
// PART 3b — Local-only features (desktop advantage)
// ============================================================

const local = {
  addRecent: (filePath: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('local:add-recent', filePath),
  clearRecent: (): Promise<{ ok: true }> =>
    ipcRenderer.invoke('local:clear-recent'),
  notify: (opts: { title: string; body: string; silent?: boolean }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('local:notify', opts),
  clipboardRead: (): Promise<string> =>
    ipcRenderer.invoke('local:clipboard-read'),
  clipboardWrite: (text: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('local:clipboard-write', text),
  clipboardReadHtml: (): Promise<string> =>
    ipcRenderer.invoke('local:clipboard-read-html'),
  clipboardHasImage: (): Promise<boolean> =>
    ipcRenderer.invoke('local:clipboard-has-image'),
  onFileDropped: (cb: (filePath: string) => void): (() => void) => {
    const sub = (_e: IpcRendererEvent, fp: string) => cb(fp);
    ipcRenderer.on('local:file-dropped', sub);
    return () => ipcRenderer.removeListener('local:file-dropped', sub);
  },
};

// ============================================================
// PART 3c — MCP (Model Context Protocol) servers
// ============================================================

interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

const mcp = {
  startServer: (config: MCPServerConfig): Promise<{ ok: boolean; id?: string; tools?: unknown[]; error?: string }> =>
    ipcRenderer.invoke('mcp:start-server', config),
  stopServer: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('mcp:stop-server', id),
  restartServer: (id: string): Promise<{ ok: boolean; id?: string; tools?: unknown[]; error?: string }> =>
    ipcRenderer.invoke('mcp:restart-server', id),
  listServers: (): Promise<Array<{ id: string; name: string; status: string; tools: unknown[] }>> =>
    ipcRenderer.invoke('mcp:list-servers'),
  listTools: (serverId: string): Promise<Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>> =>
    ipcRenderer.invoke('mcp:list-tools', serverId),
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>): Promise<{ content: string; isError: boolean }> =>
    ipcRenderer.invoke('mcp:call-tool', serverId, toolName, args),
  serverStatus: (id: string): Promise<{ status: string; tools?: unknown[] }> =>
    ipcRenderer.invoke('mcp:server-status', id),
  saveConfig: (configs: MCPServerConfig[]): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('mcp:save-config', configs),
  loadConfig: (): Promise<MCPServerConfig[]> =>
    ipcRenderer.invoke('mcp:load-config'),
  onServerEvent: (id: string, cb: (event: { status: string; tools?: unknown[]; reason?: string }) => void): (() => void) => {
    const channel = `mcp:server-event:${id}`;
    const sub = (_e: IpcRendererEvent, ev: { status: string; tools?: unknown[]; reason?: string }) => cb(ev);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
};

// ============================================================
// PART 3d — Ollama local model management
// ============================================================

const ollama = {
  healthCheck: (baseUrl?: string): Promise<{ ok: boolean; version?: string }> =>
    ipcRenderer.invoke('ollama:health-check', baseUrl),
  listModels: (baseUrl?: string): Promise<Array<{ name: string; size: number; digest: string; modified_at: string }>> =>
    ipcRenderer.invoke('ollama:list-models', baseUrl),
  modelInfo: (modelName: string, baseUrl?: string): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('ollama:model-info', modelName, baseUrl),
  pullModel: (baseUrl: string, modelName: string): Promise<{ requestId: string }> =>
    ipcRenderer.invoke('ollama:pull-model', baseUrl, modelName),
  onPullProgress: (requestId: string, cb: (progress: { status: string; percent?: number }) => void): (() => void) => {
    const channel = `ollama:pull-progress:${requestId}`;
    const sub = (_e: IpcRendererEvent, p: { status: string; percent?: number }) => cb(p);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  onPullDone: (requestId: string, cb: () => void): (() => void) => {
    const channel = `ollama:pull-done:${requestId}`;
    const sub = () => cb();
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
};

// ============================================================
// PART 4 — Public bridge
// ============================================================

const cs = { fs, quill, ai, keystore, shell, git, updater, cli, menu, meta, system, local, ollama, mcp };

// New canonical surface
contextBridge.exposeInMainWorld('cs', cs);

// Backwards-compat: keep `window.electron` until renderer migration is done in C-5
contextBridge.exposeInMainWorld('electron', {
  getAppVersion: meta.getAppVersion,
  fs: {
    openDirectory: fs.openDirectory,
    readFile: fs.readFile,
    writeFile: fs.writeFile,
    readdir: fs.readDir,
    exists: fs.exists,
  },
  aiChat: {
    request: ai.request,
    onChunk: ai.onChunk,
    onError: ai.onError,
    onEnd: ai.onEnd,
  },
});
