"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  X, Save, Download,
  Search, Maximize2, Minimize2, Keyboard, Sun, Moon,
  Key, BookOpen, SearchCode,
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { StatusBadge } from '@/components/ui/StatusIndicator';
import type { AppTab } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { useStudioUIStore } from '@/store/studio-ui-store';
import EngineDashboard from '@/components/studio/EngineDashboard';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import GlobalSearchPalette from '@/components/studio/GlobalSearchPalette';
import { ShortcutsModal } from '@/components/studio/StudioModals';
import StudioTabRouter from '@/components/studio/StudioTabRouter';
import { WindowTitleBar } from '@/components/studio/WindowTitleBar';
import { StudioStatusBar } from '@/components/studio/StudioStatusBar';
import { useStudio } from './StudioContext';
import { useGitHubSync } from '@/hooks/useGitHubSync';
import { getFile, getTree } from '@/lib/github-sync';
import { repoFilesToConfig, extractWriterProfile } from '@/lib/project-serializer';
import { saveProfile } from '@/engine/writer-profile';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const OnboardingGuide = dynamic(() => import('@/components/studio/OnboardingGuide'), { ssr: false, loading: DynSkeleton });
const EpisodeExplorer = dynamic(() => import('@/components/studio/EpisodeExplorer'), { ssr: false });

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+components

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
    archiveScope, setArchiveScope, archiveFilter, setArchiveFilter,
    charSubTab, setCharSubTab,
    createNewSession, createDemoSession, openQuickStart,
    startRename, renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue, confirmRename,
    moveSessionToProject, deleteSession, handleNextEpisode, handlePrint,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
    clearAllSessions,
    suggestions, setSuggestions, pipelineResult,
  } = useStudio();

  const t = createT(language);
  const isOnline = useOnlineStatus();
  const episodeExplorerOpen = useStudioUIStore(s => s.episodeExplorerOpen);
  const setEpisodeExplorerOpen = useStudioUIStore(s => s.setEpisodeExplorerOpen);

  // First-session keyboard shortcuts hint
  const [shortcutsHintVisible, setShortcutsHintVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return !localStorage.getItem('noa_shortcuts_hint_shown'); } catch { return false; }
  });
  const dismissShortcutsHint = useCallback(() => {
    setShortcutsHintVisible(false);
    try { localStorage.setItem('noa_shortcuts_hint_shown', '1'); } catch { /* quota/private */ }
  }, []);

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
      const yamlEntries = tree.filter(e => e.type === 'blob' && (e.path.endsWith('.yaml') || e.path.endsWith('.md')));
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
      const path = `volumes/ep-${String(episode).padStart(3, '0')}.md`;
      const branchConfig = { ...gh.config, branch };
      const file = await getFile(branchConfig, path);
      return file?.content ?? '';
    },
    [gh.config],
  );

  return (
    <main className={`flex-1 flex flex-col relative bg-bg-primary text-text-primary overflow-hidden${focusMode ? '' : ' pt-10'} ${focusMode ? '' : 'md:m-2 md:rounded-xl md:border md:border-border/40 md:shadow-[0_4px_32px_rgba(0,0,0,0.15)]'}`}>
      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-accent-red/15 border-b border-accent-red/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-accent-red z-50 shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
          {isKO ? '인터넷 연결이 끊겼습니다. 일부 기능이 제한됩니다.' : 'No internet connection. Some features are unavailable.'}
        </div>
      )}
      {focusMode && (
        <button onClick={() => setFocusMode(false)}
          className="fixed top-2 right-2 z-50 px-2 py-1 bg-bg-secondary/80 border border-border rounded-lg text-[11px] text-text-tertiary hover:text-text-primary transition-[opacity,background-color,border-color,color] font-(family-name:--font-mono) opacity-70 hover:opacity-100"
          title={L4(language, { ko: '집중 모드 (F11)', en: 'Focus Mode (F11)', ja: 'フォーカスモード (F11)', zh: '专注模式 (F11)' })}>
          <Minimize2 className="w-3 h-3 inline mr-1" />{t('ui.exitFocus')}
        </button>
      )}

      {/* Window Frame */}
      {!focusMode && (
        <WindowTitleBar activeTab={activeTab} language={language} focusMode={focusMode} onToggleFocus={() => setFocusMode(prev => !prev)} />
      )}

      {/* Header */}
      <header className={`h-14 flex items-center justify-between px-3 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
        <div className="flex items-center gap-1.5 md:gap-4 min-w-0 flex-1 mr-2">
          {/* Sidebar toggle removed — OSDesktop handles navigation */}
          <div className="text-xs md:text-sm font-bold tracking-tight uppercase flex items-center gap-1.5 md:gap-2 min-w-0 font-(family-name:--font-mono)">
            <span className="text-text-primary truncate max-w-[120px] md:max-w-none">{currentSession?.title || t('engine.noStory')}</span>
            {currentSessionId && <span key={saveFlash ? Date.now() : 'idle'} className={`text-[13px] font-(family-name:--font-mono) transition-[transform,opacity,background-color,border-color,color] duration-300 hidden sm:inline ${saveFlash ? 'text-accent-green scale-125 font-black animate-[save-flash_0.5s_ease-out]' : 'text-text-tertiary'}`}>{'\u2713'} {saveFlash ? t('ui.saved') : t('ui.autoSaved')}</span>}
            <style>{`@keyframes save-flash{0%{opacity:0}30%{opacity:1}100%{opacity:0.6}}`}</style>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Genre badge + ANS engine badge removed for cleaner header */}
          {/* Tool buttons */}
          <div className="flex items-center gap-1">
            <button onClick={() => setEpisodeExplorerOpen(prev => !prev)} className={`relative p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple min-w-[44px] min-h-[44px] flex items-center justify-center ${episodeExplorerOpen ? 'text-accent-amber bg-accent-amber/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary'}`} title={L4(language, { ko: '에피소드 탐색기', en: 'Episode Explorer', ja: 'エピソードエクスプローラー', zh: '章节浏览器' })} aria-label="Episode Explorer">
              <BookOpen className="w-4 h-4" />
              {currentSession?.config?.episode != null && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-accent-purple text-[8px] font-black text-white leading-none">
                  {currentSession.config.episode}{L4(language, { ko: '화', en: '', ja: '話', zh: '话' })}
                </span>
              )}
            </button>
            <button onClick={triggerSave} className={`p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple ${saveFlash ? 'text-accent-green' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary'}`} title={isKO ? '저장 (Ctrl+S)' : 'Save (Ctrl+S)'} aria-label="Save"><Save className="w-4 h-4" /></button>
            <button onClick={handlePrint} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={isKO ? '내보내기 (Ctrl+E)' : 'Export (Ctrl+E)'} aria-label="Export"><Download className="w-4 h-4" /></button>
            <button onClick={() => setShowSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${t('ui.searchCtrlF')} (Ctrl+F)`} aria-label={t('ui.search')}><Search className="w-4 h-4" /></button>
            <button onClick={() => setShowGlobalSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'} (Ctrl+K)`} aria-label={isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'}><SearchCode className="w-4 h-4" /></button>
            <button onClick={() => setFocusMode(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={`${t('ui.focusMode')} (F11)`} aria-label={t('ui.focusModeLabel')}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            {/* Premium Theme Controls - Brightness + Color */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-bg-secondary/40 border border-white/4">
              {/* Brightness Dial */}
              <button 
                onClick={toggleTheme} 
                className="group relative flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-bg-secondary to-bg-primary border border-white/10 hover:border-white/20 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent-purple/50"
                title={isKO ? ['밤','낮'][themeLevel] : ['Night','Day'][themeLevel]}
                aria-label={t('ui.toggleThemeLabel')}
              >
                <span className={`relative z-10 transition-[transform,opacity,background-color,border-color,color] duration-300 ${
                  themeLevel === 0 ? 'text-accent-purple' : 'text-accent-amber'
                }`}>
                  {themeLevel === 0 ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </span>
              </button>

              {/* Divider */}
            </div>
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
            className="flex-1 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-text-primary placeholder-text-tertiary" />
          {searchMatchesEditDraft && (
            <button onClick={() => setWritingMode('edit')} className="text-[11px] text-accent-green font-bold font-(family-name:--font-mono) shrink-0">
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
        {/* Episode Explorer Panel — mobile: slide-up overlay, desktop: sidebar */}
        {episodeExplorerOpen && currentSession?.config && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setEpisodeExplorerOpen(false)} />
        )}
        {episodeExplorerOpen && currentSession?.config && (
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] border-t border-border bg-bg-primary overflow-hidden rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 md:static md:max-h-none md:rounded-none md:shadow-none md:z-auto md:w-[240px] md:shrink-0 md:border-t-0 md:border-r md:flex">
            <EpisodeExplorer
              config={currentSession.config}
              currentEpisode={currentSession.config.episode}
              language={language}
              onSelectEpisode={(ep) => {
                if (currentSession) {
                  setConfig((prev) => ({ ...prev, episode: ep }));
                  handleTabChange('writing');
                }
              }}
              onCreateEpisode={() => handleTabChange('manuscript')}
              onCreateVolume={() => handleTabChange('manuscript')}
              onClose={() => setEpisodeExplorerOpen(false)}
              onNavigateTab={(tab) => handleTabChange(tab as AppTab)}
              branches={ghBranches}
              currentBranch={gh.config?.branch}
              onSwitchBranch={handleGhSwitchBranch}
              onCreateBranch={handleGhCreateBranch}
              gitConnected={gh.connected}
              onLoadBranchContent={gh.connected ? handleLoadBranchContent : undefined}
              className="w-full"
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 min-h-0">
          {/* API key banner */}
          {hydrated && aiCapabilitiesLoaded && !hasAiAccess && !bannerDismissed && (
            <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-accent-amber/10 border border-accent-amber/30 rounded-xl text-accent-amber text-xs">
              <Key className="w-4 h-4 shrink-0" />
              <span className="flex-1">{apiBannerMessage}</span>
              <button data-testid="btn-api-key" onClick={() => setShowApiKeyModal(true)} className="shrink-0 px-3 py-1 bg-accent-amber/20 hover:bg-accent-amber/30 rounded-lg text-[10px] font-bold uppercase transition-colors">
                {apiSetupLabel}
              </button>
              <button onClick={() => { setBannerDismissed(true); try { localStorage.setItem('noa_api_banner_dismissed', '1'); } catch { /* quota/private */ } }} className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors text-sm leading-none" aria-label="Dismiss">
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

      {/* First-session keyboard shortcuts hint */}
      {shortcutsHintVisible && !focusMode && (
        <div className="flex items-center justify-center gap-4 px-4 py-1 bg-bg-secondary/60 border-t border-border/30 text-[10px] text-text-tertiary shrink-0">
          <span>{L4(language, { ko: 'F5: 집필 | Ctrl+K: 검색 | Ctrl+S: 저장 | F11: 집중모드', en: 'F5: Write | Ctrl+K: Search | Ctrl+S: Save | F11: Focus', ja: 'F5: 執筆 | Ctrl+K: 検索 | Ctrl+S: 保存 | F11: 集中モード', zh: 'F5: 写作 | Ctrl+K: 搜索 | Ctrl+S: 保存 | F11: 专注模式' })}</span>
          <button onClick={dismissShortcutsHint} className="text-text-quaternary hover:text-text-secondary transition-colors px-1" aria-label="Dismiss">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Status Bar */}
      {!focusMode && (
        <StudioStatusBar
          editDraft={editDraft}
          writingMode={writingMode}
          activeTab={activeTab}
          saveFlash={saveFlash}
          isGenerating={isGenerating}
          language={language}
          currentSession={currentSession}
          sessionStartChars={sessionStartChars}
          editorFontSize={editorFontSize}
        />
      )}
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=main-content-area | inputs=StudioContext | outputs=JSX(header+tabs+input)
