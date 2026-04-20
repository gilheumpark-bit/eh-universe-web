'use client';

// ============================================================
// useStudioMounts — M1.5.1~M1.5.2 StudioShell 마운트 래퍼 훅
// ============================================================
//
// M1.1~M1.4 3 UI 컴포넌트 조건부 연결 + M1.5.2 Shadow 쓰기 어댑터 제공.
// FEATURE_JOURNAL_ENGINE='off' 기본값에서는 모든 훅 내부 로직이 비활성이며,
// UI는 렌더되지만 동작하지 않는다 (Banner null, Dialog 열림 없음, Shadow 쓰기 0건).
//
// [C] SSR 가드 / 훅 시그니처 안정 (enabled toggle만 내부로 전달)
// [G] useMemo 없이 얇은 패스스루 — 훅 내부가 이미 최적화
// [K] 외부 의존성 0 — 훅을 하나로 묶는 것만
//
// 원칙:
//   - useAutoSave는 여기서 절대 호출 금지 (M1.5.4 primary 승격 범위)
//   - useShadowProjectWriter 는 Shadow 쓰기 전용 — 'off' 상태에서는 내부 no-op
//   - 기존 저장 경로(project-migration)는 건드리지 않음
//   - flag off일 때 useMultiTab은 enabled:false라 leader-election 관찰 안 함
//     → 탭 상태 불필요, Banner는 내부 조건(isLeader && followerCount<=0)으로 자연 숨김
//
// @module hooks/useStudioMounts

// ============================================================
// PART 1 — Imports & types
// ============================================================

import { useMemo } from 'react';
import {
  isJournalEngineActive,
  isJournalEngineOn,
} from '@/lib/feature-flags';
import { useRecovery, type UseRecoveryResult } from '@/hooks/useRecovery';
import { useMultiTab, type UseMultiTabResult } from '@/hooks/useMultiTab';
import {
  useShadowProjectWriter,
  type UseShadowProjectWriterResult,
} from '@/hooks/useShadowProjectWriter';
import type { AppLanguage } from '@/lib/studio-types';

export interface UseStudioMountsOptions {
  /** 토스트/배너 언어. */
  language: AppLanguage | string;
  /** 현재 활성 프로젝트 id — Shadow 쓰기 메타데이터용 (선택). */
  projectId?: string | null;
  /** 현재 활성 세션 id — Shadow 쓰기 메타데이터용 (선택). */
  sessionId?: string | null;
}

export interface UseStudioMountsResult {
  /** 저널 엔진이 활성(shadow 또는 on)인가. UI 가시성 판단용. */
  journalActive: boolean;
  /** 저널 엔진이 primary(on)로 승격됐는가. 향후 autosave 연결 분기용. */
  journalOn: boolean;
  /** 복구 결과/Dialog 상태 (flag off 시 inert — enabled:false). */
  recovery: UseRecoveryResult;
  /** 멀티탭 Leader/Follower 정보 (flag off 시 inert — enabled:false). */
  multiTab: UseMultiTabResult;
  /** [M1.5.2] Shadow 쓰기 어댑터. useProjectManager 의 onSaveComplete 에 주입. */
  shadowWriter: UseShadowProjectWriterResult;
}

// ============================================================
// PART 2 — Hook
// ============================================================

/**
 * StudioShell이 필요한 M1.2/M1.3 훅 + M1.5.2 Shadow 쓰기 어댑터를 한 번에 제공.
 * BackupNowButton은 항상 표시되므로 이 훅과 무관.
 */
export function useStudioMounts(options: UseStudioMountsOptions): UseStudioMountsResult {
  const { language, projectId = null, sessionId = null } = options;

  // flag off에서는 enabled:false → 훅 내부 로직 우회.
  // isJournalEngineActive()는 localStorage를 읽으므로 SSR-safe 가드는 훅 내부에 있음.
  const active = isJournalEngineActive();
  const on = isJournalEngineOn();

  const recovery = useRecovery({
    enabled: active,
    language,
  });

  const multiTab = useMultiTab({
    enabled: active,
  });

  // [M1.5.2] Shadow 쓰기 — flag 'shadow' 또는 'on' 일 때만 callback 내부에서 실제 쓰기.
  // 'off' 에서는 onPrimarySaveComplete 호출 시에도 즉시 return (no-op).
  const shadowWriter = useShadowProjectWriter({ projectId, sessionId });

  return useMemo<UseStudioMountsResult>(
    () => ({
      journalActive: active,
      journalOn: on,
      recovery,
      multiTab,
      shadowWriter,
    }),
    [active, on, recovery, multiTab, shadowWriter],
  );
}

// IDENTITY_SEAL: PART-1..2 | role=studio-mounts-hook | inputs=language+ids | outputs=recovery+multiTab+shadowWriter
