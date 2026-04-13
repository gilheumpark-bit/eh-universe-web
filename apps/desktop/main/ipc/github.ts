/**
 * apps/desktop/main/ipc/github.ts
 *
 * GitHub REST API integration via personal access token.
 * Token stored in OS keychain via keystore (provider: 'github').
 *
 * PART 1 — API helpers
 * PART 2 — IPC handlers (repos, PRs, issues, actions)
 */

import { ipcMain } from 'electron';
import { getKey } from './keystore';

// ============================================================
// PART 1 — GitHub API helpers
// ============================================================

const GITHUB_API = 'https://api.github.com';
const TIMEOUT_MS = 15_000;

async function ghFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getKey('github');
  if (!token) throw new Error('No GitHub token configured. Add one in Settings.');

  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers as Record<string, string> ?? {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function ghJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await ghFetch(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ============================================================
// PART 2 — IPC handlers
// ============================================================

let registered = false;

export function registerGithubIpc(): void {
  if (registered) return;
  registered = true;

  // ── User ────────────────────────────────────────────────
  ipcMain.handle('github:user', async () => {
    try {
      return await ghJson<{ login: string; name: string; avatar_url: string }>('/user');
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // ── Repos ───────────────────────────────────────────────
  ipcMain.handle('github:list-repos', async (_event, opts?: { per_page?: number; sort?: string }) => {
    try {
      const perPage = opts?.per_page ?? 30;
      const sort = opts?.sort ?? 'updated';
      return await ghJson<unknown[]>(`/user/repos?per_page=${perPage}&sort=${sort}`);
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle('github:get-repo', async (_event, owner: string, repo: string) => {
    try {
      return await ghJson(`/repos/${owner}/${repo}`);
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // ── Pull Requests ───────────────────────────────────────
  ipcMain.handle('github:list-prs', async (_event, owner: string, repo: string, state?: string) => {
    try {
      return await ghJson(`/repos/${owner}/${repo}/pulls?state=${state ?? 'open'}&per_page=30`);
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle('github:create-pr', async (_event, owner: string, repo: string, data: {
    title: string; head: string; base: string; body?: string; draft?: boolean;
  }) => {
    try {
      return await ghJson(`/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // ── Issues ──────────────────────────────────────────────
  ipcMain.handle('github:list-issues', async (_event, owner: string, repo: string, state?: string) => {
    try {
      return await ghJson(`/repos/${owner}/${repo}/issues?state=${state ?? 'open'}&per_page=30`);
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle('github:create-issue', async (_event, owner: string, repo: string, data: {
    title: string; body?: string; labels?: string[];
  }) => {
    try {
      return await ghJson(`/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // ── Actions ─────────────────────────────────────────────
  ipcMain.handle('github:list-runs', async (_event, owner: string, repo: string) => {
    try {
      return await ghJson(`/repos/${owner}/${repo}/actions/runs?per_page=10`);
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // ── Clone URL ───────────────────────────────────────────
  ipcMain.handle('github:clone-url', async (_event, owner: string, repo: string) => {
    try {
      const token = await getKey('github');
      if (!token) return { error: 'No GitHub token' };
      return { url: `https://${token}@github.com/${owner}/${repo}.git` };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
}
