import React from 'react';
import { useTranslatorLayout } from './core/TranslatorLayoutContext';
import * as PI from './PanelImports';
import { getLeftPanelLabel, getRightPanelLabel } from './core/panel-registry';
import { useLang } from '@/lib/LangContext';
import { X } from 'lucide-react';

export function TranslatorPanelManager({ region }: { region: 'left' | 'right' }) {
  const layout = useTranslatorLayout();
  const { lang } = useLang();
  
  const activePanel = region === 'left' ? layout.activeLeftPanel : layout.activeRightPanel;

  if (!activePanel) return null;

  const renderContent = () => {
    switch (activePanel) {
      // Left
      case 'explorer': return <PI.ExplorerPanel />;
      case 'glossary': return <PI.GlossaryPanel />;
      case 'settings': return <PI.SettingsPanel />;
      case 'history': return <PI.HistoryPanel />;
      
      // Right
      case 'chat': return <PI.ChatPanel />;
      case 'audit': return <PI.AuditPanel />;
      case 'reference': return <PI.ReferencePanel />;
      default: return null;
    }
  };

  const title = region === 'left' 
    ? getLeftPanelLabel(activePanel, lang.toUpperCase() as 'KO' | 'EN')
    : getRightPanelLabel(activePanel, lang.toUpperCase() as 'KO' | 'EN');

  return (
    <div className="flex h-full w-full flex-col bg-black/40 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 shrink-0">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-text-primary">
          {title}
        </h2>
        <button
          onClick={() => {
            if (region === 'left') layout.setActiveLeftPanel(null);
            else layout.setActiveRightPanel(null);
          }}
          className="rounded p-1 text-text-tertiary hover:bg-white/10 hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto relative z-10 w-full h-full pointer-events-auto">
        {renderContent()}
      </div>
    </div>
  );
}
