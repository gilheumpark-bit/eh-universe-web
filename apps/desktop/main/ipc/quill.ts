/**
 * apps/desktop/main/ipc/quill.ts
 *
 * Quill verification engine IPC.
 *
 * PART 1 — Tier dispatch (A: light, B: medium, C: heavy)
 * PART 2 — Auto-watcher integration (file change → tier A/B verify)
 * PART 3 — Worker pool delegation (tier C heavy scans)
 * PART 4 — Public registrar
 */

import { ipcMain, type WebContents } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

// NOTE: @eh/quill-engine is workspace-linked. The actual import wires up
// once the engine package exports a runtime API. For now we lazy-import
// to keep the surface stable even while the engine is being moved.
type QuillEngine = {
  ENGINE_VERSION: string;
  // Will expand: runVerify, runDeepVerify, ARICircuitBreaker, etc.
};

let engineCache: QuillEngine | null = null;
async function getEngine(): Promise<QuillEngine> {
  if (engineCache) return engineCache;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  engineCache = require('@eh/quill-engine') as QuillEngine;
  return engineCache;
}

// ============================================================
// PART 1 — Verify request shapes
// ============================================================

interface VerifyFileRequest {
  filePath: string;
  tier?: 'A' | 'B' | 'C';
}

interface VerifyResultIssue {
  ruleId: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  line: number;
  column?: number;
  message: string;
}

interface VerifyResult {
  filePath: string;
  tier: 'A' | 'B' | 'C';
  issues: VerifyResultIssue[];
  durationMs: number;
  engineVersion: string;
}

async function verifyFile(req: VerifyFileRequest): Promise<VerifyResult> {
  const t0 = Date.now();
  const tier = req.tier ?? 'A';

  // Load file content
  let content: string;
  try {
    content = await fs.readFile(req.filePath, 'utf-8');
  } catch (err) {
    return {
      filePath: req.filePath,
      tier,
      issues: [
        {
          ruleId: 'fs-read-error',
          severity: 'P1',
          line: 0,
          message: `Cannot read file: ${(err as Error).message}`,
        },
      ],
      durationMs: Date.now() - t0,
      engineVersion: 'unknown',
    };
  }

  const engine = await getEngine();

  // STUB: detector dispatch by tier. Real wiring lands when engine
  // exports `runVerify(file, options)`. For now we return an empty
  // pass to keep the IPC contract stable.
  const issues: VerifyResultIssue[] = [];

  return {
    filePath: req.filePath,
    tier,
    issues,
    durationMs: Date.now() - t0,
    engineVersion: engine.ENGINE_VERSION,
  };
}

// ============================================================
// PART 2 — Auto-watcher integration
// ============================================================

interface AutoVerifyState {
  rootPath: string;
  webContents: WebContents;
  pending: Set<string>;
  flushTimer: NodeJS.Timeout | null;
  enabled: boolean;
}

const autoStates = new Map<string, AutoVerifyState>();
const FLUSH_DEBOUNCE_MS = 300;

function scheduleFlush(state: AutoVerifyState): void {
  if (state.flushTimer) return;
  state.flushTimer = setTimeout(() => {
    void flushAutoVerify(state);
  }, FLUSH_DEBOUNCE_MS);
}

async function flushAutoVerify(state: AutoVerifyState): Promise<void> {
  state.flushTimer = null;
  if (!state.enabled || state.pending.size === 0) return;

  const files = Array.from(state.pending);
  state.pending.clear();

  for (const filePath of files) {
    if (state.webContents.isDestroyed()) return;

    try {
      const result = await verifyFile({ filePath, tier: 'A' });
      state.webContents.send('quill:auto-report', result);
    } catch (err) {
      state.webContents.send('quill:auto-error', {
        filePath,
        error: (err as Error).message,
      });
    }
  }
}

function isQuillCandidate(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.java', '.kt', '.swift',
    '.rb', '.php', '.cs',
  ].includes(ext);
}

export function notifyFileChange(rootPath: string, filePath: string): void {
  for (const state of autoStates.values()) {
    if (state.rootPath !== rootPath) continue;
    if (!state.enabled) continue;
    if (!isQuillCandidate(filePath)) continue;
    state.pending.add(filePath);
    scheduleFlush(state);
  }
}

// ============================================================
// PART 3 — Worker pool stub (tier C heavy scans)
// ============================================================

async function runFullProjectScan(rootPath: string): Promise<{ scanned: number; issues: number }> {
  // STUB: future implementation will use child_process worker pool
  // (apps/desktop/main/workers/quill-worker.ts) to run all detectors
  // in parallel against every tracked file.
  return { scanned: 0, issues: 0 };
}

// ============================================================
// PART 4 — Public registrar
// ============================================================

let registered = false;

export function registerQuillIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.handle('quill:verify', async (_event, req: VerifyFileRequest) => verifyFile(req));

  ipcMain.handle('quill:engine-version', async () => {
    const engine = await getEngine();
    return engine.ENGINE_VERSION;
  });

  ipcMain.handle('quill:full-scan', async (_event, rootPath: string) => runFullProjectScan(rootPath));

  ipcMain.handle('quill:auto-start', (event, opts: { rootPath: string; sessionId: string }) => {
    const state: AutoVerifyState = {
      rootPath: opts.rootPath,
      webContents: event.sender,
      pending: new Set(),
      flushTimer: null,
      enabled: true,
    };
    autoStates.set(opts.sessionId, state);

    event.sender.once('destroyed', () => {
      const s = autoStates.get(opts.sessionId);
      if (s?.flushTimer) clearTimeout(s.flushTimer);
      autoStates.delete(opts.sessionId);
    });

    return { ok: true, sessionId: opts.sessionId };
  });

  ipcMain.handle('quill:auto-stop', (_event, sessionId: string) => {
    const s = autoStates.get(sessionId);
    if (s?.flushTimer) clearTimeout(s.flushTimer);
    autoStates.delete(sessionId);
    return { ok: true };
  });

  ipcMain.handle('quill:auto-pause', (_event, sessionId: string) => {
    const s = autoStates.get(sessionId);
    if (s) s.enabled = false;
    return { ok: true };
  });

  ipcMain.handle('quill:auto-resume', (_event, sessionId: string) => {
    const s = autoStates.get(sessionId);
    if (s) s.enabled = true;
    return { ok: true };
  });
}
