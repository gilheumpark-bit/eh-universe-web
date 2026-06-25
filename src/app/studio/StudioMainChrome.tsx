"use client";

import { useCallback, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import dynamic from 'next/dynamic';
import {
  X, Save, Download, Search, Maximize2, Minimize2, Keyboard, Sun, Moon, BookOpen, SearchCode,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusIndicator';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import { type StudioAction } from '@/components/studio/GlobalSearchPalette';
import { NovelBreadcrumb, type NovelBreadcrumbTarget } from '@/components/studio/NovelBreadcrumb';
import { StudioStatusBar } from '@/components/studio/StudioStatusBar';
import { WindowTitleBar } from '@/components/studio/WindowTitleBar';
import { createT, L4 } from '@/lib/i18n';
import type { AppLanguage, AppTab, ChatSession, Project, WritingMode } from '@/lib/studio-types';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const GlobalSearchPalette = dynamic(() => import('@/components/studio/GlobalSearchPalette'), { ssr: false, loading: DynSkeleton });
const ShortcutsModal = dynamic(() => import('@/components/studio/StudioModals').then(m => ({ default: m.ShortcutsModal })), { ssr: false, loading: DynSkeleton });

type BooleanStateSetter = (value: boolean | ((previous: boolean) => boolean)) => void;

interface StudioMainChromeProps {
  children: ReactNode;
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  isOnline: boolean;
  isKO: boolean;
  language: AppLanguage;
  activeTab: AppTab;
  currentProject: Project | null;
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  saveFlash: boolean;
  themeLevel: number;
  toggleTheme: () => void;
  episodeExplorerOpen: boolean;
  setEpisodeExplorerOpen: BooleanStateSetter;
  triggerSave: () => Promise<boolean>;
  handlePrint: () => void;
  showSearch: boolean;
  setShowSearch: Dispatch<SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  searchMatchesEditDraft: string | boolean | null;
  setWritingMode: Dispatch<SetStateAction<WritingMode>>;
  showShortcuts: boolean;
  setShowShortcuts: Dispatch<SetStateAction<boolean>>;
  showGlobalSearch: boolean;
  setShowGlobalSearch: Dispatch<SetStateAction<boolean>>;
  globalSearchQuery: string;
  setGlobalSearchQuery: Dispatch<SetStateAction<string>>;
  sessions: ChatSession[];
  paletteActions: StudioAction[];
  handleTabChange: (tab: AppTab) => void;
  setCurrentSessionId: (id: string | null) => void;
  onBreadcrumbNavigate: (target: NovelBreadcrumbTarget) => void;
  editDraft: string;
  writingMode: WritingMode;
  isGenerating: boolean;
  sessionStartChars?: number;
  editorFontSize?: number;
  currentProjectId: string | null;
}

export function StudioMainChrome({
  children,
  focusMode,
  setFocusMode,
  isOnline,
  isKO,
  language,
  activeTab,
  currentProject,
  currentSession,
  currentSessionId,
  saveFlash,
  themeLevel,
  toggleTheme,
  episodeExplorerOpen,
  setEpisodeExplorerOpen,
  triggerSave,
  handlePrint,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  searchMatchesEditDraft,
  setWritingMode,
  showShortcuts,
  setShowShortcuts,
  showGlobalSearch,
  setShowGlobalSearch,
  globalSearchQuery,
  setGlobalSearchQuery,
  sessions,
  paletteActions,
  handleTabChange,
  setCurrentSessionId,
  onBreadcrumbNavigate,
  editDraft,
  writingMode,
  isGenerating,
  sessionStartChars,
  editorFontSize,
  currentProjectId,
}: StudioMainChromeProps) {
  const t = createT(language);
  const [shortcutsHintVisible, setShortcutsHintVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return !localStorage.getItem('noa_shortcuts_hint_shown'); } catch { return false; }
  });

  const dismissShortcutsHint = useCallback(() => {
    setShortcutsHintVisible(false);
    try { localStorage.setItem('noa_shortcuts_hint_shown', '1'); } catch { /* quota/private */ }
  }, []);

  const closeGlobalSearch = useCallback(() => {
    setShowGlobalSearch(false);
    setGlobalSearchQuery('');
  }, [setGlobalSearchQuery, setShowGlobalSearch]);

  return (
    <main className={`flex-1 flex flex-col relative bg-bg-primary text-text-primary overflow-hidden${focusMode ? '' : ' pt-10'} ${focusMode ? '' : 'md:m-2 md:rounded-xl md:border md:border-border/40 md:shadow-[0_4px_32px_rgba(0,0,0,0.15)]'}`}>
      {!isOnline && (
        <div className="bg-accent-red/15 border-b border-accent-red/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-accent-red z-50 shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
          {isKO ? '인터넷 연결이 끊겼습니다. 일부 기능이 제한됩니다.' : 'No internet connection. Some features are unavailable.'}
        </div>
      )}

      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed top-2 right-2 z-50 px-2 py-1 bg-bg-secondary/80 border border-border rounded-lg text-[11px] text-text-tertiary hover:text-text-primary transition-[opacity,background-color,border-color,color] font-(family-name:--font-mono) opacity-70 hover:opacity-100"
          title={L4(language, { ko: '집중 모드 (F11)', en: 'Focus Mode (F11)', ja: 'フォーカスモード (F11)', zh: '专注模式 (F11)' })}
        >
          <Minimize2 className="w-3 h-3 inline mr-1" />{t('ui.exitFocus')}
        </button>
      )}

      {!focusMode && (
        <WindowTitleBar activeTab={activeTab} language={language} focusMode={focusMode} onToggleFocus={() => setFocusMode(previous => !previous)} />
      )}

      <header className={`h-14 flex items-center justify-between px-3 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
        <div className="flex items-center gap-1.5 md:gap-4 min-w-0 flex-1 mr-2">
          <div className="text-xs md:text-sm font-bold tracking-tight uppercase flex items-center gap-1.5 md:gap-2 min-w-0 font-(family-name:--font-mono)">
            <span className="text-text-primary truncate max-w-[120px] md:max-w-none">{currentSession?.title || t('engine.noStory')}</span>
            {currentSessionId && (
              <span key={saveFlash ? 'saved' : 'idle'} className={`text-[13px] font-(family-name:--font-mono) transition-[transform,opacity,background-color,border-color,color] duration-300 hidden sm:inline ${saveFlash ? 'text-accent-green scale-125 font-black animate-[save-flash_0.5s_ease-out]' : 'text-text-tertiary'}`}>
                {'\u2713'} {saveFlash ? t('ui.saved') : t('ui.autoSaved')}
              </span>
            )}
            <style>{`@keyframes save-flash{0%{opacity:0}30%{opacity:1}100%{opacity:0.6}}`}</style>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1">
            <button onClick={() => setEpisodeExplorerOpen(previous => !previous)} className={`relative rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple min-w-[44px] min-h-[44px] flex items-center justify-center ${episodeExplorerOpen ? 'text-accent-amber bg-accent-amber/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary'}`} title={L4(language, { ko: '에피소드 탐색기', en: 'Episode Explorer', ja: 'エピソードエクスプローラー', zh: '章节浏览器' })} aria-label="Episode Explorer">
              <BookOpen className="w-4 h-4" />
              {currentSession?.config?.episode != null && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-accent-purple text-[8px] font-black text-white leading-none">
                  {currentSession.config.episode}{L4(language, { ko: '화', en: '', ja: '話', zh: '话' })}
                </span>
              )}
            </button>
            <button onClick={triggerSave} className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${saveFlash ? 'text-accent-green bg-accent-green/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary'}`} title={isKO ? '저장 (Ctrl+S)' : 'Save (Ctrl+S)'} aria-label="Save"><Save className="w-4 h-4" /></button>
            <button onClick={handlePrint} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={isKO ? '내보내기 (Ctrl+E)' : 'Export (Ctrl+E)'} aria-label="Export"><Download className="w-4 h-4" /></button>
            <button onClick={() => setShowSearch(previous => !previous)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${t('ui.searchCtrlF')} (Ctrl+F)`} aria-label={t('ui.search')}><Search className="w-4 h-4" /></button>
            <button onClick={() => setShowGlobalSearch(previous => !previous)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'} (Ctrl+K)`} aria-label={isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'}><SearchCode className="w-4 h-4" /></button>
            <button onClick={() => setFocusMode(previous => !previous)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${t('ui.focusMode')} (F11)`} aria-label={t('ui.focusModeLabel')}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-bg-secondary/40 border border-white/4">
              <button
                onClick={toggleTheme}
                className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-linear-to-br from-bg-secondary to-bg-primary border border-white/10 hover:border-white/20 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/50"
                title={isKO ? ['밤', '낮'][themeLevel] : ['Night', 'Day'][themeLevel]}
                aria-label={t('ui.toggleThemeLabel')}
              >
                <span className={`relative z-10 transition-[transform,opacity,background-color,border-color,color] duration-300 ${themeLevel === 0 ? 'text-accent-purple' : 'text-accent-amber'}`}>
                  {themeLevel === 0 ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </span>
              </button>
            </div>
            <StatusBadge showStorage />
            <button onClick={() => setShowShortcuts(previous => !previous)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${isKO ? '\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4' : 'Keyboard Shortcuts'} (Ctrl+/)`} aria-label={t('ui.keyboardShortcuts')}><Keyboard className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {!focusMode && (currentProject || currentSession) && (
        <NovelBreadcrumb
          project={currentProject}
          currentSession={currentSession}
          language={language}
          onNavigate={onBreadcrumbNavigate}
        />
      )}

      {showSearch && (
        <div className="px-4 py-2 bg-bg-secondary border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={t('ui.searchMessages')}
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-text-primary placeholder-text-tertiary"
          />
          {searchMatchesEditDraft && (
            <button onClick={() => setWritingMode('edit')} className="text-[11px] text-accent-green font-bold font-(family-name:--font-mono) shrink-0">
              {t('ui.foundInDraft')}
            </button>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} aria-label="Close search" className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
      )}

      {showShortcuts && <ShortcutsModal language={language} onClose={() => setShowShortcuts(false)} />}

      {showGlobalSearch && (
        <GlobalSearchPalette
          query={globalSearchQuery}
          setQuery={setGlobalSearchQuery}
          sessions={sessions}
          config={currentSession?.config ?? null}
          language={language}
          actions={paletteActions}
          onSelect={(type, id, sessionId) => {
            closeGlobalSearch();
            const targetSession = sessionId ?? id;
            if (type === 'character') handleTabChange('characters');
            else if (type === 'episode') { if (targetSession) setCurrentSessionId(targetSession); handleTabChange('writing'); }
            else if (type === 'world') handleTabChange('world');
            else if (type === 'text') { if (targetSession) setCurrentSessionId(targetSession); handleTabChange('writing'); }
          }}
          onExecuteAction={(actionId) => {
            closeGlobalSearch();
            window.dispatchEvent(new CustomEvent('noa:command-action', { detail: { actionId } }));
          }}
          onClose={closeGlobalSearch}
        />
      )}

      {children}

      {shortcutsHintVisible && !focusMode && (
        <div className="flex items-center justify-center gap-4 px-4 py-1 bg-bg-secondary/60 border-t border-border/30 text-[10px] text-text-tertiary shrink-0">
          <span>{L4(language, { ko: 'Ctrl+4: 집필 | Ctrl+K: 검색 | Ctrl+S: 저장 | F11: 집중모드', en: 'Ctrl+4: Write | Ctrl+K: Search | Ctrl+S: Save | F11: Focus', ja: 'Ctrl+4: 執筆 | Ctrl+K: 検索 | Ctrl+S: 保存 | F11: 集中モード', zh: 'Ctrl+4: 写作 | Ctrl+K: 搜索 | Ctrl+S: 保存 | F11: 专注模式' })}</span>
          <button onClick={dismissShortcutsHint} className="text-text-quaternary hover:text-text-secondary transition-colors px-1" aria-label="Dismiss">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

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
          currentProjectId={currentProjectId}
        />
      )}
    </main>
  );
}
