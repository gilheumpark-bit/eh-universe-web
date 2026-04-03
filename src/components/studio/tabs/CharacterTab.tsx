import React, { useState } from 'react';
import { AppLanguage, StoryConfig } from '@/lib/studio-types';
import ResourceView from '@/components/studio/ResourceView';
import ItemStudioView from '@/components/studio/ItemStudioView';
import TabAssistant from '@/components/studio/TabAssistant';
import { createT } from '@/lib/i18n';
import { Loader2, Sparkles } from 'lucide-react';
import { generateCharacters } from '@/services/geminiService';
import { activeSupportsStructured } from '@/lib/ai-providers';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [genCount, setGenCount] = useState(4);

  const handleAutoGenerate = async () => {
    if (!activeSupportsStructured()) {
      const msg = ({ KO: "현재 프로바이더는 구조화 생성을 지원하지 않습니다. Gemini를 사용해주세요.", EN: "Current provider doesn't support structured generation. Please use Gemini.", JA: "現在のプロバイダーは構造化生成に対応していません。Geminiをご利用ください。", ZH: "当前提供商不支持结构化生成，请使用Gemini。" })[language];
      setUxError({ error: new Error(msg) });
      return;
    }
    if (!config.synopsis) {
      const msg = ({ KO: "먼저 시놉시스를 작성해주세요.", EN: "Please write the synopsis first.", JA: "先にあらすじを書いてください。", ZH: "请先编写大纲。" })[language];
      setUxError({ error: new Error(msg) });
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateCharacters(config, language, genCount);
      setConfig(prev => ({
        ...prev,
        characters: [...prev.characters, ...generated]
      }));
    } catch {
      const msg = ({ KO: "캐릭터 생성 중 오류가 발생했습니다.", EN: "Error generating characters.", JA: "キャラクター生成中にエラーが発生しました。", ZH: "生成角色时出错。" })[language];
      setUxError({ error: new Error(msg) });
    } finally {
      setIsGenerating(false);
    }
  };

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

          <div className="flex items-center gap-3">
            {charSubTab === 'characters' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={genCount}
                  onChange={e => setGenCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 4)))}
                  className="w-12 bg-black/50 border border-border/80 rounded-xl px-2 py-3 text-center text-xs font-black text-blue-400 focus:border-blue-500 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  title={language === 'KO' ? '생성할 캐릭터 수' : 'Number of characters'}
                />
                <button
                  onClick={handleAutoGenerate}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-800 to-stone-900 text-stone-100 rounded-xl text-sm font-bold tracking-widest transition-all shadow-lg hover:shadow-amber-950/25 active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? "Synthesizing..." : (language === 'KO' ? '자동 생성' : 'Auto Generate')}
                </button>
              </div>
            )}

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
