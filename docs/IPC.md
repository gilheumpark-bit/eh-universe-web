# IPC Reference — `window.cs`

The desktop renderer communicates with the Electron main process
through the `window.cs` bridge defined in
`apps/desktop/main/preload.ts`. This file documents every surface
and channel.

**Security rule:** the renderer never receives API keys, never
spawns processes directly, and never reads files outside what the
user explicitly opens. All privileged operations go through main.

---

## Surfaces

```
window.cs
├── fs        — file system + dialogs + watcher
├── quill     — verification engine (Phase B-2)
├── ai        — keystore-backed BYOK chat streaming
├── keystore  — set/has/list/delete (NO get — keys live in main only)
├── shell     — node-pty pseudo-terminal
├── git       — real `git` invocations
├── updater   — electron-updater integration
├── cli       — install/uninstall the bundled `cs` CLI
├── menu      — listeners for File/Tools menu commands
└── meta      — getAppVersion
```

---

## fs

| Method | IPC channel | Notes |
|---|---|---|
| `openDirectory()` | `fs:open-directory` | Native dialog, returns absolute path or `null` |
| `openFile(opts)` | `fs:open-file` | `opts.filters?: Electron.FileFilter[]` |
| `saveAs(opts)` | `fs:save-as` | `opts.defaultPath?` `opts.filters?` |
| `readFile(path)` | `fs:read-file` | UTF-8 |
| `writeFile(path, content)` | `fs:write-file` | Creates parent dirs |
| `readDir(path)` | `fs:readdir` | Returns `FsEntry[]` |
| `exists(path)` | `fs:exists` | |
| `stat(path)` | `fs:stat` | size/mtime/ctime/isFile/isDirectory |
| `rename(from, to)` | `fs:rename` | |
| `delete(target)` | `fs:delete` | Recursive, force=false |
| `mkdir(path)` | `fs:mkdir` | Recursive |
| `watch(opts, callback)` | `fs:watch` + `fs:watch-event:{id}` | Returns cleanup fn |

`watch` uses chokidar with `awaitWriteFinish` (200ms stability) and
ignores `node_modules`, `.git`, `.next`, `dist`, `coverage` by default.

---

## quill

| Method | Notes |
|---|---|
| `verify({ filePath, tier? })` | Tier A (light), B (med), C (heavy) |
| `engineVersion()` | Returns `@eh/quill-engine` semver |
| `fullScan(rootPath)` | Project-wide scan (worker pool — Phase TBD) |
| `autoStart({ rootPath, sessionId })` | Begin auto-verify on file changes |
| `autoStop(sessionId)` | |
| `autoPause(sessionId)` / `autoResume(sessionId)` | |
| `onAutoReport(cb)` | Receives `quill:auto-report` events |
| `onAutoError(cb)` | |

Auto-verify is debounced 300ms in main and only triggers on
extensions in the candidate list (.ts/.tsx/.js/.py/.go/.rs/...).

---

## ai

| Method | Notes |
|---|---|
| `chatStream(req)` | Returns `{ requestId }`. Chunks arrive via `onChunk` |
| `onChunk(requestId, cb)` | |
| `onError(requestId, cb)` | |
| `onEnd(requestId, cb)` | |
| `ariState()` | Inspect ARI Circuit Breaker EMA per provider |
| `ariReset(provider?)` | |

Main pulls the API key from `keystore.getKey()` at request time.
ARI Circuit Breaker:
- EMA α = 0.3
- close → open at EMA < 0.4
- open → half-open after 30s cooldown
- half-open → closed at EMA > 0.7

---

## keystore

| Method | Notes |
|---|---|
| `available()` | Whether `safeStorage.isEncryptionAvailable()` |
| `set(provider, key)` | Encrypts with safeStorage, persists to userData |
| `has(provider)` | |
| `list()` | Provider IDs only |
| `delete(provider)` | |
| `clear()` | Wipe all |

⚠ **There is no `get` method.** This is intentional — API keys
never leave the main process. Renderer XSS cannot exfiltrate them.

---

## shell

| Method | Notes |
|---|---|
| `create({ id, cwd?, cols?, rows? })` | Returns `{ ok, id, kind: 'pty' \| 'child' }` |
| `write(id, data)` | Sends to PTY stdin |
| `resize(id, cols, rows)` | PTY only — no-op for child fallback |
| `dispose(id)` | Kill the session |
| `onData(id, cb)` | Subscribe to stdout/stderr |
| `onExit(id, cb)` | |

Main loads `node-pty` lazily. If unavailable, falls back to
`child_process.spawn` (no real TTY semantics, but works for basic
command execution).

---

## git

| Method | Notes |
|---|---|
| `status(cwd)` | Porcelain v1, parsed |
| `diff(cwd, file?)` | |
| `log(cwd, opts?)` | `opts.limit` (default 50), `opts.file` |
| `branchList(cwd)` | All branches including remotes |
| `currentBranch(cwd)` | |
| `add(cwd, paths[])` | |
| `commit(cwd, message, opts?)` | `opts.signoff` for `-s` |
| `show(cwd, ref)` | `git show` |

All output capped at 10 MB. `GIT_TERMINAL_PROMPT=0` so spawned git
never blocks on credential prompts.

---

## updater

| Method | Notes |
|---|---|
| `available()` | True only when packaged AND electron-updater present |
| `check()` | User-driven check |
| `download()` | Requires user consent — autoDownload is OFF |
| `install()` | quitAndInstall(false, true) |
| `onChecking(cb)` / `onAvailable(cb)` / `onNotAvailable(cb)` | |
| `onError(cb)` / `onProgress(cb)` / `onDownloaded(cb)` | |

Auto check 5s after launch, then every 24h.

---

## cli

| Method | Notes |
|---|---|
| `status()` | `{ installed, target }` |
| `install()` | Interactive — shows confirmation dialog before any FS write |
| `uninstall()` | |

Install targets:
- macOS / Linux: `~/.local/bin/cs` (symlink, no sudo)
- Windows: `%LOCALAPPDATA%/Programs/eh-cs/cs.exe` + user PATH update

---

## menu

| Listener | Triggered by |
|---|---|
| `onOpenFolder(cb)` | File → Open Folder… (Cmd+O / Ctrl+O) |
| `onCliInstall(cb)` | Tools → Install Command Line Tools |
| `onCliUninstall(cb)` | Tools → Uninstall Command Line Tools |
| `onCheckUpdates(cb)` | Tools → Check for Updates… |

All menu commands are dispatched as IPC events to the focused
window's renderer so the renderer can react in-context (open the
project, show a banner, etc.).

---

## meta

| Method | Notes |
|---|---|
| `getAppVersion()` | From `app.getVersion()` |
