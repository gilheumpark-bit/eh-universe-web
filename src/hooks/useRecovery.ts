'use client';

// ============================================================
// useRecovery — M1.2 부팅 자동 복구 + Dialog 표시 + 토스트 고지
// ============================================================
//
// Studio 부팅 직후 1회 runBootRecovery() 실행.
//   1) 결과에 따라 RecoveryContext를 업데이트
//   2) 자동으로 Dialog 표시 여부 결정 (조건: 크래시 or chainDamaged)
//   3) noa:alert 이벤트로 성공/경고/에러 토스트 고지
//
// 이 훅은 Phase 1.2 단독 — Phase 1.5에서 StudioShell과 연결될 예정.
// FEATURE_JOURNAL_ENGINE === 'on' 일 때만 실제 실행(기본 'off').
// 'shadow' 모드는 복구를 연결하지 않음(관찰자 전용).
//
// [C] SSR 가드 / 중복 실행 방지 / 이벤트 dispatch 실패 시 로그만
// [G] 1회 실행 — useRef 센티널로 반복 호출 차단
// [K] 파생 계산은 inline (useMemo 불필요 수준)

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { runBootRecovery, type RecoveryResult } from '@/lib/save-engine/recovery';
import {
  useRecoveryContext,
  type RecoveryContextValue,
  type RecoveryDecision,
} from '@/contexts/RecoveryContext';

// ============================================================
// PART 1 — 타입
// ============================================================

export interface UseRecoveryOptions {
  /** 기본 false. true일 때만 부팅 복구 실행. */
  enabled?: boolean;
  /** 토스트 메시지용 언어. */
  language?: AppLanguage | string;
  /** 부팅 결과 콜백 (Dialog 표시 전). */
  onResult?: (result: RecoveryResult) => void;
}

export interface UseRecoveryResult {
  /** 복구 실행 완료 여부. */
  bootComplete: boolean;
  /** 부팅 결과 (null = 아직 실행 전). */
  result: RecoveryResult | null;
  /** Dialog 표시 여부 (Context 기반). */
  dialogVisible: boolean;
  /** 사용자 선택 기록. */
  decision: RecoveryDecision | null;
  /** 수동 재실행 (테스트/디버그). */
  runBootRecoveryManually: () => Promise<RecoveryResult | null>;
}

// ============================================================
// PART 2 — 메시지 사전 (4언어)
// ============================================================

function makeToasts(lang: AppLanguage | string) {
  return {
    restoredSuccess: (mins: number) =>
      L4(lang, {
        ko: `이전 세션에서 복구했습니다 (약 ${mins}분 전 상태)`,
        en: `Restored from previous session (~${mins} min ago)`,
        ja: `前回のセッションから復元しました (約${mins}分前)`,
        zh: `已从上一会话恢复 (约${mins}分钟前)`,
      }),
    restoredZero: L4(lang, {
      ko: '이전 세션에서 복구했습니다',
      en: 'Restored from previous session',
      ja: '前回のセッションから復元しました',
      zh: '已从上一会话恢复',
    }),
    partialLoss: (lossMins: number) =>
      L4(lang, {
        ko: `일부 구간 복구 불가 — 약 ${lossMins}분 손실`,
        en: `Partial restore — ~${lossMins} min lost`,
        ja: `一部復元不可 — 約${lossMins}分損失`,
        zh: `部分恢复 — 约${lossMins}分钟损失`,
      }),
    failure: L4(lang, {
      ko: '복구 실패 — 마지막 정상 저장 지점으로 로드',
      en: 'Recovery failed — loaded last known good state',
      ja: '復旧失敗 — 最後の正常状態で読み込み',
      zh: '恢复失败 — 已加载最后正常状态',
    }),
  };
}

// ============================================================
// PART 3 — Hook
// ============================================================

export function useRecovery(options: UseRecoveryOptions = {}): UseRecoveryResult {
  const { enabled = false, language = 'ko', onResult } = options;
  const ctx: RecoveryContextValue = useRecoveryContext();

  const [bootComplete, setBootComplete] = useState(false);
  const [localResult, setLocalResult] = useState<RecoveryResult | null>(null);
  const executedRef = useRef(false);

  // 실제 복구 실행 로직.
  const executeRecovery = useCallback(async (): Promise<RecoveryResult | null> => {
    try {
      const r = await runBootRecovery();
      setLocalResult(r);
      if (onResult) {
        try {
          onResult(r);
        } catch (err) {
          logger.warn('useRecovery', 'onResult threw', err);
        }
      }

      // Dialog 표시 조건: 크래시 복구 OR 체인 손상 감지
      const needsDialog = r.recoveredFromCrash || r.chainDamaged;
      if (needsDialog) {
        ctx.openRecoveryDialog(r);
      }

      dispatchRecoveryToast(r, language);
      return r;
    } catch (err) {
      logger.error('useRecovery', 'runBootRecovery 실패', err);
      dispatchFailureToast(language);
      return null;
    } finally {
      setBootComplete(true);
    }
  }, [ctx, onResult, language]);

  // 자동 실행 — enabled=true 시 1회만.
  useEffect(() => {
    if (!enabled) return;
    if (executedRef.current) return;
    if (typeof window === 'undefined') return;
    executedRef.current = true;
    void executeRecovery();
  }, [enabled, executeRecovery]);

  const runBootRecoveryManually = useCallback(async (): Promise<RecoveryResult | null> => {
    executedRef.current = true;
    return executeRecovery();
  }, [executeRecovery]);

  return {
    bootComplete,
    result: localResult ?? ctx.result,
    dialogVisible: ctx.visible,
    decision: ctx.decision,
    runBootRecoveryManually,
  };
}

// ============================================================
// PART 4 — Toast dispatch
// ============================================================

function dispatchRecoveryToast(result: RecoveryResult, lang: AppLanguage | string): void {
  if (typeof window === 'undefined') return;
  const t = makeToasts(lang);

  try {
    if (result.strategy === 'none' && !result.recoveredFromCrash) {
      // 최초 부팅 — 알림 없음
      return;
    }

    if (result.chainDamaged || result.corruptedEntries > 0) {
      const lossMins = Math.max(1, Math.round(result.estimatedLossMs / 60_000));
      window.dispatchEvent(
        new CustomEvent('noa:alert', {
          detail: { kind: 'warn', text: t.partialLoss(lossMins) },
        }),
      );
      return;
    }

    if (result.recoveredFromCrash) {
      const mins = result.recoveredUpTo
        ? Math.max(0, Math.round((Date.now() - result.recoveredUpTo) / 60_000))
        : 0;
      const text = mins > 0 ? t.restoredSuccess(mins) : t.restoredZero;
      window.dispatchEvent(
        new CustomEvent('noa:alert', {
          detail: { kind: 'success', text },
        }),
      );
    }
  } catch (err) {
    logger.warn('useRecovery', 'toast dispatch 실패', err);
  }
}

function dispatchFailureToast(lang: AppLanguage | string): void {
  if (typeof window === 'undefined') return;
  const t = makeToasts(lang);
  try {
    window.dispatchEvent(
      new CustomEvent('noa:alert', {
        detail: { kind: 'error', text: t.failure },
      }),
    );
  } catch {
    /* noop */
  }
}
