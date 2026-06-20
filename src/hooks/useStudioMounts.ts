'use client';

// ============================================================
// useStudioMounts — M1.5.1~M1.5.5 StudioShell 마운트 래퍼 훅
// ============================================================
//
// M1.1~M1.4 3 UI 컴포넌트 조건부 연결 + M1.5.2 Shadow 쓰기 어댑터 +
// M1.5.3 탭별 다중 operation Shadow 쓰기 (sessionId forwarding) +
// M1.5.5 Primary Writer (flag 'on' journal primary + legacy mirror).
//
// FEATURE_JOURNAL_ENGINE='off'/'shadow' 기본값에서는 Primary 경로가 legacy 그대로.
// 'on' 으로 전환되면 usePrimaryWriter 가 journal 엔진으로 Primary 저장.
// 어떤 flag 상태든 UI 동작은 동일하며, 사용자 편집분은 100% 보존된다.
//
// [C] SSR 가드 / 훅 시그니처 안정 (enabled toggle만 내부로 전달)
// [G] useMemo 없이 얇은 패스스루 — 훅 내부가 이미 최적화
// [K] 외부 의존성 0 — 훅을 하나로 묶는 것만
//
// 원칙:
//   - useAutoSave는 여기서 절대 호출 금지 (별개 범위)
//   - useShadowProjectWriter 는 Shadow 쓰기 전용 — 'off' 상태에서는 내부 no-op
//   - usePrimaryWriter 는 flag 'on' 시 journal Primary — 'off'/'shadow' 는 legacy 패스스루
//   - 기존 저장 경로(project-migration / indexeddb-backup)는 건드리지 않음
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
import { saveProjects } from '@/lib/project-migration';
import { useRecovery, type UseRecoveryResult } from '@/hooks/useRecovery';
import { useMultiTab, type UseMultiTabResult } from '@/hooks/useMultiTab';
import {
  useShadowProjectWriter,
  type UseShadowProjectWriterResult,
} from '@/hooks/useShadowProjectWriter';
import {
  useJournalEngineMode,
  type UseJournalEngineModeResult,
} from '@/hooks/useJournalEngineMode';
import {
  usePrimaryWriter,
  type PrimaryWriterAPI,
} from '@/hooks/usePrimaryWriter';
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
  /** [M1.5.4] Journal Engine 모드 상태 + 승격/다운그레이드 컨트롤. */
  journalEngineMode: UseJournalEngineModeResult;
  /** [M1.5.5] Primary Writer — useProjectManager 의 primaryWriteFn 에 주입. */
  primaryWriter: PrimaryWriterAPI;
}

// ============================================================
// PART 2 — Hook
// ============================================================

/**
 * StudioShell 이 필요한 M1.2/M1.3 훅 + M1.5.2 Shadow 쓰기 어댑터 +
 * M1.5.4 Journal Engine Mode 컨트롤 + M1.5.5 Primary Writer 를 한 번에 제공.
 *
 * 사용처 (StudioShell / useProjectManager 연결):
 * ```ts
 * const mounts = useStudioMounts({ language, projectId, sessionId });
 * const pm = useProjectManager(language, uid, {
 *   onSaveComplete: mounts.shadowWriter.onPrimarySaveCompleteMulti, // M1.5.3
 *   primaryWriteFn: mounts.primaryWriter.write,                      // M1.5.5
 * });
 * ```
 *
 * BackupNowButton 은 항상 표시되므로 이 훅과 무관.
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

  // [M1.5.2/M1.5.3] Shadow 쓰기 — flag 'shadow' 또는 'on' 일 때만 callback 내부에서 실제 쓰기.
  // 'off' 에서는 onPrimarySaveComplete* 호출 시에도 즉시 return (no-op).
  // sessionId 는 탭별 payload 추출 기준 — useShadowProjectWriter 내부 ref 로 추적.
  const shadowWriter = useShadowProjectWriter({ projectId, sessionId });

  // [M1.5.4] Journal Engine mode — Primary 스왑 시 downgrade 트리거 용도.
  const journalEngineMode = useJournalEngineMode();

  // [M1.5.5] Primary Writer — flag 'on' 시 journal Primary + legacy Mirror.
  // 'off'/'shadow' 에서는 legacySaveFn 직접 호출 (기존 동작과 동일).
  // journal 실패 → legacy fallback + onDowngradeNeeded(downgradeNow) 호출.
  const primaryWriter = usePrimaryWriter({
    legacySaveFn: saveProjects,
    onDowngradeNeeded: (reason) => {
      void journalEngineMode.downgradeNow(reason);
    },
  });

  return useMemo<UseStudioMountsResult>(
    () => ({
      journalActive: active,
      journalOn: on,
      recovery,
      multiTab,
      shadowWriter,
      journalEngineMode,
      primaryWriter,
    }),
    [active, on, recovery, multiTab, shadowWriter, journalEngineMode, primaryWriter],
  );
}

// IDENTITY_SEAL: PART-1..2 | role=studio-mounts-hook | inputs=language+ids | outputs=recovery+multiTab+shadow+mode+primary
