import React from 'react';
import dynamic from 'next/dynamic';
import type { ChatSession, StoryConfig, AppTab, AppLanguage, Project, Message, ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import type { HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import type { VersionedBackup } from '@/lib/indexeddb-backup';
import { SectionErrorBoundary } from '@/components/studio/SectionErrorBoundary';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import WorldTab from '@/components/studio/tabs/WorldTab';
import CharacterTab from '@/components/studio/tabs/CharacterTab';
import SettingsView from '@/components/studio/SettingsView';
import StyleTab from '@/components/studio/tabs/StyleTab';
import ManuscriptTab from '@/components/studio/tabs/ManuscriptTab';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const NetworkFeedWidget = dynamic(() => import('@/components/studio/NetworkFeedWidget'), { ssr: false, loading: DynSkeleton });
const StudioDocsView = dynamic(() => import('@/components/studio/StudioDocsView'), { ssr: false, loading: DynSkeleton });
const VisualTab = dynamic(() => import('@/components/studio/tabs/VisualTab'), { ssr: false, loading: DynSkeleton });
const HistoryTab = dynamic(() => import('@/components/studio/tabs/HistoryTab'), { ssr: false, loading: DynSkeleton });
const RulebookTab = dynamic(() => import('@/components/studio/tabs/RulebookTab'), { ssr: false, loading: DynSkeleton });
const WritingTabInline = dynamic(() => import('@/components/studio/tabs/WritingTabInline'), { ssr: false, loading: () => <LoadingSkeleton height={300} /> });

type HostedAiAvailability = Record<string, boolean>;

interface StudioTabRouterProps {
  activeTab: AppTab;
  language: AppLanguage;
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  config: StoryConfig | null;
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  updateCurrentSession: (patch: Partial<ChatSession>) => void;
  triggerSave: () => void;
  saveFlash: boolean;
  hostedProviders: HostedAiAvailability;
  showAiLock: boolean;
  setActiveTab: (tab: AppTab) => void;
  charSubTab: 'characters' | 'items';
  setCharSubTab: React.Dispatch<React.SetStateAction<'characters' | 'items'>>;
  setUxError: (err: { error: unknown } | null) => void;
  clearAllSessions: () => void;
  setShowApiKeyModal: (v: boolean) => void;
  versionedBackups?: VersionedBackup[];
  doRestoreVersionedBackup?: (timestamp: number) => Promise<boolean>;
  refreshBackupList?: () => void;
  writingMode: string;
  setWritingMode: (mode: string) => void;
  editDraft: string;
  setEditDraft: (v: string) => void;
  editDraftRef: React.RefObject<HTMLTextAreaElement | null>;
  canvasContent: string;
  setCanvasContent: (v: string) => void;
  canvasPass: number;
  setCanvasPass: React.Dispatch<React.SetStateAction<number>>;
  promptDirective: string;
  setPromptDirective: (v: string) => void;
  isGenerating: boolean;
  lastReport: EngineReport | null;
  doHandleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  handleCancel: () => void;
  handleRegenerate: (assistantMsgId: string) => Promise<void>;
  handleVersionSwitch: (messageId: string, versionIndex: number) => void;
  handleTypoFix: (messageId: string, index: number, original: string, suggestion: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  filteredMessages: Message[];
  hasAiAccess: boolean;
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedWritingSettings>>;
  showDashboard: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  directorReport: DirectorReport | null;
  hfcpState: HFCPStateType;
  handleNextEpisode: () => void;
  writingColumnShell: string;
  input: string;
  setInput: (v: string) => void;
  archiveScope: 'project' | 'all';
  setArchiveScope: React.Dispatch<React.SetStateAction<'project' | 'all'>>;
  archiveFilter: string;
  setArchiveFilter: React.Dispatch<React.SetStateAction<string>>;
  projects: Project[];
  sessions: ChatSession[];
  currentProject: Project | null;
  currentProjectId: string | null;
  setCurrentProjectId: (v: string | null) => void;
  setCurrentSessionId: (v: string | null) => void;
  startRename: (sessionId: string, currentTitle: string) => void;
  renamingSessionId: string | null;
  setRenamingSessionId: (v: string | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  confirmRename: () => void;
  moveSessionToProject: (sessionId: string, targetProjectId: string) => void;
  handlePrint: () => void;
  deleteSession: (id: string) => void;
  // External control props for sidebar integration
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
}

export default function StudioTabRouter(props: StudioTabRouterProps) {
  const {
    activeTab, currentSession, currentSessionId, config,
    language, setConfig, updateCurrentSession, triggerSave, saveFlash,
    hostedProviders, showAiLock, setActiveTab,
    charSubTab, setCharSubTab, setUxError,
    clearAllSessions, setShowApiKeyModal, versionedBackups, doRestoreVersionedBackup, refreshBackupList,
    writingMode, setWritingMode, editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent, canvasPass, setCanvasPass, promptDirective, setPromptDirective,
    isGenerating, lastReport, doHandleSend, handleCancel, handleRegenerate, handleVersionSwitch, handleTypoFix,
    messagesEndRef, searchQuery, filteredMessages, hasAiAccess, advancedSettings, setAdvancedSettings,
    showDashboard, rightPanelOpen, setRightPanelOpen, directorReport, hfcpState, handleNextEpisode,
    writingColumnShell, input, setInput,
    archiveScope, setArchiveScope, archiveFilter, setArchiveFilter, projects, sessions,
    currentProject, currentProjectId, setCurrentProjectId, setCurrentSessionId,
    startRename, renamingSessionId, setRenamingSessionId, renameValue, setRenameValue, confirmRename,
    moveSessionToProject, handlePrint, deleteSession,
    suggestions, setSuggestions, pipelineResult
  } = props;

  return (
    <>
      {activeTab === 'world' && currentSession && config && (
        <SectionErrorBoundary sectionName="World">
        <WorldTab
          language={language} config={config} setConfig={setConfig}
          onStart={() => setActiveTab('writing')} onSave={triggerSave} saveFlash={saveFlash}
          updateCurrentSession={updateCurrentSession} currentSessionId={currentSessionId!}
          hostedProviders={hostedProviders}
        />
        {/* NetworkFeedWidget removed — distracting from writing focus */}
        </SectionErrorBoundary>
      )}
      {activeTab === 'characters' && currentSession && config && (
        <SectionErrorBoundary sectionName="Characters">
        <CharacterTab
          language={language} config={config} setConfig={setConfig}
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
      {activeTab === 'rulebook' && currentSession && config && (
        <SectionErrorBoundary sectionName="Rulebook">
        <RulebookTab
          language={language} config={config} updateCurrentSession={updateCurrentSession}
          triggerSave={triggerSave} saveFlash={saveFlash} currentSessionId={currentSessionId!}
          showAiLock={showAiLock} hostedProviders={hostedProviders}
        />
        </SectionErrorBoundary>
      )}
      {activeTab === 'writing' && currentSession && config && (
        <SectionErrorBoundary sectionName="Writing" fallbackHeight={400}>
        <WritingTabInline
          language={language} currentSession={currentSession} currentSessionId={currentSessionId!}
          updateCurrentSession={updateCurrentSession} setConfig={setConfig}
          writingMode={writingMode as 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced'} setWritingMode={setWritingMode}
          editDraft={editDraft} setEditDraft={setEditDraft} editDraftRef={editDraftRef}
          canvasContent={canvasContent} setCanvasContent={setCanvasContent} canvasPass={canvasPass} setCanvasPass={setCanvasPass}
          promptDirective={promptDirective} setPromptDirective={setPromptDirective}
          isGenerating={isGenerating} lastReport={lastReport}
          handleSend={doHandleSend} handleCancel={handleCancel} handleRegenerate={handleRegenerate}
          handleVersionSwitch={handleVersionSwitch} handleTypoFix={handleTypoFix} messagesEndRef={messagesEndRef}
          searchQuery={searchQuery} filteredMessages={filteredMessages}
          hasApiKey={hasAiAccess} setShowApiKeyModal={setShowApiKeyModal} setActiveTab={setActiveTab}
          advancedSettings={advancedSettings} setAdvancedSettings={setAdvancedSettings}
          advancedOutputMode={advancedSettings.outputMode} setAdvancedOutputMode={(m: string) => setAdvancedSettings({ ...advancedSettings, outputMode: m as typeof advancedSettings.outputMode })}
          showDashboard={showDashboard} rightPanelOpen={rightPanelOpen} setRightPanelOpen={setRightPanelOpen}
          directorReport={directorReport} hfcpState={hfcpState} handleNextEpisode={handleNextEpisode}
          showAiLock={showAiLock} hostedProviders={hostedProviders} saveFlash={saveFlash} triggerSave={triggerSave}
          writingColumnShell={writingColumnShell} input={input} setInput={setInput}
          suggestions={suggestions} setSuggestions={setSuggestions} pipelineResult={pipelineResult}
        />
        </SectionErrorBoundary>
      )}
      {activeTab === 'style' && currentSession && config && (
        <SectionErrorBoundary sectionName="Style">
        <StyleTab
          language={language} config={config}
          updateCurrentSession={updateCurrentSession}
          triggerSave={triggerSave} saveFlash={saveFlash}
          showAiLock={showAiLock} hostedProviders={hostedProviders}
          messages={currentSession.messages}
        />
        </SectionErrorBoundary>
      )}
      {activeTab === 'manuscript' && currentSession && config && (
        <SectionErrorBoundary sectionName="Manuscript">
        <ManuscriptTab
          language={language} config={config} setConfig={setConfig}
          messages={currentSession.messages}
          onEditInStudio={(content: string) => { setEditDraft(content); setWritingMode('edit'); setActiveTab('writing'); }}
        />
        </SectionErrorBoundary>
      )}
      {activeTab === 'history' && (
        <SectionErrorBoundary sectionName="History">
        <HistoryTab
          language={language}
          archiveScope={archiveScope} setArchiveScope={setArchiveScope}
          archiveFilter={archiveFilter} setArchiveFilter={setArchiveFilter}
          projects={projects} sessions={sessions} currentProject={currentProject}
          currentProjectId={currentProjectId} setCurrentProjectId={setCurrentProjectId}
          currentSessionId={currentSessionId} setCurrentSessionId={setCurrentSessionId}
          setActiveTab={setActiveTab} startRename={startRename} renamingSessionId={renamingSessionId}
          setRenamingSessionId={setRenamingSessionId} renameValue={renameValue} setRenameValue={setRenameValue}
          confirmRename={confirmRename} moveSessionToProject={moveSessionToProject}
          handlePrint={handlePrint} deleteSession={deleteSession} currentSession={currentSession}
        />
        </SectionErrorBoundary>
      )}
      {activeTab === 'docs' && (
        <SectionErrorBoundary sectionName="Docs">
        <StudioDocsView lang={language} />
        </SectionErrorBoundary>
      )}
      {activeTab === 'visual' && currentSession && config && (
        <SectionErrorBoundary sectionName="Visual">
        <VisualTab config={config} setConfig={setConfig} currentSession={currentSession} language={language} />
        </SectionErrorBoundary>
      )}
    </>
  );
}
