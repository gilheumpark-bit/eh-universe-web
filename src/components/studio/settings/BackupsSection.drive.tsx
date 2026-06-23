"use client";

import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { AppLanguage } from '@/lib/studio-types';

function GoogleDriveSection({ language }: { language: AppLanguage }) {
  const { user } = useAuth();
  const [lastSync, setLastSync] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('noa_drive_last_sync');
      if (!stored) return null;
      const parsed = Number.parseInt(stored, 10);
      return Number.isFinite(parsed) ? parsed : null;
    } catch (err) {
      logger.warn('BackupsSection', 'read noa_drive_last_sync failed', err);
      return null;
    }
  });
  const [syncing, setSyncing] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleCompleted = (event: Event) => {
      const detail = (event as CustomEvent<{ time?: number }>).detail;
      const time = typeof detail?.time === 'number' ? detail.time : Date.now();
      setLastSync(time);
      setSyncing(false);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
    const handleFailed = () => {
      setSyncing(false);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
    window.addEventListener('noa:drive-sync-completed', handleCompleted);
    window.addEventListener('noa:drive-sync-failed', handleFailed);
    return () => {
      window.removeEventListener('noa:drive-sync-completed', handleCompleted);
      window.removeEventListener('noa:drive-sync-failed', handleFailed);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const encActive = Boolean(user?.uid);

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);
    window.dispatchEvent(new CustomEvent('noa:drive-sync-requested'));
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => setSyncing(false), 15000);
  };

  return (
    <div className="md:col-span-2 ds-card-lg">
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
        <Shield className="w-4 h-4 text-accent-blue" />
        {L4(language, { ko: 'Google Drive 백업', en: 'Google Drive Backup', ja: 'Google Driveバックアップ', zh: 'Google Drive备份' })}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '연결 상태', en: 'Connection', ja: '接続状態', zh: '连接状态' })}</span>
          <span className={`text-xs font-black ${user ? 'text-green-500' : 'text-text-tertiary'}`}>
            {user
              ? L4(language, { ko: '연결됨', en: 'Connected', ja: '接続済み', zh: '已连接' })
              : L4(language, { ko: '미연결', en: 'Not Connected', ja: '未接続', zh: '未连接' })}
          </span>
        </div>
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '마지막 동기화', en: 'Last Sync', ja: '最終同期', zh: '上次同步' })}</span>
          <span className="text-xs font-black text-text-tertiary">
            {lastSync ? new Date(lastSync).toLocaleString() : L4(language, { ko: '없음', en: 'Never', ja: 'なし', zh: '从未' })}
          </span>
        </div>
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '암호화', en: 'Encryption', ja: '暗号化', zh: '加密' })}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${encActive ? 'bg-green-500/15 text-green-500 border border-green-500/30' : 'bg-bg-tertiary text-text-tertiary'}`}>
            {encActive ? 'AES-GCM-256' : L4(language, { ko: '비활성', en: 'Off', ja: '無効', zh: '关闭' })}
          </span>
        </div>
        <button
          type="button"
          onClick={handleManualSync}
          disabled={syncing || !user}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue/10 border border-accent-blue/30 rounded-xl text-xs font-bold text-accent-blue hover:bg-accent-blue/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {syncing
            ? L4(language, { ko: '동기화 중...', en: 'Syncing...', ja: '同期中...', zh: '同步中...' })
            : L4(language, { ko: '지금 동기화', en: 'Sync Now', ja: '今すぐ同期', zh: '立即同步' })}
        </button>
      </div>
    </div>
  );
}

export default GoogleDriveSection;
