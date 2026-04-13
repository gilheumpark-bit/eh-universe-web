/**
 * apps/desktop/main/services/crash-reporter.ts
 *
 * Persistent error logging for production builds.
 * Writes to userData/crash-reports/ for post-mortem analysis.
 */

import fs from 'node:fs';
import path from 'node:path';
import { app, ipcMain } from 'electron';

// ============================================================
// PART 1 — File-based crash log
// ============================================================

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB per log file
const MAX_LOG_FILES = 10;

function getLogDir(): string {
  const dir = path.join(app.getPath('userData'), 'crash-reports');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLogFile(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(getLogDir(), `crash-${date}.log`);
}

function rotateIfNeeded(logPath: string): void {
  try {
    const stat = fs.statSync(logPath);
    if (stat.size > MAX_LOG_SIZE) {
      const rotated = logPath.replace('.log', `-${Date.now()}.log`);
      fs.renameSync(logPath, rotated);
    }
  } catch {
    // File doesn't exist yet — no rotation needed
  }

  // Prune old files
  try {
    const dir = getLogDir();
    const files = fs.readdirSync(dir)
      .filter((f) => f.startsWith('crash-') && f.endsWith('.log'))
      .sort()
      .reverse();
    for (const file of files.slice(MAX_LOG_FILES)) {
      fs.unlinkSync(path.join(dir, file));
    }
  } catch {
    // Best effort
  }
}

function writeEntry(entry: Record<string, unknown>): void {
  const logPath = getLogFile();
  rotateIfNeeded(logPath);
  const line = JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n';
  fs.appendFileSync(logPath, line, 'utf-8');
}

// ============================================================
// PART 2 — Main process error capture
// ============================================================

export function initCrashReporter(): void {
  // Capture unhandled main process errors
  process.on('uncaughtException', (err) => {
    writeEntry({
      source: 'main',
      kind: 'uncaughtException',
      message: err.message,
      stack: err.stack,
    });
    console.error('[crash-reporter] uncaughtException:', err.message);
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    writeEntry({
      source: 'main',
      kind: 'unhandledRejection',
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    console.error('[crash-reporter] unhandledRejection:', message);
  });

  // IPC: renderer sends error reports to main for persistent logging
  ipcMain.handle('crash:report', (_event, entry: Record<string, unknown>) => {
    writeEntry({ source: 'renderer', ...entry });
    return { ok: true };
  });

  ipcMain.handle('crash:get-logs', () => {
    try {
      const logPath = getLogFile();
      if (!fs.existsSync(logPath)) return { logs: [] };
      const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
      return { logs: lines.slice(-50).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } }) };
    } catch {
      return { logs: [] };
    }
  });

  ipcMain.handle('crash:get-log-path', () => getLogDir());
}
