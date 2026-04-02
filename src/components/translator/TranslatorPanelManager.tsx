import React from 'react';
import { useTranslatorLayout } from './core/TranslatorLayoutContext';
import * as PI from './PanelImports';
import { getLeftPanelLabel, getRightPanelLabel } from './core/panel-registry';
import { useLang } from '@/lib/LangContext';
import { X, LayoutTemplate } from 'lucide-react';

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

  const themeColorClass = region === 'left' ? 'text-accent-amber' : 'text-accent-purple';

  return (
    <div className={`flex h-full w-full flex-col bg-black/40 backdrop-blur-3xl shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-4 py-3 shrink-0`}>
        <div className="flex items-center gap-2">
          <LayoutTemplate className={`h-4 w-4 ${themeColorClass} opacity-80`} />
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-secondary drop-shadow-md">
            {title}
          </h2>
        </div>
        <button
          onClick={() => {
            if (region === 'left') layout.setActiveLeftPanel(null);
            else layout.setActiveRightPanel(null);
          }}
          className="group rounded-full p-1.5 transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
          title="Close Panel"
        >
          <X className="h-4 w-4 text-text-tertiary group-hover:text-text-primary transition-colors" />
        </button>
      </div>

      {/* Decorative Line */}
      <div className={`h-[1px] w-full bg-gradient-to-r from-transparent via-${region === 'left' ? 'accent-amber' : 'accent-purple'}/30 to-transparent opacity-50`} />

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 w-full h-full pointer-events-auto custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
}
