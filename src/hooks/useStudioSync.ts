// ============================================================
// useStudioSync — Drive 동기화 상태 관리
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { syncAllProjects } from '@/services/driveService';
import type { Project } from '@/lib/studio-types';
import type { User } from 'firebase/auth';

interface UseStudioSyncParams {
  user: User | null;
  accessToken: string | null;
  refreshAccessToken: () => Promise<string | null>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setUxError: (err: { error: unknown; retry?: () => void } | null) => void;
}

export function useStudioSync({
  user, accessToken, refreshAccessToken, projects, setProjects, setUxError,
}: UseStudioSyncParams) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [showSyncReminder, setShowSyncReminder] = useState(false);

  // 2-hour sync reminder
  const SYNC_REMINDER_MS = 2 * 60 * 60 * 1000;
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setShowSyncReminder(true);
      }, SYNC_REMINDER_MS);
      return () => clearTimeout(timer);
    }
    const timer = setInterval(() => {
      const gap = lastSyncTime ? Date.now() - lastSyncTime : Infinity;
      if (gap >= SYNC_REMINDER_MS) setShowSyncReminder(true);
    }, 60_000);
    return () => clearInterval(timer);
  }, [user, lastSyncTime, SYNC_REMINDER_MS]);

  const handleSync = useCallback(async () => {
    let token = accessToken;
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return;
    }
    setSyncStatus('syncing');
    try {
      const result = await syncAllProjects(token, projects);
      setProjects(result.merged);
      setLastSyncTime(Date.now());
      if (result.failedCount > 0) {
        setSyncStatus('done');
        setUxError({ error: new Error(`Drive sync: ${result.failedCount} file(s) failed to sync`) });
      } else {
        setSyncStatus('done');
      }
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      if (msg.includes('401')) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const retryResult = await syncAllProjects(newToken, projects);
            setProjects(retryResult.merged);
            setLastSyncTime(Date.now());
            if (retryResult.failedCount > 0) {
              setSyncStatus('done');
              setUxError({ error: new Error(`Drive sync: ${retryResult.failedCount} file(s) failed to sync`) });
            } else {
              setSyncStatus('done');
            }
            setTimeout(() => setSyncStatus('idle'), 3000);
            return;
          } catch (retryErr) {
            console.error('[Sync] Retry failed', retryErr);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return;
          }
        }
      }
      console.error('[Sync]', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [accessToken, refreshAccessToken, projects, setProjects, setUxError]);

  return {
    syncStatus,
    lastSyncTime,
    showSyncReminder, setShowSyncReminder,
    handleSync,
  };
}
