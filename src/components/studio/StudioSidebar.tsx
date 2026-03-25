"use client";

// ============================================================
// PART 0 — IMPORTS & TYPES
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap, Plus, Globe, UserCircle, FileText, PenTool, Edit3, History,
  Download, Upload, Cloud, CloudOff, Settings, X, BookOpen, Hash,
} from 'lucide-react';
import { AppLanguage, AppTab, Project, ChatSession } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

type ConfirmOpts = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
};

interface StudioSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  focusMode: boolean;
  projects: Project[];
  createNewProject: () => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  currentProject: Project | null;
  sessions: ChatSession[];
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  createNewSession: () => void;
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  studioMode: 'guided' | 'free';
  setStudioMode: (mode: 'guided' | 'free') => void;
  exportTXT: () => void;
  exportJSON: () => void;
  handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportAllJSON: () => void;
  handleExportEPUB: () => void;
  handleExportDOCX: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
  signInWithGoogle: () => void;
  signOut: () => void;
  authConfigured: boolean;
  handleSync: () => void;
  syncStatus: string;
  lastSyncTime: number | null;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  showConfirm: (opts: ConfirmOpts) => void;
  closeConfirm: () => void;
}

// IDENTITY_SEAL: PART-0 | role=imports and types | inputs=none | outputs=StudioSidebarProps

// ============================================================
// PART 1 — COMPONENT SHELL & HEADER
// ============================================================

const StudioSidebar: React.FC<StudioSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  focusMode,
  projects,
  createNewProject,
  currentProjectId,
  setCurrentProjectId,
  currentSessionId,
  setCurrentSessionId,
  currentProject,
  sessions,
  renameProject,
  deleteProject,
  createNewSession,
  activeTab,
  handleTabChange,
  studioMode,
  setStudioMode,
  exportTXT,
  exportJSON,
  handleImportJSON,
  exportAllJSON,
  handleExportEPUB,
  handleExportDOCX,
  fileInputRef,
  user,
  signInWithGoogle,
  signOut,
  authConfigured,
  handleSync,
  syncStatus,
  lastSyncTime,
  language,
  setLanguage,
  showConfirm,
  closeConfirm,
}) => {
  const t = createT(language);
  const [showSessionList, setShowSessionList] = useState(false);
  const [jumpValue, setJumpValue] = useState('');

  const exportButtonClass =
    'flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary transition-all hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-35';
  const languageButtonClass =
    'rounded-full border px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] transition-all';
  const lastSyncLabel = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Sessions in chronological order (ep #1 = first created)
  const orderedSessions = [...sessions].sort((a, b) => a.lastUpdate - b.lastUpdate);

  function handleEpisodeJump() {
    const idx = parseInt(jumpValue, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= orderedSessions.length) return;
    setCurrentSessionId(orderedSessions[idx].id);
    setShowSessionList(false);
    setJumpValue('');
  }

  return (
    <aside
      className={`fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 md:transition-all ${
        focusMode
          ? '-translate-x-full md:translate-x-0 md:w-0'
          : isSidebarOpen
          ? 'translate-x-0 w-80'
          : '-translate-x-full md:translate-x-0 md:w-0'
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden px-2 py-2 md:px-3 md:py-3">
        <div className="premium-panel-soft flex h-full flex-col overflow-hidden border-white/8">

          {/* Collapse toggle */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="hidden md:flex items-center justify-center gap-1 py-1.5 border-b border-white/8 text-[9px] font-[family-name:var(--font-mono)] text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-widest"
          >
            ◀ {language === 'KO' ? '접기' : 'Collapse'}
          </button>

          {/* Header: logo + project selector + new session */}
          <div className="border-b border-white/8 px-4 py-3">
            <div className="mb-3 flex items-start justify-between gap-2">
              <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(202,161,92,0.22)] bg-[linear-gradient(135deg,rgba(202,161,92,0.2),rgba(92,143,214,0.14))] text-[rgba(246,226,188,0.94)] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="site-kicker text-[0.62rem]">Narrative Workbench</div>
                  <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.04em] text-text-primary">
                    NOA Studio
                  </h1>
                  <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
                    EH Universe
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-text-secondary transition-all hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary md:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-[1.125rem] w-[1.125rem]" />
              </button>
            </div>

            {/* Project selector */}
            <div className="rounded-[1.25rem] border border-white/8 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="site-kicker text-[0.58rem]">{t('sidebar.activeProject')}</span>
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {projects.length} projects
                </span>
              </div>

              {projects.length === 0 ? (
                <button
                  onClick={createNewProject}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(202,161,92,0.28)] bg-[rgba(202,161,92,0.08)] py-4 font-[family-name:var(--font-mono)] text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(246,226,188,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[rgba(202,161,92,0.12)]"
                >
                  <Plus className="h-4 w-4" /> {t('project.newProject')}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      value={currentProjectId || ''}
                      onChange={e => { setCurrentProjectId(e.target.value); setCurrentSessionId(null); }}
                      className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 font-[family-name:var(--font-mono)] text-[12px] font-semibold text-text-primary outline-none transition-colors hover:border-[rgba(202,161,92,0.2)]"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sessions.length})</option>
                      ))}
                    </select>
                    <button
                      onClick={createNewProject}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-text-secondary transition-all hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary"
                      title={t('project.newProject')}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {currentProject && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold">
                      <button
                        onClick={() => {
                          const name = window.prompt(t('project.renameProject'), currentProject.name);
                          if (name) renameProject(currentProject.id, name);
                        }}
                        className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-text-secondary transition-all hover:border-[rgba(92,143,214,0.28)] hover:text-text-primary"
                      >
                        {t('project.renameProject')}
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={() => deleteProject(currentProject.id)}
                          className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-text-secondary transition-all hover:border-accent-red/30 hover:text-accent-red"
                        >
                          {t('project.deleteProject')}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={createNewSession}
              className="premium-button mt-3 flex w-full justify-center rounded-[1.1rem] px-4 py-3 text-[11px]"
            >
              <Plus className="h-4 w-4" /> {t('sidebar.newProject')}
            </button>
          </div>

          {/* IDENTITY_SEAL: PART-1 | role=header (logo, project selector, new session) | inputs=projects,currentProject | outputs=UI */}

          {/* ============================================================
              PART 2 — NAV: mode toggle + tabs + episode jump
              ============================================================ */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Studio mode toggle */}
            <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2">
              <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                {studioMode === 'guided'
                  ? (language === 'KO' ? '가이드 모드' : 'Guided Mode')
                  : (language === 'KO' ? '자유 모드' : 'Free Mode')}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = studioMode === 'guided' ? 'free' : 'guided';
                  setStudioMode(next);
                  localStorage.setItem('noa_studio_mode', next);
                }}
                className={`relative h-5 w-10 rounded-full transition-colors ${
                  studioMode === 'free' ? 'bg-[rgba(92,143,214,0.7)]' : 'bg-white/12'
                }`}
                aria-label={language === 'KO' ? '모드 전환' : 'Toggle mode'}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
                    studioMode === 'free' ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Nav tabs */}
            <nav className="space-y-1">
              {([
                { tab: 'world' as AppTab, icon: Globe, label: t('sidebar.worldStudio'), guided: true },
                { tab: 'characters' as AppTab, icon: UserCircle, label: t('sidebar.characterStudio'), guided: true },
                { tab: 'rulebook' as AppTab, icon: FileText, label: t('sidebar.rulebook'), guided: true },
                { tab: 'writing' as AppTab, icon: PenTool, label: t('sidebar.writingMode'), guided: false },
                { tab: 'style' as AppTab, icon: Edit3, label: t('sidebar.styleStudio'), guided: false },
                { tab: 'manuscript' as AppTab, icon: FileText, label: t('ui.manuscript'), guided: false },
                { tab: 'history' as AppTab, icon: History, label: t('sidebar.archives'), guided: false },
                { tab: 'docs' as AppTab, icon: BookOpen, label: language === 'KO' ? '사용설명서' : 'User Guide', guided: true },
              ] as const)
                .filter(item => studioMode === 'free' || item.guided)
                .map(({ tab, icon: Icon, label }) => (
                  <button
                    key={tab}
                    data-testid={`tab-${tab}`}
                    onClick={() => handleTabChange(tab)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                      activeTab === tab
                        ? 'border border-[rgba(202,161,92,0.24)] bg-[linear-gradient(135deg,rgba(202,161,92,0.16),rgba(92,143,214,0.1))] text-text-primary shadow-[0_14px_32px_rgba(0,0,0,0.22)]'
                        : 'border border-transparent text-text-secondary hover:border-white/8 hover:bg-white/[0.04] hover:text-text-primary'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                        activeTab === tab
                          ? 'border-[rgba(202,161,92,0.22)] bg-[rgba(202,161,92,0.12)] text-[rgba(246,226,188,0.92)]'
                          : 'border-white/8 bg-black/20 text-text-tertiary'
                      }`}
                    >
                      <Icon className="h-[1.05rem] w-[1.05rem]" />
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[12px] font-semibold uppercase tracking-[0.12em]">
                      {label}
                    </span>
                  </button>
                ))}
            </nav>

            {/* Episode Jump */}
            {orderedSessions.length > 0 && (
              <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
                <button
                  onClick={() => setShowSessionList(prev => !prev)}
                  className="mb-3 flex w-full items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 site-kicker text-[0.58rem]">
                    <Hash className="h-3 w-3" />
                    {language === 'KO' ? `에피소드 (${orderedSessions.length})` : `Episodes (${orderedSessions.length})`}
                  </span>
                  <span className="text-[10px] text-text-tertiary">{showSessionList ? '▲' : '▼'}</span>
                </button>

                {showSessionList && (
                  <div className="mb-3 max-h-36 overflow-y-auto space-y-1 pr-1">
                    {orderedSessions.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => { setCurrentSessionId(s.id); setShowSessionList(false); }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                          currentSessionId === s.id
                            ? 'bg-[rgba(202,161,92,0.12)] text-[rgba(246,226,188,0.92)]'
                            : 'text-text-tertiary hover:bg-white/[0.04] hover:text-text-secondary'
                        }`}
                      >
                        <span className="font-[family-name:var(--font-mono)] text-[10px] font-black w-5 text-right shrink-0 text-text-tertiary">
                          {i + 1}
                        </span>
                        <span className="truncate font-[family-name:var(--font-mono)] text-[11px] font-semibold">
                          {s.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Jump-to input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={orderedSessions.length}
                    value={jumpValue}
                    onChange={e => setJumpValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEpisodeJump(); }}
                    placeholder={`1–${orderedSessions.length}`}
                    className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold text-text-primary outline-none transition-colors hover:border-[rgba(202,161,92,0.2)] focus:border-[rgba(92,143,214,0.4)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    onClick={handleEpisodeJump}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-text-secondary transition-all hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary"
                    title={language === 'KO' ? '이동' : 'Jump'}
                  >
                    <span className="text-[12px] font-black">↵</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* IDENTITY_SEAL: PART-2 | role=nav (mode toggle, tabs, episode jump) | inputs=studioMode,sessions,activeTab | outputs=tab navigation, session jump */}

          {/* ============================================================
              PART 3 — FOOTER: exports, auth, sync, language, settings
              ============================================================ */}
          <div className="space-y-2 border-t border-white/8 px-4 py-3">
            {/* Export buttons */}
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
              <button onClick={exportAllJSON} className={exportButtonClass}>
                <Download className="h-3.5 w-3.5" /> Backup
              </button>
              <button onClick={() => fileInputRef.current?.click()} className={exportButtonClass}>
                <Upload className="h-3.5 w-3.5" /> {t('export.import')}
              </button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
            </div>

            {/* Auth + Sync */}
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[rgba(92,143,214,0.24)] bg-[rgba(92,143,214,0.12)] text-sm font-semibold text-[rgba(216,230,255,0.92)] shrink-0">
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
                        title: t('confirm.logout'),
                        message: t('confirm.logoutMsg'),
                        variant: 'warning',
                        onConfirm: () => { closeConfirm(); signOut(); },
                      })
                    }
                    className="rounded-full border border-white/8 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary transition-all hover:border-accent-red/30 hover:text-accent-red shrink-0"
                  >
                    {t('confirm.logout')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!authConfigured) {
                      alert(t('confirm.firebaseRequired'));
                      return;
                    }
                    signInWithGoogle();
                  }}
                  disabled={!authConfigured}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary transition-all hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Cloud className="h-4 w-4" /> {t('auth.googleLogin')}
                </button>
              )}

              {user && (
                <>
                  <button
                    onClick={handleSync}
                    disabled={syncStatus === 'syncing'}
                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                      syncStatus === 'syncing'
                        ? 'animate-pulse border-[rgba(92,143,214,0.28)] bg-[rgba(92,143,214,0.12)] text-[rgba(216,230,255,0.92)]'
                        : syncStatus === 'done'
                        ? 'border-[rgba(92,214,143,0.28)] bg-[rgba(92,214,143,0.08)] text-[rgba(188,255,224,0.9)]'
                        : syncStatus === 'error'
                        ? 'border-accent-red/30 bg-accent-red/8 text-accent-red'
                        : 'border-white/8 bg-white/[0.04] text-text-secondary hover:-translate-y-0.5 hover:border-[rgba(92,143,214,0.26)] hover:text-text-primary'
                    }`}
                  >
                    {syncStatus === 'syncing' ? (
                      <Cloud className="h-4 w-4 animate-spin" />
                    ) : syncStatus === 'error' ? (
                      <CloudOff className="h-4 w-4" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    {syncStatus === 'syncing'
                      ? t('sync.syncing')
                      : syncStatus === 'done'
                      ? t('sync.syncDone')
                      : syncStatus === 'error'
                      ? t('sync.syncError')
                      : t('sync.syncNow')}
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

            {/* Language + Settings */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`${languageButtonClass} ${
                      language === l
                        ? 'border-[rgba(202,161,92,0.3)] bg-[rgba(202,161,92,0.14)] text-[rgba(246,226,188,0.92)]'
                        : 'border-white/8 bg-white/[0.04] text-text-tertiary hover:border-white/12 hover:text-text-primary'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <button
                data-testid="tab-settings"
                onClick={() => handleTabChange('settings')}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                  activeTab === 'settings'
                    ? 'border-[rgba(202,161,92,0.3)] bg-[rgba(202,161,92,0.14)] text-[rgba(246,226,188,0.92)]'
                    : 'border-white/8 bg-white/[0.04] text-text-tertiary hover:border-white/12 hover:text-text-primary'
                }`}
                title={t('sidebar.settings')}
              >
                <Settings className="h-[1.125rem] w-[1.125rem]" />
              </button>
            </div>
          </div>

          {/* IDENTITY_SEAL: PART-3 | role=footer (exports, auth, sync, language, settings) | inputs=user,syncStatus,language | outputs=UI actions */}
        </div>
      </div>
    </aside>
  );
};

export default StudioSidebar;
