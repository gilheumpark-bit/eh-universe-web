"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import { type RefObject, useState, useEffect } from 'react';
import {
  Menu, X,
  Search, Maximize2, Minimize2, Keyboard, Clock,
  Key, Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { StatusBadge } from '@/components/ui/StatusIndicator';
import type {
  ChatSession, StoryConfig, AppTab, AppLanguage, Message,
  Project, ProactiveSuggestion, PipelineStageResult,
} from '@/lib/studio-types';
import type { HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import type { VersionedBackup } from '@/lib/indexeddb-backup';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import EngineDashboard from '@/components/studio/EngineDashboard';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import GlobalSearchPalette from '@/components/studio/GlobalSearchPalette';
import { ShortcutsModal } from '@/components/studio/StudioModals';
import StudioTabRouter from '@/components/studio/StudioTabRouter';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const OnboardingGuide = dynamic(() => import('@/components/studio/OnboardingGuide'), { ssr: false, loading: DynSkeleton });


type HostedAiAvailability = Record<string, boolean>;

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+components

// ============================================================
// PART 2 — Props Interface
// ============================================================
export interface StudioMainContentProps {
  // Layout state
  focusMode: boolean;
  setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Theme
  themeLevel: number;
  toggleTheme: () => void;

  // Search
  showSearch: boolean;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showShortcuts: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;

  // Global search
  showGlobalSearch: boolean;
  setShowGlobalSearch: React.Dispatch<React.SetStateAction<boolean>>;
  globalSearchQuery: string;
  setGlobalSearchQuery: React.Dispatch<React.SetStateAction<string>>;

  // Tab
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  setActiveTab: (tab: AppTab) => void;

  // Session/Project
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  currentProjectId: string | null;
  currentProject: Project | null;
  sessions: ChatSession[];
  projects: Project[];
  setCurrentSessionId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  hydrated: boolean;

  // Config
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  updateCurrentSession: (patch: Partial<ChatSession>) => void;

  // Writing
  writingMode: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWritingMode: React.Dispatch<React.SetStateAction<any>>;
  editDraft: string;
  setEditDraft: React.Dispatch<React.SetStateAction<string>>;
  editDraftRef: RefObject<HTMLTextAreaElement | null>;
  canvasContent: string;
  setCanvasContent: React.Dispatch<React.SetStateAction<string>>;
  canvasPass: number;
  setCanvasPass: React.Dispatch<React.SetStateAction<number>>;
  promptDirective: string;
  setPromptDirective: React.Dispatch<React.SetStateAction<string>>;
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedWritingSettings>>;

  // AI
  isGenerating: boolean;
  lastReport: EngineReport | null;
  directorReport: DirectorReport | null;
  handleSend: (customPrompt?: string) => void;
  doHandleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  handleCancel: () => void;
  handleRegenerate: (assistantMsgId: string) => Promise<void>;
  handleVersionSwitch: (messageId: string, versionIndex: number) => void;
  handleTypoFix: (messageId: string, index: number, original: string, suggestion: string) => void;
  hfcpState: HFCPStateType;

  // Input
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;

  // Display state
  showDashboard: boolean;
  setShowDashboard: React.Dispatch<React.SetStateAction<boolean>>;
  rightPanelOpen: boolean;
  setRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showAiLock: boolean;
  hasAiAccess: boolean;
  aiCapabilitiesLoaded: boolean;
  bannerDismissed: boolean;
  setBannerDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  showApiKeyModal: boolean;
  setShowApiKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
  showQuickStartLock: boolean;
  hostedProviders: HostedAiAvailability;

  // Save
  saveFlash: boolean;
  lastSaveTime: number | null;
  triggerSave: () => void;

  // UX
  setUxError: (err: { error: unknown } | null) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  filteredMessages: Message[];
  searchMatchesEditDraft: string | boolean | null;
  writingColumnShell: string;
  writingInputDockOffset: string;
  apiBannerMessage: string;
  apiSetupLabel: string;

  // Language
  language: AppLanguage;
  isKO: boolean;

  // History tab
  archiveScope: 'project' | 'all';
  setArchiveScope: React.Dispatch<React.SetStateAction<'project' | 'all'>>;
  archiveFilter: string;
  setArchiveFilter: React.Dispatch<React.SetStateAction<string>>;
  charSubTab: 'characters' | 'items';
  setCharSubTab: React.Dispatch<React.SetStateAction<'characters' | 'items'>>;

  // Session management
  createNewSession: (tab?: AppTab) => void;
  createDemoSession: () => void;
  openQuickStart: () => void;
  startRename: (sessionId: string, currentTitle: string) => void;
  renamingSessionId: string | null;
  setRenamingSessionId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (val: string) => void;
  confirmRename: () => void;
  moveSessionToProject: (sessionId: string, targetProjectId: string) => void;
  deleteSession: (sessionId: string) => void;
  handleNextEpisode: () => void;
  handlePrint: () => void;

  // External control props for sidebar integration
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;

  // Versioned backups (OFFLINE_CACHE 꺼지면 undefined)
  versionedBackups?: VersionedBackup[];
  doRestoreVersionedBackup?: (timestamp: number) => Promise<boolean>;
  refreshBackupList?: () => void;

  // Modals/actions
  clearAllSessions: () => void;

  // Children: right panel slots
  children?: React.ReactNode;
}

// IDENTITY_SEAL: PART-2 | role=type-definitions | inputs=none | outputs=StudioMainContentProps

// ============================================================
// PART 3 — Main Content Component (header + tabs + writing input)
// ============================================================

const StudioClock = () => {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTime(new Date()), 0);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(timer);
    };
  }, []);

  if (!time) return <div className="h-8 w-20 rounded-xl bg-bg-secondary/40 animate-pulse border border-white/4" />;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary/40 border border-white/4 text-text-tertiary font-mono text-[11px]">
      <Clock className="w-3.5 h-3.5 text-accent-purple" />
      <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
};
export default function StudioMainContent(props: StudioMainContentProps) {
  const {
  focusMode, setFocusMode, isSidebarOpen, setIsSidebarOpen,
  themeLevel: _themeLevel, toggleTheme: _toggleTheme,
  showSearch, setShowSearch, searchQuery, setSearchQuery,
    showShortcuts, setShowShortcuts,
    showGlobalSearch, setShowGlobalSearch, globalSearchQuery, setGlobalSearchQuery,
    activeTab, handleTabChange, setActiveTab,
    currentSession, currentSessionId, currentProjectId, currentProject,
    sessions, projects, setCurrentSessionId, setCurrentProjectId,
    hydrated,
    setConfig, updateCurrentSession,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent, canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
    advancedSettings, setAdvancedSettings,
    isGenerating, lastReport, directorReport,
    doHandleSend, handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix, hfcpState,
    input, setInput,
    showDashboard, setShowDashboard,
    rightPanelOpen, setRightPanelOpen,
    showAiLock, hasAiAccess, aiCapabilitiesLoaded,
    bannerDismissed, setBannerDismissed,
    setShowApiKeyModal,
    showQuickStartLock, hostedProviders,
    saveFlash, triggerSave,
    setUxError, messagesEndRef, filteredMessages, searchMatchesEditDraft,
    writingColumnShell,
    apiBannerMessage, apiSetupLabel,
    language, isKO,
    archiveScope, setArchiveScope, archiveFilter, setArchiveFilter,
    charSubTab, setCharSubTab,
    createNewSession, createDemoSession, openQuickStart,
    startRename, renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue, confirmRename,
    moveSessionToProject, deleteSession, handleNextEpisode, handlePrint,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
    clearAllSessions,
    suggestions, setSuggestions, pipelineResult,
    children,
  } = props;

  const t = createT(language);

  return (
    <main className={`flex-1 flex flex-col relative bg-bg-primary overflow-hidden ${focusMode ? '' : 'pt-10'}`}>
      {focusMode && (
        <button onClick={() => setFocusMode(false)}
          className="fixed top-2 right-2 z-50 px-2 py-1 bg-bg-secondary/80 border border-border rounded-lg text-[11px] text-text-tertiary hover:text-text-primary transition-all font-mono opacity-30 hover:opacity-100"
          title="F11">
          <Minimize2 className="w-3 h-3 inline mr-1" />{t('ui.exitFocus')}
        </button>
      )}

      {/* Header */}
      <header className={`h-14 flex items-center justify-between px-3 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
        <div className="flex items-center gap-1.5 md:gap-4 min-w-0 flex-1 mr-2">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 md:p-2 hover:bg-bg-secondary rounded-lg transition-colors shrink-0" aria-label="Toggle sidebar" title={isKO ? '\uC0AC\uC774\uB4DC\uBC14 \uD1A0\uAE00' : 'Toggle sidebar'}>
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="text-xs md:text-sm font-bold tracking-tight uppercase flex items-center gap-1.5 md:gap-2 min-w-0 font-mono">
            <span className="text-text-secondary hidden md:inline">{t('sidebar.activeProject')}:</span>
            <span className="text-text-primary truncate max-w-[120px] md:max-w-none">{currentSession?.title || t('engine.noStory')}</span>
            {currentSessionId && <span className={`text-[10px] font-mono transition-all duration-300 hidden sm:inline ${saveFlash ? 'text-accent-green scale-125 font-black' : 'text-text-tertiary'}`}>{'\u2713'} {saveFlash ? t('ui.saved') : t('ui.autoSaved')}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {currentSession && (
            <div className="flex gap-2 md:gap-4">
              <div className="px-3 py-1 bg-bg-secondary rounded-full text-[10px] font-bold text-text-tertiary border border-border hidden sm:block font-mono">
                {currentSession.config.genre}
              </div>
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all font-mono ${
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
            <button onClick={() => setShowSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${t('ui.searchCtrlF')} (Ctrl+F)`} aria-label={t('ui.search')}><Search className="w-4 h-4" /></button>
            <button onClick={() => setShowGlobalSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'} (Ctrl+K)`} aria-label={isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'}><Sparkles className="w-4 h-4" /></button>
            <button onClick={() => setFocusMode(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${t('ui.focusMode')} (F11)`} aria-label={t('ui.focusModeLabel')}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            {/* Clock Widget */}
            <StudioClock />
            <StatusBadge showStorage />
            <button onClick={() => setShowShortcuts(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${isKO ? '\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4' : 'Keyboard Shortcuts'} (Ctrl+/)`} aria-label={t('ui.keyboardShortcuts')}><Keyboard className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-bg-secondary border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('ui.searchMessages')} autoFocus
            className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder-text-tertiary" />
          {searchMatchesEditDraft && (
            <button onClick={() => setWritingMode('edit')} className="text-[11px] text-accent-green font-bold font-mono shrink-0">
              {t('ui.foundInDraft')}
            </button>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} aria-label="Close search" className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Shortcuts modal */}
      {showShortcuts && <ShortcutsModal language={language} onClose={() => setShowShortcuts(false)} />}

      {/* Global Search Palette (Ctrl+K) */}
      {showGlobalSearch && (
        <GlobalSearchPalette
          query={globalSearchQuery}
          setQuery={setGlobalSearchQuery}
          sessions={sessions}
          config={currentSession?.config ?? null}
          language={language}
          onSelect={(type, id) => {
            setShowGlobalSearch(false);
            setGlobalSearchQuery('');
            if (type === 'character') handleTabChange('characters');
            else if (type === 'episode') { if (id) setCurrentSessionId(id); handleTabChange('writing'); }
            else if (type === 'world') handleTabChange('world');
          }}
          onClose={() => { setShowGlobalSearch(false); setGlobalSearchQuery(''); }}
        />
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 min-h-0">
          {/* API key banner */}
          {hydrated && aiCapabilitiesLoaded && !hasAiAccess && !bannerDismissed && (
            <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-amber-900/30 border border-amber-700/40 rounded-xl text-amber-300 text-xs">
              <Key className="w-4 h-4 shrink-0" />
              <span className="flex-1">{apiBannerMessage}</span>
              <button data-testid="btn-api-key" onClick={() => setShowApiKeyModal(true)} className="shrink-0 px-3 py-1 bg-amber-600/30 hover:bg-amber-600/50 rounded-lg text-[10px] font-bold uppercase transition-colors">
                {apiSetupLabel}
              </button>
              <button onClick={() => { setBannerDismissed(true); localStorage.setItem('noa_api_banner_dismissed', '1'); }} className="shrink-0 text-amber-500/60 hover:text-amber-300 transition-colors text-sm leading-none" aria-label="Dismiss">
                {'\u2715'}
              </button>
            </div>
          )}

          {/* No session selected — Onboarding */}
          {!currentSessionId && !['settings', 'history', 'rulebook', 'style', 'docs'].includes(activeTab) ? (
            <div className="h-full relative flex flex-col items-center justify-center text-center px-4 overflow-hidden z-1">
              <div className="absolute inset-0 z-0">
                <Image src="/images/gate-infrastructure-visual.jpg" alt="" fill priority={true} className="object-cover opacity-20" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
              </div>
              <div className="absolute inset-0 z-1 pointer-events-none opacity-4" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
              <div className="relative z-10 flex flex-col items-center w-full">
                <OnboardingGuide
                  lang={language}
                  onComplete={() => { window.dispatchEvent(new Event('storage')); }}
                  onNavigate={(tab) => { createNewSession(tab as AppTab); }}
                  onQuickStart={openQuickStart}
                  onDemo={createDemoSession}
                  showQuickStartLock={showQuickStartLock}
                />
              </div>
            </div>
          ) : (
              <StudioTabRouter
                activeTab={activeTab} language={language} currentSession={currentSession}
                currentSessionId={currentSessionId} config={currentSession?.config || null}
                setConfig={setConfig} updateCurrentSession={updateCurrentSession}
                triggerSave={triggerSave} saveFlash={saveFlash} hostedProviders={hostedProviders}
                showAiLock={showAiLock} setActiveTab={setActiveTab} charSubTab={charSubTab}
                setCharSubTab={setCharSubTab} setUxError={setUxError} clearAllSessions={clearAllSessions}
                setShowApiKeyModal={setShowApiKeyModal} versionedBackups={versionedBackups}
                doRestoreVersionedBackup={doRestoreVersionedBackup} refreshBackupList={refreshBackupList}
                writingMode={writingMode} setWritingMode={setWritingMode} editDraft={editDraft}
                setEditDraft={setEditDraft} editDraftRef={editDraftRef} canvasContent={canvasContent}
                setCanvasContent={setCanvasContent} canvasPass={canvasPass} setCanvasPass={setCanvasPass}
                promptDirective={promptDirective} setPromptDirective={setPromptDirective}
                isGenerating={isGenerating} lastReport={lastReport} doHandleSend={doHandleSend}
                handleCancel={handleCancel} handleRegenerate={handleRegenerate} handleVersionSwitch={handleVersionSwitch}
                handleTypoFix={handleTypoFix} messagesEndRef={messagesEndRef} searchQuery={searchQuery}
                filteredMessages={filteredMessages} hasAiAccess={hasAiAccess} advancedSettings={advancedSettings}
                setAdvancedSettings={setAdvancedSettings} showDashboard={showDashboard}
                rightPanelOpen={rightPanelOpen} setRightPanelOpen={setRightPanelOpen}
                directorReport={directorReport} hfcpState={hfcpState} handleNextEpisode={handleNextEpisode}
                writingColumnShell={writingColumnShell} input={input} setInput={setInput}
                archiveScope={archiveScope} setArchiveScope={setArchiveScope} archiveFilter={archiveFilter}
                setArchiveFilter={setArchiveFilter} projects={projects} sessions={sessions}
                currentProject={currentProject} currentProjectId={currentProjectId} setCurrentProjectId={setCurrentProjectId}
                setCurrentSessionId={setCurrentSessionId} startRename={startRename}
                renamingSessionId={renamingSessionId} setRenamingSessionId={setRenamingSessionId}
                renameValue={renameValue} setRenameValue={setRenameValue} confirmRename={confirmRename}
                moveSessionToProject={moveSessionToProject} handlePrint={handlePrint} deleteSession={deleteSession}
                suggestions={suggestions} setSuggestions={setSuggestions} pipelineResult={pipelineResult}
              />
          )}
        </div>

        {showDashboard && activeTab === 'writing' && currentSession && !showAiLock && (
          <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
        )}

        {/* Right panel slots (injected from parent) */}
        {children}
      </div>

      {/* Writing Input dock - Removed (Moved into WritingTabInline for split layout) */}
    </main>
  );
}

// IDENTITY_SEAL: PART-3 | role=main-content-area | inputs=all-studio-state | outputs=JSX(header+tabs+input)
