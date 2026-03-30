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

/** Manages UX transient state: toasts, error alerts, save flash, confirm modal, provider fallback notices */
export function useStudioUX() {
  // Error toast
  const [uxError, setUxError] = useState<{ error: unknown; retry?: () => void } | null>(null);

  // Storage-full warning
  const [storageFull, setStorageFull] = useState(false);
  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener('noa:storage-full', handler);
    return () => window.removeEventListener('noa:storage-full', handler);
  }, []);

  // Export done toast
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

  // Auto-save timestamp
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  useEffect(() => {
    const handler = () => setLastSaveTime(Date.now());
    window.addEventListener('noa:auto-saved', handler);
    return () => window.removeEventListener('noa:auto-saved', handler);
  }, []);

  // Provider fallback notice
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
    // Export
    exportDoneFormat,
    // Save
    lastSaveTime, saveFlash, triggerSave,
    // Fallback
    fallbackNotice, setFallbackNotice,
    // Confirm
    confirmState, showConfirm, closeConfirm,
  };
}
