"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import { type RefObject } from 'react';
import {
  Send, Menu, X, StopCircle,
  Search, Maximize2, Minimize2, Keyboard, Sun, Moon,
  Key, Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type {
  ChatSession, StoryConfig, AppTab, AppLanguage, Message,
  Project,
} from '@/lib/studio-types';
import type { HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import type { VersionedBackup } from '@/lib/indexeddb-backup';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import CharacterTab from '@/components/studio/tabs/CharacterTab';
import SettingsView from '@/components/studio/SettingsView';
import EngineDashboard from '@/components/studio/EngineDashboard';
import { SectionErrorBoundary } from '@/components/studio/SectionErrorBoundary';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import WorldTab from '@/components/studio/tabs/WorldTab';
import StyleTab from '@/components/studio/tabs/StyleTab';
import ManuscriptTab from '@/components/studio/tabs/ManuscriptTab';
import GlobalSearchPalette from '@/components/studio/GlobalSearchPalette';
import { ShortcutsModal } from '@/components/studio/StudioModals';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const OnboardingGuide = dynamic(() => import('@/components/studio/OnboardingGuide'), { ssr: false, loading: DynSkeleton });
const StudioDocsView = dynamic(() => import('@/components/studio/StudioDocsView'), { ssr: false, loading: DynSkeleton });
const VisualTab = dynamic(() => import('@/components/studio/tabs/VisualTab'), { ssr: false, loading: DynSkeleton });
const HistoryTab = dynamic(() => import('@/components/studio/tabs/HistoryTab'), { ssr: false, loading: DynSkeleton });
const RulebookTab = dynamic(() => import('@/components/studio/tabs/RulebookTab'), { ssr: false, loading: DynSkeleton });
const WritingTabInline = dynamic(() => import('@/components/studio/tabs/WritingTabInline'), { ssr: false, loading: () => <LoadingSkeleton height={300} /> });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Versioned backups
  versionedBackups: VersionedBackup[];
  doRestoreVersionedBackup: (timestamp: number) => Promise<boolean>;
  refreshBackupList: () => void;

  // Modals/actions
  clearAllSessions: () => void;

  // Children: right panel slots
  children?: React.ReactNode;
}

// IDENTITY_SEAL: PART-2 | role=type-definitions | inputs=none | outputs=StudioMainContentProps

// ============================================================
// PART 3 — Main Content Component (header + tabs + writing input)
// ============================================================
export default function StudioMainContent(props: StudioMainContentProps) {
  const {
    focusMode, setFocusMode, isSidebarOpen, setIsSidebarOpen,
    themeLevel, toggleTheme,
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
    handleSend, doHandleSend, handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix, hfcpState,
    input, setInput,
    showDashboard, setShowDashboard,
    rightPanelOpen, setRightPanelOpen,
    showAiLock, hasAiAccess, aiCapabilitiesLoaded,
    bannerDismissed, setBannerDismissed,
    showApiKeyModal, setShowApiKeyModal,
    showQuickStartLock, hostedProviders,
    saveFlash, lastSaveTime, triggerSave,
    setUxError, messagesEndRef, filteredMessages, searchMatchesEditDraft,
    writingColumnShell, writingInputDockOffset,
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
    children,
  } = props;

  const t = createT(language);

  return (
    <main className="flex-1 flex flex-col relative bg-bg-primary overflow-hidden">
      {focusMode && (
        <button onClick={() => setFocusMode(false)}
          className="fixed top-2 right-2 z-50 px-2 py-1 bg-bg-secondary/80 border border-border rounded-lg text-[11px] text-text-tertiary hover:text-text-primary transition-all font-[family-name:var(--font-mono)] opacity-30 hover:opacity-100"
          title="F11">
          <Minimize2 className="w-3 h-3 inline mr-1" />{t('ui.exitFocus')}
        </button>
      )}

      {/* Header */}
      <header className={`h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-bg-secondary rounded-lg transition-colors" aria-label="Toggle sidebar" title={isKO ? '\uC0AC\uC774\uB4DC\uBC14 \uD1A0\uAE00' : 'Toggle sidebar'}>
            <Menu className="w-5 h-5 text-text-tertiary" />
          </button>
          <div className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 min-w-0 font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary hidden sm:inline">{t('sidebar.activeProject')}:</span>
            <span className="text-text-primary truncate">{currentSession?.title || t('engine.noStory')}</span>
            {currentSessionId && <span className={`text-[10px] font-[family-name:var(--font-mono)] transition-all duration-300 ${saveFlash ? 'text-accent-green scale-125 font-black' : 'text-text-tertiary'}`}>{'\u2713'} {saveFlash ? t('ui.saved') : t('ui.autoSaved')}{lastSaveTime && !saveFlash ? ` \u00B7 ${Math.max(1, Math.round((Date.now() - lastSaveTime) / 1000))}${isKO ? '\uCD08 \uC804' : 's ago'}` : ''}</span>}
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
            <button onClick={() => setShowSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${t('ui.searchCtrlF')} (Ctrl+F)`} aria-label={t('ui.search')}><Search className="w-4 h-4" /></button>
            <button onClick={() => setShowGlobalSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'} (Ctrl+K)`} aria-label={isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'}><Sparkles className="w-4 h-4" /></button>
            <button onClick={() => setFocusMode(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${t('ui.focusMode')} (F11)`} aria-label={t('ui.focusModeLabel')}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            <button onClick={toggleTheme} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple flex items-center gap-1" title={isKO ? ['Dark','Dim','Light','Max'][themeLevel] : ['Dark','Dim','Light','Max'][themeLevel]} aria-label={t('ui.toggleThemeLabel')}>
              {themeLevel === 0 ? <Moon className="w-4 h-4" /> : themeLevel === 1 ? <Sun className="w-4 h-4 opacity-40" /> : themeLevel === 2 ? <Sun className="w-4 h-4 opacity-70" /> : <Sun className="w-4 h-4" />}
              <span className="text-[9px] font-[family-name:var(--font-mono)] hidden md:inline">{isKO ? ['\uB2E4\uD06C','\uB518','\uB77C\uC774\uD2B8','\uCD5C\uB300'][themeLevel] : ['D','DM','L','MX'][themeLevel]}</span>
            </button>
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
            <button onClick={() => setWritingMode('edit')} className="text-[11px] text-accent-green font-bold font-[family-name:var(--font-mono)] shrink-0">
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
            <div className="h-full relative flex flex-col items-center justify-center text-center px-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <Image src="/images/gate-infrastructure-visual.jpg" alt="" fill priority={true} className="object-cover opacity-20" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
              </div>
              <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
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
            <>
              {activeTab === 'world' && currentSession && (
                <SectionErrorBoundary sectionName="World">
                <WorldTab
                  language={language} config={currentSession.config} setConfig={setConfig}
                  onStart={() => setActiveTab('writing')} onSave={triggerSave} saveFlash={saveFlash}
                  updateCurrentSession={updateCurrentSession} currentSessionId={currentSessionId}
                  hostedProviders={hostedProviders}
                />
                </SectionErrorBoundary>
              )}
              {activeTab === 'characters' && currentSession && (
                <SectionErrorBoundary sectionName="Characters">
                <CharacterTab
                  language={language} config={currentSession.config} setConfig={setConfig}
                  charSubTab={charSubTab} setCharSubTab={setCharSubTab}
                  triggerSave={triggerSave} saveFlash={saveFlash}
                  setUxError={setUxError} showAiLock={showAiLock} hostedProviders={hostedProviders}
                />
                </SectionErrorBoundary>
              )}
              {activeTab === 'settings' && (
                <SectionErrorBoundary sectionName="Settings">
                <SettingsView language={language} hostedProviders={hostedProviders} onClearAll={clearAllSessions} onManageApiKey={() => setShowApiKeyModal(true)} versionedBackups={versionedBackups} onRestoreBackup={doRestoreVersionedBackup} onRefreshBackups={refreshBackupList} />
                </SectionErrorBoundary>
              )}
              {activeTab === 'rulebook' && currentSession && (
                <SectionErrorBoundary sectionName="Rulebook">
                <RulebookTab
                  language={language}
                  config={currentSession.config}
                  updateCurrentSession={updateCurrentSession}
                  triggerSave={triggerSave}
                  saveFlash={saveFlash}
                  currentSessionId={currentSessionId}
                  showAiLock={showAiLock}
                  hostedProviders={hostedProviders}
                />
                </SectionErrorBoundary>
              )}
              {activeTab === 'writing' && currentSession && (
                <SectionErrorBoundary sectionName="Writing" fallbackHeight={400}>
                <WritingTabInline
                  language={language} currentSession={currentSession} currentSessionId={currentSessionId}
                  updateCurrentSession={updateCurrentSession} setConfig={setConfig}
                  writingMode={writingMode as 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced'} setWritingMode={setWritingMode}
                  editDraft={editDraft} setEditDraft={setEditDraft} editDraftRef={editDraftRef}
                  canvasContent={canvasContent} setCanvasContent={setCanvasContent}
                  canvasPass={canvasPass} setCanvasPass={setCanvasPass}
                  promptDirective={promptDirective} setPromptDirective={setPromptDirective}
                  isGenerating={isGenerating} lastReport={lastReport}
                  handleSend={doHandleSend} handleCancel={handleCancel}
                  handleRegenerate={handleRegenerate} handleVersionSwitch={handleVersionSwitch}
                  handleTypoFix={handleTypoFix} messagesEndRef={messagesEndRef}
                  searchQuery={searchQuery} filteredMessages={filteredMessages}
                  hasApiKey={hasAiAccess} setShowApiKeyModal={setShowApiKeyModal}
                  setActiveTab={setActiveTab}
                  advancedSettings={advancedSettings} setAdvancedSettings={setAdvancedSettings}
                  advancedOutputMode={advancedSettings.outputMode} setAdvancedOutputMode={(m: string) => setAdvancedSettings({ ...advancedSettings, outputMode: m as typeof advancedSettings.outputMode })}
                  showDashboard={showDashboard}
                  rightPanelOpen={rightPanelOpen} setRightPanelOpen={setRightPanelOpen}
                  directorReport={directorReport} hfcpState={hfcpState}
                  handleNextEpisode={handleNextEpisode}
                  showAiLock={showAiLock} hostedProviders={hostedProviders}
                  saveFlash={saveFlash} triggerSave={triggerSave}
                  writingColumnShell={writingColumnShell}
                  input={input} setInput={setInput}
                />
                </SectionErrorBoundary>
              )}
              {activeTab === 'style' && currentSession && (
                <SectionErrorBoundary sectionName="Style">
                <StyleTab
                  language={language} config={currentSession.config}
                  updateCurrentSession={updateCurrentSession}
                  triggerSave={triggerSave} saveFlash={saveFlash}
                  showAiLock={showAiLock} hostedProviders={hostedProviders}
                  messages={currentSession.messages}
                />
                </SectionErrorBoundary>
              )}
              {activeTab === 'manuscript' && currentSession && (
                <SectionErrorBoundary sectionName="Manuscript">
                <ManuscriptTab
                  language={language} config={currentSession.config} setConfig={setConfig}
                  messages={currentSession.messages}
                  onEditInStudio={(content) => { setEditDraft(content); setWritingMode('edit'); setActiveTab('writing'); }}
                />
                </SectionErrorBoundary>
              )}
              {activeTab === 'history' && (
                <SectionErrorBoundary sectionName="History">
                <HistoryTab
                  language={language}
                  archiveScope={archiveScope}
                  setArchiveScope={setArchiveScope}
                  archiveFilter={archiveFilter}
                  setArchiveFilter={setArchiveFilter}
                  projects={projects}
                  sessions={sessions}
                  currentProject={currentProject}
                  currentProjectId={currentProjectId}
                  setCurrentProjectId={setCurrentProjectId}
                  currentSessionId={currentSessionId}
                  setCurrentSessionId={setCurrentSessionId}
                  setActiveTab={setActiveTab}
                  startRename={startRename}
                  renamingSessionId={renamingSessionId}
                  setRenamingSessionId={setRenamingSessionId}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  confirmRename={confirmRename}
                  moveSessionToProject={moveSessionToProject}
                  handlePrint={handlePrint}
                  deleteSession={deleteSession}
                  currentSession={currentSession}
                />
                </SectionErrorBoundary>
              )}
              {activeTab === 'docs' && (
                <SectionErrorBoundary sectionName="Docs">
                <StudioDocsView lang={language} />
                </SectionErrorBoundary>
              )}
              {activeTab === 'visual' && currentSession && (
                <SectionErrorBoundary sectionName="Visual">
                <VisualTab config={currentSession.config} setConfig={setConfig} currentSession={currentSession} language={language} />
                </SectionErrorBoundary>
              )}
            </>
          )}
        </div>

        {showDashboard && activeTab === 'writing' && currentSession && !showAiLock && (
          <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
        )}

        {/* Right panel slots (injected from parent) */}
        {children}
      </div>

      {/* Writing Input dock */}
      {activeTab === 'writing' && currentSessionId && !showAiLock && (
        <div className={`pb-4 md:pb-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-8 md:pt-12 shrink-0 transition-[padding] duration-300 ${writingInputDockOffset}`}>
          <div className={`${writingColumnShell} relative`}>
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:bottom-auto md:-top-10 md:left-4 md:translate-x-0 flex gap-2 items-center">
              <button onClick={() => { if (showAiLock) { setShowApiKeyModal(true); return; } handleSend(t('engine.nextChapterPrompt')); }}
                className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${showAiLock ? 'opacity-50' : ''}`}
                title={showAiLock ? (t('ui.apiKeyRequired')) : ''}>
                {t('engine.nextChapter')}{showAiLock && ' \uD83D\uDD12'}
              </button>
              <button onClick={() => { if (showAiLock) { setShowApiKeyModal(true); return; } handleSend(t('engine.plotTwistPrompt')); }}
                className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${showAiLock ? 'opacity-50' : ''}`}
                title={showAiLock ? (t('ui.apiKeyRequired')) : ''}>
                {t('engine.plotTwist')}{showAiLock && ' \uD83D\uDD12'}
              </button>
              {currentSession && currentSession.config.episode < currentSession.config.totalEpisodes && (
                <button onClick={handleNextEpisode} className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-[10px] font-bold text-accent-purple hover:bg-accent-purple/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                  EP.{currentSession.config.episode} {'\u2192'} {currentSession.config.episode + 1}
                </button>
              )}
              <span className="text-border">|</span>
                <button onClick={() => { if (showAiLock) { setShowApiKeyModal(true); return; } setWritingMode('canvas'); setCanvasContent(''); setCanvasPass(0); }}
                  className={`px-3 py-1.5 bg-accent-green/10 border border-accent-green/20 rounded-full text-[10px] font-bold text-accent-green hover:bg-accent-green/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${showAiLock ? 'opacity-50' : ''}`}
                  title={showAiLock ? (t('ui.apiKeyRequired')) : ''}>
                  {showAiLock ? '\uD83D\uDD12' : '\uD83C\uDFA8'} {t('writingMode.openCanvas')}
                </button>
            </div>
            <div className="relative bg-bg-secondary border border-border rounded-2xl md:rounded-[2rem] shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 md:pl-6 flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={showAiLock
                  ? t('writingMode.apiKeyPlaceholder')
                  : t('writing.inputPlaceholder')}
                className={`flex-1 bg-transparent border-none outline-none py-3 md:py-4 text-sm md:text-[15px] text-text-primary placeholder-text-tertiary resize-none max-h-40 leading-relaxed ${showAiLock ? 'cursor-not-allowed opacity-60' : ''}`}
                rows={1}
                disabled={isGenerating || showAiLock}
              />
              {input.length > 0 && (
                <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] shrink-0 self-center mr-1">
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
  );
}

// IDENTITY_SEAL: PART-3 | role=main-content-area | inputs=all-studio-state | outputs=JSX(header+tabs+input)
