"use client";

// ============================================================
// useGitHubAutoSync — 원고 자동 GitHub commit
// ============================================================
// useGitHubSync 위에 얹는 자동 동기화 레이어.
// localStorage `noa-github-autosync` 플래그가 'true' + GitHub 연결 시
// manuscripts 배열 변화 감지 → debounce → 에피소드별 saveFile 호출.
//
// 약속: README/landing의 "GitHub 자동 백업" 문구의 실제 구현체.
// 이전 상태: useGitHubSync 만 있고 호출자 0 — wiring 없음.
// 현재 상태: ManuscriptTab + BackupsSection 토글 → 이 hook 으로 자동 commit 트리거.
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { useGitHubSync } from './useGitHubSync';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export interface UseGitHubAutoSyncOptions {
  /** localStorage 'noa-github-autosync' 등의 외부 플래그를 그대로 전달 */
  enabled: boolean;
  /** 동기화 대상 — config.manuscripts 와 동일 형태 */
  manuscripts: ReadonlyArray<{ episode: number; title?: string; content: string }>;
  /** commit message 에 들어갈 프로젝트 제목 */
  projectTitle: string;
  /** debounce — 마지막 변경 후 N ms 뒤 push (기본 30초, GitHub rate limit 5000/h 여유) */
  debounceMs?: number;
}

export interface UseGitHubAutoSyncReturn {
  /** GitHub API 호출 중 */
  syncing: boolean;
  /** 마지막 commit 성공 시각 (ms epoch) */
  lastSyncAt: number | null;
  /** 마지막 에러 메시지 (transient) */
  error: string | null;
  /** 수동 즉시 push (debounce 무시) — UI 버튼에서 호출 */
  pushNow: () => Promise<void>;
  /** GitHub 연결 여부 (config.token + repo 둘 다 있음) */
  connected: boolean;
}

const STORAGE_KEY_AUTOSYNC = 'noa-github-autosync';
const DEFAULT_DEBOUNCE_MS = 30_000;

// ============================================================
// PART 2 — localStorage helpers (export — Settings 토글 + ManuscriptTab 표시 공용)
// ============================================================

export function isGitHubAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY_AUTOSYNC) === 'true';
  } catch {
    return false;
  }
}

export function setGitHubAutoSyncEnabled(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_AUTOSYNC, String(value));
    // 다른 탭/컴포넌트가 storage 이벤트로 동기화할 수 있도록 dispatch
    window.dispatchEvent(new CustomEvent('noa:github-autosync-changed', { detail: { enabled: value } }));
  } catch {
    /* quota / private — 무시 */
  }
}

// ============================================================
// PART 3 — Hook
// ============================================================

export function useGitHubAutoSync(opts: UseGitHubAutoSyncOptions): UseGitHubAutoSyncReturn {
  const gh = useGitHubSync();
  // 에피소드별 마지막 push 본문 캐시 — 동일 내용 중복 commit 방지
  const lastPushedRef = useRef<Map<number, string>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  /**
   * 변경된 에피소드만 푸시. 빈 content (글자 0) 는 skip.
   * [C] 한 에피소드 실패해도 나머지 계속 시도 (Promise.allSettled 대안)
   * [G] sequential await — GitHub rate limit 안정성 우선 (parallel 시 5xx 빈도 증가)
   */
  const pushManuscripts = useCallback(async (): Promise<void> => {
    if (!gh.connected) return;
    for (const ms of opts.manuscripts) {
      if (!ms.content || ms.content.trim().length === 0) continue;
      if (lastPushedRef.current.get(ms.episode) === ms.content) continue;
      const path = `volumes/episode-${String(ms.episode).padStart(3, '0')}.md`;
      const ts = new Date().toISOString();
      const message = `[autosync] ${opts.projectTitle} EP.${ms.episode} — ${ts}`;
      try {
        const sha = await gh.saveFile(path, ms.content, message);
        if (sha) {
          lastPushedRef.current.set(ms.episode, ms.content);
        }
      } catch (err) {
        logger.warn('useGitHubAutoSync', `push failed episode=${ms.episode}`, err);
      }
    }
  }, [gh, opts.manuscripts, opts.projectTitle]);

  // ============================================================
  // PART 4 — Debounce trigger
  // ============================================================

  useEffect(() => {
    if (!opts.enabled || !gh.connected) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void pushManuscripts();
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [opts.enabled, gh.connected, opts.manuscripts, debounceMs, pushManuscripts]);

  return {
    syncing: gh.syncing,
    lastSyncAt: gh.lastSyncAt,
    error: gh.error,
    pushNow: pushManuscripts,
    connected: gh.connected,
  };
}

// IDENTITY_SEAL: useGitHubAutoSync | role=auto-commit-debounce | inputs=manuscripts+enabled | outputs=lastSyncAt+pushNow
