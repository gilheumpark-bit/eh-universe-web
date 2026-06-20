"use client";

// ============================================================
// PART 1 — Module overview (M1.4 §5 Tier hook)
// ============================================================
//
// React 훅으로 BackupOrchestrator를 래핑.
//   - 모든 Tier 상태 구독
//   - Tier별 enable/disable
//   - 수동 retry
//   - 주기 설정 (localStorage 영속)
//   - "지금 백업" 트리거 (file-tier.backupNow)
//
// 4언어 토스트는 호출자(BackupNowButton 등)가 담당. 훅은 void 반환.

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  getDefaultBackupOrchestrator,
  TIER_STATUS_EVENT,
  type BackupTier,
  type BackupTierStatus,
} from '@/lib/save-engine/backup-tiers';
import { backupNow as fileBackupNow } from '@/lib/save-engine/file-tier';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Constants
// ============================================================

const INTERVAL_STORAGE_KEY = 'noa_backup_interval_min';
const DEFAULT_INTERVAL_MIN = 5;

// ============================================================
// PART 3 — Hook return type
// ============================================================

export interface UseBackupTiersReturn {
  /** 모든 Tier 상태 (실시간) */
  statuses: BackupTierStatus[];
  /** 특정 Tier 조회 */
  getTier: (tier: BackupTier) => BackupTierStatus | null;
  /** Tier on/off */
  setTierEnabled: (tier: BackupTier, enabled: boolean) => void;
  /** 수동 재시도 */
  retryTier: (tier: BackupTier) => Promise<void>;
  /** 백업 주기 (분) */
  intervalMin: number;
  setIntervalMin: (m: number) => void;
  /** "지금 백업" — file-tier 다운로드 */
  backupNow: (projectId: string) => Promise<{ success: boolean; filename?: string; error?: string }>;
}

// ============================================================
// PART 4 — Hook implementation
// ============================================================

export function useBackupTiers(): UseBackupTiersReturn {
  const orchestrator = useMemo(() => getDefaultBackupOrchestrator(), []);
  const [statuses, setStatuses] = useState<BackupTierStatus[]>(() => {
    if (typeof window === 'undefined') return [];
    return orchestrator.getAllStatuses();
  });
  const [intervalMin, setIntervalMinState] = useState<number>(() => loadInterval());

  // 상태 구독
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const off = orchestrator.onChange(() => {
      setStatuses(orchestrator.getAllStatuses());
    });
    const handler = () => { setStatuses(orchestrator.getAllStatuses()); };
    window.addEventListener(TIER_STATUS_EVENT, handler);
    return () => {
      off();
      window.removeEventListener(TIER_STATUS_EVENT, handler);
    };
  }, [orchestrator]);

  // ============================================================
  // PART 5 — Actions
  // ============================================================

  const getTier = useCallback(
    (tier: BackupTier): BackupTierStatus | null => orchestrator.getStatus(tier),
    [orchestrator],
  );

  const setTierEnabled = useCallback(
    (tier: BackupTier, enabled: boolean) => {
      orchestrator.setEnabled(tier, enabled);
    },
    [orchestrator],
  );

  const retryTier = useCallback(
    async (tier: BackupTier): Promise<void> => {
      await orchestrator.executeTier(tier);
    },
    [orchestrator],
  );

  const setIntervalMin = useCallback((m: number) => {
    if (!Number.isFinite(m) || m <= 0) return;
    const clamped = Math.min(Math.max(Math.floor(m), 1), 1440);
    setIntervalMinState(clamped);
    saveInterval(clamped);
  }, []);

  const backupNow = useCallback(
    async (projectId: string) => {
      try {
        const result = await fileBackupNow(projectId);
        return {
          success: result.success,
          filename: result.filename,
          error: result.error,
        };
      } catch (err) {
        logger.warn('useBackupTiers', 'backupNow threw', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'unknown',
        };
      }
    },
    [],
  );

  return {
    statuses,
    getTier,
    setTierEnabled,
    retryTier,
    intervalMin,
    setIntervalMin,
    backupNow,
  };
}

// ============================================================
// PART 6 — Interval persistence helpers
// ============================================================

function loadInterval(): number {
  if (typeof window === 'undefined') return DEFAULT_INTERVAL_MIN;
  try {
    const raw = localStorage.getItem(INTERVAL_STORAGE_KEY);
    if (!raw) return DEFAULT_INTERVAL_MIN;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MIN;
    return Math.min(Math.max(Math.floor(n), 1), 1440);
  } catch {
    return DEFAULT_INTERVAL_MIN;
  }
}

function saveInterval(m: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTERVAL_STORAGE_KEY, String(m));
  } catch (err) {
    logger.debug('useBackupTiers', 'saveInterval failed', err);
  }
}
