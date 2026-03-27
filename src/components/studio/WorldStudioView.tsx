'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useCallback } from 'react';
import { Compass, Cpu, Search, Clock, Map, X, ArrowDown } from 'lucide-react';
import type { AppLanguage, WorldSubTab, StoryConfig } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import PlanningView from './PlanningView';
import TabAssistant from './TabAssistant';
import { getApiKey, getActiveProvider } from '@/lib/ai-providers';
import WorldAnalysisView from './WorldAnalysisView';
import WorldTimeline from './WorldTimeline';
import WorldMap from './WorldMap';

// WorldSimulator uses dynamic import to avoid circular deps
import dynamic from 'next/dynamic';
const WorldSimulator = dynamic(() => import('@/components/WorldSimulator'), { ssr: false });

interface WorldStudioViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
  startLabel?: string;
  onSave: () => void;
  saveFlash: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWorldSimChange: (data: any) => void;
  hostedProviders?: Partial<Record<string, boolean>>;
}

// ============================================================
// PART 2 — Sub-tab Definitions
// ============================================================

const SUB_TABS: Record<AppLanguage, Record<WorldSubTab, string>> = {
  KO: { design: '설계', simulator: '시뮬레이터', analysis: '분석', timeline: '타임라인', map: '지도' },
  EN: { design: 'Design', simulator: 'Simulator', analysis: 'Analysis', timeline: 'Timeline', map: 'Map' },
  JP: { design: '設計', simulator: 'シミュレーター', analysis: '分析', timeline: 'タイムライン', map: 'マップ' },
  CN: { design: '设计', simulator: '模拟器', analysis: '分析', timeline: '时间线', map: '地图' },
};

const SUB_TAB_ICONS: Record<WorldSubTab, React.ElementType> = {
  design: Compass,
  simulator: Cpu,
  analysis: Search,
  timeline: Clock,
  map: Map,
};

const SUB_TAB_ORDER: WorldSubTab[] = ['design', 'simulator', 'analysis', 'timeline', 'map'];

// ============================================================
// PART 3 — Component
// ============================================================

const WorldStudioView: React.FC<WorldStudioViewProps> = ({
  language,
  config,
  setConfig,
  onStart,
  startLabel,
  onSave,
  saveFlash,
  handleWorldSimChange,
  hostedProviders = {},
}) => {
  const [subTab, setSubTab] = useState<WorldSubTab>('design');
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const t = createT(language);
  const labels = SUB_TABS[language];

  const handleSelectEra = useCallback((era: string) => {
    setSelectedEra(prev => prev === era ? null : era);
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sub-tab bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-6">
        <div className="flex items-center gap-1 p-1 bg-bg-secondary/50 border border-border rounded-2xl w-fit">
          {SUB_TAB_ORDER.map(tab => {
            const Icon = SUB_TAB_ICONS[tab];
            const active = subTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  active
                    ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/20'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab content */}
      {subTab === 'design' && (
        <>
          {/* Empty state guide — 제목/시놉시스 미입력 시 시작 안내 */}
          {!config.title && !config.synopsis && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-6">
              <div className="flex items-center gap-3 px-5 py-4 bg-accent-purple/10 border border-accent-purple/20 rounded-xl">
                <ArrowDown className="w-4 h-4 text-accent-purple shrink-0 animate-bounce" />
                <span className="text-xs text-text-secondary font-[family-name:var(--font-mono)]">
                  {language === 'EN' ? 'Enter a title and synopsis below — AI will design your world' : language === 'JP' ? 'タイトルとシノプシスを入力すると、AIが世界を設計します' : language === 'CN' ? '输入标题和大纲，AI将设计您的世界' : '아래에 제목과 시놉시스를 입력하면 AI가 세계를 설계합니다'}
                </span>
              </div>
            </div>
          )}
          <PlanningView language={language} config={config} setConfig={setConfig} onStart={onStart} startLabel={startLabel} hasAiAccess={!!getApiKey(getActiveProvider()) || Object.values(hostedProviders).some(Boolean)} />
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <TabAssistant tab="world" language={language} config={config} hostedProviders={hostedProviders} />
          </div>
          <div className="max-w-6xl mx-auto px-4 pb-8 flex gap-3 justify-end">
            {/* CTA: 세계관 설정 유무에 따라 다른 동선 */}
            {config.title || config.synopsis ? (
              <>
                <button onClick={() => setSubTab('simulator')} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 bg-bg-secondary border border-border text-text-secondary hover:text-text-primary hover:border-accent-purple/50">
                  🧪 {language === 'EN' ? 'Open Simulator' : language === 'JP' ? 'シミュレーターへ' : language === 'CN' ? '打开模拟器' : '시뮬레이터로 이동'}
                </button>
                <button onClick={onStart} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 bg-accent-purple text-white hover:opacity-80">
                  ✍️ {startLabel ?? t('planning.commence')}
                </button>
              </>
            ) : null}
            <button onClick={onSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
              💾 {saveFlash ? t('worldStudio.saved') : t('worldStudio.saveSettings')}
            </button>
          </div>
        </>
      )}

      {subTab === 'simulator' && (
        <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
          <WorldSimulator
            lang={language === 'EN' ? 'en' : 'ko'}
            synopsis={config.synopsis}
            worldContext={{
              corePremise: config.corePremise,
              powerStructure: config.powerStructure,
              currentConflict: config.currentConflict,
              factionRelations: config.factionRelations,
            }}
            initialData={config.worldSimData}
            onSave={handleWorldSimChange}
          />
          <div className="flex justify-end mt-4">
            <button onClick={onSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
              💾 {saveFlash ? t('worldStudio.saved') : t('worldStudio.saveSettings')}
            </button>
          </div>
        </div>
      )}

      {subTab === 'analysis' && (
        <WorldAnalysisView language={language} config={config} />
      )}

      {subTab === 'timeline' && (
        <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
          {selectedEra && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-accent-purple font-[family-name:var(--font-mono)]">
                {language === 'KO' ? `선택된 시대: ${selectedEra}` : `Selected era: ${selectedEra}`}
              </span>
              <button onClick={() => setSelectedEra(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-text-tertiary border border-border hover:border-red-400 hover:text-red-400 transition-all">
                <X className="w-3 h-3" />
                {language === 'KO' ? '해제' : 'Clear'}
              </button>
            </div>
          )}
          <WorldTimeline simData={config.worldSimData || {}} language={language}
            selectedEra={selectedEra ?? undefined} onSelectEra={handleSelectEra} />
        </div>
      )}

      {subTab === 'map' && (
        <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
          {selectedEra && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-accent-purple font-[family-name:var(--font-mono)]">
                {language === 'KO' ? `필터: ${selectedEra} 시대` : `Filter: ${selectedEra} era`}
              </span>
              <button onClick={() => setSelectedEra(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-text-tertiary border border-border hover:border-red-400 hover:text-red-400 transition-all">
                <X className="w-3 h-3" />
                {language === 'KO' ? '해제' : 'Clear'}
              </button>
            </div>
          )}
          <WorldMap
            simData={config.worldSimData || {}}
            language={language}
            highlightEra={selectedEra ?? undefined}
            onChange={(updated) => {
              setConfig(prev => ({
                ...prev,
                worldSimData: { ...prev.worldSimData, ...updated },
              }));
            }}
          />
        </div>
      )}
    </div>
  );
};

export default WorldStudioView;
