// @ts-nocheck
import React from 'react';
import dynamic from 'next/dynamic';
import { StoryConfig } from '@/lib/studio-types';
import TabAssistant from '@/components/studio/TabAssistant';
import { createT } from '@/lib/i18n';

const StyleStudioView = dynamic(() => import('@/components/studio/StyleStudioView'), { ssr: false });

interface StyleTabProps {
  isKO: boolean;
  language: 'KO' | 'EN' | 'JP' | 'CN';
  config: StoryConfig;
  updateCurrentSession: (data: Partial<{ config: StoryConfig }>) => void;
  triggerSave: () => void;
  saveFlash: boolean;
}

const StyleTab: React.FC<StyleTabProps> = ({
  isKO,
  language,
  config,
  updateCurrentSession,
  triggerSave,
  saveFlash
}) => {
  const t = createT(language);

  return (
    <>
      <StyleStudioView
        language={language}
        initialProfile={config.styleProfile}
        onProfileChange={(profile) => {
          updateCurrentSession({
            config: { ...config, styleProfile: profile },
          });
        }}
      />
      <div className="max-w-6xl mx-auto px-4 pb-4">
        <TabAssistant tab="style" language={language} config={config} />
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-end">
        <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
          💾 {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
        </button>
      </div>
    </>
  );
};

export default StyleTab;
