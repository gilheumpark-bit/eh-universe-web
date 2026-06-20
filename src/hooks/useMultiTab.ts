'use client';

// ============================================================
// useMultiTab — M1.3 Multi-tab state observation + promotion request
// ============================================================
//
// Studio UI가 Leader/Follower 상태를 관찰하고, Follower가 Leader로 승격을
// 요청할 수 있도록 연결. LeaderController를 내부적으로 acquire하고 React 생명
// 주기와 동기화.
//
// 사용 예:
//   const { isLeader, leaderTabId, followerCount, requestPromotion, conflicts } = useMultiTab();
//
// [C] SSR 가드 / dispose cleanup / 단일 acquire 보장 (useRef 센티넬)
// [G] info를 useState로만 관리 — 콜백 Set 재생성 X
// [K] Context 없이 self-contained (Studio가 원하는 위치에서 임의로 사용 가능)

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acquireLeaderController,
  type LeaderController,
  type LeaderInfo,
} from '@/lib/save-engine/leader-election';
import {
  getDefaultConflictDetector,
  type ConflictLogEntry,
} from '@/lib/save-engine/conflict-detector';

// ============================================================
// PART 1 — Types
// ============================================================

export interface UseMultiTabOptions {
  /** 기본 true. false면 hook이 controller를 acquire하지 않음 (테스트용). */
  enabled?: boolean;
  /** 충돌 로그 listener (noa:alert 중복 방지용 커스텀 핸들). */
  onConflict?: (entry: ConflictLogEntry) => void;
}

export interface UseMultiTabResult {
  /** 이 탭이 Leader인가. */
  isLeader: boolean;
  /** 현재 리더 tabId (없으면 null). */
  leaderTabId: string | null;
  /** 이 탭의 고유 id (ULID). */
  tabId: string | null;
  /** Follower 수 (자신 제외). -1 = Web Locks 경로라 알 수 없음. */
  followerCount: number;
  /** 마지막 역할 변경 시각 ms. */
  lastLeaderChange: number;
  /** 사용 중인 transport. */
  transport: LeaderInfo['transport'];
  /** 현재까지 감지된 conflict 로그 (새 항목 프론트). */
  conflicts: ConflictLogEntry[];
  /** Follower가 수동 승격을 요청. 2초 내 성공 여부. */
  requestPromotion: () => Promise<boolean>;
  /** conflict 로그 비우기. */
  clearConflicts: () => void;
}

// ============================================================
// PART 2 — Hook
// ============================================================

export function useMultiTab(options: UseMultiTabOptions = {}): UseMultiTabResult {
  const { enabled = true, onConflict } = options;
  const controllerRef = useRef<LeaderController | null>(null);
  const acquiredRef = useRef(false);
  const [info, setInfo] = useState<LeaderInfo | null>(null);
  const [conflicts, setConflicts] = useState<ConflictLogEntry[]>([]);

  useEffect(() => {
    if (!enabled) return;
    // SSR 가드 — window 필수.
    if (typeof window === 'undefined') return;
    if (acquiredRef.current) return;
    acquiredRef.current = true;

    const controller = acquireLeaderController();
    controllerRef.current = controller;

    // 초기 info는 비동기 setState로 — useEffect 내 동기 setState 경고 회피.
    const initialInfo = controller.getInfo();
    queueMicrotask(() => setInfo(initialInfo));

    const offInfo = controller.onInfoChange((next) => {
      setInfo(next);
    });

    const detector = getDefaultConflictDetector();
    const offConflict = detector.onConflict((entry) => {
      setConflicts((prev) => [entry, ...prev].slice(0, 50));
      onConflict?.(entry);
    });

    return () => {
      offInfo();
      offConflict();
      try { controller.dispose(); } catch { /* noop */ }
      controllerRef.current = null;
      acquiredRef.current = false;
    };
  }, [enabled, onConflict]);

  const requestPromotion = useCallback(async (): Promise<boolean> => {
    const c = controllerRef.current;
    if (!c) return false;
    return c.requestPromotion();
  }, []);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
    try { getDefaultConflictDetector().clear(); } catch { /* noop */ }
  }, []);

  return {
    isLeader: info?.isLeader ?? false,
    leaderTabId: info?.leaderTabId ?? null,
    tabId: info?.isLeader ? info.leaderTabId : (info?.leaderTabId ?? null),
    followerCount: info?.followerCount ?? 0,
    lastLeaderChange: info?.lastLeaderChange ?? 0,
    transport: info?.transport ?? 'single',
    conflicts,
    requestPromotion,
    clearConflicts,
  };
}
