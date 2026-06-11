/**
 * useGitHubSync.test.tsx — D1-pat-security 회귀 방지 (hook 저장/로드 경로)
 *
 * 검증:
 *  - 레거시 평문 token(localStorage noa-github-config) → 즉시 암호화
 *    마이그레이션 + 평문 삭제 + 세션 내 connected 유지
 *  - 새 영속 형태: 메타데이터에 token 필드 자체가 없음 (구조적 가드)
 *  - saveFile 누출 가드: PAT 포함 content/commit message 는 putFile 전 차단
 *  - disconnect: 메타 + vault 레코드 전부 제거
 */

// [C] structuredClone polyfill — fake-indexeddb 호환
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
if (typeof (globalThis as { CryptoKey?: unknown }).CryptoKey === 'undefined') {
  (globalThis as { CryptoKey?: unknown }).CryptoKey =
    (webcrypto as unknown as { CryptoKey: unknown }).CryptoKey;
}

import { renderHook, waitFor, act } from '@testing-library/react';

jest.mock('@/lib/github-sync', () => ({
  getFile: jest.fn(),
  putFile: jest.fn().mockResolvedValue({ sha: 'sha-new' }),
  listFiles: jest.fn().mockResolvedValue([]),
  listRepos: jest.fn().mockResolvedValue([]),
  createRepo: jest.fn(),
  listBranches: jest.fn().mockResolvedValue([]),
  createBranch: jest.fn(),
  switchBranch: jest.fn(),
}));

import { useGitHubSync } from '../useGitHubSync';
import { putFile } from '@/lib/github-sync';
import { clearToken } from '@/lib/github-token-vault';

const CONFIG_KEY = 'noa-github-config';
const VAULT_KEY = 'noa-github-token-vault';
const TOKEN = 'ghp_LEGACY_PLAINTEXT_token_42';

describe('useGitHubSync — PAT vault 저장/로드 경로', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearToken();
    jest.clearAllMocks();
  });

  it('레거시 평문 token — 마이그레이션 (암호화 재저장 + 평문 삭제 + 연결 유지)', async () => {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({ token: TOKEN, owner: 'me', repo: 'novel', branch: 'main' }),
    );

    const { result } = renderHook(() => useGitHubSync());

    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(result.current.config?.token).toBe(TOKEN);
    expect(result.current.config?.owner).toBe('me');

    // 평문 즉시 삭제 — 메타데이터에 token 필드 자체가 없음
    await waitFor(() => {
      const raw = localStorage.getItem(CONFIG_KEY);
      expect(raw).toBeTruthy();
      expect(raw).not.toContain(TOKEN);
      const meta = JSON.parse(raw as string) as Record<string, unknown>;
      expect('token' in meta).toBe(false);
      expect(meta.owner).toBe('me');
      expect(meta.repo).toBe('novel');
    });

    // vault 에 암호화 레코드 존재 + 평문 미포함
    await waitFor(() => {
      const vault = localStorage.getItem(VAULT_KEY);
      expect(vault).toBeTruthy();
      expect(vault).not.toContain(TOKEN);
    });
  });

  it('암호화 영속 후 재마운트 — vault 복호로 연결 복원', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: TOKEN, owner: 'me', repo: 'novel' }));
    const first = renderHook(() => useGitHubSync());
    await waitFor(() => expect(first.result.current.connected).toBe(true));
    await waitFor(() => expect(localStorage.getItem(VAULT_KEY)).toBeTruthy());
    first.unmount();

    const second = renderHook(() => useGitHubSync());
    await waitFor(() => expect(second.result.current.connected).toBe(true));
    expect(second.result.current.config?.token).toBe(TOKEN);
  });

  it('saveFile 누출 가드 — content 에 PAT 포함 시 putFile 전 차단', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: TOKEN, owner: 'me', repo: 'novel' }));
    const { result } = renderHook(() => useGitHubSync());
    await waitFor(() => expect(result.current.connected).toBe(true));

    let sha: string | null = 'sentinel';
    await act(async () => {
      sha = await result.current.saveFile('ep-001.md', `본문 일부에 ${TOKEN} 가 섞임`);
    });
    expect(sha).toBeNull();
    expect(putFile).not.toHaveBeenCalled();
    expect(result.current.error).toContain('token');

    // 정상 content 는 통과
    await act(async () => {
      sha = await result.current.saveFile('ep-001.md', '깨끗한 본문');
    });
    expect(sha).toBe('sha-new');
    expect(putFile).toHaveBeenCalledTimes(1);
  });

  it('saveFile 누출 가드 — commit message 에 PAT 포함 시 차단', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: TOKEN, owner: 'me', repo: 'novel' }));
    const { result } = renderHook(() => useGitHubSync());
    await waitFor(() => expect(result.current.connected).toBe(true));

    let sha: string | null = 'sentinel';
    await act(async () => {
      sha = await result.current.saveFile('ep-001.md', '깨끗한 본문', `msg ${TOKEN}`);
    });
    expect(sha).toBeNull();
    expect(putFile).not.toHaveBeenCalled();
  });

  it('disconnect — 메타 + vault 레코드 전부 제거', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: TOKEN, owner: 'me', repo: 'novel' }));
    const { result } = renderHook(() => useGitHubSync());
    await waitFor(() => expect(result.current.connected).toBe(true));

    act(() => result.current.disconnect());
    await waitFor(() => {
      expect(result.current.connected).toBe(false);
      expect(localStorage.getItem(CONFIG_KEY)).toBeNull();
      expect(localStorage.getItem(VAULT_KEY)).toBeNull();
    });
  });

  it('vault 레코드 없는 메타데이터 — 연결 해제 상태로 정리 (재연결 유도)', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ owner: 'me', repo: 'novel' }));
    const { result } = renderHook(() => useGitHubSync());
    // hydration 완료까지 대기 — 토큰 없는 메타는 정리된다
    await waitFor(() => expect(localStorage.getItem(CONFIG_KEY)).toBeNull());
    expect(result.current.connected).toBe(false);
  });
});
