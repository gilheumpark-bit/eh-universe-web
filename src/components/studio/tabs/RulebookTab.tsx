"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { AppLanguage, StoryConfig } from '@/lib/studio-types';
import TabAssistant from '@/components/studio/TabAssistant';
import { createT } from '@/lib/i18n';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';
import { BookOpen, TrendingUp, Palette, PenTool, ArrowLeft } from 'lucide-react';

const SceneSheet = dynamic(() => import('@/components/studio/SceneSheet'), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading...</div>
});

// ============================================================
// PART 1 — 타입 및 카드 정의
// ============================================================

interface RulebookTabProps {
  language: AppLanguage;
  config: StoryConfig;
  updateCurrentSession: (data: Partial<{ config: StoryConfig }>) => void;
  triggerSave: () => void;
  saveFlash: boolean;
  currentSessionId: string | null;
  showAiLock?: boolean;
  hostedProviders?: Partial<Record<string, boolean>>;
}

type ViewMode = 'dashboard' | 'editor-structure' | 'editor-scene' | 'editor-character' | 'editor-notes' | 'editor-all';

const CARD_INITIAL_TABS: Record<string, string> = {
  'editor-structure': 'plot',
  'editor-scene': 'goguma',
  'editor-character': 'emotion',
  'editor-notes': 'foreshadow',
  'editor-all': 'goguma',
};

const CARDS = [
  {
    id: 'structure',
    icon: TrendingUp,
    ko: '이야기 구조',
    en: 'Story Structure',
    descKo: '플롯 · 텐션 곡선 · 분량 배분',
    descEn: 'Plot · Tension Curve · Pacing',
    color: 'accent-purple',
    items: ['plot', 'tension', 'pacing'],
  },
  {
    id: 'scene',
    icon: Palette,
    ko: '장면 연출',
    en: 'Scene Direction',
    descKo: '고구마/사이다 · 훅 · 클리프 · 도파민 · 전환',
    descEn: 'Tension/Release · Hooks · Cliffs · Dopamine · Transitions',
    color: 'accent-amber',
    items: ['goguma', 'hook', 'cliff', 'dopamine', 'transition'],
  },
  {
    id: 'character',
    icon: BookOpen,
    ko: '캐릭터 · 감정',
    en: 'Character · Emotion',
    descKo: '감정선 · 대사 톤 · 캐릭터 규칙',
    descEn: 'Emotion Arc · Dialogue · Canon Rules',
    color: 'accent-green',
    items: ['emotion', 'dialogue', 'canon'],
  },
  {
    id: 'notes',
    icon: PenTool,
    ko: '복선 · 메모',
    en: 'Foreshadow · Notes',
    descKo: '떡밥 관리 · 작가 메모장',
    descEn: 'Foreshadow tracking · Writer notes',
    color: 'accent-blue',
    items: ['foreshadow', 'notes'],
  },
] as const;

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

const RulebookTab: React.FC<RulebookTabProps> = ({
  language,
  config,
  updateCurrentSession,
  triggerSave,
  saveFlash,
  hostedProviders,
  currentSessionId,
}) => {
  const t = createT(language);
  const isKO = language === 'KO';
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  // Build SceneSheet props (shared between dashboard and editor)
  const sceneSheetProps = {
    language,
    synopsis: config.synopsis,
    characterNames: config.characters.map(c => c.name),
    tierContext: {
      charProfiles: config.characters.map(c => ({
        name: c.name, desire: c.desire, conflict: c.conflict,
        changeArc: c.changeArc, values: c.values,
      })),
      corePremise: config.corePremise,
      powerStructure: config.powerStructure,
      currentConflict: config.currentConflict,
    },
    initialDirection: config.sceneDirection ? {
      goguma: config.sceneDirection.goguma?.map((g, i) => ({ id: `r-${i}`, type: g.type as "goguma" | "cider", intensity: g.intensity as "small" | "medium" | "large", desc: g.desc, episode: g.episode || 1 })),
      hooks: config.sceneDirection.hooks?.map((h, i) => ({ id: `r-${i}`, position: h.position as "opening" | "middle" | "ending", hookType: h.hookType, desc: h.desc })),
      emotions: config.sceneDirection.emotionTargets?.map((e, i) => ({ id: `r-${i}`, position: e.position ?? i * 25, emotion: e.emotion, intensity: e.intensity })),
      dialogueRules: config.sceneDirection.dialogueTones?.map((d, i) => ({ id: `r-${i}`, character: d.character, tone: d.tone, notes: d.notes })),
      dopamines: config.sceneDirection.dopamineDevices?.map((dp, i) => ({ id: `r-${i}`, scale: dp.scale as "micro" | "medium" | "macro", device: dp.device, desc: dp.desc, resolved: dp.resolved ?? false })),
      cliffs: config.sceneDirection.cliffhanger ? [{ id: 'r-0', cliffType: config.sceneDirection.cliffhanger.cliffType, desc: config.sceneDirection.cliffhanger.desc, episode: config.sceneDirection.cliffhanger.episode || 1 }] : [],
      foreshadows: config.sceneDirection.foreshadows?.map((f, i) => ({ id: `r-${i}`, planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
      pacings: config.sceneDirection.pacings?.map((p, i) => ({ id: `r-${i}`, section: p.section, percent: p.percent, desc: p.desc })),
      tensionPoints: config.sceneDirection.tensionCurve?.map((t, i) => ({ id: `r-${i}`, position: t.position, level: t.level, label: t.label })),
      canons: config.sceneDirection.canonRules?.map((c, i) => ({ id: `r-${i}`, character: c.character, rule: c.rule })),
      transitions: config.sceneDirection.sceneTransitions?.map((t, i) => ({ id: `r-${i}`, fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
      writerNotes: config.sceneDirection.writerNotes,
      plotStructure: config.sceneDirection.plotStructure,
    } : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDirectionUpdate: (data: any) => {
      if (!currentSessionId) return;
      const d = data as { goguma: { type: string; intensity: string; desc: string; episode: number }[]; hooks: { position: string; hookType: string; desc: string }[]; emotions: { emotion: string; intensity: number; position: number }[]; dialogueRules: { character: string; tone: string; notes: string }[]; dopamines: { scale: string; device: string; desc: string; resolved: boolean }[]; cliffs: { cliffType: string; desc: string; episode: number }[]; foreshadows: { planted: string; payoff: string; episode: number; resolved: boolean }[]; pacings: { section: string; percent: number; desc: string }[]; tensionPoints: { position: number; level: number; label: string }[]; canons: { character: string; rule: string }[]; transitions: { fromScene: string; toScene: string; method: string }[]; writerNotes?: string; plotStructure?: string };
      updateCurrentSession({
        config: {
          ...(config || INITIAL_CONFIG),
          sceneDirection: {
            goguma: d.goguma.map(g => ({ type: g.type as 'goguma' | 'cider', intensity: g.intensity, desc: g.desc, episode: g.episode })),
            hooks: d.hooks.map(h => ({ position: h.position, hookType: h.hookType, desc: h.desc })),
            emotionTargets: d.emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity, position: e.position })),
            dialogueTones: d.dialogueRules.map(dr => ({ character: dr.character, tone: dr.tone, notes: dr.notes })),
            dopamineDevices: d.dopamines.map(dp => ({ scale: dp.scale, device: dp.device, desc: dp.desc, resolved: dp.resolved })),
            cliffhanger: d.cliffs.length > 0 ? { cliffType: d.cliffs[0].cliffType, desc: d.cliffs[0].desc, episode: d.cliffs[0].episode } : undefined,
            foreshadows: d.foreshadows.map(f => ({ planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
            pacings: d.pacings.map(p => ({ section: p.section, percent: p.percent, desc: p.desc })),
            tensionCurve: d.tensionPoints.map(tp => ({ position: tp.position, level: tp.level, label: tp.label })),
            canonRules: d.canons.map(c => ({ character: c.character, rule: c.rule })),
            sceneTransitions: d.transitions.map(tr => ({ fromScene: tr.fromScene, toScene: tr.toScene, method: tr.method })),
            writerNotes: d.writerNotes,
            plotStructure: d.plotStructure,
          },
        },
      });
    },
    onSimRefUpdate: (ref: Record<string, unknown>) => {
      if (!currentSessionId) return;
      updateCurrentSession({
        config: { ...(config || INITIAL_CONFIG), simulatorRef: { ...ref } },
      });
    },
  };

  // ============================================================
  // PART 3 — 대시보드 뷰
  // ============================================================
  if (viewMode === 'dashboard') {
    const sd = config.sceneDirection;
    const counts = {
      structure: (sd?.plotStructure ? 1 : 0) + (sd?.tensionCurve?.length || 0) + (sd?.pacings?.length || 0),
      scene: (sd?.goguma?.length || 0) + (sd?.hooks?.length || 0) + (sd?.cliffhanger ? 1 : 0) + (sd?.dopamineDevices?.length || 0) + (sd?.sceneTransitions?.length || 0),
      character: (sd?.emotionTargets?.length || 0) + (sd?.dialogueTones?.length || 0) + (sd?.canonRules?.length || 0),
      notes: (sd?.foreshadows?.length || 0) + (sd?.writerNotes ? 1 : 0),
    };

    return (
      <div className="max-w-3xl mx-auto py-10 px-4 md:py-16 md:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-text-primary mb-2">
            {isKO ? '설정집' : 'Rulebook'}
          </h2>
          <p className="text-sm text-text-secondary">
            {isKO
              ? '이야기의 뼈대를 설계합니다. 필요한 섹션만 편집하세요.'
              : 'Design the skeleton of your story. Edit only what you need.'}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map(card => {
            const Icon = card.icon;
            const count = counts[card.id as keyof typeof counts] || 0;
            return (
              <button
                key={card.id}
                onClick={() => setViewMode(`editor-${card.id}` as ViewMode)}
                className={`group text-left p-6 rounded-2xl border border-border/50 bg-bg-secondary/50 hover:border-${card.color}/40 hover:bg-bg-secondary hover-lift active:scale-[0.98]`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-${card.color}/10 border border-${card.color}/20 flex items-center justify-center text-${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {count > 0 && (
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-${card.color}/10 text-${card.color}`}>
                      {count}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-base font-bold text-text-primary mb-1">
                  {isKO ? card.ko : card.en}
                </h3>
                <p className="text-xs text-text-tertiary leading-relaxed">
                  {isKO ? card.descKo : card.descEn}
                </p>
              </button>
            );
          })}
        </div>

        {/* Quick action */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setViewMode('editor-all')}
            className="px-6 py-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-xs font-bold font-mono uppercase tracking-wider hover:bg-accent-amber/20 transition-all"
          >
            {isKO ? '전체 설정 편집기 열기' : 'Open Full Editor'}
          </button>
        </div>

        {/* Assistant */}
        <div className="mt-6">
          <TabAssistant tab="rulebook" language={language} config={config ?? null} hostedProviders={hostedProviders} />
        </div>
      </div>
    );
  }

  // ============================================================
  // PART 4 — 에디터 뷰 (SceneSheet)
  // ============================================================
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:py-8 md:px-6">
      {/* Back button */}
      <button
        onClick={() => setViewMode('dashboard')}
        className="flex items-center gap-2 mb-6 text-xs text-text-tertiary hover:text-text-primary transition-colors font-mono uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        {isKO ? '설정집 대시보드' : 'Rulebook Dashboard'}
      </button>

      <SceneSheet {...sceneSheetProps} initialTab={CARD_INITIAL_TABS[viewMode] || 'goguma'} />

      <div className="flex justify-end mt-4">
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
    </div>
  );
};

export default RulebookTab;
