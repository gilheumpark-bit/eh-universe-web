"use client";

// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
import { storeToken, loadToken, clearToken } from '@/lib/github-token-vault';
import { showAlert } from '@/lib/show-alert';

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
// [D1-pat-security] PAT 평문 localStorage 저장 해소.
// - localStorage `noa-github-config` = 메타데이터만 (owner/repo/branch).
//   token 필드는 직렬화 형태에 존재 자체가 없다 — 백업 번들·storage 덤프·
//   cert/이벤트/Firestore가 이 키를 퍼가도 토큰은 미포함 (구조적 가드).
// - token = github-token-vault (AES-GCM + IndexedDB non-extractable 키).
// - XSS 한계 정직 표기: 동일 디바이스 코드 실행(XSS·악성 확장)에는 무력 —
//   at-rest 평문 노출만 차단. 상위안 = httpOnly 쿠키 + 서버 프록시
//   (상세: src/lib/github-token-vault.ts 헤더 주석).

/** 디스크에 영속되는 형태 — token 필드 금지. */
interface StoredConfigMeta {
  owner: string;
  repo: string;
  branch?: string;
}

async function loadStoredConfig(): Promise<GitHubSyncConfig | null> {
  if (typeof window === 'undefined') return null;

  let meta: StoredConfigMeta | null = null;
  let legacyPlaintextToken: string | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConfigMeta & { token?: unknown };
    if (typeof parsed.token === 'string' && parsed.token.length > 0) {
      legacyPlaintextToken = parsed.token; // 구버전 평문 토큰 발견
    }
    meta = {
      owner: typeof parsed.owner === 'string' ? parsed.owner : '',
      repo: typeof parsed.repo === 'string' ? parsed.repo : '',
      ...(typeof parsed.branch === 'string' ? { branch: parsed.branch } : {}),
    };
  } catch (err) {
    logger.warn('GitHubSync', 'loadStoredConfig parse failed', err);
    return null;
  }

  // [마이그레이션] 평문 발견 → 즉시 암호화 재저장 + 평문 삭제.
  // 암호화 영속이 실패해도 평문은 무조건 지운다 (안전 방향 — 최악 케이스는
  // 다음 세션 재연결이지 평문 잔존이 아니다).
  if (legacyPlaintextToken) {
    const persisted = await storeToken(legacyPlaintextToken);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(meta));
    } catch (err) {
      logger.warn('GitHubSync', 'plaintext token migration rewrite failed', err);
    }
    if (!persisted) {
      logger.warn('GitHubSync', 'token migrated to memory only — re-connect needed next session');
    }
    return { token: legacyPlaintextToken, ...meta };
  }

  const token = await loadToken();
  if (!token) {
    // 토큰 없는 메타데이터는 동작 불능 — 연결 해제 상태로 정리해 재연결 유도
    try {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    } catch { /* noop */ }
    return null;
  }
  return { token, ...meta };
}

async function saveStoredConfig(config: GitHubSyncConfig | null): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!config) {
    try {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    } catch { /* noop */ }
    await clearToken();
    return;
  }
  // 명시적 필드 구성 — config 객체를 통째로 직렬화하지 않는다 (token 미포함 가드)
  const meta: StoredConfigMeta = {
    owner: config.owner,
    repo: config.repo,
    ...(config.branch ? { branch: config.branch } : {}),
  };
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(meta));
  } catch (err) {
    logger.warn('GitHubSync', 'saveStoredConfig meta write failed', err);
  }
  if (config.token) {
    await storeToken(config.token);
  } else {
    await clearToken();
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
  // [D1-pat-security] 초기값 null — vault 복호화가 비동기라 동기 초기화 불가.
  // 저장된 연결이 있으면 아래 hydration effect가 수 ms 내 config를 채운다
  // (connected false → true 전환은 기존 consumer들이 이미 effect로 처리).
  const [config, setConfig] = useState<GitHubSyncConfig | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const shaMapRef = useRef<ShaMap>(loadShaMap());
  const hydratedRef = useRef(false);

  // Hydrate config from storage (meta) + vault (decrypted token)
  useEffect(() => {
    let cancelled = false;
    void loadStoredConfig().then((loaded) => {
      if (cancelled) return;
      hydratedRef.current = true;
      // 사용자가 hydration 완료 전에 connect 했다면 그 값이 우선 (prev 유지)
      if (loaded) setConfig((prev) => prev ?? loaded);
    });
    return () => { cancelled = true; };
  }, []);

  // Sync config to storage on change (meta → localStorage, token → vault)
  useEffect(() => {
    // hydration 전 초기 null 저장으로 기존 설정/vault를 지우는 것 방지
    if (!hydratedRef.current && config === null) return;
    hydratedRef.current = true;
    void saveStoredConfig(config);
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
      // [D1-pat-security] 누출 가드 — PAT가 GitHub 파일/commit message
      // 직렬화 경로에 절대 포함되지 않게 전송 직전 차단 (실패 비침묵).
      if (
        config.token &&
        (content.includes(config.token) || (message !== undefined && message.includes(config.token)))
      ) {
        const leakMsg = 'Blocked: GitHub token detected in file content or commit message';
        logger.error('GitHubSync', leakMsg);
        showAlert('GitHub 토큰이 저장 내용에 포함되어 업로드를 차단했습니다', 'error');
        setError(leakMsg);
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

  // [R-01 root fix — 2026-05-12] return useMemo 안정화 — caller (useGitHubAutoSync 등)
  // 의 deps churn 차단. 모든 callback 은 useCallback 이므로 deps 안정.
  return useMemo<UseGitHubSyncReturn>(() => ({
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
  }), [connected, config, syncing, lastSyncAt, error, repos, connect, selectRepo, disconnect, saveFile, loadFile, listEpisodes, checkConflict, createNewRepo, switchBranchFn, createBranchFromCurrent, getBranches]);
}

// IDENTITY_SEAL: PART-4 | role=useGitHubSync | inputs=user actions | outputs=sync state+file+branch ops
