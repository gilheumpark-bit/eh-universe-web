'use client';

// ============================================================
// PART 1 — Overview (M1.5.4 Journal Engine Mode Hook)
// ============================================================
//
// 저널 엔진 모드(off/shadow/on) 상태 구독 + 주기 평가.
// 'Shadow → On 승격' 또는 'On → Shadow 다운그레이드' 를 한 곳에서 관리.
//
// [원칙 1] autoPromote 는 기본 false — 무심코 on 전환 금지.
// [원칙 2] autoDowngrade 는 기본 true — 데이터 안전이 속도보다 우선.
// [원칙 3] 주기 평가 (기본 10분) — 과도한 재계산 방지.
// [원칙 4] downgrade 는 디바운스 — 같은 window 내 여러 에러가 있어도 1회만 전환.
// [원칙 5] 실패 격리 — 모든 평가/전환은 try/catch, 실패 시 상태 유지.
//
// [C] SSR 가드 + unmount cleanup + Storage 차단 폴백
// [G] refresh 는 microtask — Primary 경로 무간섭
// [K] 3 public API — promoteNow / downgradeNow / currentMode 구독

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getJournalEngineMode,
  setJournalEngineMode,
  type JournalEngineMode,
} from '@/lib/feature-flags';
import { getShadowLog } from '@/lib/save-engine/shadow-logger';
import { analyzeShadowLog } from '@/lib/save-engine/diff-analyzer';
import {
  evaluatePromotion,
  shouldDowngrade,
  DEFAULT_CRITERIA,
  DEFAULT_DOWNGRADE_OPTIONS,
  type PromotionCriteria,
  type PromotionStatus,
  type JournalError,
  type DowngradeOptions,
} from '@/lib/save-engine/promotion-controller';
import { recordPromotion } from '@/lib/save-engine/promotion-audit';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Types
// ============================================================

export interface UseJournalEngineModeOptions {
  /** 자동 승격 활성 — 기본 false (수동이 기본). */
  autoPromote?: boolean;
  /** 자동 다운그레이드 활성 — 기본 true (안전 우선). */
  autoDowngrade?: boolean;
  /** 승격 기준. */
  criteria?: PromotionCriteria;
  /** 다운그레이드 트리거 옵션. */
  downgradeOptions?: DowngradeOptions;
  /** 주기 평가 ms. 기본 600_000 (10분). 0 이면 수동만. */
  evaluationIntervalMs?: number;
}

export interface UseJournalEngineModeResult {
  /** 현재 모드. */
  currentMode: JournalEngineMode;
  /** 최신 승격 상태 (null = 평가 전). */
  promotionStatus: PromotionStatus | null;
  /**
   * 즉시 승격 수행. 기준 미충족 시 false 반환 (전환 안 함).
   * trigger='manual' 로 audit 기록.
   */
  promoteNow: () => Promise<boolean>;
  /**
   * 즉시 다운그레이드 수행. 현재 'on' 이 아닐 때는 no-op (true 반환).
   * trigger='downgrade' 로 audit 기록.
   */
  downgradeNow: (reason: string) => Promise<boolean>;
  /**
   * 기존 기록 기반 즉시 재평가. audit 은 기록하지 않음 (평가만).
   */
  refreshStatus: () => Promise<void>;
  /** Journal 오류 시그널 추가 — 다운그레이드 판정 입력. */
  reportJournalError: (error: Omit<JournalError, 'ts'> & { ts?: number }) => void;
}

// ============================================================
// PART 3 — Hook
// ============================================================

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const DOWNGRADE_DEBOUNCE_MS = 5_000;

export function useJournalEngineMode(
  options: UseJournalEngineModeOptions = {},
): UseJournalEngineModeResult {
  const autoPromote = options.autoPromote ?? false;
  const autoDowngrade = options.autoDowngrade ?? true;
  const criteria = options.criteria ?? DEFAULT_CRITERIA;
  const downgradeOptions = options.downgradeOptions ?? DEFAULT_DOWNGRADE_OPTIONS;
  const intervalMs = options.evaluationIntervalMs ?? DEFAULT_INTERVAL_MS;

  const [currentMode, setCurrentMode] = useState<JournalEngineMode>(() => {
    try { return getJournalEngineMode(); } catch { return 'off'; }
  });
  const [promotionStatus, setPromotionStatus] = useState<PromotionStatus | null>(null);

  // errors / 마지막 다운그레이드 시각 — 렌더 외부
  const errorsRef = useRef<JournalError[]>([]);
  const lastDowngradeAtRef = useRef<number>(0);

  // 최신 options 는 콜백 identity 안정 위해 ref — useEffect 로 동기화 (render 중 ref mutation 금지)
  const optionsRef = useRef({ autoPromote, autoDowngrade, criteria, downgradeOptions });
  useEffect(() => {
    optionsRef.current = { autoPromote, autoDowngrade, criteria, downgradeOptions };
  }, [autoPromote, autoDowngrade, criteria, downgradeOptions]);

  // reportJournalError 최신 참조 — useEffect 안에서 호출하므로 forward ref 필요.
  // 실제 콜백은 아래 PART 8 에서 정의되며 useEffect 로 ref 에 주입.
  const reportJournalErrorRef = useRef<(e: Omit<JournalError, 'ts'> & { ts?: number }) => void>(
    () => { /* placeholder, overwritten by useEffect below */ },
  );

  // ========================================================
  // PART 4 — Mode sync (localStorage / 이벤트)
  // ========================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      try { setCurrentMode(getJournalEngineMode()); } catch { /* noop */ }
    };
    window.addEventListener('storage', handler);
    window.addEventListener('noa:feature-flag-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('noa:feature-flag-changed', handler);
    };
  }, []);

  // [M1.5.4] Journal 오류 이벤트 구독 — shadow writer 의 실패 신호를 수신.
  // 'on' 모드 + autoDowngrade 이면 즉시 다운그레이드.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      try {
        // CustomEvent<JournalErrorEventDetail> 가정
        const detail = (ev as CustomEvent<{ operation?: string; reason?: string; ts?: number }>).detail;
        if (!detail) return;
        reportJournalErrorRef.current({
          ts: detail.ts,
          // operation 은 shadow-logger 의 enum — 여기서는 관측용으로만 사용
          operation: detail.operation as JournalError['operation'],
          reason: detail.reason ?? 'journal-error-event',
        });
      } catch {
        /* noop */
      }
    };
    window.addEventListener('noa:journal-error', handler as EventListener);
    return () => window.removeEventListener('noa:journal-error', handler as EventListener);
  }, []);

  // ========================================================
  // PART 5 — refreshStatus (평가만, audit 미기록)
  // ========================================================

  const refreshStatus = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const log = await getShadowLog({ limit: 5000 });
      const report = analyzeShadowLog(log);
      const status = evaluatePromotion(log, report, optionsRef.current.criteria);
      setPromotionStatus(status);
    } catch (err) {
      logger.warn('useJournalEngineMode', 'refreshStatus failed (isolated)', err);
    }
  }, []);

  // ========================================================
  // PART 6 — promoteNow (수동/자동 승격)
  // ========================================================

  const doPromote = useCallback(
    async (trigger: 'manual' | 'auto'): Promise<boolean> => {
      if (typeof window === 'undefined') return false;
      try {
        // 이미 on 이면 평가 생략 — no-op 으로 true 반환
        const before = getJournalEngineMode();
        if (before === 'on') return true;

        const log = await getShadowLog({ limit: 5000 });
        const report = analyzeShadowLog(log);
        const status = evaluatePromotion(log, report, optionsRef.current.criteria);
        setPromotionStatus(status);

        if (!status.ready) return false;

        const ok = setJournalEngineMode('on');
        if (!ok) return false;

        setCurrentMode('on');
        // audit 기록 — 실패 흡수
        void recordPromotion({
          ts: Date.now(),
          from: before,
          to: 'on',
          trigger,
          reason: trigger === 'auto' ? 'auto-promotion-criteria-met' : 'manual-promote',
          metrics: status.metrics,
        }).catch((err) => {
          logger.warn('useJournalEngineMode', 'audit promoteNow failed (isolated)', err);
        });
        return true;
      } catch (err) {
        logger.warn('useJournalEngineMode', 'promoteNow failed (isolated)', err);
        return false;
      }
    },
    [],
  );

  const promoteNow = useCallback(async (): Promise<boolean> => {
    return doPromote('manual');
  }, [doPromote]);

  // ========================================================
  // PART 7 — downgradeNow (수동/자동)
  // ========================================================

  const downgradeNow = useCallback(
    async (reason: string): Promise<boolean> => {
      if (typeof window === 'undefined') return false;
      try {
        const before = getJournalEngineMode();
        if (before !== 'on') return true; // 이미 on 이 아님 — no-op

        // 디바운스 — 5초 내 재호출은 무시
        const now = Date.now();
        if (now - lastDowngradeAtRef.current < DOWNGRADE_DEBOUNCE_MS) {
          return true;
        }
        lastDowngradeAtRef.current = now;

        const ok = setJournalEngineMode('shadow');
        if (!ok) return false;

        setCurrentMode('shadow');
        void recordPromotion({
          ts: now,
          from: before,
          to: 'shadow',
          trigger: 'downgrade',
          reason: reason || 'journal-error-threshold-exceeded',
        }).catch((err) => {
          logger.warn('useJournalEngineMode', 'audit downgradeNow failed (isolated)', err);
        });
        return true;
      } catch (err) {
        logger.warn('useJournalEngineMode', 'downgradeNow failed (isolated)', err);
        return false;
      }
    },
    [],
  );

  // ========================================================
  // PART 8 — reportJournalError + 자동 다운그레이드
  // ========================================================

  const reportJournalError = useCallback(
    (error: Omit<JournalError, 'ts'> & { ts?: number }) => {
      const ts = typeof error.ts === 'number' && Number.isFinite(error.ts) ? error.ts : Date.now();
      errorsRef.current.push({ ts, operation: error.operation, reason: error.reason });

      // 메모리 관리 — 최근 200 건만 유지
      if (errorsRef.current.length > 200) {
        errorsRef.current = errorsRef.current.slice(-200);
      }

      if (!optionsRef.current.autoDowngrade) return;
      if (getJournalEngineMode() !== 'on') return;
      if (!shouldDowngrade(errorsRef.current, optionsRef.current.downgradeOptions)) return;
      void downgradeNow(`auto-downgrade: ${error.reason}`);
    },
    [downgradeNow],
  );

  // 이벤트 리스너에서 사용할 수 있도록 ref 에 최신 콜백 주입 — useEffect 로 render 중 ref mutation 회피.
  useEffect(() => {
    reportJournalErrorRef.current = reportJournalError;
  }, [reportJournalError]);

  // ========================================================
  // PART 9 — 주기 평가 + 자동 승격
  // ========================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 마운트 시 초기 1회
    void refreshStatus();

    if (intervalMs <= 0) return;

    const tick = async () => {
      try {
        await refreshStatus();
        if (optionsRef.current.autoPromote) {
          const mode = getJournalEngineMode();
          if (mode === 'shadow') {
            void doPromote('auto');
          }
        }
      } catch (err) {
        logger.warn('useJournalEngineMode', 'periodic evaluation failed (isolated)', err);
      }
    };

    const timer = setInterval(() => {
      void tick();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [refreshStatus, doPromote, intervalMs]);

  // ========================================================
  // PART 10 — Return
  // ========================================================

  return {
    currentMode,
    promotionStatus,
    promoteNow,
    downgradeNow,
    refreshStatus,
    reportJournalError,
  };
}

// IDENTITY_SEAL: PART-1..10 | role=useJournalEngineMode | inputs=options | outputs=mode+actions
