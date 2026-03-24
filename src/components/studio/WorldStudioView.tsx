'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState } from 'react';
import { Compass, Cpu, Search } from 'lucide-react';
import type { AppLanguage, WorldSubTab, StoryConfig } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import PlanningView from './PlanningView';
import TabAssistant from './TabAssistant';
import WorldAnalysisView from './WorldAnalysisView';

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
}

// ============================================================
// PART 2 — Sub-tab Definitions
// ============================================================

const SUB_TABS: Record<AppLanguage, Record<WorldSubTab, string>> = {
  KO: { design: '설계', simulator: '시뮬레이터', analysis: '분석' },
  EN: { design: 'Design', simulator: 'Simulator', analysis: 'Analysis' },
  JP: { design: '設計', simulator: 'シミュレーター', analysis: '分析' },
  CN: { design: '设计', simulator: '模拟器', analysis: '分析' },
};

const SUB_TAB_ICONS: Record<WorldSubTab, React.ElementType> = {
  design: Compass,
  simulator: Cpu,
  analysis: Search,
};

const SUB_TAB_ORDER: WorldSubTab[] = ['design', 'simulator', 'analysis'];

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
}) => {
  const [subTab, setSubTab] = useState<WorldSubTab>('design');
  const t = createT(language);
  const labels = SUB_TABS[language];

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sub-tab bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-6">
        <div className="flex items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl w-fit">
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
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
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
          <PlanningView language={language} config={config} setConfig={setConfig} onStart={onStart} startLabel={startLabel} />
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <TabAssistant tab="world" language={language} config={config} />
          </div>
          <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-end">
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
    </div>
  );
};

export default WorldStudioView;
