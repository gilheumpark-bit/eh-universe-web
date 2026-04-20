'use client';

// ============================================================
// RecoveryContext — M1.2 크래시 복구 상태 관리
// ============================================================
//
// Studio 부팅 시 useRecovery가 runBootRecovery()를 실행하고, 결과가 사용자 개입
// 필요(크래시 복구)인 경우 이 Context에 저장하여 RecoveryDialog가 렌더되도록
// 한다. 선택(복구/버리기/둘 다 보존)은 Dialog에서 이 Context의 resolve 함수로
// 전달. 호출자(StudioShell/Phase 1.5)는 onDecision 콜백을 구독해 실제 state
// 주입을 처리.
//
// 설계 원칙:
//   - 이 Context는 Phase 1.2 단독 사용. project-migration.ts / useProjectManager.ts
//     는 건드리지 않음. 실제 state 주입은 호출자가 onDecision에서 선택적으로 연결.
//   - Provider가 없어도 안전하게 useRecoverySafe로 접근 가능 (빈 기본값).
//   - decision이 내려지면 Dialog는 자동 닫힘 (visible=false).

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { RecoveryResult } from '@/lib/save-engine/recovery';

// ============================================================
// PART 1 — 타입
// ============================================================

/** 사용자 선택 3가지. */
export type RecoveryDecision = 'restore' | 'discard' | 'keep-both';

export interface RecoveryContextValue {
  /** 복구 대화상자 표시 여부. */
  visible: boolean;
  /** 마지막 부팅 결과 (최초 부팅 전에는 null). */
  result: RecoveryResult | null;
  /** 사용자 선택 (미결정이면 null). */
  decision: RecoveryDecision | null;
  /**
   * 부팅 결과를 전달하고 필요 시 Dialog를 연다.
   * crashed 복구 또는 chainDamaged 상태에서만 표시 권장.
   */
  openRecoveryDialog: (result: RecoveryResult) => void;
  /** Dialog 닫기(선택 없이). */
  closeRecoveryDialog: () => void;
  /** 사용자 선택 기록 + Dialog 닫기. */
  resolve: (choice: RecoveryDecision) => void;
  /** 리셋 — 테스트/재부팅용. */
  reset: () => void;
}

// ============================================================
// PART 2 — Context 생성 & 기본값
// ============================================================

const DEFAULT_VALUE: RecoveryContextValue = {
  visible: false,
  result: null,
  decision: null,
  openRecoveryDialog: () => {},
  closeRecoveryDialog: () => {},
  resolve: () => {},
  reset: () => {},
};

const RecoveryContext = createContext<RecoveryContextValue>(DEFAULT_VALUE);

// ============================================================
// PART 3 — Provider
// ============================================================

export interface RecoveryProviderProps {
  children: ReactNode;
  /** 사용자 선택 콜백 — StudioShell 등 호출자가 상태 주입 결정. */
  onDecision?: (decision: RecoveryDecision, result: RecoveryResult | null) => void;
}

export function RecoveryProvider({ children, onDecision }: RecoveryProviderProps) {
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [decision, setDecision] = useState<RecoveryDecision | null>(null);

  const openRecoveryDialog = useCallback((next: RecoveryResult) => {
    setResult(next);
    setDecision(null);
    setVisible(true);
  }, []);

  const closeRecoveryDialog = useCallback(() => {
    setVisible(false);
  }, []);

  const resolve = useCallback(
    (choice: RecoveryDecision) => {
      setDecision(choice);
      setVisible(false);
      if (onDecision) {
        try {
          onDecision(choice, result);
        } catch {
          // 콜백 에러는 Dialog 흐름을 막지 않는다. (로그는 호출자 책임)
        }
      }
    },
    [onDecision, result],
  );

  const reset = useCallback(() => {
    setVisible(false);
    setResult(null);
    setDecision(null);
  }, []);

  const value = useMemo<RecoveryContextValue>(
    () => ({
      visible,
      result,
      decision,
      openRecoveryDialog,
      closeRecoveryDialog,
      resolve,
      reset,
    }),
    [visible, result, decision, openRecoveryDialog, closeRecoveryDialog, resolve, reset],
  );

  return <RecoveryContext.Provider value={value}>{children}</RecoveryContext.Provider>;
}

// ============================================================
// PART 4 — Hooks
// ============================================================

/** Provider 내부에서만 안전. 외부 접근 시 useRecoverySafe 권장. */
export function useRecoveryContext(): RecoveryContextValue {
  return useContext(RecoveryContext);
}

/** Provider 유무에 관계없이 기본값 fallback. */
export function useRecoverySafe(): RecoveryContextValue {
  const ctx = useContext(RecoveryContext);
  return ctx ?? DEFAULT_VALUE;
}
