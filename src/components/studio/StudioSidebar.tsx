import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Zap, Plus, Globe, UserCircle, FileText, PenTool, Edit3, History, 
  Download, Upload, Cloud, CloudOff, Settings 
} from 'lucide-react';
import { AppLanguage, AppTab, Project, ChatSession } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

interface StudioSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  focusMode: boolean;
  projects: Project[];
  createNewProject: () => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  setCurrentSessionId: (id: string | null) => void;
  currentProject: Project | null;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  createNewSession: () => void;
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  exportTXT: () => void;
  exportJSON: () => void;
  handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportAllJSON: () => void;
  handleExportEPUB: () => void;
  handleExportDOCX: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  user: any;
  signInWithGoogle: () => void;
  signOut: () => void;
  authConfigured: boolean;
  handleSync: () => void;
  syncStatus: string;
  lastSyncTime: number | null;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const StudioSidebar: React.FC<StudioSidebarProps> = ({
  isSidebarOpen, setIsSidebarOpen, focusMode,
  projects, createNewProject, currentProjectId, setCurrentProjectId, setCurrentSessionId, currentProject, renameProject, deleteProject,
  createNewSession, activeTab, handleTabChange,
  exportTXT, exportJSON, handleImportJSON, exportAllJSON, handleExportEPUB, handleExportDOCX, fileInputRef,
  user, signInWithGoogle, signOut, authConfigured,
  handleSync, syncStatus, lastSyncTime,
  language, setLanguage
}) => {
  const t = createT(language);

  const navItems = [
    { tab: 'world' as AppTab, icon: Globe, label: t('sidebar.worldStudio') },
    { tab: 'characters' as AppTab, icon: UserCircle, label: t('sidebar.characterStudio') },
    { tab: 'rulebook' as AppTab, icon: FileText, label: t('sidebar.rulebook') },
    { tab: 'writing' as AppTab, icon: PenTool, label: t('sidebar.writingMode') },
    { tab: 'style' as AppTab, icon: Edit3, label: t('sidebar.styleStudio') },
    { tab: 'manuscript' as AppTab, icon: FileText, label: t('ui.manuscript') },
    { tab: 'history' as AppTab, icon: History, label: t('sidebar.archives') },
  ];

  return (
    <aside className={`fixed md:relative inset-y-0 left-0 bg-bg-primary border-r border-border transition-transform md:transition-all duration-300 flex flex-col z-50 overflow-hidden ${focusMode ? '-translate-x-full md:translate-x-0 md:w-0' : isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-0'}`}>
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
          <Zap className="w-6 h-6 text-accent-purple" />
          <div>
            <h1 className="text-lg font-black italic tracking-tighter font-[family-name:var(--font-mono)]">NOA STUDIO</h1>
            <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] tracking-widest uppercase">← EH UNIVERSE</span>
          </div>
        </Link>

        {/* Project Selector */}
        <div className="mb-3 space-y-1">
          {projects.length === 0 ? (
            <button onClick={createNewProject} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary border border-dashed border-border rounded-xl text-[10px] font-bold text-text-tertiary hover:text-accent-purple hover:border-accent-purple transition-all font-[family-name:var(--font-mono)]">
              <Plus className="w-3.5 h-3.5" /> {t('project.newProject')}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <select
                  value={currentProjectId || ''}
                  onChange={e => { setCurrentProjectId(e.target.value); setCurrentSessionId(null); }}
                  className="flex-1 bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] outline-none text-text-primary truncate"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sessions.length})</option>
                  ))}
                </select>
                <button onClick={createNewProject} className="p-1.5 bg-bg-secondary border border-border rounded-lg text-text-tertiary hover:text-accent-purple transition-colors" title={t('project.newProject')}>
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {currentProject && (
                <div className="flex gap-1 text-[8px] font-[family-name:var(--font-mono)]">
                  <button onClick={() => {
                    const name = window.prompt(t('project.renameProject'), currentProject.name);
                    if (name) renameProject(currentProject.id, name);
                  }} className="text-text-tertiary hover:text-accent-purple">{t('project.renameProject')}</button>
                  {projects.length > 1 && (
                    <button onClick={() => deleteProject(currentProject.id)} className="text-text-tertiary hover:text-accent-red">{t('project.deleteProject')}</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-bg-tertiary transition-all mb-6 border border-border font-[family-name:var(--font-mono)]">
          <Plus className="w-4 h-4" /> {t('sidebar.newProject')}
        </button>

        <nav className="space-y-1">
          {navItems.map(({ tab, icon: Icon, label }) => (
            <button key={tab} onClick={() => handleTabChange(tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${activeTab === tab ? 'bg-accent-purple/20 text-accent-purple shadow-lg' : 'text-text-tertiary hover:bg-bg-secondary'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-border space-y-3">
        {/* Export / Import */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={exportTXT} disabled={!currentProject} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)]">
            <Download className="w-3 h-3" /> TXT
          </button>
          <button onClick={exportJSON} disabled={!currentProject} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)]">
            <Download className="w-3 h-3" /> JSON
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)]">
            <Upload className="w-3 h-3" /> {t('export.import')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        </div>
        
        {/* Sync & Auth */}
        {user ? (
          <div className="flex items-center gap-2 py-1">
            <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center text-[9px] font-bold text-accent-purple overflow-hidden">
              {user.photoURL ? <Image src={user.photoURL} alt="" width={24} height={24} className="w-full h-full object-cover" /> : user.displayName?.[0] || '?'}
            </div>
            <span className="text-[9px] text-text-secondary truncate flex-1">{user.displayName || user.email}</span>
            <button onClick={signOut} className="text-[8px] text-text-tertiary hover:text-accent-red font-bold">{t('confirm.logout')}</button>
          </div>
        ) : (
          <button onClick={signInWithGoogle} disabled={!authConfigured} className="w-full py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-secondary hover:text-text-primary font-[family-name:var(--font-mono)] transition-colors">
            🔑 {t('auth.googleLogin')}
          </button>
        )}

        {user && (
          <button onClick={handleSync} disabled={syncStatus === 'syncing'} className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold font-[family-name:var(--font-mono)] transition-all border ${syncStatus === 'syncing' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30 animate-pulse' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'}`}>
            {syncStatus === 'syncing' ? <Cloud className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
            {syncStatus === 'syncing' ? t('sync.syncing') : t('sync.syncNow')}
          </button>
        )}

        <div className="flex gap-4 pt-2">
          {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
            <button key={l} onClick={() => setLanguage(l)} className={`text-[10px] font-black font-[family-name:var(--font-mono)] ${language === l ? 'text-accent-purple' : 'text-text-tertiary'}`}>{l}</button>
          ))}
        </div>
        
        <button onClick={() => handleTabChange('settings')} className={`flex items-center gap-2 text-xs font-bold transition-colors font-[family-name:var(--font-mono)] ${activeTab === 'settings' ? 'text-accent-purple' : 'text-text-tertiary hover:text-text-primary'}`}>
          <Settings className="w-4 h-4" /> {t('sidebar.settings')}
        </button>
      </div>
    </aside>
  );
};

export default StudioSidebar;
