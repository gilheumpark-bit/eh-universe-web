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
      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 w-fit">
          <button 
            onClick={() => setCharSubTab('characters')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${charSubTab === 'characters' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}
          >
            👥 {t('ui.characters')}
          </button>
          <button 
            onClick={() => setCharSubTab('items')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${charSubTab === 'items' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}
          >
            ⚔️ {t('ui.itemStudio')}
          </button>
        </div>

        <button 
          onClick={triggerSave} 
          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 shadow-lg ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:-translate-y-0.5'}`}
        >
          💾 {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
        </button>
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
