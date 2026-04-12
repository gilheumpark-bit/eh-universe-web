// ============================================================
// useStudioSync — Drive 동기화 상태 관리 + Cross-tab BroadcastChannel
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { syncAllProjects } from '@/services/driveService';
import type { Project } from '@/lib/studio-types';
import type { User } from 'firebase/auth';

const CHANNEL_NAME = 'noa-studio-sync';
const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseStudioSyncParams {
  user: User | null;
  accessToken: string | null;
  refreshAccessToken: () => Promise<string | null>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setUxError: (err: { error: unknown; retry?: () => void } | null) => void;
}

/** Manages Google Drive project synchronization with 2-hour reminder and auto-retry on 401 */
export function useStudioSync({
  user, accessToken, refreshAccessToken, projects, setProjects, setUxError,
}: UseStudioSyncParams) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [showSyncReminder, setShowSyncReminder] = useState(false);
  const [crossTabNotification, setCrossTabNotification] = useState<string | null>(null);

  // Ref to avoid stale closure over `projects` in handleSync
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  // BroadcastChannel ref for cross-tab sync
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastBroadcastTs = useRef<number>(0);

  // ── Cross-tab BroadcastChannel ──
  useEffect(() => {
    try {
      if (typeof BroadcastChannel === 'undefined') return;
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; sessionId?: string; timestamp?: number } | null;
        if (!data || data.type !== 'save') return;
        // Only react if it's from a different tab (different sessionId) and newer
        if (data.sessionId === SESSION_ID) return;
        if (typeof data.timestamp === 'number' && data.timestamp > lastBroadcastTs.current) {
          lastBroadcastTs.current = data.timestamp;
          // Dispatch custom event for downstream listeners
          window.dispatchEvent(new CustomEvent('noa:cross-tab-update', { detail: data }));
          setCrossTabNotification('다른 탭에서 변경됨. 새로고침하시겠습니까? / Modified in another tab. Refresh?');
        }
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch (err) {
      // BroadcastChannel not supported — silent fallback
      logger.warn?.('Sync', 'BroadcastChannel not available', err);
    }
  }, []);

  /** Broadcast a save event to other tabs */
  const broadcastSave = useCallback(() => {
    try {
      const ts = Date.now();
      lastBroadcastTs.current = ts;
      channelRef.current?.postMessage({ type: 'save', sessionId: SESSION_ID, timestamp: ts });
    } catch {
      // ignore — channel may be closed
    }
  }, []);

  const dismissCrossTabNotification = useCallback(() => {
    setCrossTabNotification(null);
  }, []);

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
      const result = await syncAllProjects(token, projectsRef.current);
      setProjects(result.merged);
      setLastSyncTime(Date.now());
      broadcastSave();
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
            const retryResult = await syncAllProjects(newToken, projectsRef.current);
            setProjects(retryResult.merged);
            setLastSyncTime(Date.now());
            broadcastSave();
            if (retryResult.failedCount > 0) {
              setSyncStatus('done');
              setUxError({ error: new Error(`Drive sync: ${retryResult.failedCount} file(s) failed to sync`) });
            } else {
              setSyncStatus('done');
            }
            setTimeout(() => setSyncStatus('idle'), 3000);
            return;
          } catch (retryErr) {
            logger.error('Sync', 'Retry failed', retryErr);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return;
          }
        }
      }
      logger.error('Sync', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectsRef.current avoids stale closure
  }, [accessToken, refreshAccessToken, setProjects, setUxError, broadcastSave]);

  return {
    syncStatus,
    lastSyncTime,
    showSyncReminder, setShowSyncReminder,
    handleSync,
    crossTabNotification,
    dismissCrossTabNotification,
  };
}
