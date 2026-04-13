// ============================================================
// useStudioUX — UX 토스트/알림/확인 모달 상태 관리
// page.tsx에서 추출. 순수 UX 상태만 관리.
// ============================================================

import { useState, useEffect, useCallback } from 'react';

type ConfirmOpts = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
};

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
};

// ── Storage helpers ─────────────────────────────────────

/** Estimate current localStorage usage as bytes and percentage of quota */
function estimateStorageUsage(): { usedBytes: number; totalBytes: number; percent: number } {
  try {
    let usedBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        usedBytes += key.length * 2; // UTF-16
        usedBytes += (localStorage.getItem(key)?.length ?? 0) * 2;
      }
    }
    // Most browsers allow ~5MB for localStorage
    const totalBytes = 5 * 1024 * 1024;
    return { usedBytes, totalBytes, percent: (usedBytes / totalBytes) * 100 };
  } catch {
    return { usedBytes: 0, totalBytes: 5 * 1024 * 1024, percent: 0 };
  }
}

/** Remove old versioned backup keys to free localStorage space */
function cleanupOldBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
  let removed = 0;
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Match versioned backup keys: *_backup_*, *_v\d+, *_bak_*
      if (/_(backup|bak|v\d+)_?\d*/i.test(key) || key.includes('-snapshot-')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const ts = parsed?.savedAt || parsed?.timestamp || parsed?.createdAt;
            if (ts && (now - new Date(ts).getTime()) > maxAge) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Non-JSON backup key older than 7 days — safe to remove
          keysToRemove.push(key);
        }
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      removed++;
    }
  } catch {
    // localStorage unavailable
  }
  return removed;
}

/** Manages UX transient state: toasts, error alerts, save flash, confirm modal, provider fallback notices */
export function useStudioUX() {
  // Error toast
  const [uxError, setUxError] = useState<{ error: unknown; retry?: () => void } | null>(null);

  // Storage usage tracking
  const [storagePercent, setStoragePercent] = useState(0);

  // Storage-full warning
  const [storageFull, setStorageFull] = useState(false);

  // Storage 80% capacity warning
  const [storageNearFull, setStorageNearFull] = useState(false);

  // Proactive storage monitoring on mount
  useEffect(() => {
    const { percent } = estimateStorageUsage();
    setStoragePercent(percent);
    if (percent >= 80 && percent < 100) {
      setStorageNearFull(true);
    }
    if (percent >= 98) {
      setStorageFull(true);
    }
  }, []);

  // Listen for storage-full event — auto cleanup on trigger
  // Dispatch source: src/hooks/useProjectManager.ts:115
  useEffect(() => {
    const handler = () => {
      setStorageFull(true);
      // Auto cleanup: attempt to free space when storage-full fires
      const removed = cleanupOldBackups();
      if (removed > 0) {
        const { percent } = estimateStorageUsage();
        setStoragePercent(percent);
        if (percent < 98) setStorageFull(false);
        if (percent < 80) setStorageNearFull(false);
      }
    };
    window.addEventListener('noa:storage-full', handler);
    return () => window.removeEventListener('noa:storage-full', handler);
  }, []);

  // Auto cleanup: remove old backups to free space
  const triggerAutoCleanup = useCallback(() => {
    const removed = cleanupOldBackups();
    const { percent } = estimateStorageUsage();
    setStoragePercent(percent);
    if (percent < 80) {
      setStorageNearFull(false);
    }
    if (percent < 98) {
      setStorageFull(false);
    }
    return removed;
  }, []);

  // Export done toast
  // Dispatch source: src/hooks/useStudioExport.ts:98
  const [exportDoneFormat, setExportDoneFormat] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { format: string };
      setExportDoneFormat(detail.format);
      setTimeout(() => setExportDoneFormat(null), 3000);
    };
    window.addEventListener('noa:export-done', handler);
    return () => window.removeEventListener('noa:export-done', handler);
  }, []);

  // Export progress (step-by-step feedback)
  // Dispatch source: src/hooks/useStudioExport.ts:447,462
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { step?: string };
      setExportProgress(detail.step || null);
    };
    window.addEventListener('noa:export-progress', handler);
    return () => window.removeEventListener('noa:export-progress', handler);
  }, []);

  // Storage warning (from project migration)
  // Dispatch source: src/lib/project-migration.ts:130
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      setStorageWarning(detail.message || '저장 공간이 부족합니다.');
      setTimeout(() => setStorageWarning(null), 5000);
    };
    window.addEventListener('noa:storage-warning', handler);
    return () => window.removeEventListener('noa:storage-warning', handler);
  }, []);

  // Auto-save timestamp
  // Dispatch source: src/hooks/useProjectManager.ts:122
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  useEffect(() => {
    const handler = () => setLastSaveTime(Date.now());
    window.addEventListener('noa:auto-saved', handler);
    return () => window.removeEventListener('noa:auto-saved', handler);
  }, []);

  // Provider fallback notice
  // Dispatch source: src/lib/ai-providers.ts:860,951
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { from: string; to: string };
      setFallbackNotice(`${detail.from} → ${detail.to}`);
      setTimeout(() => setFallbackNotice(null), 5000);
    };
    window.addEventListener('noa:provider-fallback', handler);
    return () => window.removeEventListener('noa:provider-fallback', handler);
  }, []);

  // Save flash
  const [saveFlash, setSaveFlash] = useState(false);
  const triggerSave = useCallback(() => {
    setSaveFlash(true);
    setLastSaveTime(Date.now());
    setTimeout(() => setSaveFlash(false), 1500);
  }, []);

  // Token budget warning
  // Dispatch source: src/engine/pipeline.ts:643
  const [tokenBudgetWarning, setTokenBudgetWarning] = useState<{ estimatedTokens: number; ratio: number } | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { estimatedTokens: number; ratio: number };
      setTokenBudgetWarning(detail);
      setTimeout(() => setTokenBudgetWarning(null), 8000);
    };
    window.addEventListener('noa:token-budget-warning', handler);
    return () => window.removeEventListener('noa:token-budget-warning', handler);
  }, []);

  // Character truncation warning
  // Dispatch source: src/engine/pipeline.ts:278
  const [charTruncation, setCharTruncation] = useState<{ total: number; dropped: number } | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { total: number; dropped: number };
      setCharTruncation(detail);
      setTimeout(() => setCharTruncation(null), 10000);
    };
    window.addEventListener('noa:character-truncated', handler);
    return () => window.removeEventListener('noa:character-truncated', handler);
  }, []);

  // Session restore failure toast
  const [sessionRestoreFailed, setSessionRestoreFailed] = useState(false);
  useEffect(() => {
    const handler = () => {
      setSessionRestoreFailed(true);
      setTimeout(() => setSessionRestoreFailed(false), 5000);
    };
    window.addEventListener('noa:session-restore-failed', handler);
    return () => window.removeEventListener('noa:session-restore-failed', handler);
  }, []);

  // Confirm modal
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false, title: '', message: '', onConfirm: () => {},
  });
  const showConfirm = useCallback((opts: ConfirmOpts) => {
    setConfirmState({ open: true, ...opts });
  }, []);
  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, open: false }));
  }, []);

  return {
    // Error
    uxError, setUxError,
    // Storage
    storageFull, setStorageFull,
    storageNearFull, setStorageNearFull,
    storagePercent,
    triggerAutoCleanup,
    // Export
    exportDoneFormat, setExportDoneFormat,
    exportProgress,
    // Storage warning
    storageWarning, setStorageWarning,
    // Save
    lastSaveTime, saveFlash, triggerSave,
    // Fallback
    fallbackNotice, setFallbackNotice,
    // Token/Character warnings
    tokenBudgetWarning, setTokenBudgetWarning,
    charTruncation, setCharTruncation,
    // Session restore
    sessionRestoreFailed, setSessionRestoreFailed,
    // Confirm
    confirmState, showConfirm, closeConfirm,
  };
}
