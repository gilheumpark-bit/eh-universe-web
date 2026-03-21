
import React from 'react';
import { StoryConfig, Genre, AppLanguage, PlatformType } from '@/lib/studio-types';
import { TRANSLATIONS, GENRE_LABELS } from '@/lib/studio-constants';
import { Sparkles, BarChart3, Wand2, Monitor, Smartphone } from 'lucide-react';
import { generateTensionCurveData } from '@/engine/models';

interface PlanningViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
}

const PlanningView: React.FC<PlanningViewProps> = ({ language, config, setConfig, onStart }) => {
  const t = TRANSLATIONS[language].planning;
  const te = TRANSLATIONS[language].engine;

  const totalEpisodes = config.totalEpisodes ?? 25;
  const tensionData = generateTensionCurveData(totalEpisodes, config.genre);

  const injectDemoData = () => {
    setConfig((prev: StoryConfig) => ({
      ...prev,
      title: language === 'KO' ? "네온 심연의 관찰자" : "Observer of the Neon Abyss",
      genre: Genre.SF,
      povCharacter: "K-042",
      setting: "Sector 7 하층 구역",
      primaryEmotion: "공포와 호기심",
      totalEpisodes: 25,
      synopsis: "AI가 지배하는 근미래 도시. 폐기물 처리 로봇 K-042는 금지된 데이터 칩을 발견한다. 그 안에는 인류의 마지막 감정 데이터가 기록되어 있었다. 도시 통제 시스템 '아르고스'는 이를 감지하고 제거반을 파견하지만, K-042는 '슬픔'의 실체를 찾기 위해 도시 가장 깊은 곳으로의 도주를 시작한다.",
      guardrails: { min: 4000, max: 6000 }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-10 space-y-12 animate-in fade-in duration-700 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t.title}</h2>
          <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase">{t.subtitle}</p>
        </div>
        <button onClick={injectDemoData} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-500 hover:text-white transition-all uppercase tracking-widest shrink-0">
          <Wand2 className="w-3.5 h-3.5" /> {t.demo}
        </button>
      </div>

      <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.projectTitle}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.primaryGenre}</label>
            <select
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none cursor-pointer"
              value={config.genre}
              onChange={e => setConfig({ ...config, genre: e.target.value as Genre })}
            >
              {Object.values(Genre).map(g => (
                <option key={g} value={g}>{GENRE_LABELS[language][g]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* New: Total Episodes + Platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{te.totalEpisodes}</label>
            <input
              type="number"
              min="5"
              max="100"
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              value={totalEpisodes}
              onChange={e => setConfig({ ...config, totalEpisodes: parseInt(e.target.value) || 25 })}
            />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{language === 'KO' ? '시점 캐릭터' : 'POV Character'}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={language === 'KO' ? '주인공 이름...' : 'Protagonist name...'}
              value={config.povCharacter}
              onChange={e => setConfig({ ...config, povCharacter: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{language === 'KO' ? '주요 배경' : 'Setting'}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={language === 'KO' ? '장소, 시대...' : 'Place, era...'}
              value={config.setting}
              onChange={e => setConfig({ ...config, setting: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{language === 'KO' ? '핵심 감정' : 'Core Emotion'}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={language === 'KO' ? '공포, 사랑, 분노...' : 'Fear, love, rage...'}
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
            value={config.synopsis}
            onChange={e => setConfig({ ...config, synopsis: e.target.value })}
          />
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
            <div className="flex justify-between text-[8px] text-zinc-700 mt-2">
              <span>EP.1</span>
              <span>EP.{totalEpisodes}</span>
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="space-y-6 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Narrative Guardrails
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.minDensity}</span>
                <span>{config.guardrails.min}{language === 'KO' ? '자' : ' chars'}</span>
              </div>
              <input type="range" min="1000" max="10000" step="500" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.min} onChange={e => setConfig({...config, guardrails: {...config.guardrails, min: parseInt(e.target.value)}})} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.maxCapacity}</span>
                <span>{config.guardrails.max}{language === 'KO' ? '자' : ' chars'}</span>
              </div>
              <input type="range" min="2000" max="15000" step="500" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.max} onChange={e => setConfig({...config, guardrails: {...config.guardrails, max: parseInt(e.target.value)}})} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={onStart} className="flex items-center gap-3 md:gap-4 px-8 py-4 text-lg md:px-12 md:py-6 md:text-xl bg-white text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-2xl">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          {t.commence}
        </button>
      </div>
    </div>
  );
};

export default PlanningView;

