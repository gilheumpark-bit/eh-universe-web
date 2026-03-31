import { useCallback } from 'react';
import type { ChatSession, AppTab, AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

export function useStudioSessionActions({
  language,
  sessions,
  currentSessionId,
  setSessions,
  doDeleteSession,
  doClearAllSessions,
  showConfirm,
  closeConfirm,
  setActiveTab,
  setRenamingSessionId,
  setRenameValue,
  renamingSessionId,
  renameValue,
}: {
  language: AppLanguage;
  sessions: ChatSession[];
  currentSessionId: string | null;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  doDeleteSession: (id: string) => void;
  doClearAllSessions: () => void;
  showConfirm: (state: any) => void;
  closeConfirm: () => void;
  setActiveTab: (tab: AppTab) => void;
  setRenamingSessionId: (id: string | null) => void;
  setRenameValue: (val: string) => void;
  renamingSessionId: string | null;
  renameValue: string;
}) {
  const t = createT(language);

  const deleteSession = (sessionIdToDelete: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionIdToDelete);
    if (!sessionToDelete) return;
    showConfirm({
      title: t('confirm.deleteSession'),
      message: `'${sessionToDelete.title}'${t('confirm.deleteSessionMsg')}`,
      confirmLabel: t('confirm.delete'),
      cancelLabel: t('confirm.cancel'),
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doDeleteSession(sessionIdToDelete); if (sessions.length <= 1) setActiveTab('world'); },
    });
  };

  const clearAllSessions = () => {
    showConfirm({
      title: t('confirm.deleteAll'),
      message: t('confirm.deleteAllMsg'),
      confirmLabel: t('confirm.deleteAllConfirm'),
      cancelLabel: t('confirm.cancel'),
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doClearAllSessions(); setActiveTab('world'); },
    });
  };

  const startRename = (sessionId: string, currentTitle: string) => {
    setRenamingSessionId(sessionId);
    setRenameValue(currentTitle);
  };

  const confirmRename = () => {
    if (!renamingSessionId || !renameValue.trim()) return;
    setSessions(prev => prev.map(s =>
      s.id === renamingSessionId ? { ...s, title: renameValue.trim() } : s
    ));
    setRenamingSessionId(null);
    setRenameValue('');
  };

  const handleReorderSessions = useCallback((fromIndex: number, toIndex: number) => {
    setSessions(prev => {
      const sorted = [...prev].sort((a, b) => a.lastUpdate - b.lastUpdate);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return sorted.map((s, i) => ({ ...s, lastUpdate: i + 1 }));
    });
  }, [setSessions]);

  const handleVersionSwitch = useCallback((messageId: string, versionIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== messageId || !m.versions) return m;
        const content = m.versions[versionIndex];
        if (content == null) return m;
        return { ...m, content, currentVersionIndex: versionIndex };
      });
      return { ...s, messages: msgs };
    }));
  }, [currentSessionId, setSessions]);

  const handleTypoFix = useCallback((messageId: string, index: number, original: string, suggestion: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== messageId) return m;
        const fixed = m.content.slice(0, index) + suggestion + m.content.slice(index + original.length);
        return { ...m, content: fixed };
      });
      return { ...s, messages: msgs };
    }));
  }, [currentSessionId, setSessions]);

  return {
    deleteSession,
    clearAllSessions,
    startRename,
    confirmRename,
    handleReorderSessions,
    handleVersionSwitch,
    handleTypoFix,
  };
}
