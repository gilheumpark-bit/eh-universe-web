// ============================================================
// PART 0 — IMPORTS & TYPES
// ============================================================
import React, { useState } from 'react';
import type { AppLanguage, StoryConfig, Character } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import {
  Target, Sliders, BookOpen, Lock, FileOutput,
  ChevronDown, ChevronUp, Check, Zap,
} from 'lucide-react';

// ============================================================
// PART 1 — ADVANCED WRITING SETTINGS TYPE
// ============================================================

export interface AdvancedWritingSettings {
  sceneGoals: string[];
  constraints: {
    pov: '1st' | '3rd-limited' | '3rd-omni';
    dialogueRatio: number;   // 0~100
    tempo: 'fast' | 'stable' | 'slow';
    sentenceLen: 'short' | 'normal' | 'long';
    emotionExposure: 'restrained' | 'normal' | 'intense';
  };
  references: {
    prevEpisodes: number;    // 0~25
    characterCards: boolean;
    worldSetting: boolean;
    styleProfile: boolean;
    sceneSheet: boolean;
    platformPreset: boolean;
  };
  locks: {
    speechStyle: boolean;
    worldRules: boolean;
    charRelations: boolean;
    bannedWords: boolean;
  };
  outputMode: 'draft' | 'expand' | 'rewrite' | 'dialogue-boost' | 'description-boost' | 'ending-hook' | 'bridge';
  includes: string;
  excludes: string;
}

const DEFAULT_SETTINGS: AdvancedWritingSettings = {
  sceneGoals: [],
  constraints: {
    pov: '3rd-limited',
    dialogueRatio: 50,
    tempo: 'stable',
    sentenceLen: 'normal',
    emotionExposure: 'normal',
  },
  references: {
    prevEpisodes: 3,
    characterCards: true,
    worldSetting: true,
    styleProfile: false,
    sceneSheet: true,
    platformPreset: false,
  },
  locks: {
    speechStyle: true,
    worldRules: true,
    charRelations: false,
    bannedWords: false,
  },
  outputMode: 'draft',
  includes: '',
  excludes: '',
};

interface AdvancedWritingPanelProps {
  language: AppLanguage;
  config: StoryConfig;
  settings: AdvancedWritingSettings;
  onSettingsChange: (s: AdvancedWritingSettings) => void;
}

// ============================================================
// PART 2 — SCENE GOAL OPTIONS
// ============================================================

const SCENE_GOALS: { key: string; tKey: string }[] = [
  { key: 'conflict', tKey: 'advancedWritingExtra.goalConflict' },
  { key: 'reveal', tKey: 'advancedWritingExtra.goalReveal' },
  { key: 'emotion-turn', tKey: 'advancedWritingExtra.goalEmotionTurn' },
  { key: 'cliffhanger', tKey: 'advancedWritingExtra.goalCliffhanger' },
  { key: 'relationship', tKey: 'advancedWritingExtra.goalRelationship' },
  { key: 'world-expand', tKey: 'advancedWritingExtra.goalWorldExpand' },
  { key: 'foreshadow', tKey: 'advancedWritingExtra.goalForeshadow' },
  { key: 'payoff', tKey: 'advancedWritingExtra.goalPayoff' },
  { key: 'action', tKey: 'advancedWritingExtra.goalAction' },
  { key: 'calm', tKey: 'advancedWritingExtra.goalCalm' },
];

// ============================================================
// PART 2.5 — SITUATION PRESETS
// ============================================================

interface SituationPreset {
  id: string;
  emoji: string;
  label: { ko: string; en: string; ja?: string; zh?: string };
  desc: { ko: string; en: string; ja?: string; zh?: string };
  dialogueRatio: number;
  tempo: 'fast' | 'stable' | 'slow';
  sentenceLen: 'short' | 'normal' | 'long';
  emotionExposure: 'restrained' | 'normal' | 'intense';
  sceneGoals: string[];
}

const SITUATION_PRESETS: SituationPreset[] = [
  {
    id: 'battle',
    emoji: '\u2694\uFE0F',
    label: { ko: '\uC804\uD22C\uC528', en: 'Battle', ja: '\u6226\u95D8\u30B7\u30FC\u30F3', zh: '\u6218\u6597' },
    desc: {
      ko: '\uB192\uC740 \uC561\uC158, \uB0AE\uC740 \uB300\uD654, \uBE60\uB978 \uD15C\uD3EC',
      en: 'High action, low dialogue, fast tempo',
      ja: '\u9AD8\u30A2\u30AF\u30B7\u30E7\u30F3\u3001\u4F4E\u4F1A\u8A71\u3001\u901F\u3044\u30C6\u30F3\u30DD',
      zh: '\u9AD8\u52A8\u4F5C\u3001\u4F4E\u5BF9\u8BDD\u3001\u5FEB\u8282\u594F',
    },
    dialogueRatio: 20,
    tempo: 'fast',
    sentenceLen: 'short',
    emotionExposure: 'intense',
    sceneGoals: ['action', 'conflict'],
  },
  {
    id: 'daily',
    emoji: '\u2615',
    label: { ko: '\uC77C\uC0C1\uC528', en: 'Daily', ja: '\u65E5\u5E38\u30B7\u30FC\u30F3', zh: '\u65E5\u5E38' },
    desc: {
      ko: '\uB0AE\uC740 \uAE34\uC7A5\uAC10, \uB192\uC740 \uB300\uD654, \uC794\uC794\uD55C \uD15C\uD3EC',
      en: 'Low tension, high dialogue, calm pacing',
      ja: '\u4F4E\u7DCA\u5F35\u3001\u9AD8\u4F1A\u8A71\u3001\u843D\u3061\u7740\u3044\u305F\u30DA\u30FC\u30B9',
      zh: '\u4F4E\u7D27\u5F20\u3001\u9AD8\u5BF9\u8BDD\u3001\u5E73\u9759\u8282\u594F',
    },
    dialogueRatio: 70,
    tempo: 'slow',
    sentenceLen: 'normal',
    emotionExposure: 'restrained',
    sceneGoals: ['calm', 'relationship'],
  },
  {
    id: 'confession',
    emoji: '\uD83D\uDC97',
    label: { ko: '\uACE0\uBC31\uC528', en: 'Confession', ja: '\u544A\u767D\u30B7\u30FC\u30F3', zh: '\u544A\u767D' },
    desc: {
      ko: '\uB192\uC740 \uAC10\uC815, \uC911\uAC04 \uB300\uD654, \uCE5C\uBC00\uD55C \uBD84\uC704\uAE30',
      en: 'High emotion, medium dialogue, intimate',
      ja: '\u9AD8\u611F\u60C5\u3001\u4E2D\u7A0B\u5EA6\u306E\u4F1A\u8A71\u3001\u89AA\u5BC6',
      zh: '\u9AD8\u60C5\u611F\u3001\u4E2D\u7B49\u5BF9\u8BDD\u3001\u4EB2\u5BC6',
    },
    dialogueRatio: 50,
    tempo: 'slow',
    sentenceLen: 'long',
    emotionExposure: 'intense',
    sceneGoals: ['emotion-turn', 'relationship'],
  },
  {
    id: 'chase',
    emoji: '\uD83C\uDFC3',
    label: { ko: '\uCD94\uACA9\uC528', en: 'Chase', ja: '\u8FFD\u8DE1\u30B7\u30FC\u30F3', zh: '\u8FFD\u51FB' },
    desc: {
      ko: '\uB192\uC740 \uAE34\uC7A5\uAC10, \uC9E7\uC740 \uBB38\uC7A5, \uBE60\uB978 \uD15C\uD3EC',
      en: 'High tension, short sentences, fast',
      ja: '\u9AD8\u7DCA\u5F35\u3001\u77ED\u6587\u3001\u901F\u3044',
      zh: '\u9AD8\u7D27\u5F20\u3001\u77ED\u53E5\u3001\u5FEB\u901F',
    },
    dialogueRatio: 15,
    tempo: 'fast',
    sentenceLen: 'short',
    emotionExposure: 'intense',
    sceneGoals: ['action', 'cliffhanger'],
  },
  {
    id: 'dialogue',
    emoji: '\uD83D\uDCAC',
    label: { ko: '\uB300\uD654\uC528', en: 'Dialogue', ja: '\u4F1A\u8A71\u30B7\u30FC\u30F3', zh: '\u5BF9\u8BDD' },
    desc: {
      ko: '70%+ \uB300\uD654 \uBE44\uC728, \uBCF4\uD1B5 \uD15C\uD3EC',
      en: '70%+ dialogue ratio, normal tempo',
      ja: '70%+\u4F1A\u8A71\u7387\u3001\u666E\u901A\u306E\u30C6\u30F3\u30DD',
      zh: '70%+\u5BF9\u8BDD\u6BD4\u4F8B\u3001\u6B63\u5E38\u8282\u594F',
    },
    dialogueRatio: 75,
    tempo: 'stable',
    sentenceLen: 'normal',
    emotionExposure: 'normal',
    sceneGoals: ['reveal', 'relationship'],
  },
];

const OUTPUT_MODES: { key: AdvancedWritingSettings['outputMode']; tKey: string }[] = [
  { key: 'draft', tKey: 'advancedWritingExtra.modeDraft' },
  { key: 'expand', tKey: 'advancedWritingExtra.modeExpand' },
  { key: 'rewrite', tKey: 'advancedWritingExtra.modeRewrite' },
  { key: 'dialogue-boost', tKey: 'advancedWritingExtra.modeDialogueBoost' },
  { key: 'description-boost', tKey: 'advancedWritingExtra.modeDescriptionBoost' },
  { key: 'ending-hook', tKey: 'advancedWritingExtra.modeEndingHook' },
  { key: 'bridge', tKey: 'advancedWritingExtra.modeBridge' },
];

// ============================================================
// PART 3 — COLLAPSIBLE SECTION
// ============================================================

const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-bg-secondary hover:bg-bg-secondary/80 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-accent-purple" />
        <span className="text-[10px] font-bold uppercase tracking-wider flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="w-3 h-3 text-text-tertiary" /> : <ChevronDown className="w-3 h-3 text-text-tertiary" />}
      </button>
      {open && <div className="px-3 py-2.5 space-y-2">{children}</div>}
    </div>
  );
};

// ============================================================
// PART 4 — CONTEXT SUMMARY (좌측 설정 요약)
// ============================================================

const ContextSummary: React.FC<{ config: StoryConfig; language: AppLanguage }> = ({ config, language }) => {
  const t = createT(language);
  const chars = config.characters ?? [];
  const hasWorld = !!(config.setting || config.synopsis);
  const hasScene = !!(config.sceneDirection);
  const hasStyle = !!(config.styleProfile);

  return (
    <div className="bg-bg-secondary/30 border border-border rounded-lg px-3 py-2 space-y-1.5">
      <span className="text-[9px] font-bold text-accent-purple uppercase tracking-wider">
        {t('advancedWriting.activeContext')}
      </span>

      <div className="flex flex-wrap gap-1">
        {hasWorld && (
          <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-bold">
            🌍 {t('advancedWriting.world')}
          </span>
        )}
        {hasScene && (
          <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400 font-bold">
            🎬 {t('advancedWriting.scene')}
          </span>
        )}
        {chars.length > 0 && (
          <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] text-purple-400 font-bold">
            👥 {chars.length}{t('advancedWriting.chars')}
          </span>
        )}
        {hasStyle && (
          <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400 font-bold">
            ✍️ {t('advancedWriting.style')}
          </span>
        )}
        <span className="px-1.5 py-0.5 bg-zinc-500/10 border border-zinc-500/20 rounded text-[10px] text-text-tertiary font-bold">
          {config.genre} · EP.{config.episode}
        </span>
      </div>

      {/* 캐릭터 미니 리스트 */}
      {chars.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {chars.slice(0, 6).map((c: Character) => (
            <span key={c.id} className="text-[10px] text-text-tertiary">
              {c.name}({c.role?.slice(0, 4)})
            </span>
          ))}
          {chars.length > 6 && <span className="text-[10px] text-text-tertiary">+{chars.length - 6}</span>}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PART 5 — MAIN COMPONENT
// ============================================================

const AdvancedWritingPanel: React.FC<AdvancedWritingPanelProps> = ({
  language, config, settings, onSettingsChange,
}) => {
  const t = createT(language);
  const s = settings;

  const update = <K extends keyof AdvancedWritingSettings>(
    key: K, value: AdvancedWritingSettings[K]
  ) => onSettingsChange({ ...s, [key]: value });

  const updateConstraint = <K extends keyof AdvancedWritingSettings['constraints']>(
    key: K, value: AdvancedWritingSettings['constraints'][K]
  ) => update('constraints', { ...s.constraints, [key]: value });

  const updateRef = <K extends keyof AdvancedWritingSettings['references']>(
    key: K, value: AdvancedWritingSettings['references'][K]
  ) => update('references', { ...s.references, [key]: value });

  const updateLock = <K extends keyof AdvancedWritingSettings['locks']>(
    key: K, value: AdvancedWritingSettings['locks'][K]
  ) => update('locks', { ...s.locks, [key]: value });

  const toggleGoal = (key: string) => {
    const next = s.sceneGoals.includes(key)
      ? s.sceneGoals.filter(g => g !== key)
      : [...s.sceneGoals, key];
    update('sceneGoals', next);
  };

  const applyPreset = (preset: SituationPreset) => {
    onSettingsChange({
      ...s,
      constraints: {
        ...s.constraints,
        dialogueRatio: preset.dialogueRatio,
        tempo: preset.tempo,
        sentenceLen: preset.sentenceLen,
        emotionExposure: preset.emotionExposure,
      },
      sceneGoals: preset.sceneGoals,
    });
  };

  return (
    <div className="space-y-3">
      {/* Context summary */}
      <ContextSummary config={config} language={language} />

      {/* Situation presets */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary">
          <Zap className="w-3.5 h-3.5 text-accent-amber" />
          <span className="text-[10px] font-bold uppercase tracking-wider flex-1">
            {L4(language, { ko: '상황 프리셋', en: 'Scene Presets', ja: 'シーンプリセット', zh: '场景预设' })}
          </span>
        </div>
        <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
          {SITUATION_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-bg-primary border border-border hover:border-accent-amber/40 hover:bg-accent-amber/5 transition-colors group"
              title={L4(language, p.desc)}
            >
              <span>{p.emoji}</span>
              <span className="text-text-secondary group-hover:text-text-primary transition-colors">{L4(language, p.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. 장면 목표 */}
      <Section title={t('advancedWriting.sceneGoal')} icon={Target}>
        <div className="flex flex-wrap gap-1.5">
          {SCENE_GOALS.map(g => (
            <button
              key={g.key}
              onClick={() => toggleGoal(g.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
                s.sceneGoals.includes(g.key)
                  ? 'bg-accent-purple text-white'
                  : 'bg-bg-primary text-text-tertiary hover:text-text-primary border border-border'
              }`}
            >
              {t(g.tKey)}
            </button>
          ))}
        </div>
      </Section>

      {/* 2. 서술 제약 */}
      <Section title={t('advancedWriting.narrativeConstraints')} icon={Sliders}>
        {/* POV */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary w-14">{t('advancedWriting.pov')}</span>
          <div className="flex gap-1">
            {([
              { v: '1st' as const, tKey: 'advancedWritingExtra.pov1st' },
              { v: '3rd-limited' as const, tKey: 'advancedWritingExtra.pov3rdLimited' },
              { v: '3rd-omni' as const, tKey: 'advancedWritingExtra.pov3rdOmni' },
            ]).map(p => (
              <button key={p.v} onClick={() => updateConstraint('pov', p.v)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${s.constraints.pov === p.v ? 'bg-accent-purple text-white' : 'bg-bg-primary text-text-tertiary border border-border'}`}>
                {t(p.tKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Dialogue ratio slider */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary w-14">{t('advancedWriting.dialogue')}</span>
          <input type="range" min={10} max={90} value={s.constraints.dialogueRatio}
            onChange={e => updateConstraint('dialogueRatio', Number(e.target.value))}
            className="flex-1 h-1 accent-accent-purple" />
          <span className="text-[9px] text-text-tertiary w-8 text-right">{s.constraints.dialogueRatio}%</span>
        </div>

        {/* Tempo */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary w-14">{t('advancedWriting.tempo')}</span>
          <div className="flex gap-1">
            {([
              { v: 'fast' as const, tKey: 'advancedWritingExtra.tempoFast' },
              { v: 'stable' as const, tKey: 'advancedWritingExtra.tempoStable' },
              { v: 'slow' as const, tKey: 'advancedWritingExtra.tempoSlow' },
            ]).map(ti => (
              <button key={ti.v} onClick={() => updateConstraint('tempo', ti.v)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${s.constraints.tempo === ti.v ? 'bg-accent-purple text-white' : 'bg-bg-primary text-text-tertiary border border-border'}`}>
                {t(ti.tKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Sentence length */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary w-14">{t('advancedWriting.sentenceLen')}</span>
          <div className="flex gap-1">
            {([
              { v: 'short' as const, tKey: 'advancedWritingExtra.sentenceShort' },
              { v: 'normal' as const, tKey: 'advancedWritingExtra.sentenceNormal' },
              { v: 'long' as const, tKey: 'advancedWritingExtra.sentenceLong' },
            ]).map(sl => (
              <button key={sl.v} onClick={() => updateConstraint('sentenceLen', sl.v)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${s.constraints.sentenceLen === sl.v ? 'bg-accent-purple text-white' : 'bg-bg-primary text-text-tertiary border border-border'}`}>
                {t(sl.tKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Emotion exposure */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary w-14">{t('advancedWriting.emotion')}</span>
          <div className="flex gap-1">
            {([
              { v: 'restrained' as const, tKey: 'advancedWritingExtra.emotionRestrained' },
              { v: 'normal' as const, tKey: 'advancedWritingExtra.emotionNormal' },
              { v: 'intense' as const, tKey: 'advancedWritingExtra.emotionIntense' },
            ]).map(em => (
              <button key={em.v} onClick={() => updateConstraint('emotionExposure', em.v)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${s.constraints.emotionExposure === em.v ? 'bg-accent-purple text-white' : 'bg-bg-primary text-text-tertiary border border-border'}`}>
                {t(em.tKey)}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* 3. 참조 범위 */}
      <Section title={t('advancedWriting.referenceScope')} icon={BookOpen}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] text-text-tertiary">{t('advancedWriting.prevEpisodes')}</span>
          <input type="range" min={0} max={25} value={s.references.prevEpisodes}
            onChange={e => updateRef('prevEpisodes', Number(e.target.value))}
            className="flex-1 h-1 accent-accent-purple" />
          <span className="text-[9px] text-text-tertiary w-8 text-right">{s.references.prevEpisodes}{t('advancedWriting.ep')}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'characterCards' as const, tKey: 'advancedWritingExtra.refCharacterCards' },
            { key: 'worldSetting' as const, tKey: 'advancedWritingExtra.refWorldSetting' },
            { key: 'styleProfile' as const, tKey: 'advancedWritingExtra.refStyleProfile' },
            { key: 'sceneSheet' as const, tKey: 'advancedWritingExtra.refSceneSheet' },
            { key: 'platformPreset' as const, tKey: 'advancedWritingExtra.refPlatformPreset' },
          ]).map(r => (
            <button key={r.key} onClick={() => updateRef(r.key, !s.references[r.key])}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
                s.references[r.key]
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-bg-primary text-text-tertiary border border-border'
              }`}>
              {s.references[r.key] && <Check className="w-2.5 h-2.5" />}
              {t(r.tKey)}
            </button>
          ))}
        </div>
      </Section>

      {/* 4. 설정 잠금 */}
      <Section title={t('advancedWriting.settingLocks')} icon={Lock} defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'speechStyle' as const, tKey: 'advancedWritingExtra.lockSpeechStyle' },
            { key: 'worldRules' as const, tKey: 'advancedWritingExtra.lockWorldRules' },
            { key: 'charRelations' as const, tKey: 'advancedWritingExtra.lockCharRelations' },
            { key: 'bannedWords' as const, tKey: 'advancedWritingExtra.lockBannedWords' },
          ]).map(lk => (
            <button key={lk.key} onClick={() => updateLock(lk.key, !s.locks[lk.key])}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
                s.locks[lk.key]
                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                  : 'bg-bg-primary text-text-tertiary border border-border'
              }`}>
              {s.locks[lk.key] ? '🔒' : '🔓'} {t(lk.tKey)}
            </button>
          ))}
        </div>
      </Section>

      {/* 5. 출력 방식 */}
      <Section title={t('advancedWriting.outputMode')} icon={FileOutput}>
        <div className="flex flex-wrap gap-1.5">
          {OUTPUT_MODES.map(m => (
            <button key={m.key} onClick={() => update('outputMode', m.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
                s.outputMode === m.key
                  ? 'bg-accent-purple text-white'
                  : 'bg-bg-primary text-text-tertiary border border-border hover:text-text-primary'
              }`}>
              {t(m.tKey)}
            </button>
          ))}
        </div>
      </Section>

      {/* 6. 포함/제외 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[9px] text-emerald-400 font-bold">{t('advancedWriting.mustInclude')}</span>
          <textarea
            value={s.includes}
            onChange={e => update('includes', e.target.value)}
            placeholder={t('advancedWriting.includePlaceholder')}
            rows={2}
            className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-[10px] resize-none"
          />
        </div>
        <div>
          <span className="text-[9px] text-red-400 font-bold">{t('advancedWriting.exclude')}</span>
          <textarea
            value={s.excludes}
            onChange={e => update('excludes', e.target.value)}
            placeholder={t('advancedWriting.excludePlaceholder')}
            rows={2}
            className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-[10px] resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export { DEFAULT_SETTINGS };
export default AdvancedWritingPanel;
