"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Cloud, Download, Settings, Upload } from 'lucide-react';
import { showAlert } from '@/lib/show-alert';
import { AppLanguage, AppTab } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { getStorageUsageBytes } from '@/lib/project-migration';
import { getAllFlags } from '@/lib/feature-flags';
import type { ProjectManuscriptFormat } from '@/hooks/useStudioExport';
import { STUDIO_MANUSCRIPT_IMPORT_ACCEPT } from '@/lib/loreguard/import-classifier';

const PROJECT_EXPORT_FIVE: ProjectManuscriptFormat[] = ['txt', 'md', 'json', 'html', 'csv'];

export type StudioSidebarConfirmOpts = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
};

type StudioSidebarFooterProps = {
  activeTab: AppTab;
  authConfigured: boolean;
  closeConfirm: () => void;
  currentSessionId: string | null;
  exportAllJSON: () => void;
  exportJSON: () => void;
  exportProjectJSON?: () => void;
  exportProjectManuscripts?: (format: ProjectManuscriptFormat) => void;
  exportTXT: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleExportDOCX: () => void;
  handleExportEPUB: () => void;
  handleExportHWPX: () => void;
  handleImportJSON: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportTextFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSync: () => void;
  handleTabChange: (tab: AppTab) => void;
  hydrated: boolean;
  language: AppLanguage;
  lastSyncLabel: string | null;
  projectManuscriptExportEnabled: boolean;
  setLanguage: (lang: AppLanguage) => void;
  showConfirm: (opts: StudioSidebarConfirmOpts) => void;
  signInWithGoogle: () => void;
  signOut: () => void;
  syncStatus: string;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
};

export default function StudioSidebarFooter({
  activeTab,
  authConfigured,
  closeConfirm,
  currentSessionId,
  exportAllJSON,
  exportJSON,
  exportProjectJSON,
  exportProjectManuscripts,
  exportTXT,
  fileInputRef,
  handleExportDOCX,
  handleExportEPUB,
  handleExportHWPX,
  handleImportJSON,
  handleImportTextFiles,
  handleSync,
  handleTabChange,
  hydrated,
  language,
  lastSyncLabel,
  projectManuscriptExportEnabled,
  setLanguage,
  showConfirm,
  signInWithGoogle,
  signOut,
  syncStatus,
  user,
}: StudioSidebarFooterProps) {
  const [googleDriveBackupEnabled, setGoogleDriveBackupEnabled] = useState(() => getAllFlags().GOOGLE_DRIVE_BACKUP);
  const textFileInputRef = useRef<HTMLInputElement | null>(null);
  const translator = createT(language);
  const canUseGoogleAuth = hydrated && authConfigured;
  const storageUsageBytes = hydrated ? getStorageUsageBytes() : 0;
  const storageUsageMb = storageUsageBytes / 1024 / 1024;
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.usage != null && estimate.quota != null) {
          setStorageEstimate({ usage: estimate.usage, quota: estimate.quota });
        }
      });
    }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith('ff_')) {
        setGoogleDriveBackupEnabled(getAllFlags().GOOGLE_DRIVE_BACKUP);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const quotaMb = storageEstimate ? storageEstimate.quota / 1024 / 1024 : 5;
  const usageMb = storageEstimate ? storageEstimate.usage / 1024 / 1024 : storageUsageMb;
  const storageUsagePct = Math.min(100, (usageMb / quotaMb) * 100);
  const storageUsageColor = storageUsagePct > 80 ? 'bg-accent-red' : storageUsagePct > 50 ? 'bg-accent-amber' : 'bg-green-500';
  const bindStorageUsageFill = useCallback(
    (node: HTMLDivElement | null) => {
      node?.style.setProperty('--studio-storage-usage-pct', `${storageUsagePct}%`);
    },
    [storageUsagePct],
  );
  const exportButtonClass =
    'flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary transition-[transform,border-color,color,opacity] hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-35';
  const languageButtonClass =
    'rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-[background-color,border-color,color]';

  return (
    <div className="border-t border-white/8 px-4 py-2 space-y-2">
      {googleDriveBackupEnabled && (
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[rgba(92,143,214,0.24)] bg-[rgba(92,143,214,0.12)] text-sm font-semibold text-accent-blue shrink-0">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt="" width={44} height={44} className="h-full w-full object-cover" />
                ) : (
                  user.displayName?.[0] || '?'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="site-kicker text-[0.56rem]">Google Drive</div>
                <div className="truncate text-sm font-medium text-text-primary">{user.displayName || user.email}</div>
              </div>
              <button
                onClick={() =>
                  showConfirm({
                    title: translator('confirm.logout'),
                    message: translator('confirm.logoutMsg'),
                    variant: 'warning',
                    onConfirm: () => { closeConfirm(); signOut(); },
                  })
                }
                className="rounded-full border border-white/8 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary transition-[border-color,color] hover:border-accent-red/30 hover:text-accent-red shrink-0"
              >
                {translator('confirm.logout')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!canUseGoogleAuth) {
                  showAlert(translator('confirm.firebaseRequired'));
                  return;
                }
                signInWithGoogle();
              }}
              aria-disabled={!canUseGoogleAuth}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary transition-[transform,border-color,color,opacity] ${canUseGoogleAuth ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary' : 'cursor-not-allowed opacity-35'}`}
            >
              <Cloud className="h-4 w-4" /> {translator('auth.googleLogin')}
            </button>
          )}

          {user && (
            <>
              <button
                onClick={handleSync}
                disabled={syncStatus === 'syncing'}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-[transform,background-color,border-color,color] ${
                  syncStatus === 'syncing'
                    ? 'animate-pulse border-[rgba(92,143,214,0.28)] bg-[rgba(92,143,214,0.12)] text-accent-blue'
                    : syncStatus === 'done'
                      ? 'border-[rgba(92,214,143,0.28)] bg-[rgba(92,214,143,0.08)] text-green-400'
                      : syncStatus === 'error'
                        ? 'border-accent-red/30 bg-accent-red/8 text-accent-red'
                        : 'border-white/8 bg-white/4 text-text-secondary hover:-translate-y-0.5 hover:border-[rgba(92,143,214,0.26)] hover:text-text-primary'
                }`}
              >
                {syncStatus === 'syncing'
                  ? translator('sync.syncing')
                  : syncStatus === 'done'
                    ? translator('sync.syncDone')
                    : syncStatus === 'error'
                      ? translator('sync.syncError')
                      : translator('sync.syncNow')}
              </button>
              <div className="mt-2 flex items-center justify-between text-[11px] text-text-tertiary">
                <span>{lastSyncLabel ? `Last sync ${lastSyncLabel}` : 'Not synced yet'}</span>
                <span
                  className={
                    syncStatus === 'error'
                      ? 'text-accent-red'
                      : syncStatus === 'done'
                        ? 'text-accent-green'
                        : ''
                  }
                >
                  {syncStatus.toUpperCase()}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-1.5 select-none">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {language === 'KO' ? '내보내기' : 'Export'}
          </span>
          <span className="text-[9px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="space-y-2 pt-2">
          {exportProjectManuscripts && (
            <div className="rounded-xl border border-[rgba(202,161,92,0.22)] bg-[rgba(202,161,92,0.06)] p-2.5 space-y-2">
              <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-text-primary">
                {language === 'KO' ? '보내기 · 대표 5형식 (전 회차 원고)' : 'Export · 5 formats (all episodes)'}
              </div>
              <p className="text-[9px] text-text-tertiary leading-snug">
                {language === 'KO'
                  ? '번역·현지화 작업실과 같은 5형식으로 프로젝트 전체 회차를 한 파일로 받습니다.'
                  : 'Export all episodes in this project as one file in the same five formats used by the translation workspace.'}
              </p>
              <div className="grid grid-cols-5 gap-1">
                {PROJECT_EXPORT_FIVE.map((format) => (
                  <button
                    key={format}
                    type="button"
                    disabled={!projectManuscriptExportEnabled}
                    onClick={() => exportProjectManuscripts(format)}
                    className="rounded-lg border border-white/12 bg-black/35 py-2 text-[8px] font-black uppercase tracking-wide text-text-secondary transition-colors hover:border-[rgba(202,161,92,0.35)] hover:bg-[rgba(202,161,92,0.12)] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
                    title={format.toUpperCase()}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportTXT} disabled={!currentSessionId} className={exportButtonClass}>
              <Download className="h-3.5 w-3.5" /> TXT
            </button>
            <button onClick={exportJSON} disabled={!currentSessionId} className={exportButtonClass}>
              <Download className="h-3.5 w-3.5" /> JSON
            </button>
            <button onClick={handleExportEPUB} disabled={!currentSessionId} className={exportButtonClass}>
              <Download className="h-3.5 w-3.5" /> EPUB
            </button>
            <button onClick={handleExportDOCX} disabled={!currentSessionId} className={exportButtonClass}>
              <Download className="h-3.5 w-3.5" /> DOCX
            </button>
            <button onClick={handleExportHWPX} disabled={!currentSessionId} className={exportButtonClass}>
              <Download className="h-3.5 w-3.5" /> HWPX
            </button>
            <button onClick={exportAllJSON} className={exportButtonClass} title={language === 'KO' ? '전체 백업 (JSON)' : 'Full backup (JSON)'}>
              <Download className="h-3.5 w-3.5" /> Backup
            </button>
            <button onClick={() => fileInputRef.current?.click()} className={exportButtonClass} title={language === 'KO' ? 'JSON 가져오기' : 'Import JSON'}>
              <Upload className="h-3.5 w-3.5" /> JSON / 백업
            </button>
            <button onClick={() => textFileInputRef.current?.click()} className={exportButtonClass} title={language === 'KO' ? '원고 파일 가져오기' : 'Import manuscript files'}>
              <Upload className="h-3.5 w-3.5" /> 원고 파일
            </button>
            {exportProjectJSON && (
              <button onClick={exportProjectJSON} disabled={!currentSessionId} className={exportButtonClass} title={language === 'KO' ? '프로젝트 설정 내보내기' : 'Export project config'}>
                <Download className="h-3.5 w-3.5" /> Config
              </button>
            )}

            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
            <input ref={textFileInputRef} type="file" accept={STUDIO_MANUSCRIPT_IMPORT_ACCEPT} multiple className="hidden" onChange={handleImportTextFiles} />
          </div>
        </div>
      </details>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map((languageCode) => (
            <button
              key={languageCode}
              onClick={() => setLanguage(languageCode)}
              className={`${languageButtonClass} ${
                language === languageCode
                  ? 'border-[rgba(202,161,92,0.3)] bg-[rgba(202,161,92,0.14)] text-text-primary'
                  : 'border-white/8 bg-white/4 text-text-tertiary hover:border-white/12 hover:text-text-primary'
              }`}
            >
              {languageCode}
            </button>
          ))}
        </div>

        <button
          data-testid="tab-settings"
          onClick={() => handleTabChange('settings')}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-[background-color,border-color,color] ${
            activeTab === 'settings'
              ? 'border-[rgba(202,161,92,0.3)] bg-[rgba(202,161,92,0.14)] text-text-primary'
              : 'border-white/8 bg-white/4 text-text-tertiary hover:border-white/12 hover:text-text-primary'
          }`}
          title={translator('sidebar.settings')}
        >
          <Settings className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="mt-2">
        <div className="mb-1 flex justify-between text-[9px] font-mono text-text-tertiary">
          <span>{usageMb < 1024 ? `${usageMb.toFixed(1)} MB` : `${(usageMb / 1024).toFixed(1)} GB`} / {quotaMb < 1024 ? `${quotaMb.toFixed(0)} MB` : `${(quotaMb / 1024).toFixed(1)} GB`}</span>
          {storageUsagePct > 60 && <span className="text-accent-amber">{language === 'KO' ? '정리 권장' : 'Cleanup recommended'}</span>}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/8">
          <div
            ref={bindStorageUsageFill}
            className={`h-full ${storageUsageColor} rounded-full transition-[width,background-color] studio-storage-usage-fill`}
          />
        </div>
      </div>
    </div>
  );
}
