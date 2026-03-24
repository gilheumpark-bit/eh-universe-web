import React from 'react';
import { Menu, Search, Maximize2, Minimize2, Sun, Moon, Keyboard } from 'lucide-react';
import { AppLanguage, ChatSession } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

interface StudioHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  saveFlash: boolean;
  showDashboard: boolean;
  setShowDashboard: (show: boolean) => void;
  ENGINE_VERSION: string;
  showSearch: boolean;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  lightTheme: boolean;
  setLightTheme: React.Dispatch<React.SetStateAction<boolean>>;
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
  language: AppLanguage;
}

const StudioHeader: React.FC<StudioHeaderProps> = ({
  isSidebarOpen, setIsSidebarOpen,
  currentSession, currentSessionId,
  saveFlash, showDashboard, setShowDashboard,
  ENGINE_VERSION,
  showSearch, setShowSearch,
  focusMode, setFocusMode,
  lightTheme, setLightTheme,
  showShortcuts, setShowShortcuts,
  language
}) => {
  const t = createT(language);
  const sessionTitle = currentSession?.title || t('engine.noStory');
  const sessionGenre = currentSession?.config?.genre;
  const iconButtonClass = 'flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-text-secondary transition-all hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.28)] hover:bg-white/[0.06] hover:text-text-primary focus:outline-none';

  return (
    <header className={`z-30 shrink-0 px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4 ${focusMode ? 'hidden' : ''}`}>
      <div className="premium-panel-soft flex min-h-[74px] items-center justify-between gap-3 border-white/8 px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={iconButtonClass}
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="site-kicker text-[0.62rem]">{t('sidebar.activeProject')}</span>
              {currentSessionId && (
                <span
                  className={`rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] transition-all ${
                    saveFlash
                      ? 'border-accent-green/35 bg-accent-green/15 text-accent-green'
                      : 'border-white/8 bg-white/[0.04] text-text-tertiary'
                  }`}
                >
                  {saveFlash ? t('ui.saved') : t('ui.autoSaved')}
                </span>
              )}
            </div>

            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.04em] text-text-primary md:text-[1.35rem]">
                {sessionTitle}
              </span>
              {sessionGenre && (
                <span className="hidden rounded-full border border-[rgba(92,143,214,0.28)] bg-[rgba(92,143,214,0.12)] px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(216,230,255,0.88)] sm:inline-flex">
                  {sessionGenre}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentSession && (
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`hidden rounded-full border px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] transition-all lg:inline-flex ${
                showDashboard
                  ? 'border-[rgba(202,161,92,0.38)] bg-[rgba(202,161,92,0.16)] text-[rgba(246,226,188,0.92)]'
                  : 'border-white/8 bg-white/[0.04] text-text-secondary hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary'
              }`}
            >
              ANS {ENGINE_VERSION}
            </button>
          )}

          <div className="flex items-center gap-1 rounded-full border border-white/8 bg-black/20 p-1">
            <button
              onClick={() => setShowSearch((prev: boolean) => !prev)}
              className={`${iconButtonClass} h-9 w-9 border-transparent bg-transparent ${showSearch ? 'text-accent-amber' : ''}`}
              title={t('ui.searchCtrlF')}
            >
              <Search className="h-[1.05rem] w-[1.05rem]" />
            </button>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`${iconButtonClass} h-9 w-9 border-transparent bg-transparent`}
              title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              {focusMode ? <Minimize2 className="h-[1.05rem] w-[1.05rem]" /> : <Maximize2 className="h-[1.05rem] w-[1.05rem]" />}
            </button>
            <button
              onClick={() => setLightTheme((prev: boolean) => {
                const next = !prev;
                localStorage.setItem('noa_light_theme', String(next));
                return next;
              })}
              className={`${iconButtonClass} h-9 w-9 border-transparent bg-transparent ${lightTheme ? 'text-accent-amber' : ''}`}
              title={lightTheme ? 'Dark theme' : 'Light theme'}
            >
              {lightTheme ? <Moon className="h-[1.05rem] w-[1.05rem]" /> : <Sun className="h-[1.05rem] w-[1.05rem]" />}
            </button>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={`${iconButtonClass} h-9 w-9 border-transparent bg-transparent ${showShortcuts ? 'text-accent-amber' : ''}`}
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-[1.05rem] w-[1.05rem]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StudioHeader;
