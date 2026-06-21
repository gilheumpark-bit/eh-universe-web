'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useCallback } from 'react';
import { Compass, Cpu, Search, Clock, Map, X, Check, Globe, MapPin, Wand2, Sparkles, ChevronDown, Network } from 'lucide-react';
import type { AppLanguage, WorldSubTab, StoryConfig } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import PlanningView from './PlanningView';
import TabAssistant from './TabAssistant';
import { getApiKey, getActiveProvider, hasDgxService } from '@/lib/ai-providers';
import WorldAnalysisView from './WorldAnalysisView';
import WorldTimeline from './WorldTimeline';
import WorldMap from './WorldMap';
import { EmptyState } from '@/components/ui/EmptyState';
import WorldFactChatFill from './world/WorldFactChatFill';
import WorldGraphEditor from './world/WorldGraphEditor';

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
  currentProjectId?: string | null;
  hostedProviders?: Partial<Record<string, boolean>>;
}

// ============================================================
// PART 2 — Sub-tab Definitions
// ============================================================

const SUB_TABS: Record<AppLanguage, Record<WorldSubTab, string>> = {
  KO: { design: '설계', simulator: '점검', analysis: '분석', timeline: '타임라인', map: '지도' },
  EN: { design: 'Design', simulator: 'Check', analysis: 'Analysis', timeline: 'Timeline', map: 'Map' },
  JP: { design: '設計', simulator: '点検', analysis: '分析', timeline: 'タイムライン', map: 'マップ' },
  CN: { design: '设计', simulator: '检查', analysis: '分析', timeline: '时间线', map: '地图' },
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
  currentProjectId = null,
  hostedProviders = {},
}) => {
  const [subTab, setSubTab] = useState<WorldSubTab>('design');
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [showChatFill, setShowChatFill] = useState(false);
  const [showGraphEditor, setShowGraphEditor] = useState(false);
  const t = createT(language);
  const labels = SUB_TABS[language];

  const handleSelectEra = useCallback((era: string) => {
    setSelectedEra(prev => prev === era ? null : era);
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sub-tab bar — quiet studio tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-6">
        <div className="relative flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-secondary/70 p-2 shadow-sm" role="tablist">
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
                className={`relative z-10 group flex min-h-[44px] items-center gap-2 px-4 rounded-md text-xs font-semibold transition-[transform,opacity,background-color,border-color,color] duration-200 ${
                  active
                    ? "border border-border bg-bg-primary text-text-primary shadow-sm"
                    : "border border-transparent text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
                <span>{labels[tab]}</span>
                {active && (
                  <span className="absolute -bottom-px left-4 right-4 h-[2px] rounded-full bg-accent-blue"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab content */}
      {subTab === 'design' && (
        <>
          {/* Noa update notification */}
          {config.worldSimData?._latestUpdates && config.worldSimData._latestUpdates.length > 0 && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-3">
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg-secondary/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-bg-primary text-accent-blue">
                    <Cpu className="h-3 w-3" />
                  </div>
                  <span className="text-[12px] font-semibold text-text-primary">
                    {language === 'KO' ? '노아 변경 반영' : 'Noa changes applied'}
                  </span>
                </div>
                <ul className="ml-9 list-inside list-disc space-y-1 text-[12px] text-text-secondary">
                  {config.worldSimData._latestUpdates.map((update: string, i: number) => (
                    <li key={i}>{update}</li>
                  ))}
                </ul>
                <div className="ml-9 mt-1 text-[11px] text-text-tertiary">
                  {language === 'KO' ? '에피소드 변경분이 세계관 메모에 반영되었습니다.' : 'Story changes were merged into world notes.'}
                </div>
              </div>
            </div>
          )}

          {/* [2026-06-06 worldgraph Phase 1] 노아 인터뷰 → WorldFact 후보 정리 → 사람 검토·커밋 */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-3">
            <button
              type="button"
              onClick={() => setShowChatFill((v) => !v)}
              aria-expanded={showChatFill}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-accent-amber/40 bg-bg-secondary/60 px-4 text-sm font-semibold text-accent-amber transition-colors hover:bg-accent-amber/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Sparkles className="h-4 w-4" aria-hidden /> 노아 인터뷰로 세계관 기준 정리
              <ChevronDown className={`h-4 w-4 transition-transform ${showChatFill ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {showChatFill && (
              <div className="pt-3">
                <WorldFactChatFill workId={config.title || undefined} />
              </div>
            )}
          </div>

          {/* [Batch 3 rank 3 — 2026-06-07] worldgraph 관계도 편집 */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-3">
            <button
              type="button"
              onClick={() => setShowGraphEditor((v) => !v)}
              aria-expanded={showGraphEditor}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-accent-amber/40 bg-bg-secondary/60 px-4 text-sm font-semibold text-accent-amber transition-colors hover:bg-accent-amber/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              data-testid="worldgraph-toggle"
            >
              <Network className="h-4 w-4" aria-hidden /> 세계관 관계도 편집
              <ChevronDown className={`h-4 w-4 transition-transform ${showGraphEditor ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {showGraphEditor && (
              <div className="pt-3">
                <WorldGraphEditor workId={config.title || undefined} />
              </div>
            )}
          </div>

          {/* Empty state — 제목/시놉시스 미입력 시 공용 EmptyState 패널로 안내 */}
          {!config.title && !config.synopsis && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-3">
              <EmptyState
                icon={Globe}
                title={L4(language, {
                  ko: '아직 세계관이 비어 있습니다',
                  en: 'Your world is empty',
                  ja: 'まだ世界観が空です',
                  zh: '世界观还是空的',
                })}
                description={L4(language, {
                  ko: '장소·사건·법칙을 추가해 세계를 설계하세요.',
                  en: 'Add places, events, and laws to design your world.',
                  ja: '場所・出来事・法則を追加して世界を設計しましょう。',
                  zh: '添加地点、事件和法则来设计你的世界。',
                })}
                actions={[
                  {
                    label: L4(language, {
                      ko: '새 장소 추가',
                      en: 'Add new place',
                      ja: '新しい場所を追加',
                      zh: '添加新地点',
                    }),
                    icon: MapPin,
                    variant: 'primary',
                    onClick: () => {
                      // [C] 타이틀 입력 필드로 스크롤 이동 — PlanningView가 하단에 바로 위치
                      const el = document.querySelector<HTMLElement>('[data-testid="studio-content"] input[name="title"], [data-testid="studio-content"] textarea');
                      el?.focus();
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                  },
                  {
                    label: L4(language, {
                      ko: '노아 제안 받기',
                      en: 'Get Noa suggestions',
                      ja: 'Noa提案を受ける',
                      zh: '获取 Noa 建议',
                    }),
                    icon: Wand2,
                    variant: 'secondary',
                    onClick: () => setSubTab('simulator'),
                  },
                ]}
                tip={L4(language, {
                  ko: 'Ctrl+K로 빠른 검색 가능',
                  en: 'Press Ctrl+K for quick search',
                  ja: 'Ctrl+Kでクイック検索',
                  zh: '按 Ctrl+K 快速搜索',
                })}
              />
            </div>
          )}
          <PlanningView language={language} config={config} setConfig={setConfig} onStart={onStart} startLabel={startLabel} hasAiAccess={!!getApiKey(getActiveProvider()) || Object.values(hostedProviders).some(Boolean) || hasDgxService()} />
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <TabAssistant
              tab="world"
              language={language}
              config={config}
              currentProjectId={currentProjectId}
              hostedProviders={hostedProviders}
            />
          </div>
          <div className="max-w-6xl mx-auto px-4 pb-8 flex gap-3 justify-end">
            {/* CTA: 세계관 설정 유무에 따라 다른 동선 */}
            {config.title || config.synopsis ? (
              <>
                <button onClick={() => setSubTab('simulator')} className="group flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-bg-secondary px-5 text-[13px] font-semibold text-text-secondary transition-[background-color,border-color,color] hover:border-accent-blue/40 hover:bg-bg-tertiary hover:text-text-primary">
                  <Cpu className="h-4 w-4 transition-colors" /> {language === 'EN' ? 'World check' : language === 'JP' ? '世界観チェック' : language === 'CN' ? '世界观检查' : '세계관 점검'}
                </button>
                <button onClick={onStart} className="group flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-accent-blue/45 bg-accent-blue px-5 text-[13px] font-semibold text-white transition-[background-color,border-color,color] hover:bg-accent-blue/90">
                  <Compass className="h-4 w-4" /> {startLabel ?? t('planning.commence')}
                </button>
              </>
            ) : null}
            <button
              onClick={onSave}
              className={`group flex min-h-[44px] items-center justify-center gap-2 rounded-md px-5 text-[13px] font-semibold transition-[opacity,background-color,border-color,color] duration-200 ${
                saveFlash
                  ? 'border border-accent-green bg-accent-green text-bg-primary'
                  : 'border border-border bg-bg-secondary text-text-secondary hover:border-accent-blue/40 hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {saveFlash ? <Check className="h-4 w-4" /> : <div className="h-1.5 w-1.5 rounded-full bg-accent-blue" />}
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
              className={`group flex min-h-[44px] items-center justify-center gap-2 rounded-md px-5 text-[13px] font-semibold transition-[opacity,background-color,border-color,color] duration-200 ${
                saveFlash
                  ? 'border border-accent-green bg-accent-green text-bg-primary'
                  : 'border border-border bg-bg-secondary text-text-secondary hover:border-accent-blue/40 hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {saveFlash ? <Check className="h-4 w-4" /> : <div className="h-1.5 w-1.5 rounded-full bg-accent-blue" />}
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
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-text-tertiary border border-border hover:border-accent-red hover:text-accent-red transition-colors">
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
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-text-tertiary border border-border hover:border-accent-red hover:text-accent-red transition-colors">
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
