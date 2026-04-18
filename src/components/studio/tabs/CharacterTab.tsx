// ============================================================
// PART 1 — Imports & Localized Message Constants
// ============================================================
import React, { useState } from 'react';
import { AppLanguage, StoryConfig } from '@/lib/studio-types';
import ResourceView from '@/components/studio/ResourceView';
import ItemStudioView from '@/components/studio/ItemStudioView';
import TabAssistant from '@/components/studio/TabAssistant';
import { createT } from '@/lib/i18n';
import { Loader2, Sparkles } from 'lucide-react';
import { generateCharacters } from '@/services/geminiService';
import { activeSupportsStructured } from '@/lib/ai-providers';
import { logger } from '@/lib/logger';

/** 다국어 에러/프리픽스 메시지 — 재렌더마다 재생성되지 않도록 모듈 상수로 추출 */
const L10N = {
  unsupported: {
    KO: '현재 노아 엔진은 구조화 생성을 지원하지 않습니다. Gemini를 사용해주세요.',
    EN: "Current NOA engine doesn't support structured generation. Please use Gemini.",
    JP: '現在のノアエンジンは構造化生成に対応していません。Geminiをご利用ください。',
    CN: '当前诺亚引擎不支持结构化生成，请使用Gemini。',
  },
  needSynopsis: {
    KO: '먼저 시놉시스를 작성해주세요.',
    EN: 'Please write the synopsis first.',
    JP: '先にあらすじを書いてください。',
    CN: '请先编写大纲。',
  },
  genFail: {
    KO: '캐릭터 생성 실패',
    EN: 'Character generation failed',
    JP: 'キャラクター生成失敗',
    CN: '角色生成失败',
  },
} as const;

/** Sub-tab 버튼 기본 클래스 — 긴 Tailwind 체인을 분해하여 가독성 확보 */
const SUBTAB_BASE =
  'group flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold ' +
  'transition-[transform,opacity,background-color,border-color,color] duration-200';

const SUBTAB_ACTIVE_PURPLE =
  'bg-accent-purple/15 text-accent-purple border border-accent-purple/30 ' +
  'shadow-[0_0_16px_rgba(141,123,195,0.1)]';

const SUBTAB_ACTIVE_AMBER =
  'bg-accent-amber/15 text-accent-amber border border-accent-amber/30 ' +
  'shadow-[0_0_16px_rgba(202,161,92,0.1)]';

const SUBTAB_INACTIVE =
  'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50 border border-transparent';

const SAVE_BASE =
  'btn-ripple group flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold ' +
  'uppercase tracking-wider transition-[transform,opacity,background-color,border-color,color] duration-300';

const SAVE_FLASH =
  'bg-accent-green text-bg-primary animate-save-bounce-glow';

const SAVE_IDLE =
  'bg-gradient-to-r from-accent-purple to-accent-purple/80 text-bg-primary ' +
  'hover:shadow-[0_4px_20px_rgba(141,123,195,0.3)] hover:-translate-y-0.5 active:scale-95';

// ============================================================
// PART 2 — Props & Component
// ============================================================
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
      setUxError({ error: new Error(L10N.unsupported[language]) });
      return;
    }
    if (!config.synopsis) {
      setUxError({ error: new Error(L10N.needSynopsis[language]) });
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateCharacters(config, language, genCount);
      setConfig(prev => ({
        ...prev,
        characters: [...prev.characters, ...generated],
      }));
    } catch (err) {
      // [C] 에러 객체 방어 + [C] silent catch 방지 → logger.warn 로깅
      const detail = err instanceof Error ? err.message : '';
      logger.warn('CharacterTab', 'generateCharacters failed', detail);
      setUxError({
        error: new Error(`${L10N.genFail[language]}: ${detail}`),
        retry: handleAutoGenerate,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================================
  // PART 3 — Render
  // ============================================================
  const charsActiveCls = charSubTab === 'characters' ? SUBTAB_ACTIVE_PURPLE : SUBTAB_INACTIVE;
  const itemsActiveCls = charSubTab === 'items' ? SUBTAB_ACTIVE_AMBER : SUBTAB_INACTIVE;
  const saveCls = `${SAVE_BASE} ${saveFlash ? SAVE_FLASH : SAVE_IDLE}`;

  return (
    <>
      {/* Premium Header Bar */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Sub-tab Cards */}
          <div className="flex gap-2 p-1.5 bg-bg-secondary/30 backdrop-blur-sm border border-border rounded-2xl">
            <button
              onClick={() => setCharSubTab('characters')}
              className={`${SUBTAB_BASE} ${charsActiveCls}`}
            >
              <span className={`text-lg transition-transform duration-200 ${charSubTab === 'characters' ? 'scale-110' : 'group-hover:scale-105'}`}>👥</span>
              <span className="uppercase tracking-wider">{t('ui.characters')}</span>
            </button>
            <button
              onClick={() => setCharSubTab('items')}
              className={`${SUBTAB_BASE} ${itemsActiveCls}`}
            >
              <span className={`text-lg transition-transform duration-200 ${charSubTab === 'items' ? 'scale-110' : 'group-hover:scale-105'}`}>📦</span>
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
                  className="w-12 bg-bg-secondary/80 border border-border rounded-xl px-2 py-3 text-center text-xs font-black text-accent-purple focus:border-accent-purple/60 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  title={language === 'KO' ? '생성할 캐릭터 수' : 'Number of characters'}
                />
                <button
                  onClick={handleAutoGenerate}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-accent-amber/80 to-accent-amber/50 text-bg-primary rounded-xl text-sm font-bold tracking-widest transition-[transform,opacity] shadow-lg hover:shadow-accent-amber/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? 'Synthesizing...' : (language === 'KO' ? '초안 생성' : 'Generate Draft')}
                </button>
              </div>
            )}

            {/* Save Button — Premium Style with Micro-interactions */}
            <button onClick={triggerSave} className={saveCls}>
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
