"use client";

// ============================================================
// PART 0 — IMPORTS & TYPES
// ============================================================

import { showAlert } from '@/lib/show-alert';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap, Plus, Globe, UserCircle, FileText, PenTool, Edit3, History,
  X, BookOpen, Hash,
} from 'lucide-react';
import { AppLanguage, AppTab, Project, ChatSession } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import type { ProjectManuscriptFormat } from '@/hooks/useStudioExport';
import StudioSidebarFooter, { type StudioSidebarConfirmOpts } from './StudioSidebarFooter';

type ConfirmOpts = StudioSidebarConfirmOpts;

// TODO: Extract into context providers for future refactor:
// - UIState (isSidebarOpen, setIsSidebarOpen, focusMode)
// - ProjectState (projects, currentProjectId, setCurrentProjectId, currentProject, createNewProject, renameProject, deleteProject)
// - SessionState (sessions, currentSessionId, setCurrentSessionId, createNewSession, onReorderSessions)
// - Navigation (activeTab, handleTabChange, studioMode, setStudioMode)
// - Export (exportTXT, exportJSON, handleImportJSON, exportAllJSON, handleExportEPUB, handleExportDOCX, handleImportTextFiles, exportProjectJSON, exportProjectManuscripts)
// - Auth (user, signInWithGoogle, signOut, authConfigured, handleSync, syncStatus, lastSyncTime)
// - I18n (language, setLanguage)
// - Confirm (showConfirm, closeConfirm)
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
  handleImportTextFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportProjectJSON?: () => void;
  /** 현재 프로젝트 전 회차 원고 — 번역 스튜디오와 동일 5형식 */
  exportProjectManuscripts?: (format: ProjectManuscriptFormat) => void;
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
  onReorderSessions?: (fromIndex: number, toIndex: number) => void;
}

function latestProjectSessionId(project: Project | null | undefined): string | null {
  if (!project?.sessions.length) return null;
  let latest = project.sessions[0];
  for (const session of project.sessions) {
    if ((session.lastUpdate || 0) > (latest.lastUpdate || 0)) latest = session;
  }
  return latest.id;
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
  handleImportTextFiles,
  exportAllJSON,
  handleExportEPUB,
  handleExportDOCX,
  exportProjectJSON,
  exportProjectManuscripts,
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
  onReorderSessions,
}) => {
  const t = createT(language);
  const [showSessionList, setShowSessionList] = useState(false);
  const [jumpValue, setJumpValue] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  
  // hydrated check needed for SSR mismatch — suppressHydrationWarning won't work for conditional text content
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const projectManuscriptExportEnabled = (currentProject?.sessions?.length ?? 0) > 0;

  const lastSyncLabel = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Sessions in chronological order (ep #1 = first created)
  const orderedSessions = [...sessions].sort((a, b) => a.lastUpdate - b.lastUpdate);

  function selectProject(projectId: string) {
    const nextProjectId = projectId || null;
    const nextProject = projects.find(project => project.id === nextProjectId) ?? null;
    setCurrentProjectId(nextProjectId);
    setCurrentSessionId(latestProjectSessionId(nextProject));
  }

  function handleEpisodeJump() {
    const idx = parseInt(jumpValue, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= orderedSessions.length) return;
    setCurrentSessionId(orderedSessions[idx].id);
    setShowSessionList(false);
    setJumpValue('');
  }

  return (
    <aside
      className={`fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 md:transition-[transform,width] ${
        focusMode
          ? '-translate-x-full md:translate-x-0 md:w-0'
          : isSidebarOpen
          ? 'translate-x-0 w-80'
          : '-translate-x-full md:translate-x-0 md:w-0'
      }`}
    >
      <div className="flex h-dvh flex-col py-3 pl-3 pr-2 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[24px] bg-bg-primary/95 backdrop-blur-[32px] border border-border shadow-panel">

          {/* Collapse toggle */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label={L4(language, { ko: '사이드바 접기', en: 'Collapse sidebar', ja: 'サイドバーを折りたたむ', zh: '收起侧边栏' })}
            className="hidden md:flex items-center justify-center gap-1 py-1.5 border-b border-white/8 text-[9px] font-mono text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
          >
            ◀ {L4(language, { ko: '접기', en: 'Collapse', ja: '折りたたむ', zh: '收起' })}
          </button>

          {/* Header: logo + project selector + new session */}
          <div className="border-b border-white/8 px-4 py-3">
            <div className="mb-3 flex items-start justify-between gap-2">
              <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(202,161,92,0.22)] bg-[linear-gradient(135deg,rgba(202,161,92,0.2),rgba(92,143,214,0.14))] text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="site-kicker text-[0.62rem]">Writing Workbench</div>
                  <h1 className="font-display text-lg font-semibold tracking-[-0.04em] text-text-primary">
                    로어가드 스튜디오
                  </h1>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
                    {language === 'KO' ? '로어가드' : 'Loreguard'}
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/4 text-text-secondary transition-[border-color,color] hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary md:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Project selector */}
            <div className="rounded-[1.25rem] border border-white/8 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="site-kicker text-[0.58rem]">{t('sidebar.activeProject')}</span>
                <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {projects.length} projects
                </span>
              </div>

              {projects.length === 0 ? (
                <button
                  onClick={createNewProject}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(202,161,92,0.28)] bg-[rgba(202,161,92,0.08)] py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-text-primary transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[rgba(202,161,92,0.12)]"
                >
                  <Plus className="h-4 w-4" /> {t('project.newProject')}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      value={currentProjectId || ''}
                      onChange={e => selectProject(e.target.value)}
                      className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 font-mono text-[12px] font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors hover:border-[rgba(202,161,92,0.2)]"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sessions.length})</option>
                      ))}
                    </select>
                    <button
                      onClick={createNewProject}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-text-secondary transition-[transform,border-color,color] hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary"
                      title={t('project.newProject')}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {currentProject && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold">
                      <button
                        onClick={() => {
                          const name = window.prompt(t('project.renameProject'), currentProject.name);
                          if (name === null) return;
                          const cleanedName = name.replace(/\s+/g, ' ').trim();
                          if (!cleanedName) {
                            showAlert(L4(language, {
                              ko: '작품명을 입력해 주세요.',
                              en: 'Enter a work name.',
                              ja: '作品名を入力してください。',
                              zh: '请输入作品名。',
                            }));
                            return;
                          }
                          renameProject(currentProject.id, cleanedName);
                        }}
                        className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-text-secondary transition-[border-color,color] hover:border-[rgba(92,143,214,0.28)] hover:text-text-primary"
                      >
                        {t('project.renameProject')}
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={() => deleteProject(currentProject.id)}
                          className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-text-secondary transition-[border-color,color] hover:border-accent-red/30 hover:text-accent-red"
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
              onClick={() => createNewSession()}
              className="premium-button mt-3 flex w-full justify-center rounded-[1.1rem] px-4 py-3 text-[11px]"
            >
              <Plus className="h-4 w-4" /> {language === 'KO' ? '새 에피소드' : language === 'JP' ? '新しいエピソード' : language === 'CN' ? '新剧集' : 'New Episode'}
            </button>
          </div>

          {/* IDENTITY_SEAL: PART-1 | role=header (logo, project selector, new session) | inputs=projects,currentProject | outputs=UI */}

          {/* ============================================================
              PART 2 — NAV: mode toggle + tabs + episode jump
              ============================================================ */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Studio mode toggle - render skeleton until hydrated to prevent mismatch */}
            {!hydrated ? (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary min-w-[80px]">
                  {language === 'KO' ? '로딩...' : 'Loading...'}
                </span>
                <div className="w-[44px] h-[24px] rounded-full bg-white/15" />
              </div>
            ) : (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary min-w-[80px]">
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
                  className={`relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    studioMode === 'free' ? 'bg-accent-purple' : 'bg-white/15'
                  }`}
                  style={{ width: 44, height: 24, minWidth: 44, minHeight: 24 }}
                  aria-label={language === 'KO' ? '모드 전환' : 'Toggle mode'}
                >
                  <span
                    className={`pointer-events-none absolute top-[2px] rounded-full bg-white shadow-md transition-transform duration-200 ${
                      studioMode === 'free' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                    style={{ width: 20, height: 20 }}
                  />
                </button>
              </div>
            )}

            {/* Nav tabs - Premium styling with Primary/Advanced grouping */}
            <nav className="space-y-1.5" role="tablist" aria-label="Studio navigation">
              {studioMode === 'free' && (
                <div className="px-3 pt-1 pb-1">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary">{language === 'KO' ? '주요' : 'PRIMARY'}</span>
                </div>
              )}
              {([
                { tab: 'world' as AppTab, icon: Globe, label: t('sidebar.worldStudio'), guided: true, color: 'amber', primary: true },
                { tab: 'characters' as AppTab, icon: UserCircle, label: t('sidebar.characterStudio'), guided: true, color: 'purple', primary: true },
                { tab: 'direction' as AppTab, icon: FileText, label: L4(language, { ko: '연출', en: 'Direction', ja: '演出', zh: '演出' }), guided: true, color: 'blue', primary: true },
                { tab: 'writing' as AppTab, icon: PenTool, label: t('sidebar.writingMode'), guided: false, color: 'green', primary: true },
                { tab: 'style' as AppTab, icon: Edit3, label: t('sidebar.styleStudio'), guided: false, color: 'amber', primary: false },
                { tab: 'manuscript' as AppTab, icon: FileText, label: t('ui.manuscript'), guided: false, color: 'purple', primary: false },
                { tab: 'visual' as AppTab, icon: Zap, label: language === 'KO' ? '비주얼 설계' : 'Visual Design', guided: false, color: 'green', primary: false },
                { tab: 'history' as AppTab, icon: History, label: t('sidebar.archives'), guided: false, color: 'blue', primary: false },
                { tab: 'docs' as AppTab, icon: BookOpen, label: language === 'KO' ? '사용설명서' : 'User Guide', guided: true, color: 'amber', primary: true },
              ] as const)
                .filter(item => studioMode === 'free' || item.guided)
                .map(({ tab, icon: Icon, label, color, primary }, idx, arr) => {
                  // Advanced 섹션 시작 시 구분선 삽입
                  const prevItem = idx > 0 ? arr[idx - 1] : null;
                  const showDivider = studioMode === 'free' && !primary && prevItem?.primary;
                  const isActive = activeTab === tab;
                  const colorClasses = {
                    amber: {
                      active: 'border-accent-amber/30 bg-gradient-to-r from-accent-amber/15 to-accent-amber/5 shadow-[0_0_20px_rgba(202,161,92,0.1)]',
                      icon: 'border-accent-amber/25 bg-accent-amber/15 text-accent-amber',
                      text: 'text-accent-amber',
                      glow: 'from-accent-amber/10',
                      indicator: 'bg-accent-amber shadow-[0_0_8px_rgba(202,161,92,0.8)]',
                    },
                    purple: {
                      active: 'border-accent-purple/30 bg-gradient-to-r from-accent-purple/15 to-accent-purple/5 shadow-[0_0_20px_rgba(141,123,195,0.1)]',
                      icon: 'border-accent-purple/25 bg-accent-purple/15 text-accent-purple',
                      text: 'text-accent-purple',
                      glow: 'from-accent-purple/10',
                      indicator: 'bg-accent-purple shadow-[0_0_8px_rgba(141,123,195,0.8)]',
                    },
                    blue: {
                      active: 'border-accent-blue/30 bg-gradient-to-r from-accent-blue/15 to-accent-blue/5 shadow-[0_0_20px_rgba(92,143,214,0.1)]',
                      icon: 'border-accent-blue/25 bg-accent-blue/15 text-accent-blue',
                      text: 'text-accent-blue',
                      glow: 'from-accent-blue/10',
                      indicator: 'bg-accent-blue shadow-[0_0_8px_rgba(92,143,214,0.8)]',
                    },
                    green: {
                      active: 'border-accent-green/30 bg-gradient-to-r from-accent-green/15 to-accent-green/5 shadow-[0_0_20px_rgba(47,155,131,0.1)]',
                      icon: 'border-accent-green/25 bg-accent-green/15 text-accent-green',
                      text: 'text-accent-green',
                      glow: 'from-accent-green/10',
                      indicator: 'bg-accent-green shadow-[0_0_8px_rgba(47,155,131,0.8)]',
                    },
                  };
                  const c = colorClasses[color];
                  
                  return (
                    <React.Fragment key={tab}>
                    {showDivider && (
                      <div className="px-3 pt-3 pb-1">
                        <div className="h-px bg-border/30 mb-2" />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary">{language === 'KO' ? '고급' : 'ADVANCED'}</span>
                      </div>
                    )}
                    <button
                      data-testid={`tab-${tab}`}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabChange(tab)}
                      className={`
                        group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left overflow-hidden
                        transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out
                        ${isActive
                          ? `border ${c.active} backdrop-blur-sm`
                          : 'border border-transparent text-text-secondary hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary active:scale-[0.98]'
                        }
                      `}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span 
                          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${c.indicator}`}
                          style={{ animation: 'scale-in-x 200ms ease-out' }}
                        />
                      )}
                      
                      <span
                        className={`
                          flex h-9 w-9 items-center justify-center rounded-xl border
                          transition-[background-color,border-color,color] duration-200
                          ${isActive ? c.icon : 'border-white/8 bg-black/20 text-text-tertiary group-hover:border-white/12 group-hover:text-text-secondary'}
                        `}
                      >
                        <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={isActive ? 2.5 : 2} />
                      </span>
                      <span className={`
                        font-mono text-[11px] font-semibold uppercase tracking-[0.1em]
                        transition-colors duration-200
                        ${isActive ? c.text : ''}
                      `}>
                        {label}
                      </span>
                      
                      {/* Hover glow effect */}
                      {!isActive && (
                        <span className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r ${c.glow} to-transparent`} />
                      )}
                    </button>
                    </React.Fragment>
                  );
                })}
            </nav>
            
            <style jsx>{`
              @keyframes scale-in-x {
                from { transform: translateY(-50%) scaleX(0); }
                to { transform: translateY(-50%) scaleX(1); }
              }
              @keyframes scale-in-y {
                from { transform: scaleY(0); }
                to { transform: scaleY(1); }
              }
            `}</style>

            {/* Episode Jump */}
            {orderedSessions.length > 0 && (
              <div className="mt-5 rounded-3xl border border-white/8 bg-black/20 p-4">
                <div className="mb-3 flex w-full items-center justify-between gap-2">
                  <button
                    onClick={() => setShowSessionList(prev => !prev)}
                    aria-expanded={showSessionList}
                    aria-label={L4(language, { ko: `에피소드 목록 ${showSessionList ? '접기' : '펼치기'}`, en: `${showSessionList ? 'Collapse' : 'Expand'} episode list`, ja: `エピソード一覧を${showSessionList ? '折りたたむ' : '展開'}`, zh: `${showSessionList ? '收起' : '展开'}剧集列表` })}
                    className="flex items-center gap-2 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                  >
                    <span className="flex items-center gap-2 site-kicker text-[0.58rem]">
                      <Hash className="h-3 w-3" />
                      {language === 'KO' ? `에피소드 (${orderedSessions.length})` : `Episodes (${orderedSessions.length})`}
                    </span>
                    <span className="text-[10px] text-text-tertiary">{showSessionList ? '▲' : '▼'}</span>
                  </button>
                  {showSessionList && orderedSessions.length > 1 && (
                    <button
                      onClick={() => { setBatchMode(prev => !prev); setSelectedSessionIds(new Set()); }}
                      aria-pressed={batchMode}
                      aria-label={language === 'KO' ? `일괄 선택 모드 ${batchMode ? '끄기' : '켜기'}` : `Turn batch select mode ${batchMode ? 'off' : 'on'}`}
                      className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                        batchMode ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/30' : 'text-text-tertiary border-white/8 hover:text-text-secondary'
                      }`}
                      title={language === 'KO' ? '일괄 선택 모드' : 'Batch select mode'}
                    >
                      {language === 'KO' ? '일괄' : 'Batch'}
                    </button>
                  )}
                </div>

                {showSessionList && batchMode && orderedSessions.length > 1 && (
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-mono cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.size === orderedSessions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSessionIds(new Set(orderedSessions.map(s => s.id)));
                          } else {
                            setSelectedSessionIds(new Set());
                          }
                        }}
                        className="accent-[rgba(202,161,92,0.8)]"
                      />
                      {language === 'KO' ? '전체 선택' : 'Select All'}
                    </label>
                    {selectedSessionIds.size > 0 && (
                      <>
                        <span className="text-[9px] text-text-tertiary font-mono">
                          ({selectedSessionIds.size})
                        </span>
                        <button
                          onClick={() => {
                            showConfirm({
                              title: language === 'KO' ? '일괄 삭제' : 'Batch Delete',
                              message: language === 'KO'
                                ? `${selectedSessionIds.size}개 에피소드를 삭제하시겠습니까?`
                                : `Delete ${selectedSessionIds.size} episodes?`,
                              variant: 'danger',
                              confirmLabel: language === 'KO' ? '삭제' : 'Delete',
                              cancelLabel: language === 'KO' ? '취소' : 'Cancel',
                              onConfirm: () => {
                                closeConfirm();
                                // Dispatch batch delete event — handled by studio page
                                window.dispatchEvent(new CustomEvent('noa:batch-delete', {
                                  detail: { ids: Array.from(selectedSessionIds) },
                                }));
                                setSelectedSessionIds(new Set());
                                setBatchMode(false);
                              },
                            });
                          }}
                          className="px-2 py-1 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider text-accent-red hover:text-accent-red hover:bg-accent-red/10 active:animate-delete-warning transition-[background-color,color] duration-200"
                          title={language === 'KO' ? '선택 삭제' : 'Delete selected'}
                        >
                          {language === 'KO' ? '삭제' : 'Del'}
                        </button>
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('noa:batch-export', {
                              detail: { ids: Array.from(selectedSessionIds) },
                            }));
                            setSelectedSessionIds(new Set());
                            setBatchMode(false);
                          }}
                          className="text-[9px] font-bold font-mono uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
                          title={language === 'KO' ? '선택 내보내기' : 'Export selected'}
                        >
                          {language === 'KO' ? '내보내기' : 'Export'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {showSessionList && (
                  <div className="mb-3 max-h-36 overflow-y-auto space-y-1 pr-1">
                    {/* Render max 50 sessions for DOM performance; use jump-to for larger sets */}
                    {(orderedSessions.length > 50 ? orderedSessions.slice(0, 50) : orderedSessions).map((s, i) => (
                      <button
                        key={s.id}
                        draggable={!!onReorderSessions && !batchMode}
                        onDragStart={() => setDragIdx(i)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                        onDragLeave={() => setDragOverIdx(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIdx !== null && dragIdx !== i && onReorderSessions) {
                            onReorderSessions(dragIdx, i);
                          }
                          setDragIdx(null);
                          setDragOverIdx(null);
                        }}
                        onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                        onClick={(e) => {
                          if (batchMode) {
                            // Shift-click for range select
                            if (e.shiftKey && lastClickedIdx !== null) {
                              const start = Math.min(lastClickedIdx, i);
                              const end = Math.max(lastClickedIdx, i);
                              const range = orderedSessions.slice(start, end + 1).map(ss => ss.id);
                              setSelectedSessionIds(prev => {
                                const next = new Set(prev);
                                for (const id of range) next.add(id);
                                return next;
                              });
                            } else {
                              setSelectedSessionIds(prev => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                return next;
                              });
                            }
                            setLastClickedIdx(i);
                          } else {
                            setCurrentSessionId(s.id);
                            setShowSessionList(false);
                          }
                        }}
                        className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-[background-color,border-color,box-shadow,color] border overflow-hidden ${
                          batchMode && selectedSessionIds.has(s.id)
                            ? 'border-accent-purple/30 bg-accent-purple/15 text-accent-purple shadow-[0_0_15px_rgba(141,123,195,0.1)]'
                            : currentSessionId === s.id
                            ? 'border-[rgba(202,161,92,0.3)] bg-gradient-to-r from-[rgba(202,161,92,0.15)] to-[rgba(202,161,92,0.05)] text-text-primary shadow-[0_0_15px_rgba(202,161,92,0.1)] backdrop-blur-md'
                            : 'border-transparent text-text-tertiary hover:border-white/10 hover:bg-white/[0.04] hover:text-text-secondary hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
                        } ${dragIdx === i ? 'opacity-40' : ''} ${dragOverIdx === i && dragIdx !== i ? 'border-t-2 border-accent-purple' : ''}`}
                        title={batchMode ? (language === 'KO' ? 'Shift+클릭으로 범위 선택' : 'Shift+click for range select') : (language === 'KO' ? '드래그하여 순서 변경' : 'Drag to reorder')}
                      >
                        {/* Hover Light Sweep Effect */}
                        {currentSessionId !== s.id && !batchMode && (
                          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-[rgba(202,161,92,0.08)] to-transparent" />
                        )}
                        {/* Selected Indicator for Episode */}
                        {currentSessionId === s.id && (
                          <span 
                            className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent-amber shadow-[0_0_8px_rgba(202,161,92,0.8)]"
                            style={{ animation: 'scale-in-y 200ms ease-out' }}
                          />
                        )}
                        {batchMode && (
                          <input
                            type="checkbox"
                            checked={selectedSessionIds.has(s.id)}
                            readOnly
                            className="accent-[rgba(202,161,92,0.8)] shrink-0 pointer-events-none z-10"
                          />
                        )}
                        {!batchMode && onReorderSessions && (
                          <span className="text-[10px] text-text-tertiary cursor-grab shrink-0 z-10 hover:text-text-secondary" title={language === 'KO' ? '드래그 핸들' : 'Drag handle'}>⠿</span>
                        )}
                        <span className="font-mono text-[10px] font-black w-5 text-right shrink-0 text-text-tertiary z-10">
                          {i + 1}
                        </span>
                        <span className="flex flex-col min-w-0 z-10 relative">
                          <span className="truncate font-mono text-[11px] font-semibold">
                            {s.title}
                          </span>
                          {(() => {
                            const ms = s.config?.manuscripts?.find(m => m.episode === s.config.episode);
                            const summary = ms?.summary;
                            return (
                              <span className="truncate text-[10px] text-text-tertiary leading-tight mt-0.5 line-clamp-2">
                                {summary || (language === 'KO' ? '요약 생성 중...' : 'Generating summary...')}
                              </span>
                            );
                          })()}
                        </span>
                      </button>
                    ))}
                    {orderedSessions.length > 50 && (
                      <p className="text-center text-[9px] text-text-tertiary py-1">
                        +{orderedSessions.length - 50} {language === 'KO' ? '개 더 — 아래 점프 사용' : 'more — use jump below'}
                      </p>
                    )}
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
                    className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/4 px-3 py-2 font-mono text-[11px] font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors hover:border-[rgba(202,161,92,0.2)] focus:border-[rgba(92,143,214,0.4)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    onClick={handleEpisodeJump}
                    aria-label={language === 'KO' ? '에피소드로 이동' : 'Jump to episode'}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-text-secondary transition-[border-color,color] hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                    title={language === 'KO' ? '이동' : 'Jump'}
                  >
                    <span className="text-[12px] font-black">↵</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <StudioSidebarFooter
            activeTab={activeTab}
            authConfigured={authConfigured}
            closeConfirm={closeConfirm}
            currentSessionId={currentSessionId}
            exportAllJSON={exportAllJSON}
            exportJSON={exportJSON}
            exportProjectJSON={exportProjectJSON}
            exportProjectManuscripts={exportProjectManuscripts}
            exportTXT={exportTXT}
            fileInputRef={fileInputRef}
            handleExportDOCX={handleExportDOCX}
            handleExportEPUB={handleExportEPUB}
            handleImportJSON={handleImportJSON}
            handleImportTextFiles={handleImportTextFiles}
            handleSync={handleSync}
            handleTabChange={handleTabChange}
            hydrated={hydrated}
            language={language}
            lastSyncLabel={lastSyncLabel}
            projectManuscriptExportEnabled={projectManuscriptExportEnabled}
            setLanguage={setLanguage}
            showConfirm={showConfirm}
            signInWithGoogle={signInWithGoogle}
            signOut={signOut}
            syncStatus={syncStatus}
            user={user}
          />
        </div>
      </div>
    </aside>
  );
};

export default StudioSidebar;
