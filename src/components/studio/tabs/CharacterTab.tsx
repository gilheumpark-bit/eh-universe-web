import React from 'react';
import { AppLanguage, StoryConfig } from '@/lib/studio-types';
import ResourceView from '@/components/studio/ResourceView';
import ItemStudioView from '@/components/studio/ItemStudioView';
import TabAssistant from '@/components/studio/TabAssistant';
import { createT } from '@/lib/i18n';

interface CharacterTabProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  charSubTab: 'characters' | 'items';
  setCharSubTab: (tab: 'characters' | 'items') => void;
  triggerSave: () => void;
  saveFlash: boolean;
  setUxError: (err: { error: unknown; retry?: () => void } | null) => void;
  showAiLock?: boolean;
  hostedProviders?: Record<string, boolean>;
}

const CharacterTab: React.FC<CharacterTabProps> = ({
  language,
  config,
  setConfig,
  charSubTab,
  setCharSubTab,
  triggerSave,
  saveFlash,
  setUxError,
  showAiLock = false,
  hostedProviders = {},
}) => {
  const t = createT(language);

  return (
    <>
      {/* Premium Header Bar */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Sub-tab Cards */}
          <div className="flex gap-2 p-1.5 bg-bg-secondary/30 backdrop-blur-sm border border-border rounded-2xl">
            <button 
              onClick={() => setCharSubTab('characters')} 
              className={`group flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                charSubTab === 'characters' 
                  ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/30 shadow-[0_0_16px_rgba(141,123,195,0.1)]' 
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50 border border-transparent'
              }`}
            >
              <span className={`text-lg transition-transform duration-200 ${charSubTab === 'characters' ? 'scale-110' : 'group-hover:scale-105'}`}>👥</span>
              <span className="uppercase tracking-wider">{t('ui.characters')}</span>
            </button>
            <button 
              onClick={() => setCharSubTab('items')} 
              className={`group flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                charSubTab === 'items' 
                  ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30 shadow-[0_0_16px_rgba(202,161,92,0.1)]' 
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50 border border-transparent'
              }`}
            >
              <span className={`text-lg transition-transform duration-200 ${charSubTab === 'items' ? 'scale-110' : 'group-hover:scale-105'}`}>⚔️</span>
              <span className="uppercase tracking-wider">{t('ui.itemStudio')}</span>
            </button>
          </div>

          {/* Save Button — Premium Style with Micro-interactions */}
          <button 
            onClick={triggerSave} 
            className={`btn-ripple group flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
              saveFlash 
                ? 'bg-accent-green text-white animate-save-bounce-glow' 
                : 'bg-gradient-to-r from-accent-purple to-accent-purple/80 text-white hover:shadow-[0_4px_20px_rgba(141,123,195,0.3)] hover:-translate-y-0.5 active:scale-95'
            }`}
          >
            <span className={`text-base transition-transform duration-200 ${saveFlash ? 'animate-icon-pop' : 'group-hover:scale-110'}`}>
              {saveFlash ? '✓' : '💾'}
            </span>
            <span className={saveFlash ? 'animate-text-swap-in' : ''}>
              {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
            </span>
          </button>
        </div>
      </div>

      {charSubTab === 'characters' ? (
        <ResourceView 
          language={language} 
          config={config} 
          setConfig={setConfig} 
          onError={(msg) => setUxError({ error: new Error(msg) })} 
        />
      ) : (
        <ItemStudioView 
          language={language} 
          config={config} 
          setConfig={setConfig} 
        />
      )}

      {!showAiLock && (
      <div className="max-w-[1400px] mx-auto px-4 pb-4">
        <TabAssistant tab="characters" language={language} config={config} hostedProviders={hostedProviders} />
      </div>
      )}
    </>
  );
};

export default CharacterTab;
