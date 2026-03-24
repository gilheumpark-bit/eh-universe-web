import React from 'react';
import dynamic from 'next/dynamic';
import { AppLanguage, StoryConfig } from '@/lib/studio-types';
import TabAssistant from '@/components/studio/TabAssistant';
import { createT } from '@/lib/i18n';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';

const SceneSheet = dynamic(() => import('@/components/studio/SceneSheet'), { 
  ssr: false, 
  loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Scene Sheet...</div> 
});

interface RulebookTabProps {
  language: AppLanguage;
  config: StoryConfig;
  updateCurrentSession: (data: Partial<{ config: StoryConfig }>) => void;
  triggerSave: () => void;
  saveFlash: boolean;
  currentSessionId: string | null;
}

const RulebookTab: React.FC<RulebookTabProps> = ({
  language,
  config,
  updateCurrentSession,
  triggerSave,
  saveFlash,
  currentSessionId
}) => {
  const t = createT(language);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
      <SceneSheet
        language={language}
        synopsis={config.synopsis}
        characterNames={config.characters.map(c => c.name)}
        tierContext={{
          charProfiles: config.characters.map(c => ({
            name: c.name, desire: c.desire, conflict: c.conflict,
            changeArc: c.changeArc, values: c.values,
          })),
          corePremise: config.corePremise,
          powerStructure: config.powerStructure,
          currentConflict: config.currentConflict,
        }}
        initialDirection={config.sceneDirection ? {
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
        } : undefined}
        onDirectionUpdate={(data) => {
          if (!currentSessionId) return;
          updateCurrentSession({
            config: {
              ...(config || INITIAL_CONFIG),
              sceneDirection: {
                goguma: data.goguma.map(g => ({ type: g.type, intensity: g.intensity, desc: g.desc, episode: g.episode })),
                hooks: data.hooks.map(h => ({ position: h.position, hookType: h.hookType, desc: h.desc })),
                emotionTargets: data.emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity, position: e.position })),
                dialogueTones: data.dialogueRules.map(d => ({ character: d.character, tone: d.tone, notes: d.notes })),
                dopamineDevices: data.dopamines.map(dp => ({ scale: dp.scale, device: dp.device, desc: dp.desc, resolved: dp.resolved })),
                cliffhanger: data.cliffs.length > 0 ? { cliffType: data.cliffs[0].cliffType, desc: data.cliffs[0].desc, episode: data.cliffs[0].episode } : undefined,
                foreshadows: data.foreshadows.map(f => ({ planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
                pacings: data.pacings.map(p => ({ section: p.section, percent: p.percent, desc: p.desc })),
                tensionCurve: data.tensionPoints.map(t => ({ position: t.position, level: t.level, label: t.label })),
                canonRules: data.canons.map(c => ({ character: c.character, rule: c.rule })),
                sceneTransitions: data.transitions.map(t => ({ fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
                writerNotes: data.writerNotes,
                plotStructure: data.plotStructure,
              },
            },
          });
        }}
        onSimRefUpdate={(ref) => {
          if (!currentSessionId) return;
          updateCurrentSession({
            config: {
              ...(config || INITIAL_CONFIG),
              simulatorRef: { ...ref },
            },
          });
        }}
      />
      <div className="mt-4">
        <TabAssistant tab="rulebook" language={language} config={config ?? null} />
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
          💾 {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
        </button>
      </div>
    </div>
  );
};

export default RulebookTab;
