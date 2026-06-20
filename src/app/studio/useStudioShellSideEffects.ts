"use client";

import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { AppLanguage, ChatSession } from '@/lib/studio-types';
import { useCreativeEventLogger } from '@/hooks/useCreativeEventLogger';
import { setDriveEncryptionKey } from '@/services/driveService';
import { showAlert } from '@/lib/show-alert';
import type { StudioShellUiState } from './StudioShell.ui-state';

const LANGUAGE_MAP: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', ja: 'JP', zh: 'CN' };

interface UseStudioShellBootEffectsOptions {
  lang: string;
  language: AppLanguage;
  setLanguage: Dispatch<SetStateAction<AppLanguage>>;
  setForceDesktop: Dispatch<SetStateAction<boolean>>;
  setStudioMode: Dispatch<SetStateAction<'guided' | 'free'>>;
  setStudioModeHydrated: Dispatch<SetStateAction<boolean>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setApiKeyVersion: Dispatch<SetStateAction<number>>;
  zenMode: boolean;
}

export function useStudioShellBootEffects({
  lang,
  language,
  setLanguage,
  setForceDesktop,
  setStudioMode,
  setStudioModeHydrated,
  setIsSidebarOpen,
  setApiKeyVersion,
  zenMode,
}: UseStudioShellBootEffectsOptions) {
  useEffect(() => {
    setLanguage(LANGUAGE_MAP[lang] || 'KO');
  }, [lang, setLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    setForceDesktop(searchParams.get('force') === 'desktop' || localStorage.getItem('noa_force_desktop') === '1');
  }, [setForceDesktop]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('noa_studio_ctrl_p_warned') === '1') return;
      const message = language === 'KO'
        ? 'Ctrl+P 는 명령 팔레트를 엽니다. 브라우저 인쇄는 Ctrl+Alt+P (Win) 또는 Cmd+Opt+P (Mac).'
        : language === 'JP'
          ? 'Ctrl+P はコマンドパレットを開きます。ブラウザ印刷は Ctrl+Alt+P / Cmd+Opt+P。'
          : language === 'CN'
            ? 'Ctrl+P 打开命令面板。浏览器打印请按 Ctrl+Alt+P / Cmd+Opt+P。'
            : 'Ctrl+P opens Command Palette. For browser print use Ctrl+Alt+P (Win) or Cmd+Opt+P (Mac).';
      const warningTimeout = setTimeout(() => showAlert(message), 1200);
      localStorage.setItem('noa_studio_ctrl_p_warned', '1');
      return () => clearTimeout(warningTimeout);
    } catch {
      // Private browsing or quota limits should not block Studio boot.
    }
  }, [language]);

  useEffect(() => {
    try {
      const rawMode = localStorage.getItem('noa_studio_mode');
      if (rawMode === 'guided' || rawMode === 'free') {
        setStudioMode(rawMode);
      }
    } catch {
      // Private browsing.
    }
    setStudioModeHydrated(true);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [setStudioMode, setStudioModeHydrated, setIsSidebarOpen]);

  useEffect(() => {
    const bumpVersion = () => setApiKeyVersion(version => version + 1);
    window.addEventListener('noa-keys-changed', bumpVersion);
    const initialCheck = setTimeout(bumpVersion, 500);
    return () => {
      window.removeEventListener('noa-keys-changed', bumpVersion);
      clearTimeout(initialCheck);
    };
  }, [setApiKeyVersion]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.zen = String(zenMode);
    return () => {
      delete document.body.dataset.zen;
    };
  }, [zenMode]);
}

export function useStudioShellCreativeEffects(
  currentProjectId: string | null,
  childrenPresent: boolean,
) {
  const creativeLogger = useCreativeEventLogger(currentProjectId);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__creativeLogger = creativeLogger;
    return () => {
      try {
        delete window.__creativeLogger;
      } catch {
        // No-op.
      }
    };
  }, [creativeLogger]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (currentProjectId) {
        window.localStorage.setItem('noa_studio_currentProjectId', currentProjectId);
      } else {
        window.localStorage.removeItem('noa_studio_currentProjectId');
      }
      window.dispatchEvent(new CustomEvent('noa:project-switched', {
        detail: { projectId: currentProjectId ?? null },
      }));
    } catch {
      // No-op.
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (childrenPresent) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ totalChars: number; delta: number }>).detail;
      if (!currentProjectId) return;
      void (async () => {
        try {
          const creativeProcess = await import('@/lib/creative-process');
          await creativeProcess.recordCreativeEvent({
            projectId: currentProjectId,
            targetType: 'manuscript',
            targetId: `auto-snapshot-${Date.now()}`,
            eventType: 'edit',
            actorType: 'human',
            actorId: 'author',
            originType: 'HUMAN_REVISION',
            beforeHash: null,
            afterHash: null,
            note: `auto-snapshot delta=${detail?.delta ?? 0} total=${detail?.totalChars ?? 0}`,
          });
        } catch {
          // No-op.
        }
      })();
    };
    window.addEventListener('noa:version-snapshot-saved', handler);
    return () => window.removeEventListener('noa:version-snapshot-saved', handler);
  }, [currentProjectId, childrenPresent]);
}

interface UseStudioShellEventEffectsOptions {
  userUid?: string;
  setAlertToast: Dispatch<SetStateAction<{ message: string; variant: string } | null>>;
  sessions: ChatSession[];
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  hydrated: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  handleSync: () => void;
  aiCapabilitiesLoaded: boolean;
  hasAiAccess: boolean;
  currentSession: ChatSession | null | undefined;
  dispatchUi: Dispatch<Partial<StudioShellUiState> | ((prev: StudioShellUiState) => Partial<StudioShellUiState>)>;
  openQuickStart: () => void;
  anyModalOpen: boolean;
  activeTab: string;
  messageCount: number;
  isGenerating: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function useStudioShellEventEffects({
  userUid,
  setAlertToast,
  sessions,
  setSessions,
  currentSessionId,
  setCurrentSessionId,
  hydrated,
  setIsSidebarOpen,
  handleSync,
  aiCapabilitiesLoaded,
  hasAiAccess,
  currentSession,
  dispatchUi,
  openQuickStart,
  anyModalOpen,
  activeTab,
  messageCount,
  isGenerating,
  messagesEndRef,
}: UseStudioShellEventEffectsOptions) {
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (userUid) setDriveEncryptionKey(userUid);
  }, [userUid]);

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (event: Event) => {
      const { message, variant } = (event as CustomEvent).detail;
      setAlertToast({ message, variant });
      if (dismissTimer) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => setAlertToast(null), 4000);
    };
    window.addEventListener('noa:alert', handler);
    return () => {
      window.removeEventListener('noa:alert', handler);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [setAlertToast]);

  useEffect(() => {
    const handleBatchDelete = (event: Event) => {
      const { ids } = (event as CustomEvent).detail as { ids: string[] };
      setSessions(previousSessions => previousSessions.filter(session => !ids.includes(session.id)));
      if (currentSessionId && ids.includes(currentSessionId)) {
        setCurrentSessionId(null);
      }
    };
    const handleBatchExport = (event: Event) => {
      const { ids } = (event as CustomEvent).detail as { ids: string[] };
      const selectedSessions = sessions.filter(session => ids.includes(session.id));
      if (selectedSessions.length === 0) return;
      const blob = new Blob([JSON.stringify(selectedSessions, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `batch-export-${selectedSessions.length}-episodes.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    };
    window.addEventListener('noa:batch-delete', handleBatchDelete);
    window.addEventListener('noa:batch-export', handleBatchExport);
    return () => {
      window.removeEventListener('noa:batch-delete', handleBatchDelete);
      window.removeEventListener('noa:batch-export', handleBatchExport);
    };
  }, [sessions, currentSessionId, setSessions, setCurrentSessionId]);

  useEffect(() => {
    if (!hydrated) return;
    setIsSidebarOpen(window.innerWidth >= 768);
  }, [hydrated, setIsSidebarOpen]);

  useEffect(() => {
    const handleDriveSyncRequested = () => {
      void handleSync();
    };
    window.addEventListener('noa:drive-sync-requested', handleDriveSyncRequested);
    return () => window.removeEventListener('noa:drive-sync-requested', handleDriveSyncRequested);
  }, [handleSync]);

  useEffect(() => {
    if (!aiCapabilitiesLoaded) return;
    try {
      localStorage.setItem('noa_writing_access', hasAiAccess ? 'api' : 'manual');
    } catch {
      // Quota/private mode.
    }
  }, [hasAiAccess, aiCapabilitiesLoaded]);

  useEffect(() => {
    if (!hydrated || !currentSession) return;
    const manuscripts = currentSession.config.manuscripts ?? [];
    const completedCount = manuscripts.filter(manuscript => (manuscript.content?.length ?? 0) >= 3000).length;
    if (completedCount < 3) return;
    const key = `noa_translate_cta_${currentSessionId}`;
    try {
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
    } catch {
      // Quota.
    }
    window.dispatchEvent(new CustomEvent('noa:translate-cta', {
      detail: {
        sessionId: currentSessionId,
        episodeCount: completedCount,
      },
    }));
  }, [currentSession, currentSessionId, hydrated]);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsSidebarOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isCtrlLike = event.ctrlKey || event.metaKey;
      if (isCtrlLike && event.shiftKey && (event.key === 'H' || event.key === 'h')) {
        event.preventDefault();
        dispatchUi({ renameDialogOpen: true });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatchUi]);

  useEffect(() => {
    const handler = () => openQuickStart();
    window.addEventListener('noa:open-quickstart', handler);
    return () => window.removeEventListener('noa:open-quickstart', handler);
  }, [openQuickStart]);

  useEffect(() => {
    if (anyModalOpen) {
      previousFocusRef.current = document.activeElement;
    } else if (previousFocusRef.current && previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [anyModalOpen]);

  useEffect(() => {
    if (activeTab === 'writing') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageCount, isGenerating, activeTab, messagesEndRef]);
}
