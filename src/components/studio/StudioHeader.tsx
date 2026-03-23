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
  setShowSearch: (show: any) => void;
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  lightTheme: boolean;
  setLightTheme: (light: any) => void;
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
  const isKO = language === 'KO';

  return (
    <header className={`h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
      <div className="flex items-center gap-2 md:gap-4">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-bg-secondary rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-text-tertiary" />
        </button>
        <div className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 min-w-0 font-[family-name:var(--font-mono)]">
          <span className="text-text-tertiary hidden sm:inline">{t('sidebar.activeProject')}:</span>
          <span className="text-text-primary truncate">{currentSession?.title || t('engine.noStory')}</span>
          {currentSessionId && <span className={`text-[8px] font-[family-name:var(--font-mono)] transition-all duration-300 ${saveFlash ? 'text-accent-green scale-125 font-black' : 'text-text-tertiary'}`}>✓ {saveFlash ? t('ui.saved') : t('ui.autoSaved')}</span>}
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
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch((prev: boolean) => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none" title={t('ui.searchCtrlF')}><Search className="w-4 h-4" /></button>
          <button onClick={() => setFocusMode(!focusMode)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none">{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
          <button onClick={() => setLightTheme((prev: boolean) => { const next = !prev; localStorage.setItem('noa_light_theme', String(next)); return next; })} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none">{lightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</button>
          <button onClick={() => setShowShortcuts(!showShortcuts)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none"><Keyboard className="w-4 h-4" /></button>
        </div>
      </div>
    </header>
  );
};

export default StudioHeader;
