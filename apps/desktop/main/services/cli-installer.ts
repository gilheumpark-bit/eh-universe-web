/**
 * apps/desktop/main/services/cli-installer.ts
 *
 * Install / uninstall the bundled `cs` CLI as a system command.
 *
 * PART 1 — Path resolution per OS
 * PART 2 — install / uninstall / status
 * PART 3 — IPC handlers
 *
 * Behavior:
 *   - macOS / Linux: symlink Resources/bin/cs -> ~/.local/bin/cs
 *     (no sudo required, falls within user PATH on most distros)
 *   - Windows: copy Resources/bin/cs.exe -> %LOCALAPPDATA%/Programs/eh-cs/cs.exe
 *     and add that dir to user PATH
 *   - All actions are reversible.
 */

import { app, ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

// ============================================================
// PART 1 — Path resolution
// ============================================================

interface InstallTarget {
  source: string;       // path to bundled cli binary inside the app
  target: string;       // where it goes on disk
  kind: 'symlink' | 'copy';
  needsPath: boolean;   // true if target dir is not on PATH by default
}

function resolveTarget(): InstallTarget {
  // In production, process.resourcesPath = .../EH Code Studio.app/Contents/Resources
  // In dev, fall back to monorepo path
  const resourcesPath = app.isPackaged
    ? process.resourcesPath
    : path.resolve(__dirname, '../../../../packages/quill-cli/dist');

  if (process.platform === 'win32') {
    const source = path.join(resourcesPath, 'bin', 'cs.exe');
    const targetDir = path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'Programs', 'eh-cs');
    return {
      source,
      target: path.join(targetDir, 'cs.exe'),
      kind: 'copy',
      needsPath: true,
    };
  }

  // macOS + Linux
  const source = path.join(resourcesPath, 'bin', 'cs');
  const target = path.join(os.homedir(), '.local', 'bin', 'cs');
  return {
    source,
    target,
    kind: 'symlink',
    needsPath: false,   // ~/.local/bin is in PATH on most modern distros + macOS Homebrew
  };
}

// ============================================================
// PART 2 — Install / uninstall / status
// ============================================================

async function isInstalled(): Promise<boolean> {
  const t = resolveTarget();
  try {
    const stat = await fs.lstat(t.target);
    return stat.isFile() || stat.isSymbolicLink();
  } catch {
    return false;
  }
}

async function install(): Promise<{ ok: boolean; target?: string; error?: string }> {
  const t = resolveTarget();

  // Verify source exists
  try {
    await fs.access(t.source);
  } catch {
    return { ok: false, error: `Source binary not found at ${t.source}` };
  }

  // Ensure target dir
  await fs.mkdir(path.dirname(t.target), { recursive: true });

  // Remove any existing entry first
  try {
    await fs.unlink(t.target);
  } catch {
    /* ignore */
  }

  try {
    if (t.kind === 'symlink') {
      await fs.symlink(t.source, t.target);
      await fs.chmod(t.source, 0o755);
    } else {
      await fs.copyFile(t.source, t.target);
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  // Windows: best-effort PATH addition
  if (t.needsPath && process.platform === 'win32') {
    await addToUserPathWindows(path.dirname(t.target)).catch(() => {
      /* user can do this manually */
    });
  }

  return { ok: true, target: t.target };
}

async function uninstall(): Promise<{ ok: boolean; error?: string }> {
  const t = resolveTarget();
  try {
    await fs.unlink(t.target);
    return { ok: true };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ok: true };
    return { ok: false, error: (err as Error).message };
  }
}

function addToUserPathWindows(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // setx PATH "%PATH%;<dir>" /M would set machine-wide; we use user-level
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `$p=[Environment]::GetEnvironmentVariable('PATH','User'); if ($p -notlike '*${dir}*') { [Environment]::SetEnvironmentVariable('PATH', $p + ';${dir}', 'User') }`,
      ],
      { stdio: 'ignore' },
    );
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

// ============================================================
// PART 3 — IPC handlers + interactive flow
// ============================================================

async function installInteractive(parent: BrowserWindow | null): Promise<void> {
  const t = resolveTarget();
  const result = await dialog.showMessageBox(parent ?? undefined!, {
    type: 'question',
    buttons: ['Install', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: 'Install Command Line Tools',
    message: "Install the 'cs' command line tool?",
    detail:
      `This will create:\n  ${t.target}\n\n` +
      (t.needsPath
        ? "Your PATH will be updated so 'cs' is available in any new terminal.\n\n"
        : "It will be available in any new terminal session.\n\n") +
      'No administrator privileges required.',
  });

  if (result.response !== 0) return;

  const r = await install();
  if (r.ok) {
    await dialog.showMessageBox(parent ?? undefined!, {
      type: 'info',
      title: 'Installed',
      message: 'CLI installed successfully.',
      detail: `Run 'cs --help' in any new terminal.\nLocation: ${r.target}`,
    });
  } else {
    await dialog.showErrorBox('Install failed', r.error ?? 'Unknown error');
  }
}

let registered = false;

export function registerCliInstallerIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.handle('cli:status', async () => ({
    installed: await isInstalled(),
    target: resolveTarget().target,
  }));

  ipcMain.handle('cli:install', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await installInteractive(win);
    return { ok: true };
  });

  ipcMain.handle('cli:uninstall', async () => uninstall());
}
