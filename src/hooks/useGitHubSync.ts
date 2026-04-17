"use client";

// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { GitHubSyncConfig, GitHubFile, GitHubFileEntry, GitHubRepo } from '@/lib/github-sync';
import {
  getFile,
  putFile,
  listFiles,
  listRepos,
  createRepo,
  listBranches,
  createBranch,
  switchBranch as switchBranchApi,
} from '@/lib/github-sync';

const STORAGE_KEY_CONFIG = 'noa-github-config';
const STORAGE_KEY_SHA_MAP = 'noa-github-sha-map';

interface ShaMap {
  [path: string]: string;
}

export interface UseGitHubSyncReturn {
  connected: boolean;
  config: GitHubSyncConfig | null;
  syncing: boolean;
  lastSyncAt: number | null;
  error: string | null;
  repos: GitHubRepo[];
  connect: (token: string) => Promise<GitHubRepo[]>;
  selectRepo: (owner: string, repo: string, branch?: string) => void;
  disconnect: () => void;
  saveFile: (path: string, content: string, message?: string) => Promise<string | null>;
  loadFile: (path: string) => Promise<GitHubFile | null>;
  listEpisodes: (dirPath?: string) => Promise<GitHubFileEntry[]>;
  checkConflict: (path: string) => Promise<boolean>;
  createNewRepo: (name: string) => Promise<{ owner: string; name: string } | null>;
  /** Switch to a different branch, reloading sha map. */
  switchBranch: (branch: string) => Promise<boolean>;
  /** Create a new branch from the current HEAD. */
  createBranchFromCurrent: (name: string) => Promise<boolean>;
  /** Fetch the list of branches in the repository. */
  getBranches: () => Promise<string[]>;
}

// ============================================================
// PART 2 — Persistence Helpers
// ============================================================

function loadStoredConfig(): GitHubSyncConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return null;
    return JSON.parse(raw) as GitHubSyncConfig;
  } catch (err) {
    logger.warn('GitHubSync', 'loadStoredConfig parse failed', err);
    return null;
  }
}

function saveStoredConfig(config: GitHubSyncConfig | null): void {
  if (typeof window === 'undefined') return;
  if (config) {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } else {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
  }
}

function loadShaMap(): ShaMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHA_MAP);
    if (!raw) return {};
    return JSON.parse(raw) as ShaMap;
  } catch (err) {
    logger.warn('GitHubSync', 'loadShaMap parse failed', err);
    return {};
  }
}

function saveShaMap(map: ShaMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SHA_MAP, JSON.stringify(map));
}

// ============================================================
// PART 3 — Hook Implementation
// ============================================================

export function useGitHubSync(): UseGitHubSyncReturn {
  const [config, setConfig] = useState<GitHubSyncConfig | null>(() => loadStoredConfig());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const shaMapRef = useRef<ShaMap>(loadShaMap());

  // Sync config to localStorage on change
  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  const connected = config !== null && Boolean(config.owner) && Boolean(config.repo);

  /** Step 1: Provide a token and fetch accessible repos. */
  const connect = useCallback(async (token: string): Promise<GitHubRepo[]> => {
    setError(null);
    try {
      const repoList = await listRepos(token);
      setRepos(repoList);
      // Store a partial config with the token (no repo selected yet)
      setConfig({ token, owner: '', repo: '' });
      return repoList;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      setError(msg);
      return [];
    }
  }, []);

  /** Step 2: After listing repos, select one. */
  const selectRepo = useCallback(
    (owner: string, repo: string, branch?: string) => {
      setConfig((prev) => {
        if (!prev) return null;
        return { ...prev, owner, repo, branch: branch ?? 'main' };
      });
      // Reset sha map for new repo
      shaMapRef.current = {};
      saveShaMap({});
      setError(null);
    },
    [],
  );

  /** Disconnect: clear all stored state. */
  const disconnect = useCallback(() => {
    setConfig(null);
    setRepos([]);
    shaMapRef.current = {};
    saveShaMap({});
    setLastSyncAt(null);
    setError(null);
  }, []);

  /** Save (create/update) a file with sha tracking. */
  const saveFile = useCallback(
    async (path: string, content: string, message?: string): Promise<string | null> => {
      if (!config || !config.owner || !config.repo) {
        setError('Not connected to a repository');
        return null;
      }
      setSyncing(true);
      setError(null);
      try {
        const existingSha = shaMapRef.current[path];
        const result = await putFile(config, path, content, existingSha, message);
        shaMapRef.current[path] = result.sha;
        saveShaMap(shaMapRef.current);
        setLastSyncAt(Date.now());
        return result.sha;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save file';
        setError(msg);
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [config],
  );

  /** Load a file and cache its sha. */
  const loadFile = useCallback(
    async (path: string): Promise<GitHubFile | null> => {
      if (!config || !config.owner || !config.repo) {
        setError('Not connected to a repository');
        return null;
      }
      setSyncing(true);
      setError(null);
      try {
        const file = await getFile(config, path);
        if (file) {
          shaMapRef.current[file.path] = file.sha;
          saveShaMap(shaMapRef.current);
        }
        return file;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load file';
        setError(msg);
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [config],
  );

  /** List episodes under a directory (defaults to 'volumes/'). */
  const listEpisodes = useCallback(
    async (dirPath?: string): Promise<GitHubFileEntry[]> => {
      if (!config || !config.owner || !config.repo) return [];
      try {
        return await listFiles(config, dirPath ?? 'volumes');
      } catch (err) {
        logger.warn('GitHubSync', 'listEpisodes failed', err);
        return [];
      }
    },
    [config],
  );

  /**
   * Check whether the remote sha differs from the local cached sha.
   * Returns true if there is a conflict (remote changed since last sync).
   */
  const checkConflict = useCallback(
    async (path: string): Promise<boolean> => {
      if (!config || !config.owner || !config.repo) return false;
      try {
        const remote = await getFile(config, path);
        if (!remote) return false; // file doesn't exist remotely — no conflict
        const localSha = shaMapRef.current[path];
        if (!localSha) return false; // never synced — treat as no conflict
        return remote.sha !== localSha;
      } catch (err) {
        logger.warn('GitHubSync', 'checkConflict failed — treating as conflict for safety', err);
        return true; // 안전 방향: 충돌 있다고 가정
      }
    },
    [config],
  );

  // ============================================================
  // PART 4 — Branch Operations (Phase 6)
  // ============================================================

  /** Switch to a different branch and reset the local sha map. */
  const switchBranchFn = useCallback(
    async (branch: string): Promise<boolean> => {
      if (!config || !config.owner || !config.repo) {
        setError('Not connected to a repository');
        return false;
      }
      setError(null);
      setSyncing(true);
      try {
        const newConfig = await switchBranchApi(config, branch);
        setConfig(newConfig);
        // Reset sha map when switching branches
        shaMapRef.current = {};
        saveShaMap({});
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to switch branch';
        setError(msg);
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [config],
  );

  /** Create a new branch from the current HEAD. */
  const createBranchFromCurrent = useCallback(
    async (name: string): Promise<boolean> => {
      if (!config || !config.owner || !config.repo) {
        setError('Not connected to a repository');
        return false;
      }
      setError(null);
      try {
        await createBranch(config, name);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create branch';
        setError(msg);
        return false;
      }
    },
    [config],
  );

  /** Fetch the list of branches in the repository. */
  const getBranches = useCallback(
    async (): Promise<string[]> => {
      if (!config || !config.owner || !config.repo) return [];
      try {
        return await listBranches(config);
      } catch (err) {
        logger.warn('GitHubSync', 'getBranches failed', err);
        return [];
      }
    },
    [config],
  );

  /** Create a new private repo and auto-select it. */
  const createNewRepo = useCallback(
    async (name: string): Promise<{ owner: string; name: string } | null> => {
      if (!config?.token) {
        setError('No token available');
        return null;
      }
      setError(null);
      try {
        const result = await createRepo(config.token, name);
        selectRepo(result.owner, result.name);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create repo';
        setError(msg);
        return null;
      }
    },
    [config?.token, selectRepo],
  );

  return {
    connected,
    config,
    syncing,
    lastSyncAt,
    error,
    repos,
    connect,
    selectRepo,
    disconnect,
    saveFile,
    loadFile,
    listEpisodes,
    checkConflict,
    createNewRepo,
    switchBranch: switchBranchFn,
    createBranchFromCurrent,
    getBranches,
  };
}

// IDENTITY_SEAL: PART-4 | role=useGitHubSync | inputs=user actions | outputs=sync state+file+branch ops
