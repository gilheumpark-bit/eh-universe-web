// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { showAlert } from '@/lib/show-alert';
import { useCallback } from 'react';
import { ChatSession, AppLanguage, AppTab, Project, Genre } from '@/lib/studio-types';
import { exportEPUB, exportDOCX } from '@/lib/export-utils';
import { createT } from '@/lib/i18n';
import { trackExport } from '@/lib/analytics';

type WritingMode = 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';

interface UseStudioExportParams {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentProjectId: string | null;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setCurrentProjectId: (id: string | null) => void;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>> | ((updater: (prev: ChatSession[]) => ChatSession[]) => void);
  setCurrentSessionId: (id: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<AppTab>>;
  isKO: boolean;
  language: AppLanguage;
  writingMode: WritingMode;
  editDraft: string;
}

// ============================================================
// PART 2 — Validation helper
// ============================================================

const isValidSession = (s: unknown): s is ChatSession => {
  if (!s || typeof s !== 'object') return false;
  const obj = s as Record<string, unknown>;
  return typeof obj.id === 'string' && Array.isArray(obj.messages);
};

const isValidProject = (p: unknown): p is Project => {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.name === 'string' && Array.isArray(obj.sessions);
};

// ============================================================
// PART 3 — Hook implementation
// ============================================================

export function useStudioExport({
  currentSession,
  sessions: _sessions,
  currentSessionId: _currentSessionId,
  currentProjectId,
  projects,
  setProjects,
  setCurrentProjectId,
  setSessions,
  setCurrentSessionId,
  setActiveTab,
  isKO: _isKO,
  language,
  writingMode,
  editDraft,
}: UseStudioExportParams) {
  const t = createT(language);

  // Toast helper — 내보내기 완료 알림
  const showExportToast = useCallback((format: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('noa:export-done', { detail: { format } }));
    }
  }, []);

  // Export session as TXT
  const exportTXT = useCallback(() => {
    if (!currentSession) return;
    const lines = currentSession.messages.map(m => {
      const prefix = m.role === 'user' ? '[USER]' : '[NOW]';
      return `${prefix}\n${m.content}\n`;
    });
    const header = `# ${currentSession.config.title || currentSession.title}\n# Genre: ${currentSession.config.genre} | Episode: ${currentSession.config.episode}\n# Exported: ${new Date().toISOString()}\n\n`;
    const blob = new Blob([header + lines.join('\n---\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.title || 'noa-story'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showExportToast('TXT');
  }, [currentSession, showExportToast]);

  // Export session as JSON backup
  const exportJSON = useCallback(() => {
    if (!currentSession) return;
    const blob = new Blob([JSON.stringify(currentSession, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.title || 'noa-session'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showExportToast('JSON');
  }, [currentSession, showExportToast]);

  // Export ALL projects (full backup) as JSON
  const exportAllJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noa-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projects]);

  // Helper: ensure a project exists before importing sessions
  const ensureProject = useCallback((): void => {
    if (currentProjectId != null) return;
    const p: Project = {
      id: 'project-default',
      name: '미분류',
      description: '',
      genre: Genre.SF,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      sessions: [],
    };
    setProjects(prev => [...prev, p]);
    setCurrentProjectId(p.id);
  }, [currentProjectId, setProjects, setCurrentProjectId]);

  // Import JSON backup
  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showAlert('File too large (max 10MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);

        // Case 1: Full backup — Project[] (from exportAllJSON / BACKUP)
        if (Array.isArray(data) && data.length > 0 && isValidProject(data[0])) {
          const validProjects = data.filter(isValidProject);
          if (validProjects.length === 0) { showAlert(t('studioExport.noValidSession')); return; }
          setProjects(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newProjects = validProjects.filter(p => !existingIds.has(p.id));
            return [...prev, ...newProjects];
          });
          // Switch to first imported project's first session
          const firstProj = validProjects[0];
          setCurrentProjectId(firstProj.id);
          if (firstProj.sessions.length > 0) setCurrentSessionId(firstProj.sessions[0].id);
        }
        // Case 2: Session array — ChatSession[]
        else if (Array.isArray(data)) {
          ensureProject();
          const valid = data.filter(isValidSession);
          if (valid.length === 0) { showAlert(t('studioExport.noValidSession')); return; }
          setSessions(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const deduped = valid.filter(s => !existingIds.has(s.id));
            if (deduped.length > 0) setCurrentSessionId(deduped[0].id);
            return [...deduped, ...prev];
          });
        }
        // Case 3: Single session
        else if (isValidSession(data)) {
          ensureProject();
          setSessions(prev => {
            if (prev.some(s => s.id === data.id)) return prev;
            return [data, ...prev];
          });
          setCurrentSessionId(data.id);
        }
        // Case 4: Single project
        else if (isValidProject(data)) {
          setProjects(prev => {
            if (prev.some(p => p.id === data.id)) return prev;
            return [...prev, data];
          });
          setCurrentProjectId(data.id);
          if (data.sessions.length > 0) setCurrentSessionId(data.sessions[0].id);
        }
        else {
          showAlert(t('studioExport.invalidFormat'));
          return;
        }
        setActiveTab('writing');
      } catch {
        showAlert(t('studioExport.invalidJson'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [t, ensureProject, setSessions, setCurrentSessionId, setActiveTab]);

  // Print — accepts an optional session to print a specific history card
  const handlePrint = useCallback((targetSession?: ChatSession) => {
    const session = targetSession ?? currentSession;
    if (!session) return;
    const escHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const isEditMode = !targetSession && writingMode === 'edit' && editDraft.trim();
    const printContent = isEditMode
      ? `<div style="white-space:pre-wrap;font-family:serif;line-height:1.8;">${escHtml(editDraft)}</div>`
      : session.messages.map(m => {
        const prefix = m.role === 'user' ? '\u{1F4DD} ' : '\u{1F916} ';
        return `<div style="margin-bottom:24px;"><strong>${prefix}${m.role.toUpperCase()}</strong><div style="white-space:pre-wrap;font-family:serif;line-height:1.8;margin-top:8px;">${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>`;
      }).join('<hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${escHtml(session.title)}</title><style>body{max-width:800px;margin:40px auto;padding:0 20px;font-family:sans-serif;color:#333;}@media print{body{margin:0;}}</style></head><body><h1>${escHtml(session.title)}</h1><p style="color:#888;">${escHtml(session.config.genre)} | EP.${session.config.episode} | ${new Date().toLocaleDateString()}${isEditMode ? ` | ${language === 'KO' ? '수동 편집' : 'Manual Edit'}` : ''}</p><hr>${printContent}</body></html>`);
    w.document.close();
    w.print();
  }, [currentSession, writingMode, editDraft, language]);

  // Export as EPUB
  const handleExportEPUB = useCallback(() => {
    if (!currentSession) return;
    exportEPUB(currentSession);
    trackExport('epub');
    showExportToast('EPUB');
  }, [currentSession, showExportToast]);

  // Export as DOCX
  const handleExportDOCX = useCallback(() => {
    if (!currentSession) return;
    exportDOCX(currentSession);
    trackExport('docx');
    showExportToast('DOCX');
  }, [currentSession, showExportToast]);

  return {
    exportTXT,
    exportJSON,
    exportAllJSON,
    handleImportJSON,
    handlePrint,
    handleExportEPUB,
    handleExportDOCX,
  };
}
