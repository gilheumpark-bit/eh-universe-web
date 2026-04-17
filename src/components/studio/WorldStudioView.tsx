'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useCallback } from 'react';
import { Compass, Cpu, Search, Clock, Map, X, ArrowDown, Check } from 'lucide-react';
import type { AppLanguage, WorldSubTab, StoryConfig } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import PlanningView from './PlanningView';
import TabAssistant from './TabAssistant';
import { getApiKey, getActiveProvider, hasDgxService } from '@/lib/ai-providers';
import WorldAnalysisView from './WorldAnalysisView';
import WorldTimeline from './WorldTimeline';
import WorldMap from './WorldMap';

// WorldSimulator uses dynamic import to avoid circular deps
import dynamic from 'next/dynamic';
const WorldSimulator = dynamic(() => import('@/components/WorldSimulator'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3 p-6 animate-pulse">
      <div className="h-8 bg-bg-secondary rounded-xl w-1/3" />
      <div className="h-64 bg-bg-secondary rounded-2xl" />
      <div className="flex gap-3">
        <div className="h-10 bg-bg-secondary rounded-xl flex-1" />
        <div className="h-10 bg-bg-secondary rounded-xl flex-1" />
      </div>
    </div>
  ),
});

interface WorldStudioViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
  startLabel?: string;
  onSave: () => void;
  saveFlash: boolean;
  handleWorldSimChange: (data: Record<string, unknown>) => void;
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
      {/* Sub-tab bar — Stellar Atlas Holographic Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-6">
        <div className="relative flex flex-wrap items-center gap-2 p-2 bg-[linear-gradient(to_bottom,rgba(255,200,50,0.05),rgba(0,0,0,0.4))] backdrop-blur-xl border border-[rgba(255,200,50,0.2)] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,200,50,0.02)] overflow-hidden" role="tablist">
          {/* Scanline overlay for holographic feel */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,200,50,0.03)_50%,transparent_50%)] bg-size-[100%_4px] mix-blend-screen opacity-50"></div>
          
          {SUB_TAB_ORDER.map(tab => {
            const Icon = SUB_TAB_ICONS[tab];
            const active = subTab === tab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSubTab(tab);
                  // 서브탭 전환 시 콘텐츠 스크롤 상단 리셋
                  const sc = document.querySelector('[data-testid="studio-content"] .overflow-y-auto');
                  if (sc) sc.scrollTop = 0;
                }}
                className={`relative z-10 group flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(255,200,50,0.15),rgba(0,0,0,0.2))] text-amber-400 border border-[rgba(255,200,50,0.4)] shadow-[0_0_20px_rgba(255,200,50,0.15),inset_0_0_10px_rgba(255,200,50,0.1)] -translate-y-px"
                    : "text-text-tertiary hover:text-amber-400 hover:bg-[rgba(255,200,50,0.05)] border border-transparent hover:border-[rgba(255,200,50,0.1)]"
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,200,50,0.8)]' : 'group-hover:scale-110 group-hover:drop-shadow-[0_0_5px_rgba(255,200,50,0.4)]'}`} />
                <span className={active ? "drop-shadow-[0_0_10px_rgba(255,200,50,0.5)]" : ""}>{labels[tab]}</span>
                {active && (
                  <span className="absolute -bottom-px left-1/4 right-1/4 h-[2px] bg-[rgba(255,200,50,0.8)] shadow-[0_0_10px_rgba(255,200,50,1)] rounded-full"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab content */}
      {subTab === 'design' && (
        <>
          {/* AI Auto-Sync Notification Banner */}
          {config.worldSimData?._latestUpdates && config.worldSimData._latestUpdates.length > 0 && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-3">
              <div className="flex flex-col gap-2 p-4 bg-[linear-gradient(to_right,rgba(255,200,50,0.05),transparent)] border-l-4 border-l-[rgba(255,200,50,0.8)] border border-y-[rgba(255,200,50,0.2)] border-r-[rgba(255,200,50,0.2)] rounded-r-xl rounded-l-sm backdrop-blur-sm shadow-[0_5px_15px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(255,200,50,0.1)] border border-[rgba(255,200,50,0.3)] shadow-[0_0_10px_rgba(255,200,50,0.2)]">
                    <Cpu className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                    {language === 'KO' ? '노아 스튜디오 궤도 동기화 (ORBITAL SYNC)' : 'NOA Orbital Sync Completed'}
                  </span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-text-secondary font-mono space-y-1 ml-9">
                  {config.worldSimData._latestUpdates.map((update: string, i: number) => (
                    <li key={i}>{update}</li>
                  ))}
                </ul>
                <div className="text-[9px] text-text-tertiary mt-1 ml-9 font-mono tracking-widest">
                  {language === 'KO' ? '에피소드 데이터 변경분이 항성계 데이터베이스(World Database)에 머지되었습니다.' : 'Story modifications merged into Atlas Database.'}
                </div>
              </div>
            </div>
          )}

          {/* Empty state guide — 제목/시놉시스 미입력 시 시작 안내 */}
          {!config.title && !config.synopsis && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-3">
              <div className="flex items-center gap-3 px-5 py-4 bg-[linear-gradient(45deg,rgba(255,200,50,0.05),transparent)] border border-[rgba(255,200,50,0.2)] rounded-xl shadow-[0_0_20px_rgba(255,200,50,0.05)]">
                <ArrowDown className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                <span className="text-xs text-text-secondary font-mono tracking-wide">
                  {language === 'EN' ? 'Enter a title and synopsis below to forge your Universe' : language === 'JP' ? 'タイトルとシノプシスを入力すると世界が設計されます' : language === 'CN' ? '输入标题和大纲来设计您的世界' : '아래에 제목과 시놉시스를 입력하면 우주가 설계됩니다'}
                </span>
              </div>
            </div>
          )}
          <PlanningView language={language} config={config} setConfig={setConfig} onStart={onStart} startLabel={startLabel} hasAiAccess={!!getApiKey(getActiveProvider()) || Object.values(hostedProviders).some(Boolean) || hasDgxService()} />
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <TabAssistant tab="world" language={language} config={config} hostedProviders={hostedProviders} />
          </div>
          <div className="max-w-6xl mx-auto px-4 pb-8 flex gap-3 justify-end">
            {/* CTA: 세계관 설정 유무에 따라 다른 동선 - Stellar Buttons */}
            {config.title || config.synopsis ? (
              <>
                <button onClick={() => setSubTab('simulator')} className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-accent-amber/30 bg-bg-secondary/60 text-[12px] font-black uppercase tracking-widest font-mono transition-all hover:bg-accent-amber/10 hover:border-accent-amber/60 hover:shadow-[0_0_20px_rgba(255,200,50,0.15)] text-accent-amber hover:text-text-primary">
                  <Cpu className="w-4 h-4 group-hover:text-amber-400 transition-colors" /> {language === 'EN' ? 'ATLAS SIMULATOR' : language === 'JP' ? 'シミュレーター' : language === 'CN' ? '地图模拟器' : '엔진 시뮬레이션'}
                </button>
                <button onClick={onStart} className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-amber/70 to-accent-amber/90 border border-accent-amber/60 text-[12px] font-black uppercase tracking-widest font-mono transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,200,50,0.4)] text-bg-primary shadow-lg">
                  <Compass className="w-4 h-4 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" /> {startLabel ?? t('planning.commence')}
                </button>
              </>
            ) : null}
            <button 
              onClick={onSave} 
              className={`group flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest font-mono transition-all duration-300 ${
                saveFlash 
                  ? 'bg-accent-green text-bg-primary border border-accent-green shadow-[0_0_20px_rgba(50,200,100,0.4)]' 
                  : 'bg-gradient-to-b from-accent-amber/15 to-accent-amber/20 border border-accent-amber/40 text-accent-amber hover:bg-accent-amber/25 hover:shadow-[0_0_25px_rgba(255,200,50,0.2)]'
              }`}
            >
              {saveFlash ? <Check className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,220,100,0.9)] shadow-[0_0_8px_rgba(255,200,50,1)]" />}
              <span>{saveFlash ? t('worldStudio.saved') : t('worldStudio.saveSettings')}</span>
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
          <div className="flex justify-end mt-6">
            <button 
              onClick={onSave} 
              className={`group flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest font-mono transition-all duration-300 ${
                saveFlash 
                  ? 'bg-accent-green text-bg-primary border border-accent-green shadow-[0_0_20px_rgba(50,200,100,0.4)]' 
                  : 'bg-gradient-to-b from-accent-amber/15 to-accent-amber/20 border border-accent-amber/40 text-accent-amber hover:bg-accent-amber/25 hover:shadow-[0_0_25px_rgba(255,200,50,0.2)]'
              }`}
            >
              {saveFlash ? <Check className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,220,100,0.9)] shadow-[0_0_8px_rgba(255,200,50,1)]" />}
              <span>{saveFlash ? t('worldStudio.saved') : t('worldStudio.saveSettings')}</span>
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
              <span className="text-[10px] font-bold text-accent-purple font-mono">
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
              <span className="text-[10px] font-bold text-accent-purple font-mono">
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
