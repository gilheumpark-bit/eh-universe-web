// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { showAlert } from '@/lib/show-alert';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { ChatSession, AppLanguage, AppTab, Project, Genre, StoryConfig, WritingMode } from '@/lib/studio-types';
import { exportEPUB, exportDOCX } from '@/lib/export-utils';
import { createT } from '@/lib/i18n';
import { trackExport } from '@/lib/analytics';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';
import { episodeToMarkdown } from '@/lib/markdown-serializer';

/** 번역 스튜디오 `downloadAllResults`와 동일한 대표 5형식 — 현재 프로젝트 전체 회차 원고 */
export type ProjectManuscriptFormat = 'txt' | 'md' | 'json' | 'html' | 'csv';

function manuscriptRowsFromProject(project: Project | null | undefined): { title: string; content: string }[] {
  if (!project?.sessions?.length) return [];
  return project.sessions.map((session, i) => {
    const title = session.config?.title || session.title || `Episode ${i + 1}`;
    const manuscripts = session.config?.manuscripts ?? [];
    let content: string;
    if (manuscripts.length > 0) {
      content = manuscripts
        .sort((a, b) => a.episode - b.episode)
        .map(m => m.content)
        .join('\n\n');
    } else {
      content = session.messages
        .filter(m => m.role === 'assistant')
        .map(m => m.content.replace(/```json[\s\S]*?```/g, '').trim())
        .join('\n\n');
    }
    return { title, content };
  });
}

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
  setActiveTab: (tab: AppTab) => void;
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

/** Export: per-session TXT/JSON/EPUB/DOCX, print HTML, project-wide manuscripts in 5 formats (txt/md/json/html/csv), full backup JSON, imports */
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
        let data: unknown = JSON.parse(ev.target?.result as string);

        // Unwrap { projects: Project[] } (일부 백업/외부 도구 형식)
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const wrap = data as Record<string, unknown>;
          if (
            Array.isArray(wrap.projects) &&
            wrap.projects.length > 0 &&
            isValidProject(wrap.projects[0])
          ) {
            data = wrap.projects;
          }
        }

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
        // Case 5: exportProjectJSON 봉투 { project, config, exportedAt? } — 이전에는 미지원이라 가져오기 실패
        else if (
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          Object.prototype.hasOwnProperty.call(data, 'project') &&
          Object.prototype.hasOwnProperty.call(data, 'config')
        ) {
          const env = data as { project: unknown; config: unknown };
          if (isValidProject(env.project)) {
            const proj = env.project;
            setProjects((prev) => {
              if (prev.some((p) => p.id === proj.id)) return prev;
              return [...prev, proj];
            });
            setCurrentProjectId(proj.id);
            if (proj.sessions.length > 0) {
              let pick = 0;
              const cfgRaw = env.config;
              if (cfgRaw && typeof cfgRaw === 'object' && !Array.isArray(cfgRaw)) {
                const cfg = cfgRaw as Partial<StoryConfig>;
                const idx = proj.sessions.findIndex(
                  (s) =>
                    s.config?.title === cfg.title &&
                    (cfg.episode === undefined || s.config?.episode === cfg.episode),
                );
                if (idx >= 0) pick = idx;
              }
              setCurrentSessionId(proj.sessions[pick].id);
            }
          } else if (
            (env.project === null || env.project === undefined) &&
            env.config &&
            typeof env.config === 'object' &&
            !Array.isArray(env.config)
          ) {
            ensureProject();
            const sid = currentSession?.id;
            if (!sid) {
              showAlert(t('studioExport.noValidSession'));
              return;
            }
            const patch = env.config as Partial<StoryConfig>;
            setSessions((prev) =>
              prev.map((s) =>
                s.id === sid ? { ...s, config: { ...s.config, ...patch }, lastUpdate: Date.now() } : s,
              ),
            );
          } else {
            showAlert(t('studioExport.invalidFormat'));
            return;
          }
        }
        else {
          showAlert(t('studioExport.invalidFormat'));
          return;
        }
        setActiveTab('writing');
      } catch (err) {
        logger.warn('StudioExport', 'JSON import parse failed', err);
        showAlert(t('studioExport.invalidJson'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [t, ensureProject, setSessions, setCurrentSessionId, setActiveTab, setProjects, setCurrentProjectId, currentSession]);

  // Import multiple text/markdown files
  const handleImportTextFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    ensureProject();
    const newSessions: ChatSession[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        
        const delimiterTxt = '='.repeat(60);
        
        const createNewImportedSession = (title: string, content: string): ChatSession => {
            const now = Date.now();
            const id = `session-${crypto.randomUUID()}`;
            return {
              id,
              title: title || '가져온 에피소드',
              config: { ...INITIAL_CONFIG, title: title || '가져온 에피소드', episode: newSessions.length + 1 },
              messages: [
                {
                  id: `msg-${Date.now()}-assistant`,
                  role: 'assistant',
                  content,
                  timestamp: now
                }
              ],
              lastUpdate: now
            };
        };
        
        if (text.includes(delimiterTxt)) {
            // It's from exportAllEpisodesTXT
            const parts = text.split(delimiterTxt);
            for (let j = 1; j < parts.length; j += 2) {
                const titleStr = parts[j].trim();
                const contentStr = (parts[j+1] || '').trim();
                if (titleStr || contentStr) {
                    newSessions.push(createNewImportedSession(titleStr, contentStr));
                }
            }
        } else if (text.startsWith('# ') || text.includes('\n## ')) {
            // It might be from exportMarkdown
            const parts = text.split(/^## /m);
            if (parts.length > 1) {
                for (let j = 1; j < parts.length; j++) {
                    const lines = parts[j].split('\n');
                    const titleStr = lines[0].trim();
                    let contentStr = lines.slice(1).join('\n').trim();
                    contentStr = contentStr.replace(/---+$/, '').trim();
                    newSessions.push(createNewImportedSession(titleStr, contentStr));
                }
            } else {
                 newSessions.push(createNewImportedSession(file.name.replace(/\.[^/.]+$/, ""), text));
            }
        } else {
            // Unstructured txt or single episode
            const title = file.name.replace(/\.[^/.]+$/, "");
            newSessions.push(createNewImportedSession(title, text));
        }
    }
    
    if (newSessions.length > 0) {
        setSessions(prev => {
            const result = [...newSessions, ...prev];
            // Re-assign episode IDs mapping to indices from the end so older is lower ep number mostly, actually let's just reverse and append appropriately or adjust indices. Best to keep simple:
            return result.map((s, idx) => ({ ...s, config: { ...s.config, episode: result.length - idx } }));
        });
        setCurrentSessionId(newSessions[0].id);
        setActiveTab('writing');
        showAlert(language === 'KO' ? '텍스트 파일 불러오기 완료' : (t('studioExport.importSuccess') || 'Import successfully'));
    }
    
    e.target.value = '';
  }, [ensureProject, setSessions, setCurrentSessionId, setActiveTab, language, t]);

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
        return `<div style="margin-bottom:24px;"><strong>${prefix}${escHtml(m.role.toUpperCase())}</strong><div style="white-space:pre-wrap;font-family:serif;line-height:1.8;margin-top:8px;">${escHtml(m.content)}</div></div>`;
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

  // Export full project config as JSON
  const exportProjectJSON = useCallback(() => {
    if (!currentSession) return;
    const payload = {
      project: projects.find(p => p.id === currentProjectId) ?? null,
      config: currentSession.config,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.config.title || 'project-config'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showExportToast('Project JSON');
    trackExport('project-json');
  }, [currentSession, projects, currentProjectId, showExportToast]);

  // 프로젝트 전체 회차 원고 — TXT/MD/JSON/HTML/CSV (번역 스튜디오 5형식과 대응)
  const exportProjectManuscripts = useCallback(
    (format: ProjectManuscriptFormat) => {
      const project = projects.find(p => p.id === currentProjectId);
      const rows = manuscriptRowsFromProject(project);
      if (!project || rows.length === 0) return;

      const date = new Date().toISOString().slice(0, 10);
      const safeName = (project.name || 'noa-project').replace(/[/\\?%*:|"<>]/g, '-');
      let blob: Blob;
      let ext: string;

      if (format === 'txt') {
        const total = rows.length;
        const parts: string[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const title = r.title || `Episode ${i + 1}`;
          parts.push(`${'='.repeat(60)}\n${title}\n${'='.repeat(60)}\n\n${r.content}`);
          if (total > 5) {
            window.dispatchEvent(new CustomEvent('noa:export-progress', {
              detail: { current: i + 1, total, format: 'TXT' },
            }));
          }
        }
        blob = new Blob([parts.join('\n\n\n')], { type: 'text/plain;charset=utf-8' });
        ext = 'txt';
        showExportToast('All Episodes TXT');
        trackExport('all-episodes-txt');
      } else if (format === 'md') {
        const mdParts: string[] = [`# ${project.name}\n`];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          mdParts.push(`## ${r.title || `Episode ${i + 1}`}\n\n${r.content}`);
          if (rows.length > 5) {
            window.dispatchEvent(new CustomEvent('noa:export-progress', {
              detail: { current: i + 1, total: rows.length, format: 'MD' },
            }));
          }
        }
        blob = new Blob([mdParts.join('\n\n---\n\n')], { type: 'text/markdown;charset=utf-8' });
        ext = 'md';
        showExportToast('Markdown');
        trackExport('markdown');
      } else if (format === 'json') {
        blob = new Blob(
          [JSON.stringify(rows.map(r => ({ title: r.title, content: r.content })), null, 2)],
          { type: 'application/json;charset=utf-8' },
        );
        ext = 'json';
        showExportToast('JSON');
        trackExport('project-manuscripts-json');
      } else if (format === 'html') {
        const escHtml = (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const body = rows
          .map(
            r =>
              `<section><h2>${escHtml(r.title)}</h2><div style="white-space:pre-wrap;font-family:serif;line-height:1.7;">${escHtml(r.content)}</div></section>`,
          )
          .join('<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">');
        const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>${escHtml(project.name)}</title><style>body{max-width:800px;margin:40px auto;padding:0 20px;font-family:sans-serif;color:#333}</style></head><body><h1>${escHtml(project.name)}</h1><p style="color:#888">${escHtml(date)}</p><hr/>${body}</body></html>`;
        blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        ext = 'html';
        showExportToast('HTML');
        trackExport('project-manuscripts-html');
      } else {
        const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
        const csv =
          '\uFEFF' +
          ['Episode', 'Content'].map(q).join(',') +
          '\n' +
          rows.map(r => `${q(r.title)},${q(r.content)}`).join('\n');
        blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        ext = 'csv';
        showExportToast('CSV');
        trackExport('project-manuscripts-csv');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-manuscripts-${date}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [projects, currentProjectId, showExportToast],
  );

  const exportAllEpisodesTXT = useCallback(() => {
    exportProjectManuscripts('txt');
  }, [exportProjectManuscripts]);

  const exportMarkdown = useCallback(() => {
    exportProjectManuscripts('md');
  }, [exportProjectManuscripts]);

  // Export individual episode manuscripts as separate .md files with YAML frontmatter
  const exportAsMarkdown = useCallback(() => {
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    // Gather all manuscripts from all sessions in the project
    const allManuscripts = project.sessions
      .flatMap(s => s.config?.manuscripts ?? [])
      .filter(m => m && m.content);

    if (allManuscripts.length === 0) {
      // Fallback: build manuscripts from session messages
      const rows = manuscriptRowsFromProject(project);
      if (rows.length === 0) return;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const md = episodeToMarkdown({
          episode: i + 1,
          title: r.title,
          content: r.content,
          charCount: r.content.length,
          lastUpdate: Date.now(),
        }, 1);

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ep-${String(i + 1).padStart(3, '0')}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      // Export each manuscript as its own .md file with frontmatter
      for (const ms of allManuscripts) {
        const vol = ms.volume ?? 1;
        const md = episodeToMarkdown(ms, vol);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ep-${String(ms.episode).padStart(3, '0')}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }

    showExportToast('Markdown (YAML)');
    trackExport('markdown');
  }, [projects, currentProjectId, showExportToast]);

  return {
    exportTXT,
    exportJSON,
    exportAllJSON,
    handleImportJSON,
    handleImportTextFiles,
    handlePrint,
    handleExportEPUB,
    handleExportDOCX,
    exportProjectJSON,
    exportProjectManuscripts,
    exportAllEpisodesTXT,
    exportMarkdown,
    exportAsMarkdown,
  };
}
