/**
 * apps/desktop/main/ipc/git.ts
 *
 * Real `git` invocations via child_process.spawn. The renderer never
 * runs git directly — it always goes through these handlers so the
 * main process can rate-limit, log, and sandbox.
 *
 * PART 1 — Spawn helper with output buffering
 * PART 2 — High-level commands (status, diff, log, branch, commit)
 * PART 3 — Public registrar
 */

import { ipcMain } from 'electron';
import { spawn } from 'node:child_process';

// ============================================================
// PART 1 — Spawn helper
// ============================================================

interface SpawnResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

const MAX_OUTPUT_BYTES = 10 * 1024 * 1024; // 10 MB cap

function runGit(args: string[], cwd: string, stdin?: string): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    let stdout = '';
    let stderr = '';
    let truncated = false;

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length + chunk.length > MAX_OUTPUT_BYTES) {
        truncated = true;
        return;
      }
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length + chunk.length > MAX_OUTPUT_BYTES) {
        truncated = true;
        return;
      }
      stderr += chunk.toString();
    });

    if (stdin && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.on('error', (err) => {
      resolve({ ok: false, exitCode: -1, stdout, stderr: stderr + String(err) });
    });
    child.on('close', (code) => {
      if (truncated) {
        stderr += '\n[output truncated by main/ipc/git.ts MAX_OUTPUT_BYTES]';
      }
      resolve({ ok: code === 0, exitCode: code ?? -1, stdout, stderr });
    });
  });
}

// ============================================================
// PART 2 — Commands
// ============================================================

interface ParsedStatus {
  branch: string | null;
  ahead: number;
  behind: number;
  files: Array<{
    path: string;
    indexStatus: string;
    workingStatus: string;
  }>;
}

function parsePorcelain(out: string): ParsedStatus {
  const result: ParsedStatus = { branch: null, ahead: 0, behind: 0, files: [] };
  const lines = out.split('\n');

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const head = line.slice(3);
      const branchMatch = head.match(/^([^\s.]+)/);
      if (branchMatch) result.branch = branchMatch[1];
      const ahead = head.match(/ahead (\d+)/);
      const behind = head.match(/behind (\d+)/);
      if (ahead) result.ahead = Number(ahead[1]);
      if (behind) result.behind = Number(behind[1]);
      continue;
    }
    if (line.length < 4) continue;
    result.files.push({
      indexStatus: line[0]!,
      workingStatus: line[1]!,
      path: line.slice(3),
    });
  }
  return result;
}

// ============================================================
// PART 3 — Public registrar
// ============================================================

let registered = false;

export function registerGitIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.handle('git:status', async (_event, cwd: string) => {
    const r = await runGit(['status', '--porcelain=v1', '--branch'], cwd);
    if (!r.ok) return { ok: false, error: r.stderr };
    return { ok: true, ...parsePorcelain(r.stdout) };
  });

  ipcMain.handle('git:diff', async (_event, cwd: string, file?: string) => {
    const args = ['diff', '--no-color'];
    if (file) args.push('--', file);
    const r = await runGit(args, cwd);
    return { ok: r.ok, diff: r.stdout, error: r.ok ? undefined : r.stderr };
  });

  ipcMain.handle(
    'git:log',
    async (_event, cwd: string, opts?: { limit?: number; file?: string }) => {
      const args = [
        'log',
        '--pretty=format:%H%x09%an%x09%ae%x09%at%x09%s',
        `-n${opts?.limit ?? 50}`,
      ];
      if (opts?.file) args.push('--', opts.file);
      const r = await runGit(args, cwd);
      if (!r.ok) return { ok: false, error: r.stderr };
      const commits = r.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, email, ts, ...subjParts] = line.split('\t');
          return {
            hash,
            author,
            email,
            timestamp: Number(ts) * 1000,
            subject: subjParts.join('\t'),
          };
        });
      return { ok: true, commits };
    },
  );

  ipcMain.handle('git:branch-list', async (_event, cwd: string) => {
    const r = await runGit(['branch', '--list', '--all', '--format=%(refname:short)'], cwd);
    if (!r.ok) return { ok: false, error: r.stderr };
    return { ok: true, branches: r.stdout.split('\n').filter(Boolean) };
  });

  ipcMain.handle('git:current-branch', async (_event, cwd: string) => {
    const r = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    if (!r.ok) return { ok: false, error: r.stderr };
    return { ok: true, branch: r.stdout.trim() };
  });

  ipcMain.handle('git:add', async (_event, cwd: string, paths: string[]) => {
    const r = await runGit(['add', '--', ...paths], cwd);
    return { ok: r.ok, error: r.ok ? undefined : r.stderr };
  });

  ipcMain.handle(
    'git:commit',
    async (_event, cwd: string, message: string, opts?: { signoff?: boolean }) => {
      const args = ['commit', '-F', '-'];
      if (opts?.signoff) args.push('-s');
      const r = await runGit(args, cwd, message);
      return { ok: r.ok, error: r.ok ? undefined : r.stderr, output: r.stdout };
    },
  );

  ipcMain.handle('git:show', async (_event, cwd: string, ref: string) => {
    const r = await runGit(['show', '--no-color', ref], cwd);
    return { ok: r.ok, content: r.stdout, error: r.ok ? undefined : r.stderr };
  });
}
