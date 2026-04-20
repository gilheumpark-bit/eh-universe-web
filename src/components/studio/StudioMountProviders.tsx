'use client';

// ============================================================
// StudioMountProviders — M1.5.1 마운트 래퍼 (UI only, no logic)
// ============================================================
//
// RecoveryProvider로 children을 감싸고, RecoveryProvider 내부에서
// context의 visible/result를 구독해 RecoveryDialog를 렌더한다.
//
// 기능은 비활성(FEATURE_JOURNAL_ENGINE='off'). 이 컴포넌트는 마운트 뼈대만
// 담당하고, 실제 복구 트리거는 useRecovery가 flag 'shadow'/'on'일 때만 동작한다.
//
// [C] Provider가 항상 마운트되어 깊이 있는 Consumer(hooks) SSR-safe
// [G] Dialog 내부 파생값은 자체 memo — 이 래퍼는 단순 패스스루
// [K] 단일 책임 — Recovery 관련만. Banner/Button은 별도 위치에서 마운트.
//
// @module components/studio/StudioMountProviders

// ============================================================
// PART 1 — Imports
// ============================================================

import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  RecoveryProvider,
  useRecoveryContext,
  type RecoveryDecision,
} from '@/contexts/RecoveryContext';
import type { AppLanguage } from '@/lib/studio-types';
import type { RecoveryResult } from '@/lib/save-engine/recovery';
import { logger } from '@/lib/logger';

// Dialog는 클라이언트 전용. 첫 로드 번들에서 제외.
const RecoveryDialog = dynamic(
  () => import('@/components/studio/RecoveryDialog'),
  { ssr: false },
);

// ============================================================
// PART 2 — Props
// ============================================================

export interface StudioMountProvidersProps {
  /** 대화상자 라벨 언어. */
  language: AppLanguage | string;
  /**
   * 사용자 선택 콜백.
   * M1.5.1 단계에서는 호출 경로 없음 — useRecovery가 flag 'shadow'/'on'일 때만
   * 대화상자를 열고 이 콜백이 호출된다. flag off에서는 dead code.
   */
  onRecoveryDecision?: (
    decision: RecoveryDecision,
    result: RecoveryResult | null,
  ) => void;
  children: React.ReactNode;
}

// ============================================================
// PART 3 — Internal Dialog host (Context 소비 전용)
// ============================================================

interface RecoveryDialogHostProps {
  language: AppLanguage | string;
}

/**
 * Provider 내부에서만 사용. context의 visible/result를 구독하고
 * 선택이 이뤄지면 resolve 호출 → Provider가 onDecision으로 전파.
 */
const RecoveryDialogHost: React.FC<RecoveryDialogHostProps> = ({ language }) => {
  const { visible, result, resolve, closeRecoveryDialog } = useRecoveryContext();

  const handleDecide = useCallback(
    (decision: RecoveryDecision) => {
      try {
        resolve(decision);
      } catch (err) {
        // resolve 내부 콜백이 throw해도 Dialog는 닫혀야 함.
        logger.warn('StudioMountProviders', 'resolve threw', err);
      }
    },
    [resolve],
  );

  const handleClose = useCallback(() => {
    closeRecoveryDialog();
  }, [closeRecoveryDialog]);

  // Dialog 자체가 open=false일 때 null 반환하므로 여기서 조건부 렌더 불필요.
  return (
    <RecoveryDialog
      open={visible}
      result={result}
      language={language}
      onDecide={handleDecide}
      onClose={handleClose}
    />
  );
};

// ============================================================
// PART 4 — Public component
// ============================================================

/**
 * Studio 트리에 RecoveryProvider를 씌우고 내부에 Dialog 호스트를 둔다.
 * Banner/Button은 이 래퍼 밖에서 직접 마운트(역할 분리).
 */
export const StudioMountProviders: React.FC<StudioMountProvidersProps> = ({
  language,
  onRecoveryDecision,
  children,
}) => {
  return (
    <RecoveryProvider onDecision={onRecoveryDecision}>
      {children}
      <RecoveryDialogHost language={language} />
    </RecoveryProvider>
  );
};

export default StudioMountProviders;

// IDENTITY_SEAL: PART-1..4 | role=mount-providers | inputs=language+onDecision | outputs=JSX(provider+dialog)
