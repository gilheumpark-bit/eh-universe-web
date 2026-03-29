import React, { useState } from 'react';
import { AppLanguage, AppTab, ChatSession, Project } from '@/lib/studio-types';
import GenreReviewChat from '@/components/studio/GenreReviewChat';
import { Edit3, Upload, Printer, X } from 'lucide-react';
import { createT } from '@/lib/i18n';

interface HistoryTabProps {
  language: AppLanguage;
  archiveScope: 'project' | 'all';
  setArchiveScope: (scope: 'project' | 'all') => void;
  archiveFilter: string;
  setArchiveFilter: (filter: string) => void;
  projects: Project[];
  sessions: ChatSession[];
  currentProject: Project | null;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  setActiveTab: (tab: AppTab) => void;
  startRename: (id: string, title: string) => void;
  renamingSessionId: string | null;
  setRenamingSessionId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (val: string) => void;
  confirmRename: () => void;
  moveSessionToProject: (sid: string, pid: string) => void;
  handlePrint: (session?: ChatSession) => void;
  deleteSession: (id: string) => void;
  currentSession: ChatSession | null;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  language,
  archiveScope,
  setArchiveScope,
  archiveFilter,
  setArchiveFilter,
  projects,
  sessions,
  currentProject,
  currentProjectId,
  setCurrentProjectId,
  currentSessionId,
  setCurrentSessionId,
  setActiveTab,
  startRename,
  renamingSessionId,
  setRenamingSessionId,
  renameValue,
  setRenameValue,
  confirmRename,
  moveSessionToProject,
  handlePrint,
  deleteSession,
  currentSession
}) => {
  const t = createT(language);
  const [moveModal, setMoveModal] = useState<{ sessionId: string; others: Project[] } | null>(null);

  const allSessions: (ChatSession & { _projectName?: string; _projectId?: string })[] = archiveScope === 'all'
    ? projects.flatMap(p => p.sessions.map(s => ({ ...s, _projectName: p.name, _projectId: p.id })))
    : sessions.map(s => ({ ...s, _projectName: currentProject?.name, _projectId: currentProjectId ?? undefined }));

  const genres = Array.from(new Set(allSessions.map(s => s.config.genre)));
  const hasWorldData = allSessions.some(s => s.config.worldSimData?.civs?.length);

  const categories = [
    { key: 'ALL', label: t('archive.all') },
    ...genres.map(g => ({ key: g, label: g })),
    ...(hasWorldData ? [{ key: 'WORLD', label: t('archive.world') }] : []),
  ];

  const filtered = allSessions.filter(s => {
    if (archiveFilter === 'ALL') return true;
    if (archiveFilter === 'WORLD') return (s.config.worldSimData?.civs?.length ?? 0) > 0;
    return s.config.genre === archiveFilter;
  }).sort((a, b) => b.lastUpdate - a.lastUpdate);

  return (
    <div className="p-4 md:p-10">
      {/* Archive Header: scope toggle + category filter */}
      <div className="mb-6 space-y-3">
        {projects.length > 1 && (
          <div className="flex gap-1.5">
            <button onClick={() => setArchiveScope('project')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveScope === 'project' ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
              {t('archive.currentProject')}
            </button>
            <button onClick={() => setArchiveScope('all')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveScope === 'all' ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
              {t('archive.allProjects')}
            </button>
          </div>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setArchiveFilter(cat.key)} className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveFilter === cat.key ? 'bg-blue-600/15 border-blue-500/30 text-blue-400' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
              {cat.label}
              <span className="ml-1 text-[8px] opacity-50">
                {cat.key === 'ALL' ? allSessions.length : cat.key === 'WORLD' ? allSessions.filter(s => (s.config.worldSimData?.civs?.length ?? 0) > 0).length : allSessions.filter(s => s.config.genre === cat.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Session Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-text-tertiary font-bold uppercase tracking-widest font-[family-name:var(--font-mono)]">{t('engine.noArchive')}</div>
        ) : (
          filtered.map(s => (
            <div
              key={s.id}
              onClick={() => {
                if (s._projectId && s._projectId !== currentProjectId) setCurrentProjectId(s._projectId);
                setCurrentSessionId(s.id);
                setActiveTab('writing');
              }}
              className={`relative group p-6 bg-bg-secondary border border-border rounded-2xl cursor-pointer hover:border-accent-purple transition-all ${currentSessionId === s.id ? 'border-accent-purple ring-1 ring-accent-purple' : ''}`}
            >
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 z-10">
                <button onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }} aria-label="이름 변경" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all"><Edit3 className="w-3 h-3" /></button>
                {projects.length > 1 && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    const others = projects.filter(p => p.id !== (s._projectId || currentProjectId));
                    if (others.length === 1) {
                      moveSessionToProject(s.id, others[0].id);
                    } else if (others.length > 1) {
                      setMoveModal({ sessionId: s.id, others });
                    }
                  }} aria-label="이동" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all" title={t('project.moveSession')}><Upload className="w-3 h-3" /></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handlePrint(s); }} aria-label="인쇄" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-text-primary transition-all"><Printer className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} aria-label="삭제" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-red transition-all"><X className="w-3 h-3" /></button>
              </div>
              {renamingSessionId === s.id ? (
                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingSessionId(null); }}
                  onBlur={confirmRename} onClick={e => e.stopPropagation()}
                  className="font-black text-sm mb-2 pr-16 w-full bg-transparent border-b border-accent-purple outline-none" />
              ) : (
                <h4 className="font-black text-sm mb-2 pr-16 truncate">{s.title}</h4>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 bg-bg-tertiary/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">{s.config.genre}</span>
                <span className="px-1.5 py-0.5 bg-bg-tertiary/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">EP.{s.config.episode}</span>
                {s.messages.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-bg-tertiary/80 rounded text-[8px] font-bold text-text-tertiary font-[family-name:var(--font-mono)]">{s.messages.length} msg</span>
                )}
                {(s.config.worldSimData?.civs?.length ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400 font-[family-name:var(--font-mono)]">
                    {t('archive.worldLabel')} · {s.config.worldSimData!.civs!.length}
                  </span>
                )}
                {archiveScope === 'all' && s._projectName && (
                  <span className="px-1.5 py-0.5 bg-purple-900/20 border border-purple-500/15 rounded text-[8px] font-bold text-purple-400/70 font-[family-name:var(--font-mono)]">{s._projectName}</span>
                )}
              </div>
              <div className="mt-2 text-[8px] text-text-tertiary font-[family-name:var(--font-mono)]">
                {new Date(s.lastUpdate).toLocaleDateString(language === 'KO' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Genre×Level Reviewer Chat */}
      {currentSession && (
        <div className="mt-8">
          <GenreReviewChat
            language={language}
            config={currentSession.config}
            manuscriptText={currentSession.messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n')}
          />
        </div>
      )}

      {/* Move Session Modal */}
      {moveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setMoveModal(null)}>
          <div className="bg-bg-primary border border-border rounded-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase tracking-widest">{t('project.moveSession')}</h3>
            <select
              autoFocus
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-accent-purple"
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  moveSessionToProject(moveModal.sessionId, e.target.value);
                  setMoveModal(null);
                }
              }}
            >
              <option value="" disabled>{language === 'KO' ? '프로젝트 선택...' : 'Select project...'}</option>
              {moveModal.others.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={() => setMoveModal(null)} className="w-full py-2 text-xs font-black uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors">
              {language === 'KO' ? '취소' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
