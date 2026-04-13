/**
 * apps/desktop/main/ipc/shell.ts
 *
 * PTY (pseudo-terminal) IPC for the renderer's terminal panel.
 *
 * Uses node-pty when available; falls back to child_process.spawn for
 * environments where node-pty isn't built (CI, fresh clones).
 *
 * PART 1 — Session registry
 * PART 2 — Create / write / resize / dispose handlers
 * PART 3 — Public registrar
 */

import { ipcMain, type WebContents } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import os from 'node:os';

// node-pty is optional. We require it lazily and degrade gracefully.
type Pty = {
  spawn: (
    file: string,
    args: string[],
    opts: { name?: string; cols?: number; rows?: number; cwd?: string; env?: NodeJS.ProcessEnv },
  ) => {
    onData: (cb: (data: string) => void) => void;
    onExit: (cb: (e: { exitCode: number }) => void) => void;
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    kill: (signal?: string) => void;
    pid: number;
  };
};

let ptyMod: Pty | null = null;
function loadPty(): Pty | null {
  if (ptyMod) return ptyMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ptyMod = require('node-pty') as Pty;
    return ptyMod;
  } catch {
    return null;
  }
}

// ============================================================
// PART 1 — Session registry
// ============================================================

interface PtySession {
  id: string;
  webContents: WebContents;
  // discriminated runtime
  kind: 'pty' | 'child';
  pty?: ReturnType<Pty['spawn']>;
  child?: ChildProcess;
}

const sessions = new Map<string, PtySession>();

function defaultShell(): { file: string; args: string[] } {
  if (process.platform === 'win32') {
    const ps = process.env.ComSpec ?? 'powershell.exe';
    return { file: ps, args: [] };
  }
  return { file: process.env.SHELL ?? '/bin/bash', args: ['-l'] };
}

// ============================================================
// PART 2 — Handlers
// ============================================================

function createSession(
  sender: WebContents,
  opts: { id: string; cwd?: string; cols?: number; rows?: number },
): { ok: true; id: string; kind: 'pty' | 'child' } {
  const channel = `shell:data:${opts.id}`;
  const exitChannel = `shell:exit:${opts.id}`;
  const { file, args } = defaultShell();

  const pty = loadPty();
  if (pty) {
    const proc = pty.spawn(file, args, {
      name: 'xterm-256color',
      cols: opts.cols ?? 80,
      rows: opts.rows ?? 24,
      cwd: opts.cwd ?? os.homedir(),
      env: process.env,
    });
    proc.onData((data) => {
      if (!sender.isDestroyed()) sender.send(channel, data);
    });
    proc.onExit(({ exitCode }) => {
      if (!sender.isDestroyed()) sender.send(exitChannel, { exitCode });
      sessions.delete(opts.id);
    });

    sessions.set(opts.id, { id: opts.id, webContents: sender, kind: 'pty', pty: proc });
    return { ok: true, id: opts.id, kind: 'pty' };
  }

  // Fallback: line-buffered child process (no full TTY semantics)
  const child = spawn(file, args, {
    cwd: opts.cwd ?? os.homedir(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => {
    if (!sender.isDestroyed()) sender.send(channel, chunk.toString());
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    if (!sender.isDestroyed()) sender.send(channel, chunk.toString());
  });
  child.on('exit', (code) => {
    if (!sender.isDestroyed()) sender.send(exitChannel, { exitCode: code ?? 0 });
    sessions.delete(opts.id);
  });

  sessions.set(opts.id, { id: opts.id, webContents: sender, kind: 'child', child });
  return { ok: true, id: opts.id, kind: 'child' };
}

function writeSession(id: string, data: string): void {
  const s = sessions.get(id);
  if (!s) return;
  if (s.kind === 'pty' && s.pty) {
    s.pty.write(data);
  } else if (s.kind === 'child' && s.child?.stdin) {
    s.child.stdin.write(data);
  }
}

function resizeSession(id: string, cols: number, rows: number): void {
  const s = sessions.get(id);
  if (s?.kind === 'pty' && s.pty) {
    s.pty.resize(cols, rows);
  }
  // child fallback ignores resize
}

function disposeSession(id: string): void {
  const s = sessions.get(id);
  if (!s) return;
  try {
    if (s.kind === 'pty' && s.pty) s.pty.kill();
    else if (s.kind === 'child' && s.child) s.child.kill();
  } finally {
    sessions.delete(id);
  }
}

export function disposeAllShellSessions(): void {
  for (const id of Array.from(sessions.keys())) disposeSession(id);
}

// ============================================================
// PART 3 — Public registrar
// ============================================================

let registered = false;

export function registerShellIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.handle(
    'shell:create',
    (event, opts: { id: string; cwd?: string; cols?: number; rows?: number }) => {
      event.sender.once('destroyed', () => disposeSession(opts.id));
      return createSession(event.sender, opts);
    },
  );

  ipcMain.on('shell:write', (_event, id: string, data: string) => writeSession(id, data));
  ipcMain.on('shell:resize', (_event, id: string, cols: number, rows: number) =>
    resizeSession(id, cols, rows),
  );
  ipcMain.on('shell:dispose', (_event, id: string) => disposeSession(id));
}
