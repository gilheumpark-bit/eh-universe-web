"use client";

import { Globe } from 'lucide-react';
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
    <>
      {showSyncReminder && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-blue-900/95 border border-blue-600 text-blue-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-lg">
          <span className="text-sm">
            {user
              ? `${t('syncReminder.lastSyncPrefix')}${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString(language === 'KO' ? 'ko-KR' : language === 'JP' ? 'ja-JP' : language === 'CN' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : t('syncReminder.never')}${t('syncReminder.lastSyncSuffix')}`
              : t('syncReminder.browserOnly')}
          </span>
          {user ? (
            <button onClick={() => { setShowSyncReminder(false); handleSync(); }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md shrink-0 transition-colors">
              {t('syncReminder.sync')}
            </button>
          ) : (
            <button onClick={() => { setShowSyncReminder(false); signInWithGoogle(); }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md shrink-0 transition-colors">
              {t('syncReminder.signIn')}
            </button>
          )}
          <button onClick={() => setShowSyncReminder(false)} className="text-blue-400 hover:text-blue-200 shrink-0" aria-label={t('ui.close')}>&times;</button>
        </div>
      )}

      {storageFull && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-900/95 border border-yellow-600 text-yellow-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
          <span className="text-sm">{t('ui.storageFull')}</span>
          <button onClick={exportAllJSON} className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-bold shrink-0 hover:bg-yellow-500">{isKO ? '백업' : 'Backup'}</button>
          <button onClick={() => setStorageFull(false)} className="text-yellow-400 hover:text-yellow-200 shrink-0" aria-label={t('ui.close')}>&times;</button>
        </div>
      )}

      {fallbackNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-blue-900/95 border border-blue-600 text-blue-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
          <span className="text-sm">{isKO ? `AI 제공자 자동 전환: ${fallbackNotice}` : `Provider auto-switched: ${fallbackNotice}`}</span>
          <button onClick={() => setFallbackNotice(null)} className="text-blue-400 hover:text-blue-200 shrink-0">&times;</button>
        </div>
      )}

      {exportDoneFormat && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-green-900/95 border border-green-600 text-green-100 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm">✅ {exportDoneFormat} {isKO ? '내보내기 완료' : 'export complete'}</span>
        </div>
      )}

      {worldImportBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-900/95 border border-emerald-600 text-emerald-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
          <Globe className="w-4 h-4 shrink-0" />
          <span className="text-sm">{isKO ? 'Network에서 세계관을 불러왔습니다' : 'World imported from Network'}</span>
          <button onClick={() => setWorldImportBanner(false)} className="text-emerald-400 hover:text-emerald-200 shrink-0" aria-label="close">&times;</button>
        </div>
      )}

      {uxError && (
        <ErrorToast
          error={uxError.error}
          language={language}
          onDismiss={() => setUxError(null)}
          onRetry={uxError.retry ? () => { setUxError(null); uxError.retry?.(); } : undefined}
        />
      )}
    </>
  );
}
