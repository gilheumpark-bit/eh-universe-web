
import React, { useState } from 'react';
import { StoryConfig, Genre, AppLanguage, PlatformType, PublishPlatform } from '@/lib/studio-types';
import { PLATFORM_PRESETS, PLATFORM_BY_LANG } from '@/engine/types';
import { TRANSLATIONS, GENRE_LABELS } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import { validateWorld, calcCompletionScore, WarningBadge, CompletionBar } from './TierValidator';
import { Sparkles, BarChart3, Monitor, Smartphone, Shuffle, Bot, Loader2, ChevronDown, ChevronUp, Share2, Check, Shield, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateTensionCurveData } from '@/engine/models';
import { generateWorldDesign } from '@/services/geminiService';
import { getApiKey, getActiveProvider } from '@/lib/ai-providers';
import { SUB_GENRE_SUGGESTIONS, AUTO_PRESETS } from '@/lib/planning-presets';

function SubGenreTagInput({ genre, subGenres, onChange, language, usePrompt, onTogglePrompt }: {
  genre: Genre;
  subGenres: string[];
  onChange: (tags: string[]) => void;
  language: AppLanguage;
  usePrompt: boolean;
  onTogglePrompt: (val: boolean) => void;
}) {
  const [input, setInput] = React.useState('');
  const suggestions = SUB_GENRE_SUGGESTIONS[genre] || [];
  const isKO = language === 'KO';

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !subGenres.includes(trimmed) && subGenres.length < 8) {
      onChange([...subGenres, trimmed]);
    }
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
          {isKO ? '서브 장르 태그' : 'Sub-genre Tags'}
        </label>
        {subGenres.length > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={usePrompt}
              onChange={e => onTogglePrompt(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-blue-600"
            />
            <span className="text-[10px] text-zinc-500">{isKO ? 'AI 프롬프트에 반영' : 'Apply to AI prompt'}</span>
          </label>
        )}
      </div>
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {subGenres.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full text-[11px] font-bold text-blue-400">
            #{tag}
            <button onClick={() => onChange(subGenres.filter(t => t !== tag))} className="text-blue-400/50 hover:text-blue-300 text-xs">&times;</button>
          </span>
        ))}
        {subGenres.length === 0 && (
          <span className="text-[11px] text-zinc-600 italic">{isKO ? '태그를 추가하면 AI 프롬프트에 반영됩니다' : 'Tags will be injected into AI prompts'}</span>
        )}
      </div>
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(input); } }}
          placeholder={isKO ? '태그 입력 후 Enter' : 'Type tag + Enter'}
          className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-600 transition-colors"
          maxLength={20}
        />
      </div>
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.filter(s => !subGenres.includes(s)).map(s => (
            <button
              key={s}
              onClick={() => addTag(s)}
              className="px-2 py-0.5 text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full hover:border-blue-500/30 hover:text-blue-400 transition-colors"
            >
              +{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PlanningViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
  startLabel?: string;
  hasAiAccess?: boolean;
}

// ============================================================
// PART 2 — MAIN COMPONENT
// Sections: Basic Config → Sub-genres → Episodes/Platform → Intensity →
//           Publish Platform → World Tier (1/2/3) → Tension Curve →
//           Guardrails → PRISM → PRISM-MODE → Actions
// ============================================================

const PlanningView: React.FC<PlanningViewProps> = ({ language, config, setConfig, onStart, startLabel, hasAiAccess }) => {
  const tl = createT(language);
  const t = TRANSLATIONS[language].planning;
  const te = TRANSLATIONS[language].engine;
  const isKO = language === 'KO';

  const totalEpisodes = config.totalEpisodes ?? 25;
  const tensionData = generateTensionCurveData(totalEpisodes, config.genre);
  const [autoGenGenre, setAutoGenGenre] = useState<Genre>(config.genre);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showWorldTier2, setShowWorldTier2] = useState(false);
  const [showWorldTier3, setShowWorldTier3] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('noa_planning_advanced') === 'true';
    return false;
  });
  const router = useRouter();

  const handleAIGenerate = async () => {
    // hosted provider가 있으면 로컬 키 없이도 사용 가능
    if (!getApiKey(getActiveProvider()) && !hasAiAccess) {
      alert(tl('planningExtra.apiKeyAlert'));
      return;
    }
    setAiGenerating(true);
    try {
      // 사용자가 입력한 값을 힌트로 전달
      const hints = {
        title: config.title || undefined,
        povCharacter: config.povCharacter || undefined,
        setting: config.setting || undefined,
        primaryEmotion: config.primaryEmotion || undefined,
        synopsis: config.synopsis || undefined,
      };
      const result = await generateWorldDesign(autoGenGenre, language, hints);
      setConfig((prev: StoryConfig) => ({
        ...prev,
        title: result.title || prev.title,
        genre: autoGenGenre,
        povCharacter: result.povCharacter || prev.povCharacter,
        setting: result.setting || prev.setting,
        primaryEmotion: result.primaryEmotion || prev.primaryEmotion,
        synopsis: result.synopsis || prev.synopsis,
        // Tier 1
        corePremise: result.corePremise || prev.corePremise,
        powerStructure: result.powerStructure || prev.powerStructure,
        currentConflict: result.currentConflict || prev.currentConflict,
        // Tier 2
        worldHistory: result.worldHistory || prev.worldHistory,
        socialSystem: result.socialSystem || prev.socialSystem,
        economy: result.economy || prev.economy,
        magicTechSystem: result.magicTechSystem || prev.magicTechSystem,
        factionRelations: result.factionRelations || prev.factionRelations,
        survivalEnvironment: result.survivalEnvironment || prev.survivalEnvironment,
        // Tier 3
        culture: result.culture || prev.culture,
        religion: result.religion || prev.religion,
        education: result.education || prev.education,
        lawOrder: result.lawOrder || prev.lawOrder,
        taboo: result.taboo || prev.taboo,
        dailyLife: result.dailyLife || prev.dailyLife,
        travelComm: result.travelComm || prev.travelComm,
        truthVsBeliefs: result.truthVsBeliefs || prev.truthVsBeliefs,
        totalEpisodes: 25,
        guardrails: { min: 4000, max: 6000 },
      }));
    } catch {
      alert(tl('planningExtra.aiFailed'));
    } finally {
      setAiGenerating(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for demo/dev injection
  const injectDemoData = () => {
    const presets = AUTO_PRESETS[autoGenGenre];
    if (!presets || presets.length === 0) return;
    const preset = presets[Math.floor(Math.random() * presets.length)];
    const data = isKO ? preset.ko : preset.en;
    setConfig((prev: StoryConfig) => ({
      ...prev,
      title: data.title,
      genre: autoGenGenre,
      povCharacter: data.pov,
      setting: data.setting,
      primaryEmotion: data.emotion,
      totalEpisodes: 25,
      synopsis: data.synopsis,
      guardrails: { min: 4000, max: 6000 }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-12 animate-in fade-in duration-700 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t.title}</h2>
          <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={autoGenGenre} onChange={e => setAutoGenGenre(e.target.value as Genre)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-black text-zinc-400 outline-none cursor-pointer uppercase">
            {Object.values(Genre).map(g => (
              <option key={g} value={g}>{GENRE_LABELS[language][g]}</option>
            ))}
          </select>
          <div className="relative">
            <button onClick={() => setShowPresetMenu(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95">
              <Shuffle className="w-3.5 h-3.5" /> {tl('planningExtra.preset')}
            </button>
            {showPresetMenu && (
              <div className="absolute top-full mt-1 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 min-w-[240px] max-h-[320px] overflow-y-auto">
                {(AUTO_PRESETS[autoGenGenre] || []).map((preset, i) => {
                  const data = isKO ? preset.ko : preset.en;
                  return (
                    <button key={i} onClick={() => {
                      setConfig((prev: StoryConfig) => ({
                        ...prev, title: data.title, genre: autoGenGenre, povCharacter: data.pov,
                        setting: data.setting, primaryEmotion: data.emotion, totalEpisodes: 25,
                        synopsis: data.synopsis, guardrails: { min: 4000, max: 6000 },
                      }));
                      setShowPresetMenu(false);
                    }}
                      className="w-full text-left px-4 py-3 text-[11px] text-zinc-400 hover:bg-blue-600/20 hover:text-white transition-colors border-b border-zinc-800 last:border-0">
                      <div className="font-bold text-zinc-200">{data.title}</div>
                      <div className="text-[9px] mt-0.5 opacity-70">{data.pov} · {data.emotion}</div>
                    </button>
                  );
                })}
                {(!AUTO_PRESETS[autoGenGenre] || AUTO_PRESETS[autoGenGenre].length === 0) && (
                  <div className="px-4 py-3 text-[11px] text-zinc-500">{tl('planningExtra.noPreset')}</div>
                )}
              </div>
            )}
          </div>
          <button onClick={handleAIGenerate} disabled={aiGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all active:scale-95 disabled:opacity-50">
            {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            {aiGenerating ? tl('planningExtra.aiGenerating') : tl('planningExtra.aiGenerate')}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.projectTitle}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              aria-label={t.projectTitle}
              maxLength={200}
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.primaryGenre}</label>
            <select
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none cursor-pointer"
              aria-label={t.primaryGenre}
              value={config.genre}
              onChange={e => setConfig({ ...config, genre: e.target.value as Genre })}
            >
              {Object.values(Genre).map(g => (
                <option key={g} value={g}>{GENRE_LABELS[language][g]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 간단/고급 모드 토글 */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              const next = !advancedMode;
              setAdvancedMode(next);
              localStorage.setItem('noa_planning_advanced', String(next));
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
              advancedMode
                ? 'border-blue-500/30 bg-blue-600/10 text-blue-400'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {advancedMode
              ? (isKO ? '⚙ 고급 모드' : '⚙ Advanced')
              : (isKO ? '✦ 간단 모드' : '✦ Simple')}
          </button>
        </div>

        {/* Sub-genre tags */}
        {advancedMode && <SubGenreTagInput
          genre={config.genre}
          subGenres={config.subGenres || []}
          onChange={(tags) => setConfig({ ...config, subGenres: tags })}
          language={language}
          usePrompt={config.useSubGenrePrompt ?? false}
          onTogglePrompt={(val) => setConfig({ ...config, useSubGenrePrompt: val })}
        />}

        {/* New: Total Episodes + Platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{te.totalEpisodes}</label>
            <input
              type="number"
              className={`w-full bg-black border rounded-xl p-4 text-sm font-bold outline-none transition-all ${
                totalEpisodes < 1 || totalEpisodes > 500
                  ? 'border-red-500/60 focus:border-red-500 text-red-400'
                  : 'border-zinc-800 focus:border-blue-600'
              }`}
              value={totalEpisodes}
              onChange={e => {
                const raw = parseInt(e.target.value);
                const clamped = isNaN(raw) ? 25 : Math.max(1, Math.min(500, raw));
                setConfig({ ...config, totalEpisodes: clamped });
              }}
            />
            {(totalEpisodes < 1 || totalEpisodes > 500) && (
              <p className="text-[10px] font-bold text-red-400 px-1">
                {totalEpisodes < 1
                  ? (language === 'KO' ? '에피소드 수는 1 이상이어야 합니다.' : 'Episode count must be at least 1.')
                  : (language === 'KO' ? '500화 초과는 시스템 부하를 유발할 수 있습니다.' : 'Over 500 episodes may cause performance issues.')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{te.platform}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setConfig({ ...config, platform: PlatformType.MOBILE })}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  config.platform === PlatformType.MOBILE
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <Smartphone className="w-4 h-4" /> {te.mobile}
              </button>
              <button
                onClick={() => setConfig({ ...config, platform: PlatformType.WEB })}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  config.platform === PlatformType.WEB
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <Monitor className="w-4 h-4" /> {te.web}
              </button>
            </div>
          </div>
        </div>

        {/* === 고급 모드 전용 섹션 === */}
        <div className={advancedMode ? 'space-y-8' : 'hidden'}>

        {/* 서사 강도 (EH Engine Narrative Intensity) */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
            {language === 'KO' ? '서사 강도' : 'Narrative Intensity'}
          </label>
          <div className="flex gap-3">
            {([
              { value: 'iron' as const, label: language === 'KO' ? '강 (Iron)' : 'Iron', activeClass: 'bg-red-600/10 border-red-500/30 text-red-400', desc: language === 'KO' ? '인과 필수, 모든 경고 표시' : 'Strict causality, all warnings' },
              { value: 'standard' as const, label: language === 'KO' ? '중 (Standard)' : 'Standard', activeClass: 'bg-blue-600/10 border-blue-500/30 text-blue-400', desc: language === 'KO' ? '주요 경고만 표시' : 'Major warnings only' },
              { value: 'soft' as const, label: language === 'KO' ? '약 (Soft)' : 'Soft', activeClass: 'bg-zinc-600/10 border-zinc-500/30 text-zinc-400', desc: language === 'KO' ? '자유 창작, 오타만 표시' : 'Free creation, typos only' },
            ]).map(({ value, label, activeClass, desc }) => (
              <button
                key={value}
                onClick={() => setConfig({ ...config, narrativeIntensity: value })}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  (config.narrativeIntensity || 'standard') === value
                    ? activeClass
                    : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
                }`}
                title={desc}
              >
                <span>{label}</span>
                <span className="text-[8px] font-normal normal-case tracking-normal text-zinc-600">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 연재 플랫폼 선택 */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
            {tl('planningExtra.publishPlatform')}
          </label>
          <div className="flex flex-wrap gap-2">
            {[PublishPlatform.NONE, ...(PLATFORM_BY_LANG[language] || Object.values(PublishPlatform).filter(p => p !== 'NONE'))].map(pp => {
              const labels: Record<string, string> = {
                NONE: tl('planningExtra.none'),
                MUNPIA: '문피아', NOVELPIA: '노벨피아', KAKAOPAGE: '카카오페이지', SERIES: '시리즈',
                ROYAL_ROAD: 'Royal Road', WEBNOVEL: 'Webnovel', KINDLE_VELLA: 'Kindle Vella', WATTPAD: 'Wattpad',
                KAKUYOMU: 'カクヨム', NAROU: 'なろう', ALPHAPOLIS: 'アルファポリス',
                QIDIAN: '起点', JJWXC: '晋江', FANQIE: '番茄',
              };
              const selected = (config.publishPlatform || PublishPlatform.NONE) === pp;
              const preset = PLATFORM_PRESETS[pp];
              return (
                <button key={pp}
                  onClick={() => {
                    const updates: Partial<StoryConfig> = { publishPlatform: pp };
                    if (preset) {
                      updates.guardrails = { min: preset.episodeLength.min, max: preset.episodeLength.max };
                    }
                    setConfig(prev => ({ ...prev, ...updates }));
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                    selected
                      ? 'bg-accent-purple/10 border-accent-purple/40 text-accent-purple'
                      : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {labels[pp] || pp}
                </button>
              );
            })}
          </div>
          {config.publishPlatform && config.publishPlatform !== PublishPlatform.NONE && PLATFORM_PRESETS[config.publishPlatform] && (
            <div className="mt-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 space-y-1">
              <div><span className="text-zinc-400 font-bold">{tl('planningExtra.target')}:</span> {PLATFORM_PRESETS[config.publishPlatform].targetReader}</div>
              <div><span className="text-zinc-400 font-bold">{tl('planningExtra.length')}:</span> {PLATFORM_PRESETS[config.publishPlatform].episodeLength.min.toLocaleString()}~{PLATFORM_PRESETS[config.publishPlatform].episodeLength.max.toLocaleString()}{tl('planningExtra.chars')}</div>
              <div><span className="text-zinc-400 font-bold">{tl('planningExtra.pace')}:</span> {PLATFORM_PRESETS[config.publishPlatform].pace}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{tl('planningExtra.povCharacter')}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={tl('planningExtra.povPlaceholder')}
              maxLength={100}
              value={config.povCharacter}
              onChange={e => setConfig({ ...config, povCharacter: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{tl('planningExtra.settingLabel')}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={tl('planningExtra.settingPlaceholder')}
              maxLength={300}
              value={config.setting}
              onChange={e => setConfig({ ...config, setting: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{tl('planningExtra.coreEmotion')}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={tl('planningExtra.emotionPlaceholder')}
              value={config.primaryEmotion}
              onChange={e => setConfig({ ...config, primaryEmotion: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.synopsis}</label>
          <textarea
            className="w-full bg-black border border-zinc-800 rounded-2xl p-6 text-sm h-64 resize-none focus:border-blue-600 outline-none font-serif leading-relaxed"
            placeholder={t.synopsisPlaceholder}
            maxLength={5000}
            value={config.synopsis}
            onChange={e => setConfig({ ...config, synopsis: e.target.value })}
          />
        </div>

        {/* 세계관 뼈대 — 3-tier framework */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{t.worldTier1}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.corePremise}</label>
              <textarea
                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm h-24 resize-none focus:border-blue-600 outline-none leading-relaxed"
                placeholder={t.corePremisePH}
                value={config.corePremise ?? ''}
                onChange={e => setConfig({ ...config, corePremise: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.powerStructure}</label>
              <textarea
                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm h-24 resize-none focus:border-blue-600 outline-none leading-relaxed"
                placeholder={t.powerStructurePH}
                value={config.powerStructure ?? ''}
                onChange={e => setConfig({ ...config, powerStructure: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.currentConflict}</label>
              <textarea
                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm h-24 resize-none focus:border-blue-600 outline-none leading-relaxed"
                placeholder={t.currentConflictPH}
                value={config.currentConflict ?? ''}
                onChange={e => setConfig({ ...config, currentConflict: e.target.value })}
              />
            </div>
          </div>
          {/* 세계관 한 줄 요약 */}
          {(config.corePremise || config.currentConflict) && (
            <div className="p-4 bg-accent-purple/5 border border-accent-purple/10 rounded-xl">
              <span className="text-[10px] font-black text-accent-purple/60 uppercase tracking-widest">{t.worldFormula}</span>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                {tl('planningExtra.worldFormulaSentence')
                  .replace('{premise}', config.corePremise || '___')
                  .replace('{genre}', config.genre)
                  .replace('{power}', config.powerStructure || '___')
                  .replace('{conflict}', config.currentConflict || '___')
                }
              </p>
            </div>
          )}
          {/* 세계관 검증 */}
          {(() => {
            const warnings = validateWorld(config, language);
            const score = calcCompletionScore(warnings, 11);
            return (
              <div className="space-y-2 mt-4">
                <CompletionBar score={score} language={language} />
                <WarningBadge warnings={warnings} language={language} />
              </div>
            );
          })()}
        </div>

        {/* 세계관 2단계 — 작동 */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setShowWorldTier2(v => !v)}
            className="text-[10px] font-black text-zinc-600 uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:text-zinc-400 transition-colors"
          >
            {showWorldTier2 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t.worldTier2}
          </button>
          {showWorldTier2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.worldHistory}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.worldHistoryPH}
                  value={config.worldHistory ?? ''}
                  onChange={e => setConfig({ ...config, worldHistory: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.socialSystem}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.socialSystemPH}
                  value={config.socialSystem ?? ''}
                  onChange={e => setConfig({ ...config, socialSystem: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.economy}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.economyPH}
                  value={config.economy ?? ''}
                  onChange={e => setConfig({ ...config, economy: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.magicTechSystem}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.magicTechSystemPH}
                  value={config.magicTechSystem ?? ''}
                  onChange={e => setConfig({ ...config, magicTechSystem: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.factionRelations}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.factionRelationsPH}
                  value={config.factionRelations ?? ''}
                  onChange={e => setConfig({ ...config, factionRelations: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.survivalEnvironment}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.survivalEnvironmentPH}
                  value={config.survivalEnvironment ?? ''}
                  onChange={e => setConfig({ ...config, survivalEnvironment: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* 세계관 3단계 — 디테일 */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setShowWorldTier3(v => !v)}
            className="text-[10px] font-black text-zinc-600 uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:text-zinc-400 transition-colors"
          >
            {showWorldTier3 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t.worldTier3}
          </button>
          {showWorldTier3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.culture}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.culturePH}
                  value={config.culture ?? ''}
                  onChange={e => setConfig({ ...config, culture: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.religion}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.religionPH}
                  value={config.religion ?? ''}
                  onChange={e => setConfig({ ...config, religion: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.education}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.educationPH}
                  value={config.education ?? ''}
                  onChange={e => setConfig({ ...config, education: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.lawOrder}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.lawOrderPH}
                  value={config.lawOrder ?? ''}
                  onChange={e => setConfig({ ...config, lawOrder: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.taboo}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.tabooPH}
                  value={config.taboo ?? ''}
                  onChange={e => setConfig({ ...config, taboo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.dailyLife}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.dailyLifePH}
                  value={config.dailyLife ?? ''}
                  onChange={e => setConfig({ ...config, dailyLife: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.travelComm}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.travelCommPH}
                  value={config.travelComm ?? ''}
                  onChange={e => setConfig({ ...config, travelComm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.truthVsBeliefs}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.truthVsBeliefsPH}
                  value={config.truthVsBeliefs ?? ''}
                  onChange={e => setConfig({ ...config, truthVsBeliefs: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tension Curve Preview */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" /> {te.tensionPreview}
          </h3>
          <div className="bg-black/40 rounded-2xl border border-zinc-800/50 p-4">
            <div className="h-20 flex items-end gap-px">
              {tensionData.map((t, i) => {
                const height = Math.round(t * 100);
                const isCurrentEp = i + 1 === config.episode;
                return (
                  <div key={i} className="flex-1 relative h-full group cursor-default">
                    <div
                      className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-300 ${
                        isCurrentEp
                          ? 'bg-gradient-to-t from-blue-500 to-cyan-400'
                          : 'bg-gradient-to-t from-blue-600/40 to-indigo-400/20'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    {isCurrentEp && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    )}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-zinc-300 text-[7px] px-1 py-0.5 rounded whitespace-nowrap">
                      EP.{i + 1}: {height}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-700 mt-2">
              <span>EP.1</span>
              <span>EP.{totalEpisodes}</span>
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="space-y-6 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> {tl('planningExtra.narrativeGuardrails')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.minDensity}</span>
                <span>{config.guardrails.min}{tl('planningExtra.chars')}</span>
              </div>
              <input type="range" min="1000" max="10000" step="500" aria-label={t.minDensity} className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.min} onChange={e => setConfig({...config, guardrails: {...config.guardrails, min: parseInt(e.target.value)}})} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.maxCapacity}</span>
                <span>{config.guardrails.max}{tl('planningExtra.chars')}</span>
              </div>
              <input type="range" min="2000" max="15000" step="500" aria-label={t.maxCapacity} className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.max} onChange={e => setConfig({...config, guardrails: {...config.guardrails, max: parseInt(e.target.value)}})} />
            </div>
          </div>
        </div>

        {/* NOA-PRISM v1.1 — Writing Quality Control */}
        <div className="space-y-6 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4" /> {tl('planningExtra.prismTitle')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{tl('planningExtra.prismPreserve')}</span>
                <span className="font-[family-name:var(--font-mono)]">{config.prismPreserve ?? 100}</span>
              </div>
              <input
                type="range" min="0" max="150" step="5"
                aria-label={tl('planningExtra.prismPreserve')}
                className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none"
                value={config.prismPreserve ?? 100}
                onChange={e => setConfig({ ...config, prismPreserve: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{tl('planningExtra.prismExpand')}</span>
                <span className="font-[family-name:var(--font-mono)]">{config.prismScale ?? 120}</span>
              </div>
              <input
                type="range" min="0" max="150" step="5"
                aria-label={tl('planningExtra.prismExpand')}
                className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none"
                value={config.prismScale ?? 120}
                onChange={e => setConfig({ ...config, prismScale: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { label: tl('planningExtra.prism100'), preserve: 100, scale: 100 },
              { label: tl('planningExtra.prism105'), preserve: 100, scale: 105 },
              { label: tl('planningExtra.prism120'), preserve: 100, scale: 120 },
              { label: tl('planningExtra.prism135'), preserve: 100, scale: 135 },
              { label: tl('planningExtra.prism150'), preserve: 100, scale: 150 },
            ] as const).map(p => {
              const isActive = (config.prismPreserve ?? 100) === p.preserve && (config.prismScale ?? 120) === p.scale;
              return (
                <button
                  key={p.scale}
                  onClick={() => setConfig({ ...config, prismPreserve: p.preserve, prismScale: p.scale })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all font-[family-name:var(--font-mono)] ${
                    isActive
                      ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  PRISM-{p.scale} {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* NOA-PRISM MODE — Content Rating System */}
        <div className="space-y-6 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4" /> {tl('planningExtra.prismModeTitle')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'OFF' as const, label: tl('planningExtra.prismModeOff'), desc: tl('planningExtra.prismModeOffDesc') },
              { key: 'FREE' as const, label: tl('planningExtra.prismModeFree'), desc: tl('planningExtra.prismModeFreeDesc') },
              { key: 'ALL' as const, label: tl('planningExtra.prismModeAll'), desc: tl('planningExtra.prismModeAllDesc') },
              { key: 'T15' as const, label: tl('planningExtra.prismModeT15'), desc: tl('planningExtra.prismModeT15Desc') },
              { key: 'M18' as const, label: tl('planningExtra.prismModeM18'), desc: tl('planningExtra.prismModeM18Desc') },
              { key: 'CUSTOM' as const, label: tl('planningExtra.prismModeCustom'), desc: tl('planningExtra.prismModeCustomDesc') },
            ] as const).map(pm => {
              const currentMode = config.prismMode ?? 'OFF';
              const isActive = currentMode === pm.key;
              return (
                <button
                  key={pm.key}
                  onClick={() => setConfig({ ...config, prismMode: pm.key })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all font-[family-name:var(--font-mono)] ${
                    isActive
                      ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-zinc-400'
                  }`}
                  title={pm.desc}
                >
                  {pm.label}
                </button>
              );
            })}
          </div>
          {(config.prismMode === 'CUSTOM') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              {(['sexual', 'violence', 'profanity'] as const).map(axis => {
                const labelKey = axis === 'sexual' ? 'prismSexual' : axis === 'violence' ? 'prismViolence' : 'prismProfanity';
                const val = config.prismCustom?.[axis] ?? 0;
                return (
                  <div key={axis} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                      <span>{tl(`planningExtra.${labelKey}`)}</span>
                      <span className="font-[family-name:var(--font-mono)]">{val}/5</span>
                    </div>
                    <input
                      type="range" min="0" max="5" step="1"
                      aria-label={tl(`planningExtra.${labelKey}`)}
                      className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none"
                      value={val}
                      onChange={e => setConfig({
                        ...config,
                        prismCustom: {
                          sexual: config.prismCustom?.sexual ?? 0,
                          violence: config.prismCustom?.violence ?? 0,
                          profanity: config.prismCustom?.profanity ?? 0,
                          [axis]: parseInt(e.target.value),
                        },
                      })}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

        </div>
        {/* === 고급 모드 전용 섹션 끝 === */}

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <button onClick={onStart} className="flex items-center gap-3 md:gap-4 px-8 py-4 text-lg md:px-12 md:py-6 md:text-xl bg-white text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-2xl">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          {startLabel ?? t.commence}
        </button>
        <button
          onClick={() => {
            const worldPayload = {
              title: config.title,
              genre: config.genre,
              synopsis: config.synopsis,
              setting: config.setting,
              primaryEmotion: config.primaryEmotion,
              characters: config.characters ?? [],
              corePremise: config.corePremise,
              powerStructure: config.powerStructure,
              currentConflict: config.currentConflict,
              worldHistory: config.worldHistory,
              socialSystem: config.socialSystem,
              economy: config.economy,
              magicTechSystem: config.magicTechSystem,
              culture: config.culture,
              religion: config.religion,
              taboo: config.taboo,
              totalEpisodes: config.totalEpisodes,
              tensionCurve: config.sceneDirection?.tensionCurve,
            };
            const encoded = btoa(JSON.stringify(worldPayload));
            const url = `${window.location.origin}/world/share?data=${encoded}`;
            navigator.clipboard.writeText(url).then(() => {
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            });
          }}
          className="flex items-center gap-2 px-6 py-3 text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-2xl font-bold hover:border-zinc-500 hover:text-white hover:scale-105 active:scale-95 transition-all"
        >
          {shareCopied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
          {shareCopied
            ? (isKO ? '복사됨!' : 'Copied!')
            : (isKO ? '세계관 공유' : 'Share World')}
        </button>
        <button
          onClick={() => {
            const planetPayload = {
              title: config.title,
              genre: config.genre,
              synopsis: config.synopsis,
              characters: config.characters ?? [],
              corePremise: config.corePremise,
              powerStructure: config.powerStructure,
            };
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(planetPayload))));
            router.push(`/network/new?import=${encoded}`);
          }}
          className="flex items-center gap-2 px-6 py-3 text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-2xl font-bold hover:border-accent-amber hover:text-accent-amber hover:scale-105 active:scale-95 transition-all"
        >
          <Globe className="w-4 h-4" />
          {isKO ? '행성으로 등록' : 'Register as Planet'}
        </button>
      </div>
    </div>
  );
};

export default PlanningView;

