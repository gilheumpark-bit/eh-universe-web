"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import { useState, useEffect, useCallback, useMemo, type ComponentProps } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Key } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useStudioUIStore } from '@/store/studio-ui-store';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import StudioTabRouter from '@/components/studio/StudioTabRouter';
import { type NovelBreadcrumbTarget } from '@/components/studio/NovelBreadcrumb';
import { useStudio } from './StudioContext';
import { StudioEpisodeExplorerPane } from './StudioEpisodeExplorerPane';
import { StudioMainChrome } from './StudioMainChrome';
import { StudioMainOnboarding } from './StudioMainOnboarding';
import { useStudioCommandPaletteActions } from './useStudioCommandPaletteActions';
// [rank 11 — 2026-06-07] WritingTab 60+ props → 5 props. Writing 탭 마운트 시점에만
// WritingProvider 로 감싸 prop drilling 을 차단한다. StudioTabRouter 는 backward-compat
// 으로 props 도 그대로 받는다 — 후속 PR 에서 props 인터페이스를 슬림화.
import { WritingProvider, type WritingContextValue } from './WritingContext';
import { useGitHubSync } from '@/hooks/useGitHubSync';
import { getFile, getTree } from '@/lib/github-sync';
import { repoFilesToConfig, extractWriterProfile } from '@/lib/project-serializer';
import { buildProjectStoragePath } from '@/lib/loreguard/project-storage-layout';
import { episodeFilePath } from '@/lib/markdown-serializer';
import { saveProfile } from '@/engine/writer-profile';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
// [E 번들] 조건부 렌더 컴포넌트들 — 전부 특정 플래그 true 일 때만 렌더. initial 로드 불필요.
const EngineDashboard = dynamic(() => import('@/components/studio/EngineDashboard'), { ssr: false, loading: DynSkeleton });
// [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바.
const WriterToolbox = dynamic(() => import('@/components/studio/WriterToolbox'), { ssr: false, loading: DynSkeleton });

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+components

type StudioTabRouterProps = ComponentProps<typeof StudioTabRouter>;

// ============================================================
// PART 2 — Main Content Component (header + tabs + writing input)
// ============================================================
export default function StudioMainContent({ children }: { children?: React.ReactNode }) {
  const {
    focusMode, setFocusMode,
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
    doHandleSend, handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix, hfcpState,
    input, setInput,
    showDashboard, setShowDashboard: _setShowDashboard,
    showToolbox, setShowToolbox,
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
    sessionStartChars, editorFontSize,
    historyScope, setHistoryScope, historyFilter, setHistoryFilter,
    charSubTab, setCharSubTab,
    createNewSession, createDemoSession, openQuickStart,
    startRename, renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue, confirmRename,
    moveSessionToProject, deleteSession, handleNextEpisode, handlePrint,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
    clearAllSessions,
    suggestions, setSuggestions, pipelineResult,
  } = useStudio();

  const isOnline = useOnlineStatus();
  const episodeExplorerOpen = useStudioUIStore(s => s.episodeExplorerOpen);
  const setEpisodeExplorerOpen = useStudioUIStore(s => s.setEpisodeExplorerOpen);

  // GitHub Sync — pass branch data to EpisodeExplorer
  const gh = useGitHubSync();
  const [ghBranches, setGhBranches] = useState<string[]>([]);
  useEffect(() => {
    if (gh.connected) {
      gh.getBranches().then(setGhBranches).catch(() => {});
    } else {
      setGhBranches([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gh.connected]);
  const handleGhSwitchBranch = useCallback(async (branch: string) => {
    gh.switchBranch(branch);
    // [역동기화] 브랜치 전환 후 원격 파일 로드 → config 복원
    try {
      if (!gh.config?.token || !gh.config.owner || !gh.config.repo) return;
      const branchConfig = { ...gh.config, branch };
      const tree = await getTree(branchConfig);
      const yamlEntries = tree.filter(e =>
        e.type === 'blob' &&
        (e.path.endsWith('.yaml') || e.path.endsWith('.md') || e.path === '.noa/profile.json')
      );
      const repoFiles: { path: string; content: string }[] = [];
      for (const entry of yamlEntries.slice(0, 100)) {
        const file = await getFile(branchConfig, entry.path);
        if (file?.content) repoFiles.push({ path: entry.path, content: file.content });
      }
      if (repoFiles.length > 0) {
        const patch = repoFilesToConfig(repoFiles);
        if (Object.keys(patch).length > 0) {
          setConfig(prev => ({ ...prev, ...patch }));
        }
        // .noa/profile.json 있으면 WriterProfile localStorage에 반영
        try {
          const profile = extractWriterProfile(repoFiles);
          if (profile) saveProfile(profile);
        } catch { /* profile restore is non-fatal */ }
      }
    } catch { /* branch pull fail is non-fatal */ }
  }, [gh, setConfig]);
  const handleGhCreateBranch = useCallback((name: string) => {
    gh.createBranchFromCurrent(name).then((ok) => {
      if (ok) gh.getBranches().then(setGhBranches).catch(() => {});
    }).catch(() => {});
  }, [gh]);

  /** Load episode content from a specific branch for diff comparison. */
  const handleLoadBranchContent = useCallback(
    async (branch: string, episode: number): Promise<string> => {
      if (!gh.config?.token || !gh.config.owner || !gh.config.repo) return '';
      const manuscript = currentSession?.config?.manuscripts?.find((entry) => entry.episode === episode);
      const volume = manuscript?.volume ?? 1;
      const candidatePaths = Array.from(new Set([
        manuscript?.filePath,
        buildProjectStoragePath({
          projectId: currentProjectId,
          kind: 'episodeManuscript',
          episode,
          extension: 'md',
        }),
        episodeFilePath(episode, volume),
        `volumes/ep-${String(episode).padStart(3, '0')}.md`,
      ].filter((path): path is string => Boolean(path))));
      const branchConfig = { ...gh.config, branch };
      for (const path of candidatePaths) {
        const file = await getFile(branchConfig, path);
        if (file?.content) return file.content;
      }
      return '';
    },
    [currentProjectId, currentSession?.config?.manuscripts, gh.config],
  );

  // Breadcrumb navigation — Project > Episode > Scene
  const handleBreadcrumbNavigate = useCallback(
    (target: NovelBreadcrumbTarget) => {
      if (target === 'project') handleTabChange('history');
      else if (target === 'episode') handleTabChange('manuscript');
      else if (target === 'scene') setEpisodeExplorerOpen(true);
    },
    [handleTabChange, setEpisodeExplorerOpen],
  );

  const paletteActions = useStudioCommandPaletteActions({
    language,
    currentSessionId,
    createNewSession,
    handlePrint,
    setFocusMode,
    setShowShortcuts,
    triggerSave,
    handleTabChange,
    setRightPanelOpen,
    setShowApiKeyModal,
  });

  // [2026-05-09] noa:open-settings — ManuscriptTab 백업 alert 등 외부 트리거 수신.
  // detail.section 으로 특정 section (backups/api/plugins...) 전달 가능.
  useEffect(() => {
    const handler = () => {
      handleTabChange('settings');
    };
    window.addEventListener('noa:open-settings', handler);
    return () => window.removeEventListener('noa:open-settings', handler);
  }, [handleTabChange]);

  // [2026-05-09] noa:new-episode — ManuscriptView 새 에피소드 버튼 등 외부 트리거 수신.
  useEffect(() => {
    const handler = () => {
      createNewSession();
    };
    window.addEventListener('noa:new-episode', handler);
    return () => window.removeEventListener('noa:new-episode', handler);
  }, [createNewSession]);

  // ============================================================
  // PART 2.6 — WritingContext value (rank 11)
  // ============================================================
  // [G] currentSession === null 인 경우엔 WritingProvider 를 마운트하지 않는다.
  //     아래 useMemo 는 sessions/세션이 살아있을 때만 의미가 있다.
  // [C] setSuggestions / setRightPanelOpen / setCanvasPass 등 SetStateAction setter 는
  //     WritingContextValue 의 signature 와 1:1 호환 (Dispatch<SetStateAction<T>> ⊂ (v|fn)=>void).
  // [K] hostedProviders 는 Record<string, boolean> → Partial<Record<string,boolean>> 호환.
  // [Studio 무한 루프 수리 — 2026-06-08] setAdvancedOutputMode 를 useCallback 으로 안정화.
  // useMemo 내부 inline 화살표 함수는 매 호출마다 새 reference 생성 → writingCtx churn 위험.
  const setAdvancedOutputMode = useCallback((m: string) => {
    setAdvancedSettings((prev) => ({ ...prev, outputMode: m as typeof prev.outputMode }));
  }, [setAdvancedSettings]);

  const writingCtx = useMemo<WritingContextValue | null>(() => {
    if (!currentSession) return null;
    return {
      // 식별 / 세션
      language,
      currentSession,
      currentSessionId,
      currentProjectId,
      updateCurrentSession,
      setConfig,
      // Writing mode + draft
      writingMode,
      setWritingMode,
      editDraft,
      setEditDraft,
      editDraftRef,
      // Canvas / Prompt
      canvasContent,
      setCanvasContent,
      canvasPass,
      setCanvasPass,
      promptDirective,
      // AI 호출
      isGenerating,
      lastReport,
      handleSend: doHandleSend,
      handleCancel,
      handleRegenerate,
      handleVersionSwitch,
      handleTypoFix,
      directorReport,
      hfcpState,
      handleNextEpisode,
      // 입력 / 검색 / 필터
      input,
      setInput,
      searchQuery,
      filteredMessages,
      messagesEndRef,
      // API 접근
      hasApiKey: hasAiAccess,
      setShowApiKeyModal,
      showAiLock,
      hostedProviders,
      // 고급 설정
      advancedSettings,
      setAdvancedSettings,
      advancedOutputMode: advancedSettings.outputMode,
      setAdvancedOutputMode,
      // 레이아웃 / 패널
      showDashboard,
      rightPanelOpen,
      setRightPanelOpen,
      writingColumnShell,
      // 외부 patch
      setActiveTab,
      saveFlash,
      triggerSave,
      suggestions,
      setSuggestions,
      pipelineResult,
    };
  }, [
    language, currentSession, currentSessionId, currentProjectId, updateCurrentSession, setConfig,
    writingMode, setWritingMode, editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent, canvasPass, setCanvasPass, promptDirective,
    isGenerating, lastReport, doHandleSend, handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix, directorReport, hfcpState, handleNextEpisode,
    input, setInput, searchQuery, filteredMessages, messagesEndRef,
    hasAiAccess, setShowApiKeyModal, showAiLock, hostedProviders,
    advancedSettings, setAdvancedSettings, setAdvancedOutputMode,
    showDashboard, rightPanelOpen, setRightPanelOpen, writingColumnShell,
    setActiveTab, saveFlash, triggerSave, suggestions, setSuggestions, pipelineResult,
  ]);

  const routerProps = useMemo<StudioTabRouterProps>(() => ({
    activeTab,
    language,
    currentSession,
    currentSessionId,
    config: currentSession?.config || null,
    setConfig,
    updateCurrentSession,
    triggerSave,
    saveFlash,
    hostedProviders,
    showAiLock,
    setActiveTab,
    charSubTab,
    setCharSubTab,
    setUxError,
    clearAllSessions,
    setShowApiKeyModal,
    versionedBackups,
    doRestoreVersionedBackup,
    refreshBackupList,
    writingMode,
    setWritingMode,
    editDraft,
    setEditDraft,
    editDraftRef,
    canvasContent,
    setCanvasContent,
    canvasPass,
    setCanvasPass,
    promptDirective,
    setPromptDirective,
    isGenerating,
    lastReport,
    doHandleSend,
    handleCancel,
    handleRegenerate,
    handleVersionSwitch,
    handleTypoFix,
    messagesEndRef,
    searchQuery,
    filteredMessages,
    hasAiAccess,
    advancedSettings,
    setAdvancedSettings,
    showDashboard,
    rightPanelOpen,
    setRightPanelOpen,
    directorReport,
    hfcpState,
    handleNextEpisode,
    writingColumnShell,
    input,
    setInput,
    historyScope,
    setHistoryScope,
    historyFilter,
    setHistoryFilter,
    projects,
    sessions,
    currentProject,
    currentProjectId,
    setCurrentProjectId,
    setCurrentSessionId,
    startRename,
    renamingSessionId,
    setRenamingSessionId,
    renameValue,
    setRenameValue,
    confirmRename,
    moveSessionToProject,
    handlePrint,
    deleteSession,
    suggestions,
    setSuggestions,
    pipelineResult,
  }), [
    activeTab, language, currentSession, currentSessionId, setConfig, updateCurrentSession,
    triggerSave, saveFlash, hostedProviders, showAiLock, setActiveTab, charSubTab, setCharSubTab,
    setUxError, clearAllSessions, setShowApiKeyModal, versionedBackups, doRestoreVersionedBackup,
    refreshBackupList, writingMode, setWritingMode, editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent, canvasPass, setCanvasPass, promptDirective, setPromptDirective,
    isGenerating, lastReport, doHandleSend, handleCancel, handleRegenerate, handleVersionSwitch,
    handleTypoFix, messagesEndRef, searchQuery, filteredMessages, hasAiAccess, advancedSettings,
    setAdvancedSettings, showDashboard, rightPanelOpen, setRightPanelOpen, directorReport,
    hfcpState, handleNextEpisode, writingColumnShell, input, setInput, historyScope,
    setHistoryScope, historyFilter, setHistoryFilter, projects, sessions, currentProject,
    currentProjectId, setCurrentProjectId, setCurrentSessionId, startRename, renamingSessionId,
    setRenamingSessionId, renameValue, setRenameValue, confirmRename, moveSessionToProject,
    handlePrint, deleteSession, suggestions, setSuggestions, pipelineResult,
  ]);

  return (
    <StudioMainChrome
      focusMode={focusMode}
      setFocusMode={setFocusMode}
      isOnline={isOnline}
      isKO={isKO}
      language={language}
      activeTab={activeTab}
      currentProject={currentProject}
      currentSession={currentSession}
      currentSessionId={currentSessionId}
      saveFlash={saveFlash}
      themeLevel={themeLevel}
      toggleTheme={toggleTheme}
      episodeExplorerOpen={episodeExplorerOpen}
      setEpisodeExplorerOpen={setEpisodeExplorerOpen}
      triggerSave={triggerSave}
      handlePrint={handlePrint}
      showSearch={showSearch}
      setShowSearch={setShowSearch}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchMatchesEditDraft={searchMatchesEditDraft}
      setWritingMode={setWritingMode}
      showShortcuts={showShortcuts}
      setShowShortcuts={setShowShortcuts}
      showGlobalSearch={showGlobalSearch}
      setShowGlobalSearch={setShowGlobalSearch}
      globalSearchQuery={globalSearchQuery}
      setGlobalSearchQuery={setGlobalSearchQuery}
      sessions={sessions}
      paletteActions={paletteActions}
      handleTabChange={handleTabChange}
      setCurrentSessionId={setCurrentSessionId}
      onBreadcrumbNavigate={handleBreadcrumbNavigate}
      editDraft={editDraft}
      writingMode={writingMode}
      isGenerating={isGenerating}
      sessionStartChars={sessionStartChars}
      editorFontSize={editorFontSize}
      currentProjectId={currentProjectId}
    >
      <div className="flex-1 flex overflow-hidden min-h-0">
        <StudioEpisodeExplorerPane
          open={episodeExplorerOpen}
          currentSession={currentSession}
          language={language}
          setConfig={setConfig}
          handleTabChange={handleTabChange}
          setEpisodeExplorerOpen={setEpisodeExplorerOpen}
          branches={ghBranches}
          currentBranch={gh.config?.branch}
          onSwitchBranch={handleGhSwitchBranch}
          onCreateBranch={handleGhCreateBranch}
          gitConnected={gh.connected}
          onLoadBranchContent={gh.connected ? handleLoadBranchContent : undefined}
        />
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 min-h-0">
          {/* Connection key banner */}
          {hydrated && aiCapabilitiesLoaded && !hasAiAccess && !bannerDismissed && (
            <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-accent-amber/10 border border-accent-amber/30 rounded-xl text-accent-amber text-xs">
              <Key className="w-4 h-4 shrink-0" />
              <span className="flex-1">{apiBannerMessage}</span>
              <button data-testid="btn-api-key" onClick={() => setShowApiKeyModal(true)} className="shrink-0 min-h-[44px] px-3 py-2 bg-accent-amber/8 hover:bg-accent-amber/15 rounded-lg text-[10px] font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
                {apiSetupLabel}
              </button>
              <button onClick={() => { setBannerDismissed(true); try { localStorage.setItem('noa_api_banner_dismissed', '1'); } catch { /* quota/private */ } }} className="shrink-0 min-h-[44px] min-w-[44px] rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors text-sm leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue" aria-label={language === 'KO' ? '닫기' : 'Dismiss'}>
                {'\u2715'}
              </button>
            </div>
          )}

          {!currentSessionId && !['settings', 'history', 'direction', 'style', 'docs'].includes(activeTab) ? (
            <StudioMainOnboarding
              language={language}
              createNewSession={createNewSession}
              openQuickStart={openQuickStart}
              createDemoSession={createDemoSession}
              showQuickStartLock={showQuickStartLock}
            />
          ) : (
              // [rank 11 — 2026-06-07] WritingProvider 는 currentSession 이 있을 때만 마운트.
              // null 분기에서는 그냥 StudioTabRouter 만 — useWriting() 은 writing 탭 안에서만 호출되므로 안전.
              writingCtx ? (
                <WritingProvider value={writingCtx}>
                  <StudioTabRouter {...routerProps} />
                </WritingProvider>
              ) : (
              <StudioTabRouter {...routerProps} />
              )
          )}
        </div>

        {showDashboard && activeTab === 'writing' && currentSession && !showAiLock && (
          <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
        )}

        {/* [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바.
            ACTION_CATALOG 'studio:toolbox-open' 토글. writing 탭 + Provider 있을 때만 노출. */}
        {showToolbox && activeTab === 'writing' && currentSession && !showAiLock && (
          <WriterToolbox manuscript={editDraft} onClose={() => setShowToolbox(false)} />
        )}

        {/* Right panel slots (injected from parent) */}
        {children}
      </div>
    </StudioMainChrome>
  );
}

// IDENTITY_SEAL: PART-2 | role=main-content-area | inputs=StudioContext | outputs=JSX(header+tabs+input)
