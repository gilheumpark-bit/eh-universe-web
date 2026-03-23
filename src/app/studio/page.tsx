"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Settings, Send,
  Sparkles, Menu, Globe, UserCircle,
  Zap, Ghost, X, PenTool, History, StopCircle,
  Download, Upload, Edit3, Search, Maximize2, Minimize2, Printer, Keyboard, Sun, Moon,
  FileType, Key
} from 'lucide-react';
import {
  Message, StoryConfig,
  AppLanguage, AppTab,
  ChatSession
} from '@/lib/studio-types';
import { TRANSLATIONS, ENGINE_VERSION } from '@/lib/studio-constants';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, type HFCPState as HFCPStateType } from '@/engine/hfcp';
// EngineReport type inferred from useStudioAI hook return
import ChatMessage from '@/components/studio/ChatMessage';
const WorldStudioView = dynamic(() => import('@/components/studio/WorldStudioView'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading World Studio...</div> });
import ResourceView from '@/components/studio/ResourceView';
import SettingsView from '@/components/studio/SettingsView';
import EngineDashboard from '@/components/studio/EngineDashboard';
import EngineStatusBar from '@/components/studio/EngineStatusBar';
import ApiKeyModal from '@/components/studio/ApiKeyModal';
import ManuscriptView from '@/components/studio/ManuscriptView';
import { ErrorBoundary } from '@/components/studio/ErrorBoundary';
import MobileTabBar from '@/components/studio/MobileTabBar';
// generateStoryStream, exportEPUB, exportDOCX → moved to useStudioAI / useStudioExport hooks
import { useProjectManager, INITIAL_CONFIG } from '@/hooks/useProjectManager';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';
import { useStudioAI } from '@/hooks/useStudioAI';
import { useStudioExport } from '@/hooks/useStudioExport';
import dynamic from 'next/dynamic';
const WorldSimulator = dynamic(() => import('@/components/WorldSimulator'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading World Simulator...</div> });
const SceneSheet = dynamic(() => import('@/components/studio/SceneSheet'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Scene Sheet...</div> });
const StyleStudioView = dynamic(() => import('@/components/studio/StyleStudioView'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Style Studio...</div> });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });
const TypoPanel = dynamic(() => import('@/components/studio/TypoPanel'), { ssr: false });
const TabAssistant = dynamic(() => import('@/components/studio/TabAssistant'), { ssr: false });
const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), { ssr: false });
const InlineRewriter = dynamic(() => import('@/components/studio/InlineRewriter'), { ssr: false });
const AutoRefiner = dynamic(() => import('@/components/studio/AutoRefiner'), { ssr: false });
const ItemStudioView = dynamic(() => import('@/components/studio/ItemStudioView'), { ssr: false });
const GenreReviewChat = dynamic(() => import('@/components/studio/GenreReviewChat'), { ssr: false });
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false });
const AdvancedWritingPanel = dynamic(() => import('@/components/studio/AdvancedWritingPanel'), { ssr: false });
import Link from 'next/link';
import { FileText, Map, Cloud, CloudOff } from 'lucide-react';
import { syncAllProjects, saveApiKeysToDrive, loadApiKeysFromDrive } from '@/services/driveService';
import { ConfirmModal, ErrorToast, useUnsavedWarning } from '@/components/studio/UXHelpers';
import DirectorPanel from '@/components/studio/DirectorPanel';
// analyzeManuscript + DirectorReport → moved to useStudioAI hook
import { getApiKey, getActiveProvider } from '@/lib/ai-providers';

export default function StudioPage() {
  // ============================================================
  // PROJECT-BASED STATE MANAGEMENT (extracted to hook)
  // ============================================================
  const [language, setLanguage] = useState<AppLanguage>('KO');
  const pm = useProjectManager(language);
  const {
    projects, setProjects,
    currentProjectId, setCurrentProjectId,
    currentSessionId, setCurrentSessionId,
    hydrated,
    currentProject, sessions, currentSession,
    setSessions,
    createNewProject, deleteProject: doDeleteProject, renameProject, moveSessionToProject,
    createNewSession: doCreateNewSession, deleteSession: doDeleteSession, clearAllSessions: doClearAllSessions,
    updateCurrentSession, setConfig,
  } = pm;

  const [activeTab, setActiveTab] = useState<AppTab>('world');
  const [charSubTab, setCharSubTab] = useState<'characters' | 'items'>('characters');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);
  const [showDashboard, setShowDashboard] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS['KO'];
  const isKO = language === 'KO';

  // API 키 존재 여부 (렌더링용, hydrated 이후만 체크, apiKeyVersion으로 갱신 트리거)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasApiKey = hydrated && (apiKeyVersion >= 0) && !!getApiKey(getActiveProvider());

  // UX feature states
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [lightTheme, setLightTheme] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('noa_light_theme') === 'true';
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<string>('ALL');
  const [archiveScope, setArchiveScope] = useState<'project' | 'all'>('project');
  const { user, signInWithGoogle, signOut, isConfigured: authConfigured, accessToken, refreshAccessToken } = useAuth();

  // UX: unsaved changes warning
  useUnsavedWarning(isGenerating);

  // UX: error toast state
  const [uxError, setUxError] = useState<{ error: unknown; retry?: () => void } | null>(null);

  // UX: confirm modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel?: string; cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = useCallback((opts: Omit<typeof confirmState, 'open'>) => {
    setConfirmState({ ...opts, open: true });
  }, []);
  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, open: false }));
  }, []);

  // ============================================================
  // AUTO-RESTORE API KEYS ON LOGIN
  // ============================================================
  useEffect(() => {
    if (!user || !accessToken) return;
    const alreadyHasKey = localStorage.getItem('noa_api_key');
    if (alreadyHasKey) return;
    loadApiKeysFromDrive(accessToken).then(restored => {
      if (restored) {
        console.log('[Settings] API keys restored from Drive');
        window.dispatchEvent(new Event('storage'));
      }
    });
  }, [user, accessToken]);

  // ============================================================
  // SYNC STATE
  // ============================================================
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

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
      // Also sync API keys to Drive
      saveApiKeysToDrive(token).catch(e => console.warn('[Sync] API keys save failed', e));
      setLastSyncTime(Date.now());
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      // Auto-retry on 401 (expired token)
      if (msg.includes('401')) {
        console.warn('[Sync] Token expired, refreshing...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const retryResult = await syncAllProjects(newToken, projects);
            setProjects(retryResult.merged);
            saveApiKeysToDrive(newToken).catch(e => console.warn('[Sync] API keys save failed', e));
            setLastSyncTime(Date.now());
            setSyncStatus('done');
            setTimeout(() => setSyncStatus('idle'), 3000);
            return;
          } catch (retryErr) {
            console.error('[Sync] Retry failed', retryErr);
          }
        }
      }
      console.error('[Sync]', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [accessToken, refreshAccessToken, projects]);

  // ============================================================
  // PROJECT MANAGEMENT (confirm-wrapped actions)
  // ============================================================
  const deleteProject = useCallback((projectId: string) => {
    const projName = projects.find(p => p.id === projectId)?.name || '';
    showConfirm({
      title: isKO ? '작품 삭제' : 'Delete Project',
      message: isKO ? `'${projName}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` : `Delete '${projName}'? This cannot be undone.`,
      confirmLabel: isKO ? '삭제' : 'Delete',
      cancelLabel: isKO ? '취소' : 'Cancel',
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doDeleteProject(projectId); },
    });
  }, [projects, isKO, showConfirm, closeConfirm, doDeleteProject]);

  const [hfcpState] = useState<HFCPStateType>(() => createHFCPState());
  const [writingMode, setWritingMode] = useState<'ai' | 'edit' | 'canvas' | 'refine' | 'advanced'>('ai');
  const [editDraft, setEditDraft] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState<import('@/components/studio/AdvancedWritingPanel').AdvancedWritingSettings>({
    sceneGoals: [], constraints: { pov: '3rd-limited', dialogueRatio: 40, tempo: 'stable', sentenceLen: 'normal', emotionExposure: 'normal' },
    references: { prevEpisodes: 3, characterCards: true, worldSetting: true, styleProfile: false, sceneSheet: false, platformPreset: false },
    locks: { speechStyle: false, worldRules: false, charRelations: false, bannedWords: false },
    outputMode: 'draft', includes: '', excludes: '',
  });
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasPass, setCanvasPass] = useState(0);
  const [promptDirective, setPromptDirective] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [saveFlash, setSaveFlash] = useState(false);
  const [saveSlotModalOpen, setSaveSlotModalOpen] = useState(false);
  const [saveSlotName, setSaveSlotName] = useState('');
  const triggerSave = useCallback(() => {
    // Data is already auto-saved via localStorage, this is visual feedback
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, []); // 0=empty, 1=skeleton, 2=emotion, 3=sensory

  useEffect(() => {
    setIsSidebarOpen(window.innerWidth >= 768);
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hydration + auto-save handled by useProjectManager hook

  const messageCount = currentSession?.messages?.length ?? 0;
  useEffect(() => {
    if (activeTab === 'writing') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount, isGenerating, activeTab]);

  const createNewSession = useCallback(() => {
    doCreateNewSession();
    setActiveTab('world');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [doCreateNewSession]);

  const handleTabChange = useCallback((tab: AppTab) => {
    // 수동 편집 중 탭 전환 시 미저장 경고
    if (activeTab === 'writing' && writingMode === 'edit' && editDraft.trim()) {
      showConfirm({
        title: isKO ? '편집 내용 미저장' : 'Unsaved Edits',
        message: isKO
          ? '수동 편집 내용이 저장되지 않았습니다. 탭을 전환하시겠습니까?'
          : 'Your manual edits have not been saved. Switch tabs anyway?',
        variant: 'warning',
        confirmLabel: isKO ? '전환' : 'Switch',
        cancelLabel: isKO ? '계속 편집' : 'Keep Editing',
        onConfirm: () => {
          setActiveTab(tab);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
      });
      return;
    }
    setActiveTab(tab);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [activeTab, writingMode, editDraft, isKO, showConfirm]);

  const deleteSession = (sessionIdToDelete: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionIdToDelete);
    if (!sessionToDelete) return;
    showConfirm({
      title: isKO ? '세션 삭제' : 'Delete Session',
      message: isKO ? `'${sessionToDelete.title}'을(를) 삭제하시겠습니까?` : `Delete '${sessionToDelete.title}'?`,
      confirmLabel: isKO ? '삭제' : 'Delete',
      cancelLabel: isKO ? '취소' : 'Cancel',
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doDeleteSession(sessionIdToDelete); if (sessions.length <= 1) setActiveTab('world'); },
    });
  };

  const clearAllSessions = () => {
    showConfirm({
      title: isKO ? '전체 삭제' : 'Delete All',
      message: isKO ? '모든 세션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.' : 'Delete all sessions? This cannot be undone.',
      confirmLabel: isKO ? '전체 삭제' : 'Delete All',
      cancelLabel: isKO ? '취소' : 'Cancel',
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doClearAllSessions(); setActiveTab('world'); },
    });
  };

  // ============================================================
  // EXPORT / IMPORT / RENAME / SEARCH (extracted to hook)
  // ============================================================
  const {
    exportTXT, exportJSON, exportAllJSON, handleImportJSON,
    handlePrint, handleExportEPUB, handleExportDOCX,
  } = useStudioExport({
    currentSession, sessions, currentSessionId,
    setSessions, setCurrentSessionId, setActiveTab,
    isKO, language, writingMode, editDraft,
  });

  // Rename session
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

  // Search filter
  const filteredMessages = currentSession?.messages.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  const searchMatchesEditDraft = searchQuery && editDraft && editDraft.toLowerCase().includes(searchQuery.toLowerCase());

  // Switch message version
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
  }, [currentSessionId]);

  // Apply single typo fix to a message
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
  }, [currentSessionId]);

  // Keyboard shortcuts (extracted to hook)
  useStudioKeyboard({
    onTabChange: handleTabChange,
    onToggleSearch: () => setShowSearch(prev => !prev),
    onExportTXT: exportTXT,
    onPrint: handlePrint,
    onNewSession: createNewSession,
    onToggleFocus: () => setFocusMode(prev => !prev),
    onToggleShortcuts: () => setShowShortcuts(prev => !prev),
    disabled: showApiKeyModal || showShortcuts || confirmState.open,
  });

  // ============================================================
  // AI STREAMING (extracted to hook)
  // ============================================================
  const {
    isGenerating, lastReport, directorReport, handleCancel,
    handleSend: doHandleSend, handleRegenerate,
  } = useStudioAI({
    currentSession, currentSessionId, setSessions, updateCurrentSession,
    hfcpState, promptDirective, language, canvasPass,
    setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError,
  });

  const handleSend = useCallback((customPrompt?: string) => {
    doHandleSend(customPrompt, input, () => setInput(''));
  }, [doHandleSend, input]);

  const handleNextEpisode = () => {
    if (!currentSession) return;
    const nextEp = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
    setConfig({ ...currentSession.config, episode: nextEp });
  };

  return (
    <ErrorBoundary language={isKO ? 'KO' : 'EN'}>
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${lightTheme ? 'bg-white text-gray-900' : 'bg-bg-primary text-text-primary'}`} style={{ fontFamily: 'var(--font-sans)' }}>
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Mobile bottom tab bar */}
      <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} language={language} />

      {/* Sidebar */}
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
                <Plus className="w-3.5 h-3.5" /> {t.project?.newProject || 'New Project'}
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
                  <button onClick={createNewProject} className="p-1.5 bg-bg-secondary border border-border rounded-lg text-text-tertiary hover:text-accent-purple transition-colors" title={t.project?.newProject || 'New Project'}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {currentProject && (
                  <div className="flex gap-1 text-[8px] font-[family-name:var(--font-mono)]">
                    <button onClick={() => {
                      const name = window.prompt(t.project?.renameProject || 'Rename', currentProject.name);
                      if (name) renameProject(currentProject.id, name);
                    }} className="text-text-tertiary hover:text-accent-purple">{t.project?.renameProject || 'Rename'}</button>
                    {projects.length > 1 && (
                      <button onClick={() => deleteProject(currentProject.id)} className="text-text-tertiary hover:text-accent-red">{t.project?.deleteProject || 'Delete'}</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-bg-tertiary transition-all mb-6 border border-border font-[family-name:var(--font-mono)]">
            <Plus className="w-4 h-4" /> {t.sidebar.newProject}
          </button>

          <nav className="space-y-1">
            {([
              { tab: 'world' as AppTab, icon: Globe, label: t.sidebar.worldStudio },
              { tab: 'characters' as AppTab, icon: UserCircle, label: t.sidebar.characterStudio },
              { tab: 'rulebook' as AppTab, icon: FileText, label: t.sidebar.rulebook },
              { tab: 'writing' as AppTab, icon: PenTool, label: t.sidebar.writingMode },
              { tab: 'style' as AppTab, icon: Edit3, label: t.sidebar.styleStudio },
              { tab: 'manuscript' as AppTab, icon: FileText, label: isKO ? '원고 관리' : 'Manuscript' },
              { tab: 'history' as AppTab, icon: History, label: t.sidebar.archives },
            ]).map(({ tab, icon: Icon, label }) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${activeTab === tab ? 'bg-accent-purple/20 text-accent-purple shadow-lg' : 'text-text-tertiary hover:bg-bg-secondary'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-border space-y-3">
          {/* Export / Import */}
          <div className="flex gap-1.5">
            <button onClick={exportTXT} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Download className="w-3 h-3" /> TXT
            </button>
            <button onClick={exportJSON} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Download className="w-3 h-3" /> JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Upload className="w-3 h-3" /> {isKO ? '불러오기' : 'Import'}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleExportEPUB} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <FileText className="w-3 h-3" /> EPUB
            </button>
            <button onClick={handleExportDOCX} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <FileType className="w-3 h-3" /> DOCX
            </button>
          </div>
          <button onClick={exportAllJSON} className="w-full py-1.5 bg-bg-secondary border border-border rounded-lg text-[8px] font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
            {isKO ? '📦 전체 백업 (JSON)' : '📦 Full Backup (JSON)'}
          </button>
          {/* Auth */}
          <div className="flex items-center gap-2 py-1">
            {user ? (
              <>
                <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center text-[9px] font-bold text-accent-purple overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.displayName?.[0] || '?'}
                </div>
                <span className="text-[9px] text-text-secondary truncate flex-1">{user.displayName || user.email}</span>
                <button onClick={() => showConfirm({
                  title: isKO ? '로그아웃' : 'Logout',
                  message: isKO ? '로그아웃하시겠습니까? 저장되지 않은 API 키가 초기화됩니다.' : 'Are you sure you want to logout? Unsaved API keys will be cleared.',
                  variant: 'warning',
                  onConfirm: signOut,
                })} className="text-[8px] text-text-tertiary hover:text-accent-red font-bold">{isKO ? '로그아웃' : 'Logout'}</button>
              </>
            ) : (
              <button onClick={() => {
                if (!authConfigured) {
                  alert(isKO ? 'Firebase 설정이 필요합니다.\n.env.local에 NEXT_PUBLIC_FIREBASE_* 환경변수를 설정해주세요.' : 'Firebase configuration required.\nSet NEXT_PUBLIC_FIREBASE_* in .env.local');
                  return;
                }
                signInWithGoogle();
              }} className="w-full py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-secondary hover:text-text-primary font-[family-name:var(--font-mono)] transition-colors">
                🔑 {isKO ? 'Google 로그인' : 'Sign in with Google'}
              </button>
            )}
          </div>
          {/* Drive Sync */}
          {user && (
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all border ${
                syncStatus === 'syncing' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30 animate-pulse'
                : syncStatus === 'done' ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                : syncStatus === 'error' ? 'bg-accent-red/10 text-accent-red border-accent-red/30'
                : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
              }`}
            >
              {syncStatus === 'syncing' ? <Cloud className="w-3 h-3 animate-spin" /> : syncStatus === 'error' ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
              {syncStatus === 'syncing' ? (t.sync?.syncing || 'Syncing...')
                : syncStatus === 'done' ? (t.sync?.syncDone || 'Synced!')
                : syncStatus === 'error' ? (t.sync?.syncError || 'Error')
                : (t.sync?.syncNow || 'Sync')}
            </button>
          )}
          {lastSyncTime && (
            <div className="text-[7px] text-text-tertiary font-[family-name:var(--font-mono)] text-center">
              {t.sync?.lastSync || 'Last'}: {new Date(lastSyncTime).toLocaleTimeString()}
            </div>
          )}
          <div className="flex gap-4">
            {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
              <button key={l} onClick={() => setLanguage(l)} className={`text-[10px] font-black font-[family-name:var(--font-mono)] ${language === l ? 'text-accent-purple' : 'text-text-tertiary'}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => handleTabChange('settings')} className={`flex items-center gap-2 text-xs font-bold transition-colors font-[family-name:var(--font-mono)] ${activeTab === 'settings' ? 'text-accent-purple' : 'text-text-tertiary hover:text-text-primary'}`}>
            <Settings className="w-4 h-4" /> {t.sidebar.settings}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-bg-primary overflow-hidden">
        {focusMode && (
          <button onClick={() => setFocusMode(false)}
            className="fixed top-2 right-2 z-50 px-2 py-1 bg-bg-secondary/80 border border-border rounded-lg text-[9px] text-text-tertiary hover:text-text-primary transition-all font-[family-name:var(--font-mono)] opacity-30 hover:opacity-100"
            title="F11">
            <Minimize2 className="w-3 h-3 inline mr-1" />{isKO ? '포커스 해제' : 'Exit Focus'}
          </button>
        )}
        <header className={`h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-bg-secondary rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-text-tertiary" />
            </button>
            <div className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 min-w-0 font-[family-name:var(--font-mono)]">
              <span className="text-text-tertiary hidden sm:inline">{t.sidebar.activeProject}:</span>
              <span className="text-text-primary truncate">{currentSession?.title || t.engine.noStory}</span>
              {currentSessionId && <span className={`text-[8px] font-[family-name:var(--font-mono)] transition-all duration-300 ${saveFlash ? 'text-accent-green scale-125 font-black' : 'text-text-tertiary'}`}>✓ {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '자동 저장' : 'Auto-saved')}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {currentSession && (
              <div className="flex gap-2 md:gap-4">
                <div className="px-3 py-1 bg-bg-secondary rounded-full text-[10px] font-bold text-text-tertiary border border-border hidden sm:block font-[family-name:var(--font-mono)]">
                  {currentSession.config.genre}
                </div>
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all font-[family-name:var(--font-mono)] ${
                    showDashboard
                      ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/30'
                      : 'bg-accent-purple/10 text-accent-purple border-accent-purple/20 hover:bg-accent-purple/20'
                  }`}
                >
                  ANS {ENGINE_VERSION}
                </button>
              </div>
            )}
            {/* Tool buttons */}
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={isKO ? '검색 (Ctrl+F)' : 'Search (Ctrl+F)'} aria-label={isKO ? '검색' : 'Search'}><Search className="w-4 h-4" /></button>
              <button onClick={() => setFocusMode(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={isKO ? '집중 모드 (F11)' : 'Focus Mode (F11)'} aria-label={isKO ? '집중 모드' : 'Focus mode'}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
              <button onClick={() => setLightTheme(prev => { const next = !prev; localStorage.setItem('noa_light_theme', String(next)); return next; })} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={isKO ? '테마 전환' : 'Toggle Theme'} aria-label={isKO ? '테마 전환' : 'Toggle theme'}>{lightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</button>
              <button onClick={() => setShowShortcuts(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title="Ctrl+/" aria-label={isKO ? '단축키 도움말' : 'Keyboard shortcuts'}><Keyboard className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        {/* Search bar */}
        {showSearch && (
          <div className="px-4 py-2 bg-bg-secondary border-b border-border flex items-center gap-2">
            <Search className="w-4 h-4 text-text-tertiary shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isKO ? '메시지 검색...' : 'Search messages...'} autoFocus
              className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder-text-tertiary" />
            {searchMatchesEditDraft && (
              <button onClick={() => setWritingMode('edit')} className="text-[9px] text-accent-green font-bold font-[family-name:var(--font-mono)] shrink-0">
                {isKO ? '✏️ 편집 중 원고에서 발견' : '✏️ Found in draft'}
              </button>
            )}
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Shortcuts modal */}
        {showShortcuts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
            <div className="bg-bg-primary border border-border rounded-xl p-6 max-w-md mx-4 space-y-3 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm">{isKO ? '키보드 단축키' : 'Keyboard Shortcuts'}</h3>
                <button onClick={() => setShowShortcuts(false)}><X className="w-4 h-4 text-text-tertiary" /></button>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ['F1', isKO ? '세계관 설계' : 'World Design'],
                  ['F2', isKO ? '세계관 시뮬레이터' : 'World Simulator'],
                  ['F3', isKO ? '캐릭터 스튜디오' : 'Character Studio'],
                  ['F4', isKO ? '룰북' : 'Rulebook'],
                  ['F5', isKO ? '집필 스튜디오' : 'Writing Studio'],
                  ['F6', isKO ? '문체 스튜디오' : 'Style Studio'],
                  ['F7', isKO ? '원고 관리' : 'Manuscript'],
                  ['F8', isKO ? '아카이브' : 'Archive'],
                  ['F9', isKO ? '설정' : 'Settings'],
                  ['F11', isKO ? '집중 모드' : 'Focus mode'],
                  ['F12', isKO ? '단축키 도움말' : 'Shortcuts help'],
                  ['Ctrl+N', isKO ? '새 세션' : 'New session'],
                  ['Ctrl+F', isKO ? '검색' : 'Search'],
                  ['Ctrl+E', isKO ? 'TXT 내보내기' : 'Export TXT'],
                  ['Ctrl+P', isKO ? '인쇄' : 'Print'],
                  ['Enter', isKO ? '메시지 전송' : 'Send message'],
                  ['Shift+Enter', isKO ? '줄바꿈' : 'New line'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex justify-between">
                    <span className="px-2 py-0.5 bg-bg-secondary rounded text-text-tertiary font-[family-name:var(--font-mono)]">{key}</span>
                    <span className="text-text-secondary">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* API 키 미설정 안내 배너 */}
            {hydrated && !localStorage.getItem('noa_api_key') && (
              <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-amber-900/30 border border-amber-700/40 rounded-xl text-amber-300 text-xs">
                <Key className="w-4 h-4 shrink-0" />
                <span className="flex-1">{isKO ? 'AI 기능을 사용하려면 API 키를 설정하세요.' : 'Set your API key to use AI features.'}</span>
                <button onClick={() => setShowApiKeyModal(true)} className="shrink-0 px-3 py-1 bg-amber-600/30 hover:bg-amber-600/50 rounded-lg text-[10px] font-bold uppercase transition-colors">
                  {isKO ? '설정하기' : 'Set Up'}
                </button>
              </div>
            )}
            {!currentSessionId && !['settings', 'history', 'rulebook', 'style'].includes(activeTab) ? (
              <div className="h-full relative flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                {/* Background gate image */}
                <div className="absolute inset-0 z-0">
                  <img src="/images/gate-infrastructure-visual.jpg" alt="" className="w-full h-full object-cover opacity-20" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
                </div>
                {/* Noise overlay matching landing */}
                <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-accent-purple/30 flex items-center justify-center mb-6 backdrop-blur-sm bg-bg-primary/30">
                    <Ghost className="w-10 h-10 md:w-12 md:h-12 text-accent-purple/40" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black mb-2 tracking-tighter uppercase font-[family-name:var(--font-mono)] text-text-primary">{t.engine.noActiveNarrative}</h2>
                  <p className="text-text-tertiary text-sm mb-2">{t.engine.startPrompt}</p>
                  <p className="text-text-tertiary/50 text-[10px] mb-2 max-w-sm font-[family-name:var(--font-mono)]">
                    {isKO ? '세계관 설계 → 캐릭터 생성 → 연출 설정 → 집필 순서로 진행하세요' : 'World Design → Characters → Direction → Writing — follow the workflow'}
                  </p>
                  <p className="text-text-tertiary/30 text-[9px] mb-8 max-w-sm font-[family-name:var(--font-mono)]">
                    {isKO ? '💡 API 키 없이도 세계관·캐릭터·연출 설계와 수동 편집이 가능합니다' : '💡 World/character/direction design and manual editing work without API key'}
                  </p>
                  <button onClick={createNewSession} className="px-8 py-3 md:px-10 md:py-4 bg-accent-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest font-[family-name:var(--font-mono)] hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-accent-purple/20">{t.sidebar.newProject}</button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'world' && currentSession && (
                  <WorldStudioView
                    language={language}
                    config={currentSession.config}
                    setConfig={setConfig}
                    onStart={() => setActiveTab('writing')}
                    onSave={triggerSave}
                    saveFlash={saveFlash}
                    handleWorldSimChange={(data) => {
                      if (!currentSessionId || !currentSession) return;
                      updateCurrentSession({
                        config: {
                          ...currentSession.config,
                          worldSimData: {
                            civs: data.civs.map((c: { name: string; era: string; color: string; traits: string[] }) => ({ name: c.name, era: c.era, color: c.color, traits: c.traits })),
                            relations: data.relations.map((r: { from: string; to: string; type: string }) => {
                              const from = data.civs.find((c: { id: string }) => c.id === r.from)?.name || '';
                              const to = data.civs.find((c: { id: string }) => c.id === r.to)?.name || '';
                              return { fromName: from, toName: to, type: r.type };
                            }),
                            transitions: data.transitions,
                            selectedGenre: data.selectedGenre,
                            selectedLevel: data.selectedLevel,
                            genreSelections: data.genreSelections,
                            ruleLevel: data.ruleLevel,
                          },
                        },
                      });
                    }}
                  />
                )}
                {activeTab === 'characters' && currentSession && (
                  <>
                    {/* 서브탭 토글: 캐릭터 / 아이템 */}
                    <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
                      <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 w-fit">
                        <button onClick={() => setCharSubTab('characters')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${charSubTab === 'characters' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}>
                          👥 {isKO ? '캐릭터' : 'Characters'}
                        </button>
                        <button onClick={() => setCharSubTab('items')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${charSubTab === 'items' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}>
                          ⚔️ {isKO ? '아이템 스튜디오' : 'Item Studio'}
                        </button>
                      </div>
                    </div>

                    {charSubTab === 'characters' ? (
                      <ResourceView language={language} config={currentSession.config} setConfig={setConfig} onError={(msg) => setUxError({ error: new Error(msg) })} />
                    ) : (
                      <ItemStudioView language={language} config={currentSession.config} setConfig={setConfig} />
                    )}

                    <div className="max-w-[1400px] mx-auto px-4 pb-4">
                      <TabAssistant tab="characters" language={language} config={currentSession.config} />
                    </div>
                    <div className="max-w-[1400px] mx-auto px-4 pb-8 flex justify-end">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '설정 저장' : 'Save')}
                      </button>
                    </div>
                  </>
                )}
                {activeTab === 'settings' && (
                  <SettingsView language={language} onClearAll={clearAllSessions} onManageApiKey={() => setShowApiKeyModal(true)} />
                )}
                {/* world studio (design/simulator/analysis) rendered above */}
                {activeTab === 'rulebook' && (
                  <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
                    <SceneSheet lang={language === 'EN' ? 'en' : 'ko'}
                      synopsis={currentSession?.config.synopsis}
                      characterNames={currentSession?.config.characters.map(c => c.name)}
                      tierContext={{
                        charProfiles: currentSession?.config.characters.map(c => ({
                          name: c.name, desire: c.desire, conflict: c.conflict,
                          changeArc: c.changeArc, values: c.values,
                        })),
                        corePremise: currentSession?.config.corePremise,
                        powerStructure: currentSession?.config.powerStructure,
                        currentConflict: currentSession?.config.currentConflict,
                      }}
                      initialDirection={currentSession?.config.sceneDirection ? {
                        goguma: currentSession.config.sceneDirection.goguma?.map((g, i) => ({ id: `r-${i}`, type: g.type as "goguma" | "cider", intensity: g.intensity as "small" | "medium" | "large", desc: g.desc, episode: g.episode || 1 })),
                        hooks: currentSession.config.sceneDirection.hooks?.map((h, i) => ({ id: `r-${i}`, position: h.position as "opening" | "middle" | "ending", hookType: h.hookType, desc: h.desc })),
                        emotions: currentSession.config.sceneDirection.emotionTargets?.map((e, i) => ({ id: `r-${i}`, position: e.position ?? i * 25, emotion: e.emotion, intensity: e.intensity })),
                        dialogueRules: currentSession.config.sceneDirection.dialogueTones?.map((d, i) => ({ id: `r-${i}`, character: d.character, tone: d.tone, notes: d.notes })),
                        dopamines: currentSession.config.sceneDirection.dopamineDevices?.map((dp, i) => ({ id: `r-${i}`, scale: dp.scale as "micro" | "medium" | "macro", device: dp.device, desc: dp.desc, resolved: dp.resolved ?? false })),
                        cliffs: currentSession.config.sceneDirection.cliffhanger ? [{ id: 'r-0', cliffType: currentSession.config.sceneDirection.cliffhanger.cliffType, desc: currentSession.config.sceneDirection.cliffhanger.desc, episode: currentSession.config.sceneDirection.cliffhanger.episode || 1 }] : [],
                        foreshadows: currentSession.config.sceneDirection.foreshadows?.map((f, i) => ({ id: `r-${i}`, planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
                        pacings: currentSession.config.sceneDirection.pacings?.map((p, i) => ({ id: `r-${i}`, section: p.section, percent: p.percent, desc: p.desc })),
                        tensionPoints: currentSession.config.sceneDirection.tensionCurve?.map((t, i) => ({ id: `r-${i}`, position: t.position, level: t.level, label: t.label })),
                        canons: currentSession.config.sceneDirection.canonRules?.map((c, i) => ({ id: `r-${i}`, character: c.character, rule: c.rule })),
                        transitions: currentSession.config.sceneDirection.sceneTransitions?.map((t, i) => ({ id: `r-${i}`, fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
                        writerNotes: currentSession.config.sceneDirection.writerNotes,
                        plotStructure: currentSession.config.sceneDirection.plotStructure,
                      } : undefined}
                      onDirectionUpdate={(data) => {
                        if (!currentSessionId) return;
                        updateCurrentSession({
                          config: {
                            ...(currentSession?.config || INITIAL_CONFIG),
                            sceneDirection: {
                              goguma: data.goguma.map(g => ({ type: g.type, intensity: g.intensity, desc: g.desc, episode: g.episode })),
                              hooks: data.hooks.map(h => ({ position: h.position, hookType: h.hookType, desc: h.desc })),
                              emotionTargets: data.emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity, position: e.position })),
                              dialogueTones: data.dialogueRules.map(d => ({ character: d.character, tone: d.tone, notes: d.notes })),
                              dopamineDevices: data.dopamines.map(dp => ({ scale: dp.scale, device: dp.device, desc: dp.desc, resolved: dp.resolved })),
                              cliffhanger: data.cliffs.length > 0 ? { cliffType: data.cliffs[0].cliffType, desc: data.cliffs[0].desc, episode: data.cliffs[0].episode } : undefined,
                              foreshadows: data.foreshadows.map(f => ({ planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
                              pacings: data.pacings.map(p => ({ section: p.section, percent: p.percent, desc: p.desc })),
                              tensionCurve: data.tensionPoints.map(t => ({ position: t.position, level: t.level, label: t.label })),
                              canonRules: data.canons.map(c => ({ character: c.character, rule: c.rule })),
                              sceneTransitions: data.transitions.map(t => ({ fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
                              writerNotes: data.writerNotes,
                              plotStructure: data.plotStructure,
                            },
                          },
                        });
                      }}
                      onSimRefUpdate={(ref) => {
                        if (!currentSessionId) return;
                        updateCurrentSession({
                          config: {
                            ...(currentSession?.config || INITIAL_CONFIG),
                            simulatorRef: { ...ref },
                          },
                        });
                      }}
                    />
                    <div className="mt-4">
                      <TabAssistant tab="rulebook" language={language} config={currentSession?.config ?? null} />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '설정 저장' : 'Save')}
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === 'writing' && currentSession && (
                  <div className={`max-w-6xl w-full mx-auto px-4 md:px-8 lg:px-12 flex flex-col ${currentSession.messages.length === 0 && writingMode === 'ai' ? 'h-full justify-center items-center' : 'py-6 md:py-8 space-y-6 min-h-full'}`}>
                    {/* Continuity Tracker Graph — 맥락 추적 */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
                      <ContinuityGraph language={language} config={currentSession.config} />
                    )}

                    {/* Applied Settings Summary — hide when empty */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
                    <details className="group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
                          {isKO ? '📋 현재 적용 설정' : '📋 Applied Settings'}
                        </span>
                        <span className="text-[9px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-4 pb-4 space-y-3 text-[10px] border-t border-border pt-3">
                        {/* World */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-text-tertiary font-bold uppercase w-16">{isKO ? '장르' : 'Genre'}</span>
                          <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                          <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                          {currentSession.config.setting && <span className="text-text-secondary">📍 {currentSession.config.setting}</span>}
                          {currentSession.config.primaryEmotion && <span className="text-text-secondary">💓 {currentSession.config.primaryEmotion}</span>}
                        </div>
                        {/* Characters */}
                        {currentSession.config.characters.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '캐릭터' : 'Characters'}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.characters.map(c => (
                                <span key={c.id} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[9px]">
                                  <span className="font-bold text-text-primary">{c.name}</span>
                                  <span className="text-text-tertiary ml-1">({c.role})</span>
                                  {c.speechStyle && <span className="text-accent-blue ml-1">🗣️{c.speechStyle}</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Relations */}
                        {currentSession.config.charRelations && currentSession.config.charRelations.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '관계' : 'Relations'}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.charRelations.map((r, i) => {
                                const from = currentSession.config.characters.find(c => c.id === r.from)?.name || '?';
                                const to = currentSession.config.characters.find(c => c.id === r.to)?.name || '?';
                                return (
                                  <span key={i} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[9px]">
                                    {from} ⇄ {to} <span className="text-accent-purple">[{r.type}]</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Synopsis preview */}
                        {currentSession.config.synopsis && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '시놉시스' : 'Synopsis'}</span>
                            <p className="text-text-secondary text-[9px] mt-0.5 line-clamp-2 italic">{currentSession.config.synopsis}</p>
                          </div>
                        )}
                        {/* Scene Direction */}
                        {currentSession.config.sceneDirection && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '연출' : 'Direction'}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.sceneDirection.hooks && currentSession.config.sceneDirection.hooks.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold">
                                  🪝 {isKO ? '훅' : 'Hook'} {currentSession.config.sceneDirection.hooks.length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.goguma && currentSession.config.sceneDirection.goguma.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[9px] font-bold">
                                  🍠 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'goguma').length} / 🥤 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'cider').length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.cliffhanger && (
                                <span className="px-2 py-0.5 bg-accent-red/10 text-accent-red rounded text-[9px] font-bold">
                                  🔚 {currentSession.config.sceneDirection.cliffhanger.cliffType}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.emotionTargets && currentSession.config.sceneDirection.emotionTargets.length > 0 && (
                                <span className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[9px]">
                                  💓 {currentSession.config.sceneDirection.emotionTargets.map(e => e.emotion).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Simulator Ref */}
                        {currentSession.config.simulatorRef && Object.values(currentSession.config.simulatorRef).some(Boolean) && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '시뮬레이터' : 'Simulator'}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {currentSession.config.simulatorRef.worldConsistency && <span className="px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded text-[8px] font-bold">✓ {isKO ? '일관성' : 'Consistency'}</span>}
                              {currentSession.config.simulatorRef.civRelations && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[8px] font-bold">✓ {isKO ? '관계도' : 'Relations'}</span>}
                              {currentSession.config.simulatorRef.timeline && <span className="px-1.5 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[8px] font-bold">✓ {isKO ? '타임라인' : 'Timeline'}</span>}
                              {currentSession.config.simulatorRef.territoryMap && <span className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[8px] font-bold">✓ {isKO ? '지도' : 'Map'}</span>}
                              {currentSession.config.simulatorRef.languageSystem && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[8px] font-bold">✓ {isKO ? '언어' : 'Language'}</span>}
                              {currentSession.config.simulatorRef.genreLevel && <span className="px-1.5 py-0.5 bg-accent-red/10 text-accent-red rounded text-[8px] font-bold">✓ {isKO ? '장르Lv' : 'GenreLv'}</span>}
                            </div>
                          </div>
                        )}
                        {/* Quick nav */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setActiveTab('world')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {isKO ? '→ 세계관 수정' : '→ Edit World'}
                          </button>
                          <button onClick={() => setActiveTab('characters')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {isKO ? '→ 캐릭터 수정' : '→ Edit Characters'}
                          </button>
                          <button onClick={() => setActiveTab('rulebook')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {isKO ? '→ 연출 수정' : '→ Edit Direction'}
                          </button>
                        </div>
                      </div>
                    </details>
                    )}

                    {/* AI / Edit sub-tabs + Directive — show when: has messages, not in default ai mode, or no API key (so manual users can find edit) */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai' || !hasApiKey) && (<>
                    <div className="flex gap-1 items-center">
                      <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('ai'); }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'ai' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        } ${!hasApiKey && writingMode !== 'ai' ? 'opacity-50' : ''}`}
                        title={!hasApiKey ? (isKO ? 'API 키 필요' : 'API key required') : ''}>
                        🤖 {isKO ? '초안 생성' : 'Draft'}{!hasApiKey && ' 🔒'}
                      </button>
                      <button onClick={() => {
                        setWritingMode('edit');
                        if (!editDraft && currentSession.messages.length > 0) {
                          const allText = currentSession.messages
                            .filter(m => m.role === 'assistant' && m.content)
                            .map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                            .join('\n\n---\n\n');
                          setEditDraft(allText);
                        }
                      }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'edit' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        }`}>
                        ✏️ {isKO ? '직접 편집' : 'Manual Edit'}
                      </button>
                      <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('canvas'); if (!canvasContent) setCanvasPass(0); }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'canvas' ? 'bg-accent-green text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        } ${!hasApiKey && writingMode !== 'canvas' ? 'opacity-50' : ''}`}
                        title={!hasApiKey ? (isKO ? 'API 키 필요' : 'API key required') : ''}>
                        🎨 {isKO ? '3단계 작성' : '3-Step Write'}{!hasApiKey && ' 🔒'}
                      </button>
                      <button onClick={() => {
                        if (!hasApiKey) { setShowApiKeyModal(true); return; }
                        setWritingMode('refine');
                        if (!editDraft && currentSession.messages.length > 0) {
                          const allText = currentSession.messages
                            .filter(m => m.role === 'assistant' && m.content)
                            .map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                            .join('\n\n---\n\n');
                          setEditDraft(allText);
                        }
                      }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'refine' ? 'bg-gradient-to-r from-accent-purple to-blue-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        } ${!hasApiKey && writingMode !== 'refine' ? 'opacity-50' : ''}`}
                        title={!hasApiKey ? (isKO ? 'API 키 필요' : 'API key required') : ''}>
                        ⚡ {isKO ? 'AUTO 30%' : 'AUTO 30%'}{!hasApiKey && ' 🔒'}
                      </button>
                      <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('advanced'); }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'advanced' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        } ${!hasApiKey && writingMode !== 'advanced' ? 'opacity-50' : ''}`}
                        title={!hasApiKey ? (isKO ? 'API 키 필요' : 'API key required') : ''}>
                        🎯 {isKO ? '정밀 집필' : 'Advanced'}{!hasApiKey && ' 🔒'}
                      </button>
                      {writingMode === 'edit' && (
                        <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] ml-2">
                          {editDraft.length.toLocaleString()}{isKO ? '자' : ' chars'}
                        </span>
                      )}
                    </div>

                    {/* Prompt Directive — AI에 추가 지시 */}
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider shrink-0">
                        💡 {isKO ? '지침' : 'Directive'}
                      </span>
                      <input
                        value={promptDirective}
                        onChange={e => setPromptDirective(e.target.value)}
                        placeholder={isKO ? '프롬프트 지침 (예: "문체를 하드보일드로", "대화 비율 50%", "1인칭 시점")' : 'Prompt directive (e.g. "hardboiled style", "50% dialogue", "1st person POV")'}
                        className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                      />
                      {promptDirective && (
                        <button onClick={() => setPromptDirective('')} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
                      )}
                    </div>
                    </>)}

                    {writingMode === 'ai' && (
                      <>
                        <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                        {currentSession.messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <Sparkles className="w-14 h-14 text-accent-purple/20 mx-auto" />
                            <p className="text-text-tertiary text-base font-medium">{t.engine.startPrompt}</p>
                            <p className="text-text-tertiary/40 text-xs font-[family-name:var(--font-mono)] max-w-sm">
                              {isKO ? '아래 입력창에 첫 장면을 묘사하세요' : 'Describe the first scene in the input below'}
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center pt-2 max-w-2xl">
                              {(isKO ? [
                                "주인공이 처음 등장하는 장면을 써줘",
                                "긴박한 추격전으로 시작해줘",
                                "일상 속 작은 이상 징후로 시작해줘",
                                "두 캐릭터의 첫 만남을 써줘",
                                "비밀이 드러나는 대화 장면을 써줘",
                                "전투 직전의 긴장감 있는 장면을 써줘",
                                "과거 회상으로 시작하는 장면을 써줘",
                                "편지나 일지 형식으로 시작해줘",
                                "절체절명의 위기 장면을 써줘",
                                "고요한 풍경 묘사로 시작해줘",
                              ] : [
                                "Write the protagonist's first appearance",
                                "Start with a tense chase scene",
                                "Begin with a subtle anomaly in daily life",
                                "Write the first meeting of two characters",
                                "Write a dialogue scene revealing a secret",
                                "Write a tense moment before battle",
                                "Start with a flashback scene",
                                "Begin in letter or journal format",
                                "Write a life-or-death crisis scene",
                                "Start with a quiet landscape description",
                              ]).map((preset, i) => (
                                <button key={i} onClick={() => handleSend(preset)}
                                  className="px-3 py-1.5 bg-bg-secondary/80 border border-border rounded-full text-[10px] text-text-tertiary hover:text-accent-purple hover:border-accent-purple/50 transition-all font-[family-name:var(--font-mono)]">
                                  {preset}
                                </button>
                              ))}
                            </div>
                            {!hasApiKey && (
                              <div className="mt-6 pt-4 border-t border-border/30">
                                <p className="text-text-tertiary/60 text-[10px] font-[family-name:var(--font-mono)] mb-2">
                                  {isKO ? 'API 키 없이 시작하려면:' : 'To start without API key:'}
                                </p>
                                <button onClick={() => setWritingMode('edit')}
                                  className="px-4 py-2 bg-bg-secondary border border-accent-purple/30 rounded-xl text-[10px] font-bold text-accent-purple hover:bg-accent-purple/10 transition-all font-[family-name:var(--font-mono)]">
                                  ✏️ {isKO ? '직접 편집 모드로 시작' : 'Start in Manual Edit mode'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          (searchQuery ? filteredMessages : currentSession.messages).map(msg => (
                            <div key={msg.id}>
                              <ChatMessage message={msg} language={language} onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined} />
                              {msg.role === 'assistant' && msg.versions && msg.versions.length > 1 && (
                                <div className="ml-11 md:ml-12">
                                  <VersionDiff
                                    versions={msg.versions}
                                    currentIndex={msg.currentVersionIndex ?? msg.versions.length - 1}
                                    language={language}
                                    onSwitch={(idx) => handleVersionSwitch(msg.id, idx)}
                                  />
                                </div>
                              )}
                              {msg.role === 'assistant' && msg.content && (
                                <div className="ml-11 md:ml-12">
                                  <TypoPanel
                                    text={msg.content}
                                    language={language}
                                    onApplyFix={(idx, orig, sug) => handleTypoFix(msg.id, idx, orig, sug)}
                                  />
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} className="h-32" />
                      </>
                    )}

                    {writingMode === 'edit' && (
                      /* ====== INLINE REWRITE MODE ====== */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-text-tertiary">
                            {isKO
                              ? `직접 수정 가능.${hasApiKey ? ' 텍스트 드래그 선택 → 리라이트/살붙이기/압축 등 AI 액션도 사용 가능.' : ' (AI 리라이트 액션은 API 키 설정 후 사용 가능)'}`
                              : `Direct editing available.${hasApiKey ? ' Select text → run AI rewrite/expand/compress actions.' : ' (AI rewrite actions require API key)'}`}
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              if (!editDraft.trim()) return;
                              const editMsg: Message = { id: `edit-${Date.now()}`, role: 'assistant', content: editDraft, timestamp: Date.now() };
                              updateCurrentSession({
                                messages: [...currentSession.messages, { id: `u-edit-${Date.now()}`, role: 'user', content: isKO ? '[인라인 편집 완료]' : '[Inline Edit Complete]', timestamp: Date.now() }, editMsg],
                                title: currentSession.messages.length === 0 ? editDraft.substring(0, 15) : currentSession.title
                              });
                              if (hasApiKey) setWritingMode('ai');
                              setEditDraft('');
                            }}
                              className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity">
                              {isKO ? '💾 원고에 반영' : '💾 Apply to Manuscript'}
                            </button>
                          </div>
                        </div>
                        {!editDraft.trim() ? (
                          /* ====== EMPTY EDIT ONBOARDING ====== */
                          <div className="text-center py-16 space-y-4">
                            <PenTool className="w-8 h-8 text-text-tertiary mx-auto opacity-50" />
                            <p className="text-sm text-text-secondary font-[family-name:var(--font-mono)]">
                              {isKO ? '원고를 직접 작성하세요' : 'Write your manuscript here'}
                            </p>
                            <p className="text-[10px] text-text-tertiary max-w-md mx-auto">
                              {isKO
                                ? 'AI 없이 직접 글을 쓸 수 있습니다. 아래 영역에 텍스트를 붙여넣거나 입력하세요. 텍스트 선택 후 AI 리라이트 액션도 사용 가능합니다.'
                                : 'Write directly without AI. Paste or type text below. You can also select text for AI rewrite actions.'}
                            </p>
                            <textarea
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              placeholder={isKO ? '여기에 원고를 입력하세요...' : 'Type your manuscript here...'}
                              className="w-full min-h-[300px] bg-bg-primary border border-border rounded-xl p-4 text-sm text-left outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] resize-y"
                            />
                          </div>
                        ) : (
                          <InlineRewriter
                            content={editDraft}
                            language={language}
                            context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''}` : undefined}
                            onApply={(newContent) => setEditDraft(newContent)}
                          />
                        )}
                      </div>
                    )}

                    {/* ====== AUTO 30% REFINE MODE ====== */}
                    {writingMode === 'refine' && editDraft && (
                      <div className="space-y-4">
                        <AutoRefiner
                          content={editDraft}
                          language={language}
                          context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''} | EP.${currentSession.config.episode}` : undefined}
                          onApply={(newContent) => {
                            setEditDraft(newContent);
                            const editMsg: Message = { id: `refine-${Date.now()}`, role: 'assistant', content: newContent, timestamp: Date.now() };
                            updateCurrentSession({ messages: [...currentSession.messages, { id: `u-refine-${Date.now()}`, role: 'user', content: isKO ? '[AUTO 30% 리파인 완료]' : '[AUTO 30% Refine Complete]', timestamp: Date.now() }, editMsg] });
                            setWritingMode('ai');
                          }}
                        />
                        <div className="text-[9px] text-zinc-600 font-[family-name:var(--font-mono)]">
                          {isKO
                            ? '※ 분석 시작 → AI가 문단별 약점 분석 → 개별/전체 생성 → 선택 적용 → 원고 반영'
                            : '※ Analyze → AI finds weak paragraphs → Generate fixes → Selectively apply → Save to manuscript'}
                        </div>
                      </div>
                    )}

                    {/* ====== 3-PASS CANVAS MODE ====== */}
                    {writingMode === 'canvas' && (
                      <div className="space-y-4">
                        {/* Pass progress */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 1 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            🦴 {canvasPass >= 1 ? '✓' : '1'} {isKO ? '뼈대' : 'Skeleton'}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 2 ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            💓 {canvasPass >= 2 ? '✓' : '2'} {isKO ? '감정' : 'Emotion'}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            👁 {canvasPass >= 3 ? '✓' : '3'} {isKO ? '묘사' : 'Sensory'}
                          </div>
                          <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
                            {canvasContent.length.toLocaleString()}{isKO ? '자' : ' chars'}
                          </span>
                          {isGenerating && <span className="text-[9px] text-accent-purple animate-pulse font-[family-name:var(--font-mono)]">{isKO ? '생성 중...' : 'Generating...'}</span>}
                        </div>

                        {/* Custom prompt input */}
                        <div className="flex gap-2">
                          <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
                            placeholder={isKO ? '💡 커스텀 지시 (예: "전투 장면 더 길게", "대사 톤 부드럽게", "클리프행어 바꿔줘")' : '💡 Custom instruction (e.g. "extend fight scene", "softer dialogue", "change cliffhanger")'}
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-xs outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                            disabled={isGenerating}
                          />
                          <button onClick={() => { if (input.trim()) handleSend(); }} disabled={isGenerating || !input.trim()}
                            className="px-4 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                            {isKO ? '전송' : 'Send'}
                          </button>
                        </div>

                        {/* Canvas textarea */}
                        <textarea
                          value={canvasContent}
                          onChange={e => setCanvasContent(e.target.value)}
                          className="w-full min-h-[50vh] bg-bg-primary border border-border rounded-xl p-6 text-sm leading-[2] font-serif text-text-primary outline-none focus:border-accent-purple transition-colors resize-y"
                          placeholder={isKO ? '3패스 캔버스 — 상단에서 커스텀 지시를 보내거나, 아래 단계 버튼을 순서대로 눌러 원고를 완성하세요.' : '3-Pass Canvas — Send custom instructions above, or click pass buttons below in order.'}
                        />

                        {/* Pass action buttons */}
                        <div className="flex gap-2 flex-wrap items-center">
                          <button disabled={isGenerating} onClick={() => {
                            setCanvasPass(1);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? '[1단계 — 뼈대] 씬시트/연출표를 기반으로 초안을 작성하세요. 사건과 대사만. 감정 묘사 없이 골격만. 약 1,000토큰(2,000자). 중요: JSON 코드블록, 분석 리포트, grade, metrics 등 절대 출력하지 마세요. 순수 소설 본문만 출력하세요.'
                                : '[Pass 1 — Skeleton] Scene sheet based. Events and dialogue only. ~1,000 tokens. Story text only, no JSON.'
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            🦴 {isKO ? '1단계: 뼈대' : 'Pass 1: Skeleton'}
                          </button>
                          <button disabled={isGenerating || canvasPass < 1} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const draft = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!draft) { alert(isKO ? '1단계 결과가 없습니다.' : 'No Pass 1 result.'); return; }
                            setCanvasContent(draft);
                            setCanvasPass(2);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[2단계 — 감정선] 아래 초안을 전체 다시 써주세요. 인물 내면, 감정 밀도, 문장 리듬 강화. 고구마/사이다 타이밍. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---초안---\n${draft.slice(0, 4000)}`
                                : `[Pass 2 — Emotion] Rewrite fully with inner thoughts, emotional density, pacing. +1,000 tokens. Full output.\n\n---Draft---\n${draft.slice(0, 4000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-pink-600/10 border border-pink-500/30 rounded-lg text-[10px] font-bold text-pink-400 hover:bg-pink-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            💓 {isKO ? '2단계: 감정' : 'Pass 2: Emotion'}
                          </button>
                          <button disabled={isGenerating || canvasPass < 2} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const ms = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!ms) { alert(isKO ? '2단계 결과가 없습니다.' : 'No Pass 2 result.'); return; }
                            setCanvasContent(ms);
                            setCanvasPass(3);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[3단계 — 감각 묘사] 아래 원고를 전체 다시 써주세요. 물성/시각/청각/촉각 묘사 추가. 클리프행어 마무리. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---원고---\n${ms.slice(0, 5000)}`
                                : `[Pass 3 — Sensory] Rewrite with physical/visual/auditory descriptions. Cliffhanger. +1,000 tokens. Full output.\n\n---Manuscript---\n${ms.slice(0, 5000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-amber-600/10 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-amber-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            👁 {isKO ? '3단계: 묘사' : 'Pass 3: Sensory'}
                          </button>
                          <span className="text-border mx-1">|</span>
                          <button onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const text = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (text) { setCanvasContent(text); setWritingMode('canvas'); }
                          }}
                            className="px-3 py-2.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all font-[family-name:var(--font-mono)]">
                            📋 {isKO ? '캔버스에 가져오기' : 'Pull to Canvas'}
                          </button>
                          <button disabled={!canvasContent} onClick={() => {
                            const editMsg: Message = { id: `canvas-${Date.now()}`, role: 'assistant', content: canvasContent, timestamp: Date.now() };
                            updateCurrentSession({ messages: [...(currentSession?.messages || []), { id: `u-canvas-${Date.now()}`, role: 'user', content: isKO ? `[3패스 완성 — ${canvasContent.length}자]` : `[3-Pass Complete — ${canvasContent.length} chars]`, timestamp: Date.now() }, editMsg] });
                            setWritingMode('ai');
                          }}
                            className="px-3 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30">
                            💾 {isKO ? '원고 저장' : 'Save'}
                          </button>
                        </div>
                        <p className="text-[8px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {isKO ? '※ 각 단계 클릭 → AI 채팅에서 결과 확인 → 📋 캔버스로 가져와서 편집 → 다음 단계' : '※ Click pass → Check result in AI chat → 📋 Pull to canvas for editing → Next pass'}
                        </p>
                      </div>
                    )}

                    {/* ====== ADVANCED WRITING MODE ====== */}
                    {writingMode === 'advanced' && currentSession && (
                      <div className="space-y-4">
                        <AdvancedWritingPanel
                          language={language}
                          config={currentSession.config}
                          settings={advancedSettings}
                          onSettingsChange={setAdvancedSettings}
                        />
                        <div className="flex gap-2 items-center">
                          <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
                            placeholder={isKO ? '🎯 정밀 지시 (설정된 제약 조건이 자동 반영됩니다)' : '🎯 Precise instruction (configured constraints auto-applied)'}
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-xs outline-none focus:border-amber-500 transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                            disabled={isGenerating}
                          />
                          <button onClick={() => { if (input.trim()) handleSend(); }} disabled={isGenerating || !input.trim()}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                            {isKO ? '정밀 생성' : 'Generate'}
                          </button>
                        </div>
                        <p className="text-[8px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {isKO
                            ? '※ 장면 목표·서술 제약·참조 범위·고정 규칙이 프롬프트에 자동 결합됩니다. "고급 집필 = 작가가 더 세밀하게 제어하는 모드"'
                            : '※ Scene goals, narrative constraints, references, and locks are auto-combined into the prompt.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'style' && currentSession && (
                  <>
                    <StyleStudioView
                      isKO={isKO}
                      initialProfile={currentSession.config.styleProfile}
                      onProfileChange={(profile) => {
                        updateCurrentSession({
                          config: { ...currentSession.config, styleProfile: profile },
                        });
                      }}
                    />
                    <div className="max-w-6xl mx-auto px-4 pb-4">
                      <TabAssistant tab="style" language={language} config={currentSession.config} />
                    </div>
                    <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-end">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '설정 저장' : 'Save')}
                      </button>
                    </div>
                  </>
                )}
                {activeTab === 'manuscript' && currentSession && (
                  <ManuscriptView
                    language={language}
                    config={currentSession.config}
                    setConfig={setConfig}
                    messages={currentSession.messages}
                    onEditInStudio={(content) => {
                      setEditDraft(content);
                      setWritingMode('edit');
                      setActiveTab('writing');
                    }}
                  />
                )}
                {activeTab === 'history' && (() => {
                  const allSessions: (ChatSession & { _projectName?: string; _projectId?: string })[] = archiveScope === 'all'
                    ? projects.flatMap(p => p.sessions.map(s => ({ ...s, _projectName: p.name, _projectId: p.id })))
                    : sessions.map(s => ({ ...s, _projectName: currentProject?.name, _projectId: currentProjectId ?? undefined }));

                  const genres = Array.from(new Set(allSessions.map(s => s.config.genre)));
                  const hasWorldData = allSessions.some(s => s.config.worldSimData?.civs?.length);

                  const categories = [
                    { key: 'ALL', label: isKO ? '전체' : 'All' },
                    ...genres.map(g => ({ key: g, label: g })),
                    ...(hasWorldData ? [{ key: 'WORLD', label: isKO ? '세계관' : 'World' }] : []),
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
                              {isKO ? '현재 프로젝트' : 'Current Project'}
                            </button>
                            <button onClick={() => setArchiveScope('all')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveScope === 'all' ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
                              {isKO ? '전체 프로젝트' : 'All Projects'}
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
                          <div className="col-span-full py-20 text-center text-text-tertiary font-bold uppercase tracking-widest font-[family-name:var(--font-mono)]">{t.engine.noArchive}</div>
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
                                <button onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all"><Edit3 className="w-3 h-3" /></button>
                                {projects.length > 1 && (
                                  <button onClick={(e) => {
                                    e.stopPropagation();
                                    const others = projects.filter(p => p.id !== (s._projectId || currentProjectId));
                                    if (others.length === 1) {
                                      moveSessionToProject(s.id, others[0].id);
                                    } else if (others.length > 1) {
                                      const choice = window.prompt(
                                        (t.project?.moveSession || 'Move to') + ':\n' + others.map((p, i) => `${i + 1}. ${p.name}`).join('\n'),
                                        '1'
                                      );
                                      const idx = parseInt(choice || '', 10) - 1;
                                      if (idx >= 0 && idx < others.length) moveSessionToProject(s.id, others[idx].id);
                                    }
                                  }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all" title={t.project?.moveSession || 'Move Session'}><Upload className="w-3 h-3" /></button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handlePrint(); }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-text-primary transition-all"><Printer className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-red transition-all"><X className="w-3 h-3" /></button>
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
                                <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">{s.config.genre}</span>
                                <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">EP.{s.config.episode}</span>
                                {s.messages.length > 0 && (
                                  <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[8px] font-bold text-zinc-600 font-[family-name:var(--font-mono)]">{s.messages.length} msg</span>
                                )}
                                {(s.config.worldSimData?.civs?.length ?? 0) > 0 && (
                                  <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400 font-[family-name:var(--font-mono)]">
                                    {isKO ? '세계관' : 'WORLD'} · {s.config.worldSimData!.civs!.length}
                                  </span>
                                )}
                                {archiveScope === 'all' && s._projectName && (
                                  <span className="px-1.5 py-0.5 bg-purple-900/20 border border-purple-500/15 rounded text-[8px] font-bold text-purple-400/70 font-[family-name:var(--font-mono)]">{s._projectName}</span>
                                )}
                              </div>
                              <div className="mt-2 text-[8px] text-zinc-600 font-[family-name:var(--font-mono)]">
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
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {showDashboard && activeTab === 'writing' && currentSession && (
            <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
          )}

          {/* Right Panel — Save Slots (all tabs except writing) */}
          {activeTab !== 'history' && activeTab !== 'settings' && activeTab !== 'manuscript' && !(activeTab === 'writing' && writingMode === 'ai' && !showDashboard) && currentSession && (
            <aside className="hidden lg:flex w-64 shrink-0 flex-col border-l border-border bg-bg-primary overflow-y-auto">
              <div className="p-4 space-y-3">
                <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)]">
                  📂 {isKO ? '저장 목록' : 'Saved Versions'}
                </div>

                {/* Save current */}
                <button onClick={() => {
                  setSaveSlotName('');
                  setSaveSlotModalOpen(true);
                }}
                  className="w-full py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity active:scale-95">
                  💾 {isKO ? '현재 설정 저장' : 'Save Current'}
                </button>

                {/* Saved slots list */}
                <div className="space-y-1.5">
                  {(currentSession.config.savedSlots || [])
                    .filter(s => s.tab === activeTab || s.tab === 'all')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 px-2 py-2 bg-bg-secondary/50 border border-border rounded-lg group hover:border-accent-purple/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-text-primary truncate">{slot.name}</div>
                          <div className="text-[8px] text-text-tertiary">{new Date(slot.timestamp).toLocaleString()}</div>
                        </div>
                        <button onClick={() => {
                          if (!confirm(isKO ? `"${slot.name}"을 불러오시겠습니까? 현재 설정이 덮어씌워집니다.` : `Load "${slot.name}"? Current settings will be overwritten.`)) return;
                          updateCurrentSession({ config: { ...currentSession.config, ...slot.data } });
                          triggerSave();
                        }}
                          className="px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-[8px] font-bold hover:bg-accent-purple/20 transition-colors opacity-0 group-hover:opacity-100">
                          {isKO ? '불러오기' : 'Load'}
                        </button>
                        <button onClick={() => {
                          updateCurrentSession({
                            config: {
                              ...currentSession.config,
                              savedSlots: (currentSession.config.savedSlots || []).filter(s => s.id !== slot.id),
                            },
                          });
                        }}
                          className="text-text-tertiary hover:text-accent-red text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                          ✕
                        </button>
                      </div>
                    ))}
                  {(currentSession.config.savedSlots || []).filter(s => s.tab === activeTab || s.tab === 'all').length === 0 && (
                    <p className="text-[9px] text-text-tertiary italic text-center py-4">
                      {isKO ? '저장된 버전이 없습니다' : 'No saved versions'}
                    </p>
                  )}
                </div>

                {/* All slots across tabs */}
                {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length > 0 && (
                  <details className="group">
                    <summary className="text-[9px] text-text-tertiary cursor-pointer hover:text-text-secondary">
                      {isKO ? '다른 탭 저장' : 'Other tabs'} ({(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).map(slot => (
                        <div key={slot.id} className="text-[8px] text-text-tertiary px-2 py-1 bg-bg-primary rounded">
                          [{slot.tab}] {slot.name}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </aside>
          )}

          {/* Right Panel — Writing Assistant + AI Chat */}
          {activeTab === 'writing' && writingMode === 'ai' && currentSession && !showDashboard && (
            <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-all duration-300 ${rightPanelOpen ? 'w-80' : 'w-10'}`}>
              {/* Toggle button */}
              <button onClick={() => setRightPanelOpen(p => !p)} className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary transition-colors border-b border-border font-[family-name:var(--font-mono)]">
                {rightPanelOpen ? '▶' : '◀'}
              </button>

              {rightPanelOpen && (
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {/* 도우미 섹션 */}
                  <div className="p-4 space-y-3 border-b border-border min-w-0">
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)]">
                      {isKO ? '집필 참고' : 'Reference'}
                    </div>

                    {/* ① 브릿지 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📎 {isKO ? '이전 화' : 'Bridge'}</summary>
                      {(() => {
                        const prev = currentSession.messages.filter(m => m.role === 'assistant' && m.content).slice(-1)[0];
                        const txt = prev?.content.replace(/```(?:json|JSON)?\s*[\s\S]*?```/g, '').replace(/\{\s*\n\s*"(?:grade|metrics|tension|pacing|immersion|eos|active_eh_layer|critique)"[\s\S]*?\n\s*\}/g, '').trim() || '';
                        return <p className="mt-1.5 text-[11px] text-text-tertiary pl-4 italic leading-relaxed break-words overflow-hidden">{txt ? txt.slice(-250) : (isKO ? '없음' : 'None')}</p>;
                      })()}
                    </details>

                    {/* ② 씬시트 — 미설정 시 자동 open + 경고 표시 */}
                    <details className="group" open={!currentSession.config.sceneDirection}>
                      <summary className={`flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-colors ${
                        currentSession.config.sceneDirection
                          ? 'text-text-tertiary hover:text-text-secondary'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}>🎬 {isKO ? '씬시트' : 'Scene'} {!currentSession.config.sceneDirection && <span className="text-[9px] ml-1 px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-400">{isKO ? '미설정' : 'Not set'}</span>}</summary>
                      <div className="mt-1.5 pl-4 space-y-1 min-w-0">
                        {currentSession.config.sceneDirection?.hooks?.map((h, i) => <div key={i} className="text-[10px] text-blue-400 break-words">🪝 {h.desc}</div>)}
                        {currentSession.config.sceneDirection?.goguma?.map((g, i) => <div key={i} className={`text-[10px] break-words ${g.type === 'goguma' ? 'text-amber-400' : 'text-cyan-400'}`}>{g.type === 'goguma' ? '🍠' : '🥤'} {g.desc}</div>)}
                        {currentSession.config.sceneDirection?.cliffhanger && <div className="text-[10px] text-red-400 break-words">🔚 {currentSession.config.sceneDirection.cliffhanger.desc}</div>}
                        {!currentSession.config.sceneDirection && (
                          <div className="space-y-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                            <p className="text-[10px] text-amber-300">{isKO ? '씬시트 없이 집필하면 AI 품질이 떨어집니다' : 'Writing without scene direction reduces AI quality'}</p>
                            <button onClick={() => setActiveTab('rulebook')} className="text-[10px] text-accent-purple hover:underline font-bold">
                              → {isKO ? '연출 스튜디오에서 설정하기' : 'Set up in Direction Studio'}
                            </button>
                          </div>
                        )}
                      </div>
                    </details>

                    {/* ②-B 에피소드 씬시트 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📋 {isKO ? '에피소드 씬시트' : 'Episode Scenes'} ({(currentSession.config.episodeSceneSheets ?? []).length})</summary>
                      <div className="mt-1.5 pl-2 min-w-0">
                        <EpisodeScenePanel
                          lang={language}
                          currentEpisode={currentSession.config.episode}
                          episodeSceneSheets={currentSession.config.episodeSceneSheets ?? []}
                          onSave={(sheet) => {
                            const existing = currentSession.config.episodeSceneSheets ?? [];
                            const filtered = existing.filter(s => s.episode !== sheet.episode);
                            setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                          }}
                          onDelete={(ep) => {
                            setConfig({ ...currentSession.config, episodeSceneSheets: (currentSession.config.episodeSceneSheets ?? []).filter(s => s.episode !== ep) });
                          }}
                          onUpdate={(sheet) => {
                            const existing = currentSession.config.episodeSceneSheets ?? [];
                            const filtered = existing.filter(s => s.episode !== sheet.episode);
                            setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                          }}
                        />
                      </div>
                    </details>

                    {/* ③ 캐릭터 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">👤 {isKO ? '캐릭터' : 'Chars'} ({currentSession.config.characters.length})</summary>
                      <div className="mt-1.5 pl-4 space-y-1.5 min-w-0">
                        {currentSession.config.characters.length > 0 ? currentSession.config.characters.map(c => (
                          <div key={c.id} className="text-[10px] break-words">
                            <span className="font-bold text-text-primary">{c.name}</span> <span className="text-text-tertiary">({c.role})</span>
                            {c.speechStyle && <span className="text-accent-blue ml-1">🗣️{c.speechStyle}</span>}
                          </div>
                        )) : <p className="text-[10px] text-text-tertiary italic">{isKO ? '없음' : 'None'}</p>}
                      </div>
                    </details>

                    {/* ④ 서식 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📐 {isKO ? '서식' : 'Format'}</summary>
                      <div className="mt-1.5 pl-4 grid grid-cols-2 gap-1">
                        {(isKO ? ['괄호제거','소제목없음','대화줄분리','—금지','삭제금지','…통일','대화보호'] : ['No()','No head','Dlg split','No—','No del','…','Keep dlg']).map((r, i) => (
                          <div key={i} className="text-[9px] text-text-tertiary"><span className="text-accent-green">✓</span> {r}</div>
                        ))}
                      </div>
                    </details>

                    {/* ⑤ NOD 감독 */}
                    <DirectorPanel report={directorReport} language={language} />

                    {/* ⑥ 대화 온도 */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-text-tertiary">🌡️</span>
                      <span className={`text-xs font-bold ${
                        hfcpState.verdict === 'engagement' ? 'text-accent-green' :
                        hfcpState.verdict === 'normal_free' ? 'text-accent-blue' :
                        hfcpState.verdict === 'normal_analysis' ? 'text-accent-amber' :
                        hfcpState.verdict === 'limited' ? 'text-accent-red' : 'text-text-tertiary'
                      }`}>
                        {isKO ? ({
                          engagement: '적극 참여',
                          normal_free: '자유 대화',
                          normal_analysis: '분석 모드',
                          limited: '절제 모드',
                          silent: '침묵',
                        } as Record<string, string>)[hfcpState.verdict] || hfcpState.verdict
                        : hfcpState.verdict.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-text-tertiary">{Math.round(hfcpState.score)}</span>
                    </div>
                  </div>

                  {/* AI 대화 섹션 */}
                  <div className="p-4 space-y-3">
                    <div className="text-[10px] font-black text-accent-purple uppercase tracking-widest font-[family-name:var(--font-mono)]">
                      💬 {isKO ? 'AI 대화' : 'AI Chat'}
                    </div>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                      {currentSession.messages.filter(m => {
                        if (m.role === 'user') {
                          const isGen = m.meta?.hfcpMode === 'generate' || m.content.startsWith('[1단계') || m.content.startsWith('[2단계') || m.content.startsWith('[3단계') || m.content.startsWith('[Pass');
                          return !isGen;
                        }
                        return false;
                      }).length === 0 ? (
                        <p className="text-[11px] text-text-tertiary italic text-center py-4">{isKO ? 'AI와 대화하려면 아래 입력창에 질문하세요' : 'Ask questions in the input below'}</p>
                      ) : (
                        currentSession.messages.filter(m => {
                          if (m.role === 'user' && m.meta?.hfcpMode === 'chat') return true;
                          const idx = currentSession.messages.indexOf(m);
                          if (m.role === 'assistant' && idx > 0) {
                            const prev = currentSession.messages[idx - 1];
                            return prev.meta?.hfcpMode === 'chat';
                          }
                          return false;
                        }).slice(-6).map(msg => (
                          <div key={msg.id} className={`text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-accent-purple' : 'text-text-secondary'}`}>
                            <span className="font-bold">{msg.role === 'user' ? '나' : 'NOW'}:</span> {msg.content.slice(0, 200)}{msg.content.length > 200 ? '...' : ''}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Writing Input */}
        {activeTab === 'writing' && currentSessionId && (
          <div className="px-4 md:px-6 pb-4 md:pb-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-8 md:pt-12 shrink-0">
            <div className="max-w-6xl mx-auto relative px-0">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:bottom-auto md:-top-10 md:left-4 md:translate-x-0 flex gap-2 items-center">
                <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } handleSend(t.engine.nextChapterPrompt); }}
                  className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${!hasApiKey ? 'opacity-50' : ''}`}
                  title={!hasApiKey ? (isKO ? 'API 키 필요' : 'API key required') : ''}>
                  {t.engine.nextChapter}{!hasApiKey && ' 🔒'}
                </button>
                <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } handleSend(t.engine.plotTwistPrompt); }}
                  className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${!hasApiKey ? 'opacity-50' : ''}`}
                  title={!hasApiKey ? (isKO ? 'API 키 필요' : 'API key required') : ''}>
                  {t.engine.plotTwist}{!hasApiKey && ' 🔒'}
                </button>
                {currentSession && currentSession.config.episode < currentSession.config.totalEpisodes && (
                  <button onClick={handleNextEpisode} className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-[10px] font-bold text-accent-purple hover:bg-accent-purple/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                    EP.{currentSession.config.episode} → {currentSession.config.episode + 1}
                  </button>
                )}
                <span className="text-border">|</span>
                <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('canvas'); setCanvasContent(''); setCanvasPass(0); }}
                  className={`px-3 py-1.5 bg-accent-green/10 border border-accent-green/20 rounded-full text-[10px] font-bold text-accent-green hover:bg-accent-green/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${!hasApiKey ? 'opacity-50' : ''}`}
                  title={!hasApiKey ? (isKO ? 'API 키 필요' : 'API key required') : ''}>
                  {!hasApiKey ? '🔒' : '🎨'} {isKO ? '캔버스 실행' : 'Open Canvas'}
                </button>
              </div>
              <div className="relative bg-bg-secondary border border-border rounded-2xl md:rounded-[2rem] shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 md:pl-6 flex items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={!hasApiKey
                    ? (isKO ? '🔒 AI 생성에는 API 키가 필요합니다. 직접 편집 모드(✏️)를 이용하세요.' : '🔒 API key required for AI generation. Use Manual Edit (✏️) mode instead.')
                    : t.writing.inputPlaceholder}
                  className={`flex-1 bg-transparent border-none outline-none py-3 md:py-4 text-sm md:text-[15px] text-text-primary placeholder-text-tertiary resize-none max-h-40 leading-relaxed ${!hasApiKey ? 'cursor-not-allowed opacity-60' : ''}`}
                  rows={1}
                  disabled={isGenerating || !hasApiKey}
                />
                {input.length > 0 && (
                  <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] shrink-0 self-center mr-1">
                    {input.length}
                  </span>
                )}
                {isGenerating ? (
                  <button onClick={handleCancel} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-accent-red text-white transition-all shrink-0 hover:opacity-80">
                    <StopCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={() => handleSend()} disabled={!input.trim()} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}>
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showApiKeyModal && (
        <ApiKeyModal language={language} onClose={() => { setShowApiKeyModal(false); setApiKeyVersion(v => v + 1); }} onSave={() => setApiKeyVersion(v => v + 1)} />
      )}

      {/* UX: Confirm Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Save Slot Name Modal */}
      {saveSlotModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSaveSlotModalOpen(false)}>
          <div className="bg-bg-primary border border-border rounded-2xl p-6 w-[360px] space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary">{isKO ? '저장 이름 입력' : 'Enter Save Name'}</h3>
            <input
              autoFocus
              type="text"
              value={saveSlotName}
              onChange={e => setSaveSlotName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && saveSlotName.trim()) {
                  const slot: import('@/lib/studio-types').SavedSlot = {
                    id: `slot-${Date.now()}`,
                    name: saveSlotName.trim(),
                    tab: activeTab,
                    timestamp: Date.now(),
                    data: {
                      genre: currentSession?.config.genre,
                      title: currentSession?.config.title,
                      povCharacter: currentSession?.config.povCharacter,
                      setting: currentSession?.config.setting,
                      primaryEmotion: currentSession?.config.primaryEmotion,
                      synopsis: currentSession?.config.synopsis,
                      characters: currentSession?.config.characters,
                      charRelations: currentSession?.config.charRelations,
                      sceneDirection: currentSession?.config.sceneDirection,
                      worldSimData: currentSession?.config.worldSimData,
                      simulatorRef: currentSession?.config.simulatorRef,
                      styleProfile: currentSession?.config.styleProfile,
                      items: currentSession?.config.items,
                      skills: currentSession?.config.skills,
                      magicSystems: currentSession?.config.magicSystems,
                    },
                  };
                  updateCurrentSession({
                    config: { ...(currentSession?.config || INITIAL_CONFIG), savedSlots: [...(currentSession?.config.savedSlots || []), slot] },
                  });
                  triggerSave();
                  setSaveSlotModalOpen(false);
                }
                if (e.key === 'Escape') setSaveSlotModalOpen(false);
              }}
              placeholder={isKO ? '예: 초기 설정 백업' : 'e.g. Initial setup backup'}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-zinc-500 focus:outline-none focus:border-accent-purple"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSaveSlotModalOpen(false)} className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
                {isKO ? '취소' : 'Cancel'}
              </button>
              <button
                disabled={!saveSlotName.trim()}
                onClick={() => {
                  if (!saveSlotName.trim()) return;
                  const slot: import('@/lib/studio-types').SavedSlot = {
                    id: `slot-${Date.now()}`,
                    name: saveSlotName.trim(),
                    tab: activeTab,
                    timestamp: Date.now(),
                    data: {
                      genre: currentSession?.config.genre,
                      title: currentSession?.config.title,
                      povCharacter: currentSession?.config.povCharacter,
                      setting: currentSession?.config.setting,
                      primaryEmotion: currentSession?.config.primaryEmotion,
                      synopsis: currentSession?.config.synopsis,
                      characters: currentSession?.config.characters,
                      charRelations: currentSession?.config.charRelations,
                      sceneDirection: currentSession?.config.sceneDirection,
                      worldSimData: currentSession?.config.worldSimData,
                      simulatorRef: currentSession?.config.simulatorRef,
                      styleProfile: currentSession?.config.styleProfile,
                      items: currentSession?.config.items,
                      skills: currentSession?.config.skills,
                      magicSystems: currentSession?.config.magicSystems,
                    },
                  };
                  updateCurrentSession({
                    config: { ...(currentSession?.config || INITIAL_CONFIG), savedSlots: [...(currentSession?.config.savedSlots || []), slot] },
                  });
                  triggerSave();
                  setSaveSlotModalOpen(false);
                }}
                className="px-4 py-2 bg-accent-purple text-white rounded-lg text-xs font-bold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isKO ? '저장' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UX: Error Toast */}
      {uxError && (
        <ErrorToast
          error={uxError.error}
          isKO={isKO}
          onDismiss={() => setUxError(null)}
          onRetry={uxError.retry ? () => { setUxError(null); uxError.retry?.(); } : undefined}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
