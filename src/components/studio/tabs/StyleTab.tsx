import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { StoryConfig, Message } from '@/lib/studio-types';
import TabAssistant from '@/components/studio/TabAssistant';
import RhythmAnalyzer from '@/components/studio/RhythmAnalyzer';
import { createT } from '@/lib/i18n';

const StyleStudioView = dynamic(() => import('@/components/studio/StyleStudioView'), { ssr: false, loading: () => <div className="animate-pulse p-6"><div className="h-8 bg-bg-secondary rounded-xl w-1/3 mb-3" /><div className="h-48 bg-bg-secondary rounded-2xl" /></div> });

interface StyleTabProps {
  language: 'KO' | 'EN' | 'JP' | 'CN';
  config: StoryConfig;
  updateCurrentSession: (data: Partial<{ config: StoryConfig }>) => void;
  triggerSave: () => void;
  saveFlash: boolean;
  showAiLock?: boolean;
  hostedProviders?: Record<string, boolean>;
  messages?: Message[];
}

const StyleTab: React.FC<StyleTabProps> = ({
  language,
  config,
  updateCurrentSession,
  triggerSave,
  saveFlash,
  showAiLock = false,
  hostedProviders = {},
  messages = [],
}) => {
  const t = createT(language);
  const [showRhythm, setShowRhythm] = useState(false);

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
      {/* 문장 리듬 분석 */}
      {messages.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-2 pb-2">
          <button onClick={() => setShowRhythm(!showRhythm)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-all ${
              showRhythm ? 'bg-accent-purple text-white border-accent-purple' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
            }`}>
            📐 {language === 'KO' ? '문장 리듬 분석' : 'Sentence Rhythm'}
          </button>
          {showRhythm && (
            <div className="mt-3">
              <RhythmAnalyzer messages={messages} language={language} />
            </div>
          )}
        </div>
      )}
      {!showAiLock && (
      <div className="max-w-6xl mx-auto px-4 pb-4">
        <TabAssistant tab="style" language={language} config={config} hostedProviders={hostedProviders} />
      </div>
      )}
      <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-end">
        <button 
          onClick={triggerSave} 
          className={`btn-ripple group flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-mono transition-all duration-300 ${
            saveFlash 
              ? 'bg-accent-green text-white animate-save-bounce-glow' 
              : 'bg-gradient-to-r from-accent-purple to-accent-purple/80 text-white hover:shadow-[0_4px_20px_rgba(141,123,195,0.3)] hover:-translate-y-0.5 active:scale-95'
          }`}
        >
          <span className={`transition-transform duration-200 ${saveFlash ? 'animate-icon-pop' : 'group-hover:scale-110'}`}>
            {saveFlash ? '✓' : '💾'}
          </span>
          <span className={saveFlash ? 'animate-text-swap-in' : ''}>
            {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
          </span>
        </button>
      </div>
    </>
  );
};

export default StyleTab;
