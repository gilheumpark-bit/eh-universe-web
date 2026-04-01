
import { showAlert } from '@/lib/show-alert';
import React, { useState, useMemo } from 'react';
import { StoryConfig, Genre, AppLanguage, PlatformType, PublishPlatform } from '@/lib/studio-types';
import { PLATFORM_PRESETS, PLATFORM_BY_LANG } from '@/engine/types';
import { TRANSLATIONS, GENRE_LABELS } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import { Sparkles, Monitor, Smartphone, Shuffle, Bot, Loader2, Share2, Check, Globe } from 'lucide-react';
import AdvancedPlanningSection from './planning/AdvancedPlanningSection';
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
        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
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
            <span className="text-[10px] text-text-tertiary">{isKO ? 'AI 프롬프트에 반영' : 'Apply to AI prompt'}</span>
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
          <span className="text-[11px] text-text-tertiary italic">{isKO ? '태그를 추가하면 AI 프롬프트에 반영됩니다' : 'Tags will be injected into AI prompts'}</span>
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
          className="flex-1 bg-black border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-600 transition-colors"
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
              className="px-2 py-0.5 text-[10px] font-bold text-text-tertiary bg-bg-secondary border border-border rounded-full hover:border-blue-500/30 hover:text-blue-400 transition-colors"
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
  const tensionData = useMemo(() => generateTensionCurveData(totalEpisodes, config.genre), [totalEpisodes, config.genre]);
  const [autoGenGenre, setAutoGenGenre] = useState<Genre>(config.genre);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  // showWorldTier2/3 → AdvancedPlanningSection 내부
  const [shareCopied, setShareCopied] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('noa_planning_advanced') === 'true';
    return false;
  });
  const router = useRouter();

  const handleAIGenerate = async () => {
    // hosted provider가 있으면 로컬 키 없이도 사용 가능
    if (!getApiKey(getActiveProvider()) && !hasAiAccess) {
      showAlert(tl('planningExtra.apiKeyAlert'));
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
      showAlert(tl('planningExtra.aiFailed'));
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:px-10 md:pt-4 md:pb-10 space-y-8 animate-in fade-in duration-700 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t.title}</h2>
          <p className="text-text-tertiary text-[10px] font-bold tracking-widest uppercase">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={autoGenGenre} onChange={e => setAutoGenGenre(e.target.value as Genre)}
            className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-secondary outline-none cursor-pointer uppercase">
            {Object.values(Genre).map(g => (
              <option key={g} value={g}>{GENRE_LABELS[language][g]}</option>
            ))}
          </select>
          <div className="relative">
            <button onClick={() => setShowPresetMenu(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95">
              <Shuffle className="w-3.5 h-3.5" /> {tl('planningExtra.preset')}
            </button>
            {showPresetMenu && (
              <div className="absolute top-full mt-1 right-0 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 min-w-[240px] max-h-[320px] overflow-y-auto">
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
                      className="w-full text-left px-4 py-3 text-[11px] text-text-secondary hover:bg-blue-600/20 hover:text-white transition-colors border-b border-border last:border-0">
                      <div className="font-bold text-zinc-200">{data.title}</div>
                      <div className="text-[9px] mt-0.5 opacity-70">{data.pov} · {data.emotion}</div>
                    </button>
                  );
                })}
                {(!AUTO_PRESETS[autoGenGenre] || AUTO_PRESETS[autoGenGenre].length === 0) && (
                  <div className="px-4 py-3 text-[11px] text-text-tertiary">{tl('planningExtra.noPreset')}</div>
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

      <div className="ds-card-lg space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{t.projectTitle}</label>
            <input
              className="w-full bg-black border border-border rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              aria-label={t.projectTitle}
              maxLength={200}
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{t.primaryGenre}</label>
            <select
              className="w-full bg-black border border-border rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none cursor-pointer"
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
                : 'border-border bg-bg-secondary text-text-tertiary hover:text-text-secondary'
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
            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{te.totalEpisodes}</label>
            <input
              type="number"
              min={1}
              max={500}
              className={`w-full bg-black border rounded-xl p-4 text-sm font-bold outline-none transition-all ${
                totalEpisodes < 1 || totalEpisodes > 500
                  ? 'border-red-500/60 focus:border-red-500 text-red-400'
                  : 'border-border focus:border-blue-600'
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
            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{te.platform}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setConfig({ ...config, platform: PlatformType.MOBILE })}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  config.platform === PlatformType.MOBILE
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-black border-border text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Smartphone className="w-4 h-4" /> {te.mobile}
              </button>
              <button
                onClick={() => setConfig({ ...config, platform: PlatformType.WEB })}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  config.platform === PlatformType.WEB
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-black border-border text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Monitor className="w-4 h-4" /> {te.web}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 간단 모드: PRISM-MODE 프리셋만 표시 */}
      {!advancedMode && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-mono">
            {isKO ? '콘텐츠 등급' : 'Content Rating'}
          </span>
          {(['OFF', 'FREE', 'ALL', 'T15', 'M18'] as const).map(mode => (
            <button key={mode} onClick={() => setConfig({ ...config, prismMode: mode })}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono border transition-all ${
                (config.prismMode ?? 'OFF') === mode
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                  : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-secondary'
              }`}>
              {mode}
            </button>
          ))}
        </div>
      )}

      {/* === 고급 모드 전용 섹션 === */}
      {advancedMode && (
        <div className="ds-card-lg">
          <AdvancedPlanningSection language={language} config={config} setConfig={setConfig} totalEpisodes={totalEpisodes} tensionData={tensionData} />
        </div>
      )}

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
            // UTF-8 safe base64 (한국어 제목/시놉시스 안전)
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(worldPayload))));
            const url = `${window.location.origin}/world/share?data=${encoded}`;
            navigator.clipboard.writeText(url).then(() => {
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            }).catch(() => {
              // clipboard 권한 거부 — 수동 복사 안내
              window.prompt(language === 'KO' ? '클립보드 접근이 거부됐습니다. 아래 링크를 직접 복사하세요:' : 'Clipboard access denied. Copy the link below:', url);
            });
          }}
          className="flex items-center gap-2 px-6 py-3 text-sm bg-bg-secondary border border-border text-text-secondary rounded-2xl font-bold hover:border-zinc-500 hover:text-white hover:scale-105 active:scale-95 transition-all"
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
          className="flex items-center gap-2 px-6 py-3 text-sm bg-bg-secondary border border-border text-text-secondary rounded-2xl font-bold hover:border-accent-amber hover:text-accent-amber hover:scale-105 active:scale-95 transition-all"
        >
          <Globe className="w-4 h-4" />
          {isKO ? '행성으로 등록' : 'Register as Planet'}
        </button>
      </div>
    </div>
  );
};

export default PlanningView;

