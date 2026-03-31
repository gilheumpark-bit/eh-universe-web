"use client";

import { useState, useEffect } from 'react';
import { Globe, Cloud, AlertTriangle, CheckCircle, Info, X, RefreshCw, Download } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { ErrorToast } from './UXHelpers';

interface StudioToastsProps {
  language: AppLanguage;
  isKO: boolean;
  // Sync reminder
  showSyncReminder: boolean;
  setShowSyncReminder: (v: boolean) => void;
  user: { displayName: string | null } | null;
  lastSyncTime: number | null;
  handleSync: () => void;
  signInWithGoogle: () => void;
  // Storage
  storageFull: boolean;
  setStorageFull: (v: boolean) => void;
  exportAllJSON: () => void;
  // Fallback
  fallbackNotice: string | null;
  setFallbackNotice: (v: string | null) => void;
  // Export
  exportDoneFormat: string | null;
  // World import
  worldImportBanner: boolean;
  setWorldImportBanner: (v: boolean) => void;
  // Error
  uxError: { error: unknown; retry?: () => void } | null;
  setUxError: (v: { error: unknown; retry?: () => void } | null) => void;
}

// Premium Toast Card Component
function ToastCard({ 
  children, 
  variant = 'info',
  onClose,
  progress,
}: { 
  children: React.ReactNode; 
  variant?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
  progress?: number;
}) {
  const variants = {
    info: {
      bg: 'from-accent-blue/20 to-accent-blue/5',
      border: 'border-accent-blue/30',
      icon: 'text-accent-blue',
      close: 'text-accent-blue/60 hover:text-accent-blue',
      progress: 'bg-accent-blue',
    },
    success: {
      bg: 'from-accent-green/20 to-accent-green/5',
      border: 'border-accent-green/30',
      icon: 'text-accent-green',
      close: 'text-accent-green/60 hover:text-accent-green',
      progress: 'bg-accent-green',
    },
    warning: {
      bg: 'from-accent-amber/20 to-accent-amber/5',
      border: 'border-accent-amber/30',
      icon: 'text-accent-amber',
      close: 'text-accent-amber/60 hover:text-accent-amber',
      progress: 'bg-accent-amber',
    },
    error: {
      bg: 'from-accent-red/20 to-accent-red/5',
      border: 'border-accent-red/30',
      icon: 'text-accent-red',
      close: 'text-accent-red/60 hover:text-accent-red',
      progress: 'bg-accent-red',
    },
  };
  const v = variants[variant];

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border ${v.border}
      bg-gradient-to-r ${v.bg} backdrop-blur-xl
      shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)]
      animate-in slide-in-from-top-2 fade-in duration-300
    `}>
      <div className="flex items-center gap-3 px-4 py-3">
        {children}
        {onClose && (
          <button 
            onClick={onClose} 
            className={`shrink-0 p-1 rounded-lg transition-colors ${v.close}`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div 
            className={`h-full ${v.progress} transition-all duration-100`} 
            style={{ width: `${progress}%`, opacity: 0.6 }}
          />
        </div>
      )}
    </div>
  );
}

// Auto-dismiss wrapper
function AutoDismissToast({ 
  children, 
  duration = 4000,
  onDismiss,
  variant,
}: { 
  children: React.ReactNode;
  duration?: number;
  onDismiss: () => void;
  variant?: 'info' | 'success' | 'warning' | 'error';
}) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setVisible(false);
        setTimeout(onDismiss, 300);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <ToastCard variant={variant} onClose={onDismiss} progress={progress}>
      {children}
    </ToastCard>
  );
}

export default function StudioToasts({
  language, isKO,
  showSyncReminder, setShowSyncReminder, user, lastSyncTime, handleSync, signInWithGoogle,
  storageFull, setStorageFull, exportAllJSON,
  fallbackNotice, setFallbackNotice,
  exportDoneFormat,
  worldImportBanner, setWorldImportBanner,
  uxError, setUxError,
}: StudioToastsProps) {
  const t = createT(language);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-md px-4">
      {/* Sync Reminder */}
      {showSyncReminder && (
        <ToastCard variant="info" onClose={() => setShowSyncReminder(false)}>
          <Cloud className="w-5 h-5 text-accent-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user
                ? `${t('syncReminder.lastSyncPrefix')}${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString(language === 'KO' ? 'ko-KR' : language === 'JP' ? 'ja-JP' : language === 'CN' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : t('syncReminder.never')}${t('syncReminder.lastSyncSuffix')}`
                : t('syncReminder.browserOnly')}
            </p>
          </div>
          <button 
            onClick={() => { setShowSyncReminder(false); user ? handleSync() : signInWithGoogle(); }}
            className="shrink-0 px-3 py-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-blue/30 text-accent-blue text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            {user ? t('syncReminder.sync') : t('syncReminder.signIn')}
          </button>
        </ToastCard>
      )}

      {/* Storage Full Warning */}
      {storageFull && (
        <ToastCard variant="warning" onClose={() => setStorageFull(false)}>
          <AlertTriangle className="w-5 h-5 text-accent-amber shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">{t('ui.storageFull')}</p>
          <button 
            onClick={exportAllJSON}
            className="shrink-0 px-3 py-1.5 bg-accent-amber/20 hover:bg-accent-amber/30 border border-accent-amber/30 text-accent-amber text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            {isKO ? '백업' : 'Backup'}
          </button>
        </ToastCard>
      )}

      {/* Fallback Notice */}
      {fallbackNotice && (
        <AutoDismissToast variant="info" duration={5000} onDismiss={() => setFallbackNotice(null)}>
          <Info className="w-5 h-5 text-accent-blue shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">
            {isKO ? `AI 제공자 자동 전환: ${fallbackNotice}` : `Provider auto-switched: ${fallbackNotice}`}
          </p>
        </AutoDismissToast>
      )}

      {/* Export Complete */}
      {exportDoneFormat && (
        <AutoDismissToast variant="success" duration={3000} onDismiss={() => {}}>
          <CheckCircle className="w-5 h-5 text-accent-green shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">
            {exportDoneFormat} {isKO ? '내보내기 완료' : 'export complete'}
          </p>
        </AutoDismissToast>
      )}

      {/* World Import Banner */}
      {worldImportBanner && (
        <AutoDismissToast variant="success" duration={4000} onDismiss={() => setWorldImportBanner(false)}>
          <Globe className="w-5 h-5 text-accent-green shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">
            {isKO ? 'Network에서 세계관을 불러왔습니다' : 'World imported from Network'}
          </p>
        </AutoDismissToast>
      )}

      {/* Error Toast */}
      {uxError && (
        <ErrorToast
          error={uxError.error}
          language={language}
          onDismiss={() => setUxError(null)}
          onRetry={uxError.retry ? () => { setUxError(null); uxError.retry?.(); } : undefined}
        />
      )}
    </div>
  );
}
